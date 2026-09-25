import type { GameType, Prisma } from "../../generated/prisma/client";
import { prisma } from "../client";

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
  timeMs?: number | undefined;
  score?: number | undefined;
  /** What the game reports beside the score; Prisma's own JSON input type. */
  metadata?: Prisma.InputJsonObject | undefined;
}) {
  return await prisma.gameScore.create({
    data: {
      gameType: data.gameType,
      // Json? columns take Prisma.DbNull rather than null, so absent metadata is left out.
      ...(data.metadata && {
        metadata: data.metadata,
      }),
      score: data.score ?? null,
      timeMs: data.timeMs ?? null,
      userId: data.userId,
    },
  });
}

function getScoreOrderBy(gameType: GameType) {
  return gameType === "QUIZ"
    ? [{ score: "desc" as const }, { timeMs: "asc" as const }]
    : [{ score: "asc" as const }, { timeMs: "asc" as const }];
}

export async function getLeaderboard(
  gameType: GameType,
  limit = 25
): Promise<LeaderboardEntry[]> {
  return await prisma.gameScore.findMany({
    distinct: ["userId"],
    include: { user: { select: { image: true, name: true } } },
    orderBy: getScoreOrderBy(gameType),
    take: limit,
    where: { gameType, timeMs: { not: null } },
  });
}

export async function getGlobalBestScore(gameType: GameType) {
  return await prisma.gameScore.findFirst({
    orderBy: getScoreOrderBy(gameType),
    where: { gameType, timeMs: { not: null } },
  });
}

export async function getUserBestScore(userId: string, gameType: GameType) {
  return await prisma.gameScore.findFirst({
    orderBy: getScoreOrderBy(gameType),
    where: { gameType, timeMs: { not: null }, userId },
  });
}

export async function getUserGameStats(userId: string) {
  const scores = await prisma.gameScore.groupBy({
    _count: true,
    by: ["gameType"],
    where: { userId },
  });

  const totalGames = scores.reduce((sum, s) => sum + s._count, 0);

  return { gamesPerType: scores, totalGames };
}

export async function getGameStats(gameType: GameType) {
  const [totalGames, uniquePlayers, avgTime] = await Promise.all([
    prisma.gameScore.count({ where: { gameType } }),
    prisma.gameScore
      .groupBy({ by: ["userId"], where: { gameType } })
      .then((r) => r.length),
    prisma.gameScore.aggregate({
      _avg: { timeMs: true },
      _min: { timeMs: true },
      where: { gameType, timeMs: { not: null } },
    }),
  ]);

  return {
    avgTimeMs: avgTime._avg.timeMs,
    bestTimeMs: avgTime._min.timeMs,
    totalGames,
    uniquePlayers,
  };
}
