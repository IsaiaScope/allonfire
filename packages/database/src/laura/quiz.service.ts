import { prisma } from "../client";

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

type ImageFields = {
  imageUrl?: string | undefined;
  imageThumbnailUrl?: string | undefined;
  imageBlurHash?: string | undefined;
};

/** The three image columns a question or an answer stores, null when absent. */
const imageColumns = (image: ImageFields) => ({
  imageBlurHash: image.imageBlurHash ?? null,
  imageThumbnailUrl: image.imageThumbnailUrl ?? null,
  imageUrl: image.imageUrl ?? null,
});

export async function createQuizQuestion(data: {
  text: string;
  createdBy: string;
  imageUrl?: string | undefined;
  imageThumbnailUrl?: string | undefined;
  imageBlurHash?: string | undefined;
  answers: {
    text: string;
    isCorrect: boolean;
    sortOrder: number;
    imageUrl?: string | undefined;
    imageThumbnailUrl?: string | undefined;
    imageBlurHash?: string | undefined;
  }[];
}) {
  return await prisma.quizQuestion.create({
    data: {
      answers: {
        create: data.answers.map((a) => ({
          ...imageColumns(a),
          isCorrect: a.isCorrect,
          sortOrder: a.sortOrder,
          text: a.text,
        })),
      },
      createdBy: data.createdBy,
      ...imageColumns(data),
      text: data.text,
    },
    include: { answers: true },
  });
}

export async function getRandomQuizQuestions(
  count = 10
): Promise<QuizQuestionWithAnswers[]> {
  const randomIds = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM laura."QuizQuestion" ORDER BY RANDOM() LIMIT ${count}
  `;

  const questions = await prisma.quizQuestion.findMany({
    include: {
      answers: {
        orderBy: { sortOrder: "asc" },
      },
    },
    where: { id: { in: randomIds.map((r) => r.id) } },
  });

  // Shuffle the questions order (since findMany returns in id order)
  for (let i = questions.length - 1; i > 0; i -= 1) {
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
      _count: { select: { answers: true } },
      createdAt: true,
      id: true,
      imageThumbnailUrl: true,
      imageUrl: true,
      text: true,
    },
  });
}

export async function getQuizQuestionById(id: string) {
  return await prisma.quizQuestion.findUnique({
    include: {
      answers: { orderBy: { sortOrder: "asc" } },
    },
    where: { id },
  });
}

const NO_IMAGE = imageColumns({});

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
      imageUrl?: string | undefined;
      imageThumbnailUrl?: string | undefined;
      imageBlurHash?: string | undefined;
      /** Keep the image this question already stores at that URL. */
      keepImageUrl?: string | undefined;
    }[];
  }
) {
  // An image field left out stays as it is; only the keys present are written.
  const { answers, ...fields } = data;
  return await prisma.$transaction(async (tx) => {
    // Answers are recreated, so a kept image is copied from its stored row. A
    // URL this question does not hold matches nothing and is not written.
    const stored = await tx.quizAnswer.findMany({
      select: { imageBlurHash: true, imageThumbnailUrl: true, imageUrl: true },
      where: { imageUrl: { not: null }, questionId: id },
    });
    const storedByUrl = new Map(stored.map((image) => [image.imageUrl, image]));

    await tx.quizAnswer.deleteMany({ where: { questionId: id } });

    return await tx.quizQuestion.update({
      data: {
        ...fields,
        answers: {
          create: answers.map((a) => ({
            ...(a.imageUrl
              ? imageColumns(a)
              : (storedByUrl.get(a.keepImageUrl ?? null) ?? NO_IMAGE)),
            isCorrect: a.isCorrect,
            sortOrder: a.sortOrder,
            text: a.text,
          })),
        },
      },
      include: { answers: true },
      where: { id },
    });
  });
}

export async function deleteQuizQuestion(id: string) {
  return await prisma.quizQuestion.delete({ where: { id } });
}
