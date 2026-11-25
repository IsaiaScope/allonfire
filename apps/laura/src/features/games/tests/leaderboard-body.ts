import type { LeaderboardBody } from "@allonfire/api/features/laura/games/constants/schemas";

const PLAYED = "2026-11-19T08:00:00.000Z";

/** One leaderboard row as the API answers it. */
export const leaderboardEntry = (
  overrides: Partial<LeaderboardBody["entries"][number]> = {}
): LeaderboardBody["entries"][number] => ({
  email: "ada@laura.test",
  image: null,
  imageBlurDataUrl: null,
  isMe: false,
  moves: 8,
  name: "Ada",
  playedAt: PLAYED,
  rank: 1,
  timeMs: 40_000,
  ...overrides,
});

/** A leaderboard of three players, the second the caller. */
export const leaderboardBody = (
  overrides: Partial<LeaderboardBody> = {}
): LeaderboardBody => ({
  entries: [
    leaderboardEntry({ moves: 7, name: "Ada", rank: 1, timeMs: 38_000 }),
    leaderboardEntry({
      email: "grace@laura.test",
      isMe: true,
      moves: 8,
      name: "Grace",
      rank: 2,
    }),
    leaderboardEntry({
      email: "someone@laura.test",
      moves: 11,
      name: null,
      rank: 3,
      timeMs: 75_000,
    }),
  ],
  me: {
    averageMs: 45_000,
    bestMoves: 8,
    bestTimeMs: 40_000,
    rank: 2,
    totalGames: 3,
  },
  stats: {
    averageMs: 51_000,
    fastestMs: 38_000,
    fewestMoves: 7,
    totalGames: 9,
    uniquePlayers: 3,
  },
  ...overrides,
});

/** A leaderboard nobody has played: no entries, dashes for every figure. */
export const emptyLeaderboardBody = (): LeaderboardBody =>
  leaderboardBody({
    entries: [],
    me: {
      averageMs: null,
      bestMoves: null,
      bestTimeMs: null,
      rank: null,
      totalGames: 0,
    },
    stats: {
      averageMs: null,
      fastestMs: null,
      fewestMoves: null,
      totalGames: 0,
      uniquePlayers: 0,
    },
  });
