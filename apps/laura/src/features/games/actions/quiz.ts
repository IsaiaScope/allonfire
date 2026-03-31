"use server";

import type { GameType } from "@allonfire/database";
import {
  createQuizQuestion,
  getQuizQuestionCount,
  getRandomQuizQuestions,
  getUserBestScore,
  prisma,
  submitGameScore,
} from "@allonfire/database";
import {
  blurHashToDataURL,
  processPhoto,
  uploadFile,
} from "@allonfire/storage";
import { headers } from "next/headers";
import {
  getLeaderboardAction,
  type LeaderboardData,
} from "@/features/games/actions/games";
import { auth } from "@/lib/auth";
import { validateImageFile } from "@/lib/file-validation";

// ---- Types ----

export type QuizQuestionData = {
  id: string;
  text: string;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  imageBlurDataURL: string | null;
  answers: {
    id: string;
    text: string;
    imageUrl: string | null;
    imageThumbnailUrl: string | null;
    imageBlurDataURL: string | null;
    isCorrect: boolean;
    sortOrder: number;
  }[];
};

export type QuizQuestionsResult =
  | { success: true; questions: QuizQuestionData[] }
  | { success: false; error: string; questionCount: number };

export type SubmitQuizScoreResult =
  | { success: true; isNewBest: boolean }
  | { success: false; error: string };

export type CreateQuestionResult =
  | { success: true; questionId: string }
  | { success: false; error: string };

// ---- Actions ----

export async function getQuizQuestionsAction(): Promise<QuizQuestionsResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  const questionCount = await getQuizQuestionCount();
  if (questionCount < 10) {
    return { success: false, error: "NOT_ENOUGH_QUESTIONS", questionCount };
  }

  const questions = await getRandomQuizQuestions(10);

  return {
    success: true,
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      imageUrl: q.imageUrl,
      imageThumbnailUrl: q.imageThumbnailUrl,
      imageBlurDataURL: q.imageBlurHash
        ? blurHashToDataURL(q.imageBlurHash)
        : null,
      answers: q.answers.map((a) => ({
        id: a.id,
        text: a.text,
        imageUrl: a.imageUrl,
        imageThumbnailUrl: a.imageThumbnailUrl,
        imageBlurDataURL: a.imageBlurHash
          ? blurHashToDataURL(a.imageBlurHash)
          : null,
        isCorrect: a.isCorrect,
        sortOrder: a.sortOrder,
      })),
    })),
  };
}

export async function submitQuizScoreAction(data: {
  timeMs: number;
  correctCount: number;
  totalQuestions: number;
}): Promise<SubmitQuizScoreResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  if (data.timeMs <= 0 || data.correctCount < 0) {
    return { success: false, error: "Invalid score data" };
  }

  const existingBest = await getUserBestScore(session.user.id, "QUIZ");
  const isNewBest =
    !existingBest ||
    data.correctCount > (existingBest.score ?? 0) ||
    (data.correctCount === (existingBest.score ?? 0) &&
      data.timeMs < (existingBest.timeMs ?? Number.POSITIVE_INFINITY));

  await submitGameScore({
    userId: session.user.id,
    gameType: "QUIZ" as GameType,
    timeMs: data.timeMs,
    score: data.correctCount,
    metadata: { questionCount: data.totalQuestions },
  });

  return { success: true, isNewBest };
}

export async function getQuizLeaderboardAction(): Promise<LeaderboardData> {
  return await getLeaderboardAction("QUIZ");
}

async function processAndUploadImage(
  file: File,
  pathPrefix: string,
  id: string
) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await processPhoto(buffer);

  const [fullUrl, thumbUrl] = await Promise.all([
    uploadFile(`${pathPrefix}/full/${id}.jpg`, processed.full, "image/jpeg"),
    uploadFile(
      `${pathPrefix}/thumb/${id}.jpg`,
      processed.thumbnail,
      "image/jpeg"
    ),
  ]);

  return {
    imageUrl: fullUrl,
    imageThumbnailUrl: thumbUrl,
    imageBlurHash: processed.blurHash,
  };
}

