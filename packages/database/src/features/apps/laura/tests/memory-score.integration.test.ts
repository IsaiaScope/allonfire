// @module-tag integration

import { UNIT } from "@allonfire/core/shared/constants/units";
import { prisma } from "../../../prisma/client";
import {
  memoryLeaderboard,
  memoryStats,
  submitMemoryScore,
  userMemoryStats,
} from "../memory-score.service";
import { ensureLauraProfile } from "../profile.service";
import { resetScope } from "./laura-test-data";

// Runs against the run's Test database: the scores table is this file's alone.
const PREFIX = "memory-score-test-";
const SCOPE = { domain: "memory-score.test", prefix: PREFIX };
const A = `${PREFIX}a`;
const B = `${PREFIX}b`;
const C = `${PREFIX}c`;
const OUTSIDER = `${PREFIX}outsider`;
const TOP = 25;
/** Well outside the window in which a game sent again is the same game. */
const LONG_AGO_MS = 10 * UNIT.MS_PER_MINUTE;

const play = (
  userId: string,
  moves: number,
  timeMs: number,
  createdAt?: Date
) =>
  prisma.memoryScore.create({
    data: { ...(createdAt && { createdAt }), moves, timeMs, userId },
  });

beforeEach(async () => {
  await resetScope(SCOPE, { ids: [A, B, C, OUTSIDER], members: [A, B, C] });
  await Promise.all([A, B, C].map((id) => ensureLauraProfile(id)));
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe("memoryLeaderboard", () => {
  it("ranks by fewest moves, then the faster time", async () => {
    await play(A, 8, 40_000);
    await play(B, 7, 90_000);
    await play(C, 7, 60_000);
    const entries = await memoryLeaderboard(TOP);
    expect(entries.map(({ userId, rank }) => [userId, rank])).toEqual([
      [C, 1],
      [B, 2],
      [A, 3],
    ]);
  });

  it("lists each Member once, by their best game", async () => {
    await play(A, 9, 30_000);
    await play(A, 8, 50_000);
    const entries = await memoryLeaderboard(TOP);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ moves: 8, timeMs: 50_000, userId: A });
  });

  it("ranks an equal game earlier first", async () => {
    await play(B, 7, 60_000, new Date("2026-02-01"));
    await play(A, 7, 60_000, new Date("2026-01-01"));
    const entries = await memoryLeaderboard(TOP);
    expect(entries.map(({ userId }) => userId)).toEqual([A, B]);
  });

  it("cuts the list, not the rank", async () => {
    await play(A, 7, 60_000);
    await play(B, 8, 60_000);
    await play(C, 9, 60_000);
    expect(await memoryLeaderboard(2)).toHaveLength(2);
    expect((await userMemoryStats(C)).rank).toBe(3);
  });

  it("leaves out someone who left Laura and does not count their games", async () => {
    await play(A, 8, 40_000);
    await prisma.membership.deleteMany({ where: { userId: A } });
    expect(await memoryLeaderboard(TOP)).toEqual([]);
    expect((await memoryStats()).totalGames).toBe(0);
  });

  it("carries the name, the email and the Avatar of the player", async () => {
    await prisma.user.update({
      data: { image: "avatar.avif", imageBlurDataUrl: "blur", name: "Ada" },
      where: { id: A },
    });
    await play(A, 8, 40_000);
    expect((await memoryLeaderboard(TOP))[0]).toMatchObject({
      email: `${A}@${SCOPE.domain}`,
      image: "avatar.avif",
      imageBlurDataUrl: "blur",
      name: "Ada",
    });
  });
});

/** A game saved, answered as saved: a refusal fails the test that did not expect one. */
const submit = async (userId: string, moves: number, timeMs: number) => {
  const outcome = await submitMemoryScore({ moves, timeMs, userId });
  if (!("saved" in outcome)) {
    throw new Error(`refused: ${outcome.refused}`);
  }
  return outcome.saved;
};

/** A game played long before the next one, so the next is not too soon after it. */
const playedEarlier = (userId: string, moves: number, timeMs: number) =>
  play(userId, moves, timeMs, new Date(Date.now() - LONG_AGO_MS));

