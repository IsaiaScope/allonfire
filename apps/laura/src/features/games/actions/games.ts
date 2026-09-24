"use server";

import { checkAppAccess, checkMutationAccess } from "@allonfire/auth/guard";
import type { GameType } from "@allonfire/database";
import {
  getGlobalBestScore,
  getUserBestScore,
  getUserGameStats,
  submitGameScore,
} from "@allonfire/database/laura/game-score";
import {
  getAllRandomPhotos,
  getPhotoCount,
} from "@allonfire/database/laura/photo";
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
    return { error: "NOT_ENOUGH_PHOTOS", photoCount, success: false };
  }

  const photos = await getAllRandomPhotos(6);

  if (photos.length < 6) {
    return {
      error: "NOT_ENOUGH_PHOTOS",
      photoCount: photos.length,
      success: false,
    };
  }

  const cards: MemoryCard[] = [];
  for (const photo of photos) {
    const blurDataURL = blurHashToDataURL(photo.blurHash);
    cards.push(
      {
        blurDataURL,
        cardId: `${photo.id}-a`,
        photoId: photo.id,
        thumbnailUrl: photo.thumbnailUrl,
      },
      {
        blurDataURL,
        cardId: `${photo.id}-b`,
        photoId: photo.id,
        thumbnailUrl: photo.thumbnailUrl,
      }
    );
  }

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cards[i];
    const swap = cards[j];
    if (temp && swap) {
      cards[i] = swap;
      cards[j] = temp;
    }
  }

  return { cards, success: true };
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
    return { error: access.reason, success: false };
  }
  const { session } = access;

  if (data.timeMs <= 0 || data.moves <= 0) {
    return { error: "Invalid score data", success: false };
  }

  const globalBest = await getGlobalBestScore(data.gameType);

  await submitGameScore({
    gameType: data.gameType,
    metadata: { gridSize: "3x4", pairs: 6 },
    score: data.moves,
    timeMs: data.timeMs,
    userId: session.user.id,
  });

  const isNewBest =
    !globalBest ||
    data.moves < (globalBest.score ?? Number.POSITIVE_INFINITY) ||
    (data.moves === (globalBest.score ?? Number.POSITIVE_INFINITY) &&
      data.timeMs < (globalBest.timeMs ?? Number.POSITIVE_INFINITY));

  updateTag(LEADERBOARD_CACHE_TAGS.MEMORY);

  return { isNewBest, success: true };
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
  if (!best?.timeMs || best.score === null) {
    return null;
  }
  return { score: best.score, timeMs: best.timeMs };
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
    currentUserId: session.user.id,
    scores: cached.scores,
    stats: cached.stats,
    userStats: {
      bestScore: userBest?.score ?? null,
      bestTimeMs: userBest?.timeMs ?? null,
      totalGames: userGamesForType,
    },
  };
}
