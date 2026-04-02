"use server";

import { checkAdminAccess, checkMutationAccess } from "@allonfire/auth/guard";
import {
  createQuizQuestion,
  deleteQuizQuestion,
  getAllQuizQuestions,
  getGlobalBestScore,
  getQuizQuestionById,
  getRandomQuizQuestions,
  submitGameScore,
  updateQuizQuestion,
} from "@allonfire/database";
import {
  blurHashToDataURL,
  processPhoto,
  uploadFile,
} from "@allonfire/storage";
import { formatErrorMessage } from "@allonfire/utils";
import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import {
  getLeaderboardAction,
  type LeaderboardData,
} from "@/features/games/actions/games";
import { LEADERBOARD_CACHE_TAGS } from "@/features/games/actions/leaderboard-cache";
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

export type QuizQuestionListItem = {
  id: string;
  text: string;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  createdAt: string;
  answerCount: number;
};

export type QuizQuestionDetail = {
  id: string;
  text: string;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  answers: {
    id: string;
    text: string;
    imageUrl: string | null;
    imageThumbnailUrl: string | null;
    isCorrect: boolean;
    sortOrder: number;
  }[];
};

export type DeleteQuestionResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateQuestionResult =
  | { success: true }
  | { success: false; error: string };

// ---- Actions ----

export async function getQuizQuestionsAction(): Promise<QuizQuestionsResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  const questions = await getRandomQuizQuestions(10);
  if (questions.length < 10) {
    return {
      success: false,
      error: "NOT_ENOUGH_QUESTIONS",
      questionCount: questions.length,
    };
  }

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
  const access = await checkMutationAccess(auth);
  if (!access.allowed) {
    return { success: false, error: access.reason };
  }
  const { session } = access;

  if (data.timeMs <= 0 || data.correctCount < 0) {
    return { success: false, error: "Invalid score data" };
  }

  const globalBest = await getGlobalBestScore("QUIZ");

  await submitGameScore({
    userId: session.user.id,
    gameType: "QUIZ",
    timeMs: data.timeMs,
    score: data.correctCount,
    metadata: { questionCount: data.totalQuestions },
  });

  const isNewBest =
    !globalBest ||
    data.correctCount > (globalBest.score ?? 0) ||
    (data.correctCount === (globalBest.score ?? 0) &&
      data.timeMs < (globalBest.timeMs ?? Number.POSITIVE_INFINITY));

  updateTag(LEADERBOARD_CACHE_TAGS.QUIZ);

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

function resolveImageFields(
  uploadedImage:
    | { imageUrl: string; imageThumbnailUrl: string; imageBlurHash: string }
    | undefined,
  keepExisting: boolean,
  existingUrl: string | null,
  existingThumbUrl: string | null
) {
  if (uploadedImage) {
    return {
      imageUrl: uploadedImage.imageUrl,
      imageThumbnailUrl: uploadedImage.imageThumbnailUrl,
      imageBlurHash: uploadedImage.imageBlurHash,
    };
  }
  if (keepExisting && existingUrl) {
    return {
      imageUrl: existingUrl,
      imageThumbnailUrl: existingThumbUrl ?? existingUrl,
    };
  }
  return {};
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
  const access = await checkAdminAccess(auth);
  if (!access.allowed) {
    return { success: false, error: access.reason };
  }
  const { session } = access;

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

    revalidatePath("/games/quiz/edit");
    return { success: true, questionId: question.id };
  } catch (error) {
    return {
      success: false,
      error: formatErrorMessage(error, "Failed to create question"),
    };
  }
}

export async function getQuizQuestionsListAction(): Promise<
  QuizQuestionListItem[]
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  const questions = await getAllQuizQuestions();
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    imageUrl: q.imageUrl,
    imageThumbnailUrl: q.imageThumbnailUrl,
    createdAt: q.createdAt.toISOString(),
    answerCount: q._count.answers,
  }));
}

export async function getQuizQuestionByIdAction(
  id: string
): Promise<QuizQuestionDetail | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  const question = await getQuizQuestionById(id);
  if (!question) {
    return null;
  }

  return {
    id: question.id,
    text: question.text,
    imageUrl: question.imageUrl,
    imageThumbnailUrl: question.imageThumbnailUrl,
    answers: question.answers.map((a) => ({
      id: a.id,
      text: a.text,
      imageUrl: a.imageUrl,
      imageThumbnailUrl: a.imageThumbnailUrl,
      isCorrect: a.isCorrect,
      sortOrder: a.sortOrder,
    })),
  };
}

export async function updateQuestionAction(
  id: string,
  formData: FormData
): Promise<UpdateQuestionResult> {
  const access = await checkAdminAccess(auth);
  if (!access.allowed) {
    return { success: false, error: access.reason };
  }

  const validation = validateQuestionForm(formData);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { text, answers, questionImage: questionImageFile } = validation;

  try {
    const timestamp = Date.now();
    const keepExistingImage = formData.get("keepExistingImage") === "true";
    const qExistingUrl = formData.get("existingImageUrl") as string | null;
    const qExistingThumb = formData.get("existingThumbUrl") as string | null;

    const [questionImageData, answersData] = await Promise.all([
      questionImageFile && questionImageFile.size > 0
        ? processAndUploadImage(
            questionImageFile,
            "quiz/questions",
            `${timestamp}`
          )
        : Promise.resolve(undefined),
      Promise.all(
        answers.map(async (answer, index) => {
          const keepAnswerImage =
            formData.get(`answer-${index}-keepExistingImage`) === "true";
          const answerExistingUrl = formData.get(
            `answer-${index}-existingImageUrl`
          ) as string | null;
          const answerExistingThumb = formData.get(
            `answer-${index}-existingThumbUrl`
          ) as string | null;

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
            ...resolveImageFields(
              imageData,
              keepAnswerImage,
              answerExistingUrl,
              answerExistingThumb
            ),
          };
        })
      ),
    ]);

    const resolvedQuestionImage = resolveImageFields(
      questionImageData,
      keepExistingImage,
      qExistingUrl,
      qExistingThumb
    );
    const clearImage = !(questionImageData || keepExistingImage);

    await updateQuizQuestion(id, {
      text,
      ...resolvedQuestionImage,
      ...(clearImage && {
        imageUrl: null,
        imageThumbnailUrl: null,
        imageBlurHash: null,
      }),
      answers: answersData,
    });

    revalidatePath("/games/quiz/edit");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatErrorMessage(error, "Failed to update question"),
    };
  }
}

export async function deleteQuestionAction(
  id: string
): Promise<DeleteQuestionResult> {
  const access = await checkAdminAccess(auth);
  if (!access.allowed) {
    return { success: false, error: access.reason };
  }

  try {
    await deleteQuizQuestion(id);
    revalidatePath("/games/quiz/edit");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatErrorMessage(error, "Failed to delete question"),
    };
  }
}
