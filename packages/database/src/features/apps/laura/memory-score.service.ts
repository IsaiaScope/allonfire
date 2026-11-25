import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../prisma/client";
import { MEMORY_SCORE } from "./constants/memory-score";
import { lockUserScores } from "./utils/lock-user-scores";
import { refusedByForeignKey } from "./utils/refused-by-foreign-key";

export type MemoryScore = { moves: number; timeMs: number };
export type LeaderboardEntry = MemoryScore & {
  /** Shown under the name: Laura is private, her Members know each other. */
  email: string;
  /** `User.image`, raw: the API signs it. */
  image: string | null;
  imageBlurDataUrl: string | null;
  name: string | null;
  playedAt: Date;
  /** 1-based, without ties. */
  rank: number;
  userId: string;
};
export type MemoryStats = {
  averageMs: number | null;
  fastestMs: number | null;
  fewestMoves: number | null;
  totalGames: number;
  uniquePlayers: number;
};
export type UserMemoryStats = {
  /** The mean time of all their games. */
  averageMs: number | null;
  /** The fewest moves of any of their games. */
  bestMoves: number | null;
  /** The fastest time of any of their games, which need not be the one with the fewest moves. */
  bestTimeMs: number | null;
  rank: number | null;
  totalGames: number;
};
type SubmittedScore = {
  id: string;
  isGlobalBest: boolean;
  isPersonalBest: boolean;
  rank: number;
};
/** What saving a game came to: saved, or refused with nothing written. */
export type SubmitOutcome =
  | { saved: SubmittedScore }
  | {
      /** The User has no Laura Profile any more (a Member revoked mid-game). */
      refused: "noProfile";
    }
  | {
      /** The game ends sooner after the User's last save than it takes to play: it cannot have been played. */
      refused: "tooSoon";
      /** How long until it could have been. */
      retryAfterMs: number;
    };

/**
 * The best game of each Laura Member, ranked: fewer moves first, then the
 * faster time, then the earlier game. A score hangs on the Member's Profile,
 * which goes with their Membership, so someone who left is never listed.
 */
const RANKED = Prisma.sql`
  WITH best AS (
    SELECT DISTINCT ON ("userId") "userId", "score" AS moves, "timeMs", "createdAt"
    FROM "laura"."MemoryScore"
    ORDER BY "userId", "score", "timeMs", "createdAt"
  ),
  ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY moves, "timeMs", "createdAt", "userId") AS rank
    FROM best
  )
`;

type RankedRow = {
  createdAt: Date;
  email: string;
  image: string | null;
  imageBlurDataUrl: string | null;
  moves: number;
  name: string | null;
  rank: bigint;
  timeMs: number;
  userId: string;
};

/** The rank of a User's best game, or null when they have none. */
async function rankOf(
  db: Pick<typeof prisma, "$queryRaw">,
  userId: string
): Promise<number | null> {
  const rows = await db.$queryRaw<{ rank: bigint }[]>`
    ${RANKED} SELECT rank FROM ranked WHERE "userId" = ${userId}
  `;
  return rows[0] ? Number(rows[0].rank) : null;
}

/** The game, written under the User's lock (or the one already saved, when sent again); says what rank it earned. */
const saveScore = async (
  tx: Prisma.TransactionClient,
  { moves, timeMs, userId }: MemoryScore & { userId: string }
): Promise<SubmitOutcome> => {
  await lockUserScores(tx, userId);
  // The same game sent again: its answer was lost and the visitor retried.
  const saved = await tx.memoryScore.findFirst({
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, id: true },
    where: {
      createdAt: {
        gte: new Date(Date.now() - MEMORY_SCORE.LIMIT.REPEAT_WINDOW_MS),
      },
      moves,
      timeMs,
      userId,
    },
  });
  // A game takes `timeMs` from its first card, which turns after the last
  // save, so it cannot end sooner than that after it.
  if (!saved) {
    const last = await tx.memoryScore.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
      where: { userId },
    });
    const retryAfterMs = last
      ? timeMs - (Date.now() - last.createdAt.getTime())
      : 0;
    if (retryAfterMs > 0) {
      return { refused: "tooSoon", retryAfterMs };
    }
  }
  // A retry is told as the first answer was: against the games before it.
  const previous = await tx.memoryScore.findFirst({
    orderBy: [{ moves: "asc" }, { timeMs: "asc" }],
    select: { moves: true, timeMs: true },
    where: { userId, ...(saved && { createdAt: { lt: saved.createdAt } }) },
  });
  const id =
    saved?.id ??
    (
      await tx.memoryScore.create({
        data: { moves, timeMs, userId },
        select: { id: true },
      })
    ).id;
  const isPersonalBest =
    !previous ||
    moves < previous.moves ||
    (moves === previous.moves && timeMs < previous.timeMs);
  const rank = (await rankOf(tx, userId)) ?? 1;
  return {
    saved: {
      id,
      isGlobalBest: isPersonalBest && rank === 1,
      isPersonalBest,
      rank,
    },
  };
};

