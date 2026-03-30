import type { GameType } from "../../generated/prisma/client";
import { prisma } from "../index";

export type LeaderboardEntry = {
  id: string;
  userId: string;
  timeMs: number | null;
  score: number | null;
  createdAt: Date;
  user: { name: string | null; image: string | null };
};

export async function submitGameScore(data: {
  userId: string;
  gameType: GameType;
  timeMs?: number;
  score?: number;
  metadata?: Record<string, unknown>;
}) {
  return await prisma.gameScore.create({
    data: {
      userId: data.userId,
      gameType: data.gameType,
      timeMs: data.timeMs,
      score: data.score,
      metadata: data.metadata
        ? (data.metadata as Record<string, string | number>)
        : undefined,
    },
  });
}

export async function getLeaderboard(
  gameType: GameType,
  limit = 25
): Promise<LeaderboardEntry[]> {
  return await prisma.gameScore.findMany({
    where: { gameType, timeMs: { not: null } },
    distinct: ["userId"],
    orderBy: { timeMs: "asc" },
    take: limit,
    include: { user: { select: { name: true, image: true } } },
  });
}

export async function getUserBestScore(userId: string, gameType: GameType) {
  return await prisma.gameScore.findFirst({
    where: { userId, gameType, timeMs: { not: null } },
    orderBy: { timeMs: "asc" },
  });
}

export async function getUserGameStats(userId: string) {
  const scores = await prisma.gameScore.groupBy({
    by: ["gameType"],
    where: { userId },
    _count: true,
  });

  const totalGames = scores.reduce((sum, s) => sum + s._count, 0);

  return { totalGames, gamesPerType: scores };
}

export async function getGameStats(gameType: GameType) {
  const [totalGames, uniquePlayers, avgTime] = await Promise.all([
    prisma.gameScore.count({ where: { gameType } }),
    prisma.gameScore
      .groupBy({ by: ["userId"], where: { gameType } })
      .then((r) => r.length),
    prisma.gameScore.aggregate({
      where: { gameType, timeMs: { not: null } },
      _avg: { timeMs: true },
      _min: { timeMs: true },
    }),
  ]);

  return {
    totalGames,
    uniquePlayers,
    avgTimeMs: avgTime._avg.timeMs,
    bestTimeMs: avgTime._min.timeMs,
  };
}
