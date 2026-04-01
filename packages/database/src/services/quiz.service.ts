import { prisma } from "../index";

export type QuizQuestionWithAnswers = {
  id: string;
  text: string;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  imageBlurHash: string | null;
  answers: {
    id: string;
    text: string;
    imageUrl: string | null;
    imageThumbnailUrl: string | null;
    imageBlurHash: string | null;
    isCorrect: boolean;
    sortOrder: number;
  }[];
};

export async function createQuizQuestion(data: {
  text: string;
  createdBy: string;
  imageUrl?: string;
  imageThumbnailUrl?: string;
  imageBlurHash?: string;
  answers: {
    text: string;
    isCorrect: boolean;
    sortOrder: number;
    imageUrl?: string;
    imageThumbnailUrl?: string;
    imageBlurHash?: string;
  }[];
}) {
  return await prisma.quizQuestion.create({
    data: {
      text: data.text,
      createdBy: data.createdBy,
      imageUrl: data.imageUrl,
      imageThumbnailUrl: data.imageThumbnailUrl,
      imageBlurHash: data.imageBlurHash,
      answers: {
        create: data.answers.map((a) => ({
          text: a.text,
          isCorrect: a.isCorrect,
          sortOrder: a.sortOrder,
          imageUrl: a.imageUrl,
          imageThumbnailUrl: a.imageThumbnailUrl,
          imageBlurHash: a.imageBlurHash,
        })),
      },
    },
    include: { answers: true },
  });
}

export async function getRandomQuizQuestions(
  count = 10
): Promise<QuizQuestionWithAnswers[]> {
  const randomIds = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "QuizQuestion" ORDER BY RANDOM() LIMIT ${count}
  `;

  const questions = await prisma.quizQuestion.findMany({
    where: { id: { in: randomIds.map((r) => r.id) } },
    include: {
      answers: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  // Shuffle the questions order (since findMany returns in id order)
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = questions[i];
    const swap = questions[j];
    if (temp && swap) {
      questions[i] = swap;
      questions[j] = temp;
    }
  }

  return questions;
}

export async function getQuizQuestionCount() {
  return await prisma.quizQuestion.count();
}

export async function getAllQuizQuestions() {
  return await prisma.quizQuestion.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      text: true,
      imageUrl: true,
      imageThumbnailUrl: true,
      createdAt: true,
      _count: { select: { answers: true } },
    },
  });
}

export async function getQuizQuestionById(id: string) {
  return await prisma.quizQuestion.findUnique({
    where: { id },
    include: {
      answers: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function updateQuizQuestion(
  id: string,
  data: {
    text: string;
    imageUrl?: string | null;
    imageThumbnailUrl?: string | null;
    imageBlurHash?: string | null;
    answers: {
      text: string;
      isCorrect: boolean;
      sortOrder: number;
      imageUrl?: string;
      imageThumbnailUrl?: string;
      imageBlurHash?: string;
    }[];
  }
) {
  return await prisma.$transaction(async (tx) => {
    await tx.quizAnswer.deleteMany({ where: { questionId: id } });

    return await tx.quizQuestion.update({
      where: { id },
      data: {
        text: data.text,
        imageUrl: data.imageUrl,
        imageThumbnailUrl: data.imageThumbnailUrl,
        imageBlurHash: data.imageBlurHash,
        answers: {
          create: data.answers.map((a) => ({
            text: a.text,
            isCorrect: a.isCorrect,
            sortOrder: a.sortOrder,
            imageUrl: a.imageUrl,
            imageThumbnailUrl: a.imageThumbnailUrl,
            imageBlurHash: a.imageBlurHash,
          })),
        },
      },
      include: { answers: true },
    });
  });
}

export async function deleteQuizQuestion(id: string) {
  return await prisma.quizQuestion.delete({ where: { id } });
}