describe("submitMemoryScore", () => {
  it("makes a first game a personal and global best at rank 1", async () => {
    expect(await submit(A, 8, 40_000)).toMatchObject({
      isGlobalBest: true,
      isPersonalBest: true,
      rank: 1,
    });
  });

  it("makes a worse later game neither", async () => {
    await playedEarlier(A, 8, 40_000);
    expect(await submit(A, 9, 30_000)).toMatchObject({
      isGlobalBest: false,
      isPersonalBest: false,
      rank: 1,
    });
  });

  it("makes a strictly better game both", async () => {
    await playedEarlier(A, 8, 40_000);
    expect(await submit(A, 7, 90_000)).toMatchObject({
      isGlobalBest: true,
      isPersonalBest: true,
      rank: 1,
    });
  });

  it("makes a game equal to the best, played earlier, neither", async () => {
    await playedEarlier(A, 8, 40_000);
    expect(await submit(A, 8, 40_000)).toMatchObject({
      isGlobalBest: false,
      isPersonalBest: false,
    });
  });

  it("lets a better game of a second User take rank 1 and move the first to 2", async () => {
    await submit(A, 8, 40_000);
    expect(await submit(B, 7, 40_000)).toMatchObject({
      isGlobalBest: true,
      rank: 1,
    });
    expect((await userMemoryStats(A)).rank).toBe(2);
  });

  it("refuses a game no player can produce", async () => {
    await expect(
      prisma.memoryScore.create({
        data: { moves: 5, timeMs: 40_000, userId: A },
      })
    ).rejects.toThrow();
  });

  it("saves nothing and answers noProfile for someone with no Profile (a Member revoked mid-game)", async () => {
    expect(
      await submitMemoryScore({ moves: 8, timeMs: 40_000, userId: OUTSIDER })
    ).toEqual({ refused: "noProfile" });
    expect(
      await prisma.memoryScore.count({ where: { userId: OUTSIDER } })
    ).toBe(0);
  });

  it("answers a game sent again (a retry after a lost answer) with the one already saved", async () => {
    const first = await submit(A, 8, 40_000);
    expect(await submit(A, 8, 40_000)).toEqual(first);
    expect(await prisma.memoryScore.count({ where: { userId: A } })).toBe(1);
  });

  it("saves one game, not four, when the same one is sent four times at once", async () => {
    const answers = await Promise.all(
      Array.from({ length: 4 }, () => submit(A, 8, 40_000))
    );
    expect(new Set(answers.map(({ id }) => id)).size).toBe(1);
    expect(await prisma.memoryScore.count({ where: { userId: A } })).toBe(1);
  });

  it("saves a game that equals an older one, as a new game", async () => {
    await playedEarlier(A, 8, 40_000);
    await submit(A, 8, 40_000);
    expect(await prisma.memoryScore.count({ where: { userId: A } })).toBe(2);
  });

  it("keeps a retry told as the personal best it was, even with a worse game saved since", async () => {
    const first = await submit(A, 8, 40_000);
    await play(A, 9, 30_000, new Date(Date.now() + 1000));
    const again = await submit(A, 8, 40_000);
    expect(again.id).toBe(first.id);
    expect(again.isPersonalBest).toBe(true);
  });

  it("refuses a game that ends sooner after the last save than it takes to play, and says how long to wait", async () => {
    await submit(A, 8, 40_000);
    const outcome = await submitMemoryScore({
      moves: 9,
      timeMs: 30_000,
      userId: A,
    });
    expect(outcome).toEqual({
      refused: "tooSoon",
      retryAfterMs: expect.any(Number),
    });
    if ("refused" in outcome && outcome.refused === "tooSoon") {
      expect(outcome.retryAfterMs).toBeGreaterThan(0);
      expect(outcome.retryAfterMs).toBeLessThanOrEqual(30_000);
    }
    expect(await prisma.memoryScore.count({ where: { userId: A } })).toBe(1);
  });

  it("takes a game once as much time has passed since the last save as it lasted", async () => {
    await play(A, 8, 40_000, new Date(Date.now() - 31_000));
    expect(await submit(A, 9, 30_000)).toMatchObject({ isPersonalBest: false });
  });

  it("counts the time since a User's own last save, never another's", async () => {
    await submit(A, 8, 40_000);
    expect(await submit(B, 9, 30_000)).toMatchObject({ rank: 2 });
  });
});

describe("memoryStats", () => {
  it("counts games and players and reads the fewest moves, the fastest and the average time", async () => {
    await play(A, 9, 30_000);
    await play(A, 8, 50_000);
    await play(B, 7, 61_000);
    expect(await memoryStats()).toEqual({
      averageMs: 47_000,
      fastestMs: 30_000,
      fewestMoves: 7,
      totalGames: 3,
      uniquePlayers: 2,
    });
  });

  it("is empty when nobody played", async () => {
    expect(await memoryStats()).toEqual({
      averageMs: null,
      fastestMs: null,
      fewestMoves: null,
      totalGames: 0,
      uniquePlayers: 0,
    });
  });
});

describe("userMemoryStats", () => {
  it("reads a player's fewest moves and fastest time (from different games), average time, rank and games", async () => {
    await play(A, 9, 30_000);
    await play(A, 8, 50_000);
    expect(await userMemoryStats(A)).toEqual({
      averageMs: 40_000,
      bestMoves: 8,
      bestTimeMs: 30_000,
      rank: 1,
      totalGames: 2,
    });
  });

  it("is empty for someone who has not played", async () => {
    expect(await userMemoryStats(B)).toEqual({
      averageMs: null,
      bestMoves: null,
      bestTimeMs: null,
      rank: null,
      totalGames: 0,
    });
  });
});
