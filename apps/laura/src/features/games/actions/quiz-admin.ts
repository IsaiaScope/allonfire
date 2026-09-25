"use server";

// Quiz question management (ADMIN). Gameplay actions live in quiz.ts.
import { checkAdminAccess } from "@allonfire/auth/guard";
import {
  createQuizQuestion,
  deleteQuizQuestion,
  getAllQuizQuestions,
  getQuizQuestionById,
  updateQuizQuestion,
} from "@allonfire/database/features/laura/quiz.service";
import { formatErrorMessage } from "@allonfire/utils/helpers/error";
import { revalidatePath } from "next/cache";
import {
  processAndUploadImage,
  validateQuestionForm,
} from "@/features/games/actions/quiz-form";
import { auth } from "@/lib/auth";

// ---- Types ----

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

export async function createQuestionAction(
  formData: FormData
): Promise<CreateQuestionResult> {
  const access = await checkAdminAccess(auth);
  if (!access.allowed) {
    return { error: access.reason, success: false };
  }
  const { session } = access;

  const validation = validateQuestionForm(formData);
  if (!validation.valid) {
    return { error: validation.error, success: false };
  }

  const { text, answers, questionImage } = validation;

  try {
    const timestamp = Date.now();

    const [questionImageData, answersData] = await Promise.all([
      questionImage
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
            isCorrect: answer.isCorrect,
            sortOrder: answer.sortOrder,
            text: answer.text,
            ...imageData,
          };
        })
      ),
    ]);

    const question = await createQuizQuestion({
      createdBy: session.user.id,
      text,
      ...questionImageData,
      answers: answersData,
    });

    revalidatePath("/games/quiz/edit", "layout");
    return { questionId: question.id, success: true };
  } catch (error) {
    return {
      error: formatErrorMessage(error, "Failed to create question"),
      success: false,
    };
  }
}

export async function getQuizQuestionsListAction(): Promise<
  QuizQuestionListItem[]
> {
  const access = await checkAdminAccess(auth);
  if (!access.allowed) {
    throw new Error(access.reason);
  }

  const questions = await getAllQuizQuestions();
  return questions.map((q) => ({
    answerCount: q._count.answers,
    createdAt: q.createdAt.toISOString(),
    id: q.id,
    imageThumbnailUrl: q.imageThumbnailUrl,
    imageUrl: q.imageUrl,
    text: q.text,
  }));
}

export async function getQuizQuestionByIdAction(
  id: string
): Promise<QuizQuestionDetail | null> {
  const access = await checkAdminAccess(auth);
  if (!access.allowed) {
    throw new Error(access.reason);
  }

  const question = await getQuizQuestionById(id);
  if (!question) {
    return null;
  }

  return {
    answers: question.answers.map((a) => ({
      id: a.id,
      imageThumbnailUrl: a.imageThumbnailUrl,
      imageUrl: a.imageUrl,
      isCorrect: a.isCorrect,
      sortOrder: a.sortOrder,
      text: a.text,
    })),
    id: question.id,
    imageThumbnailUrl: question.imageThumbnailUrl,
    imageUrl: question.imageUrl,
    text: question.text,
  };
}

export async function updateQuestionAction(
  id: string,
  formData: FormData
): Promise<UpdateQuestionResult> {
  const access = await checkAdminAccess(auth);
  if (!access.allowed) {
    return { error: access.reason, success: false };
  }

  const validation = validateQuestionForm(formData);
  if (!validation.valid) {
    return { error: validation.error, success: false };
  }

  const { text, answers, questionImage } = validation;

  try {
    const timestamp = Date.now();
    const keepExistingImage = formData.get("keepExistingImage") === "true";

    const [questionImageData, answersData] = await Promise.all([
      questionImage
        ? processAndUploadImage(questionImage, "quiz/questions", `${timestamp}`)
        : Promise.resolve(undefined),
      Promise.all(
        answers.map(async (answer, index) => {
          const kept = formData.get(`answer-${index}-existingImageUrl`);
          const keepImageUrl = typeof kept === "string" ? kept : undefined;

          const imageData = answer.image
            ? await processAndUploadImage(
                answer.image,
                "quiz/answers",
                `${timestamp}-${index}`
              )
            : undefined;

          return {
            isCorrect: answer.isCorrect,
            sortOrder: answer.sortOrder,
            text: answer.text,
            ...imageData,
            keepImageUrl,
          };
        })
      ),
    ]);

    // A kept image is left out, so its stored columns stay as they are.
    const clearImage = !(questionImageData || keepExistingImage);

    await updateQuizQuestion(id, {
      text,
      ...questionImageData,
      ...(clearImage && {
        imageBlurHash: null,
        imageThumbnailUrl: null,
        imageUrl: null,
      }),
      answers: answersData,
    });

    revalidatePath("/games/quiz/edit", "layout");
    return { success: true };
  } catch (error) {
    return {
      error: formatErrorMessage(error, "Failed to update question"),
      success: false,
    };
  }
}

export async function deleteQuestionAction(
  id: string
): Promise<DeleteQuestionResult> {
  const access = await checkAdminAccess(auth);
  if (!access.allowed) {
    return { error: access.reason, success: false };
  }

  try {
    await deleteQuizQuestion(id);
    revalidatePath("/games/quiz/edit", "layout");
    return { success: true };
  } catch (error) {
    return {
      error: formatErrorMessage(error, "Failed to delete question"),
      success: false,
    };
  }
}
