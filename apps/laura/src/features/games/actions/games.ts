"use server";

import type { GameType } from "@allonfire/database";
import {
  getGameStats,
  getLeaderboard,
  getRandomPhotos,
  getUserBestScore,
  getUserGameStats,
  getUserPhotoCount,
  submitGameScore,
} from "@allonfire/database";
import { blurHashToDataURL } from "@allonfire/storage";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type MemoryCard = {
  cardId: string;
  photoId: string;
  thumbnailUrl: string;
  blurDataURL: string;
};

export type MemoryPhotosResult =
  | { success: true; cards: MemoryCard[] }
  | { success: false; error: string; photoCount: number };

export async function getMemoryPhotosAction(): Promise<MemoryPhotosResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  const photoCount = await getUserPhotoCount(session.user.id);
  if (photoCount < 6) {
    return { success: false, error: "NOT_ENOUGH_PHOTOS", photoCount };
  }

  const photos = await getRandomPhotos(session.user.id, 6);

  const cards: MemoryCard[] = [];
  for (const photo of photos) {
    const blurDataURL = blurHashToDataURL(photo.blurHash);
    cards.push(
      {
        cardId: `${photo.id}-a`,
        photoId: photo.id,
        thumbnailUrl: photo.thumbnailUrl,
        blurDataURL,
      },
      {
        cardId: `${photo.id}-b`,
        photoId: photo.id,
        thumbnailUrl: photo.thumbnailUrl,
        blurDataURL,
      }
    );
  }

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cards[i];
    const swap = cards[j];
    if (temp && swap) {
      cards[i] = swap;
      cards[j] = temp;
    }
  }

  return { success: true, cards };
}

export type SubmitScoreResult =
  | { success: true; isNewBest: boolean }
  | { success: false; error: string };

export async function submitScoreAction(data: {
  gameType: GameType;
  timeMs: number;
  moves: number;
}): Promise<SubmitScoreResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  if (data.timeMs <= 0 || data.moves <= 0) {
    return { success: false, error: "Invalid score data" };
  }

  const existingBest = await getUserBestScore(session.user.id, data.gameType);
  const isNewBest =
    !existingBest ||
    data.timeMs < (existingBest.timeMs ?? Number.POSITIVE_INFINITY);

  await submitGameScore({
    userId: session.user.id,
    gameType: data.gameType,
    timeMs: data.timeMs,
    score: data.moves,
    metadata: { pairs: 6, gridSize: "3x4" },
  });

  return { success: true, isNewBest };
}

export type LeaderboardData = {
  scores: Array<{
    id: string;
    userId: string;
    timeMs: number | null;
    score: number | null;
    createdAt: string;
    user: { name: string | null; image: string | null };
  }>;
  stats: {
    totalGames: number;
    uniquePlayers: number;
    avgTimeMs: number | null;
    bestTimeMs: number | null;
  };
  currentUserId: string;
  userStats: { totalGames: number };
  userBestTimeMs: number | null;
};

export async function getBestTimeAction(): Promise<number | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }

  const best = await getUserBestScore(session.user.id, "MEMORY");
  return best?.timeMs ?? null;
}

export async function getLeaderboardAction(
  gameType: GameType
): Promise<LeaderboardData> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  const [scores, stats, userStats, userBest] = await Promise.all([
    getLeaderboard(gameType, 25),
    getGameStats(gameType),
    getUserGameStats(session.user.id),
    getUserBestScore(session.user.id, gameType),
  ]);

  return {
    scores: scores.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
    stats,
    currentUserId: session.user.id,
    userStats: { totalGames: userStats.totalGames },
    userBestTimeMs: userBest?.timeMs ?? null,
  };
}
