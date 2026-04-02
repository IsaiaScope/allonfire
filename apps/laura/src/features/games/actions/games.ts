"use server";

import { checkAppAccess, checkMutationAccess } from "@allonfire/auth/guard";
import type { GameType } from "@allonfire/database";
import {
  getAllRandomPhotos,
  getGlobalBestScore,
  getPhotoCount,
  getUserBestScore,
  getUserGameStats,
  submitGameScore,
} from "@allonfire/database";
import { blurHashToDataURL } from "@allonfire/storage";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import {
  getCachedLeaderboardData,
  LEADERBOARD_CACHE_TAGS,
} from "@/features/games/actions/leaderboard-cache";
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
  await checkAppAccess(auth, "laura");

  const photoCount = await getPhotoCount();
  if (photoCount < 6) {
    return { success: false, error: "NOT_ENOUGH_PHOTOS", photoCount };
  }

  const photos = await getAllRandomPhotos(6);

  if (photos.length < 6) {
    return {
      success: false,
      error: "NOT_ENOUGH_PHOTOS",
      photoCount: photos.length,
    };
  }

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
  const access = await checkMutationAccess(auth);
  if (!access.allowed) {
    return { success: false, error: access.reason };
  }
  const { session } = access;

  if (data.timeMs <= 0 || data.moves <= 0) {
    return { success: false, error: "Invalid score data" };
  }

  const globalBest = await getGlobalBestScore(data.gameType);

  await submitGameScore({
    userId: session.user.id,
    gameType: data.gameType,
    timeMs: data.timeMs,
    score: data.moves,
    metadata: { pairs: 6, gridSize: "3x4" },
  });

  const isNewBest =
    !globalBest ||
    data.moves < (globalBest.score ?? Number.POSITIVE_INFINITY) ||
    (data.moves === (globalBest.score ?? Number.POSITIVE_INFINITY) &&
      data.timeMs < (globalBest.timeMs ?? Number.POSITIVE_INFINITY));

  updateTag(LEADERBOARD_CACHE_TAGS.MEMORY);

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
  userStats: {
    totalGames: number;
    bestTimeMs: number | null;
    bestScore: number | null;
  };
};

export type GlobalBest = { timeMs: number; score: number };

export async function getGlobalBestAction(
  gameType: GameType
): Promise<GlobalBest | null> {
  const best = await getGlobalBestScore(gameType);
  if (!best?.timeMs || best.score == null) {
    return null;
  }
  return { timeMs: best.timeMs, score: best.score };
}

export async function getLeaderboardAction(
  gameType: GameType
): Promise<LeaderboardData> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  const [cached, userGameStats, userBest] = await Promise.all([
    getCachedLeaderboardData(gameType),
    getUserGameStats(session.user.id),
    getUserBestScore(session.user.id, gameType),
  ]);

  const userGamesForType =
    userGameStats.gamesPerType.find((g) => g.gameType === gameType)?._count ??
    0;

  return {
    scores: cached.scores,
    stats: cached.stats,
    currentUserId: session.user.id,
    userStats: {
      totalGames: userGamesForType,
      bestTimeMs: userBest?.timeMs ?? null,
      bestScore: userBest?.score ?? null,
    },
  };
}