type ParsedAnswer = {
  text: string;
  isCorrect: boolean;
  sortOrder: number;
  image?: File;
};

type FormValidation =
  | {
      valid: true;
      text: string;
      answers: ParsedAnswer[];
      questionImage: File | null;
    }
  | { valid: false; error: string };

function parseAnswer(
  formData: FormData,
  index: number
): { answer: ParsedAnswer } | { error: string } {
  const answerText = formData.get(`answer-${index}-text`) as string;
  if (!answerText || answerText.length < 1 || answerText.length > 200) {
    return { error: `Answer ${index + 1} text must be 1-200 characters` };
  }

  const answerImage = formData.get(`answer-${index}-image`) as File | null;
  if (answerImage && answerImage.size > 0) {
    const imageError = validateImageFile(answerImage);
    if (imageError) {
      return { error: imageError };
    }
  }

  return {
    answer: {
      text: answerText,
      isCorrect: formData.get(`answer-${index}-correct`) === "true",
      sortOrder: index,
      image: answerImage && answerImage.size > 0 ? answerImage : undefined,
    },
  };
}

function validateQuestionForm(formData: FormData): FormValidation {
  const text = formData.get("text") as string;
  if (!text || text.length < 1 || text.length > 500) {
    return { valid: false, error: "Question text must be 1-500 characters" };
  }

  const answerCount = Number(formData.get("answerCount"));
  if (answerCount < 2 || answerCount > 4) {
    return { valid: false, error: "Must have 2-4 answers" };
  }

  const answers: ParsedAnswer[] = [];
  for (let i = 0; i < answerCount; i++) {
    const result = parseAnswer(formData, i);
    if ("error" in result) {
      return { valid: false, error: result.error };
    }
    answers.push(result.answer);
  }

  const correctCount = answers.filter((a) => a.isCorrect).length;
  if (correctCount !== 1) {
    return { valid: false, error: "Exactly one answer must be correct" };
  }

  const questionImage = formData.get("image") as File | null;
  if (questionImage && questionImage.size > 0) {
    const imageError = validateImageFile(questionImage);
    if (imageError) {
      return { valid: false, error: imageError };
    }
  }

  return { valid: true, text, answers, questionImage };
}

export async function createQuestionAction(
  formData: FormData
): Promise<CreateQuestionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user.role === "VIEWER") {
    return { success: false, error: "Viewers cannot create questions" };
  }

  const validation = validateQuestionForm(formData);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { text, answers, questionImage } = validation;

  try {
    const timestamp = Date.now();

    const [questionImageData, answersData] = await Promise.all([
      questionImage && questionImage.size > 0
        ? processAndUploadImage(questionImage, "quiz/questions", `${timestamp}`)
        : Promise.resolve(undefined),
      Promise.all(
        answers.map(async (answer, index) => {
          const imageData = answer.image
            ? await processAndUploadImage(
                answer.image,
                "quiz/answers",
                `${timestamp}-${index}`
              )
            : undefined;

          return {
            text: answer.text,
            isCorrect: answer.isCorrect,
            sortOrder: answer.sortOrder,
            ...(imageData && {
              imageUrl: imageData.imageUrl,
              imageThumbnailUrl: imageData.imageThumbnailUrl,
              imageBlurHash: imageData.imageBlurHash,
            }),
          };
        })
      ),
    ]);

    const question = await createQuizQuestion({
      text,
      createdBy: session.user.id,
      ...(questionImageData && {
        imageUrl: questionImageData.imageUrl,
        imageThumbnailUrl: questionImageData.imageThumbnailUrl,
        imageBlurHash: questionImageData.imageBlurHash,
      }),
      answers: answersData,
    });

    return { success: true, questionId: question.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create question";
    return { success: false, error: message };
  }
}