/**
 * Saves a finished game for a User who has a Laura Profile; says what rank it
 * earned. Refused, with nothing written, when the Profile is gone (a Member
 * revoked after it was checked: it went with the Membership) or the game
 * cannot have been played since the last one. A User's saves run one after the
 * other, so a best is claimed once, and the same game sent again is answered
 * with the one saved.
 */
export async function submitMemoryScore(
  score: MemoryScore & { userId: string }
): Promise<SubmitOutcome> {
  try {
    return await prisma.$transaction((tx) => saveScore(tx, score));
  } catch (error) {
    if (refusedByForeignKey(error)) {
      return { refused: "noProfile" };
    }
    throw error;
  }
}

/** The `limit` best players, best first. */
export async function memoryLeaderboard(
  limit: number
): Promise<LeaderboardEntry[]> {
  const rows = await prisma.$queryRaw<RankedRow[]>`
    ${RANKED}
    SELECT r."userId", r.moves, r."timeMs", r."createdAt", r.rank,
      u.name, u.email, u.image, u."imageBlurDataUrl"
    FROM ranked r JOIN "auth"."User" u ON u.id = r."userId"
    WHERE r.rank <= ${limit}
    ORDER BY r.rank
  `;
  return rows.map(
    ({
      createdAt,
      email,
      image,
      imageBlurDataUrl,
      moves,
      name,
      rank,
      timeMs,
      userId,
    }) => ({
      email,
      image,
      imageBlurDataUrl,
      moves,
      name,
      playedAt: createdAt,
      rank: Number(rank),
      timeMs,
      userId,
    })
  );
}

/** A mean time in whole milliseconds, or `null` when there is no game. */
const roundedMs = (mean: number | null) =>
  mean === null ? null : Math.round(mean);

/** Everyone's games: how many, by how many players, the fewest moves, the quickest and the mean. */
export async function memoryStats(): Promise<MemoryStats> {
  const [totalGames, uniquePlayers, times] = await Promise.all([
    prisma.memoryScore.count(),
    prisma.memoryScore
      .groupBy({ by: ["userId"] })
      .then((groups) => groups.length),
    prisma.memoryScore.aggregate({
      _avg: { timeMs: true },
      _min: { moves: true, timeMs: true },
    }),
  ]);
  return {
    averageMs: roundedMs(times._avg.timeMs),
    fastestMs: times._min.timeMs,
    fewestMoves: times._min.moves,
    totalGames,
    uniquePlayers,
  };
}

/** One player's fewest moves and fastest time (each from whichever game holds it), their mean time, their rank among everyone and how many games they played. */
export async function userMemoryStats(
  userId: string
): Promise<UserMemoryStats> {
  const [totalGames, figures, rank] = await Promise.all([
    prisma.memoryScore.count({ where: { userId } }),
    prisma.memoryScore.aggregate({
      _avg: { timeMs: true },
      _min: { moves: true, timeMs: true },
      where: { userId },
    }),
    rankOf(prisma, userId),
  ]);
  return {
    averageMs: roundedMs(figures._avg.timeMs),
    bestMoves: figures._min.moves,
    bestTimeMs: figures._min.timeMs,
    rank,
    totalGames,
  };
}
