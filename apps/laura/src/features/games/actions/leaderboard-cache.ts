import type { GameType } from "@allonfire/database";
import { getGameStats, getLeaderboard } from "@allonfire/database";
import { cacheTag } from "next/cache";

export const LEADERBOARD_CACHE_TAGS = {
  MEMORY: "leaderboard-memory",
  QUIZ: "leaderboard-quiz",
} as const;

export async function getCachedLeaderboardData(gameType: GameType) {
  "use cache";
  cacheTag(LEADERBOARD_CACHE_TAGS[gameType]);

  const [scores, stats] = await Promise.all([
    getLeaderboard(gameType, 25),
    getGameStats(gameType),
  ]);

  return {
    scores: scores.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
    stats,
  };
}
