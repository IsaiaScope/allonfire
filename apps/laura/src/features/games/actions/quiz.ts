"use server";

import { checkMutationAccess } from "@allonfire/auth/guard";
import {
  getGlobalBestScore,
  submitGameScore,
} from "@allonfire/database/laura/game-score";
import { getRandomQuizQuestions } from "@allonfire/database/laura/quiz";
import { blurHashToDataURL } from "@allonfire/storage";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import {
  getLeaderboardAction,
  type LeaderboardData,
} from "@/features/games/actions/games";
import { LEADERBOARD_CACHE_TAGS } from "@/features/games/actions/leaderboard-cache";
import { auth } from "@/lib/auth";

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

// ---- Actions ----

export async function getQuizQuestionsAction(): Promise<QuizQuestionsResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  const questions = await getRandomQuizQuestions(10);
  if (questions.length < 10) {
    return {
      error: "NOT_ENOUGH_QUESTIONS",
      questionCount: questions.length,
      success: false,
    };
  }

  return {
    questions: questions.map((q) => ({
      answers: q.answers.map((a) => ({
        id: a.id,
        imageBlurDataURL: a.imageBlurHash
          ? blurHashToDataURL(a.imageBlurHash)
          : null,
        imageThumbnailUrl: a.imageThumbnailUrl,
        imageUrl: a.imageUrl,
        isCorrect: a.isCorrect,
        sortOrder: a.sortOrder,
        text: a.text,
      })),
      id: q.id,
      imageBlurDataURL: q.imageBlurHash
        ? blurHashToDataURL(q.imageBlurHash)
        : null,
      imageThumbnailUrl: q.imageThumbnailUrl,
      imageUrl: q.imageUrl,
      text: q.text,
    })),
    success: true,
  };
}

export async function submitQuizScoreAction(data: {
  timeMs: number;
  correctCount: number;
  totalQuestions: number;
}): Promise<SubmitQuizScoreResult> {
  const access = await checkMutationAccess(auth);
  if (!access.allowed) {
    return { error: access.reason, success: false };
  }
  const { session } = access;

  if (data.timeMs <= 0 || data.correctCount < 0) {
    return { error: "Invalid score data", success: false };
  }

  const globalBest = await getGlobalBestScore("QUIZ");

  await submitGameScore({
    gameType: "QUIZ",
    metadata: { questionCount: data.totalQuestions },
    score: data.correctCount,
    timeMs: data.timeMs,
    userId: session.user.id,
  });

  const isNewBest =
    !globalBest ||
    data.correctCount > (globalBest.score ?? 0) ||
    (data.correctCount === (globalBest.score ?? 0) &&
      data.timeMs < (globalBest.timeMs ?? Number.POSITIVE_INFINITY));

  updateTag(LEADERBOARD_CACHE_TAGS.QUIZ);

  return { isNewBest, success: true };
}

export async function getQuizLeaderboardAction(): Promise<LeaderboardData> {
  return await getLeaderboardAction("QUIZ");
}
