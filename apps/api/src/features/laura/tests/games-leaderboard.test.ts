// @module-tag unit

import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { parseJson } from "@allonfire/core/shared/utils/json";
import type { LeaderboardEntry } from "@allonfire/database/features/apps/laura/memory-score.service";
import { API } from "../../../shared/constants/api";
import { LAURA } from "../constants/laura";
import { leaderboardBodySchema } from "../games/constants/schemas";
import { appWith, BACK_OFFICE_ADMIN, LAURA_USER } from "./laura-app";

const PLAYED = new Date("2026-11-19T08:00:00.000Z");

const entry = (overrides: Partial<LeaderboardEntry>): LeaderboardEntry => ({
  email: "ada@laura.test",
  image: null,
  imageBlurDataUrl: null,
  moves: 8,
  name: "Ada",
  playedAt: PLAYED,
  rank: 1,
  timeMs: 40_000,
  userId: "user-a",
  ...overrides,
});

const read = (app: ReturnType<typeof appWith>) =>
  app.request(API.PATH.LAURA.GAMES.LEADERBOARD);

describe("GET /laura/games/memory/leaderboard", () => {
  it("answers 401 without a Session", async () => {
    expect((await read(appWith({}, null))).status).toBe(
      HTTP.STATUS.UNAUTHORIZED
    );
  });

  it("answers 403 to someone Laura does not let in, and reads nothing", async () => {
    const memoryLeaderboard = vi.fn(() => Promise.resolve([]));
    const res = await read(
      appWith({ memoryLeaderboard }, sessionFor(BACK_OFFICE_ADMIN))
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(memoryLeaderboard).not.toHaveBeenCalled();
  });

  it("lists the top, signs each Avatar, marks the caller and sends each email and no user id", async () => {
    const session = sessionFor(LAURA_USER);
    const memoryLeaderboard = vi.fn(() =>
      Promise.resolve([
        entry({ image: "ada.avif", name: "Ada", userId: "user-a" }),
        entry({
          email: "me@laura.test",
          name: null,
          rank: 2,
          userId: session.user.id,
        }),
      ])
    );
    const res = await read(
      appWith(
        {
          avatarLink: (image) => (image ? `signed:${image}` : null),
          memoryLeaderboard,
        },
        session
      )
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    const text = await res.text();
    const body = leaderboardBodySchema.parse(parseJson(text));
    expect(memoryLeaderboard).toHaveBeenCalledWith(
      LAURA.GAMES.LIMIT.LEADERBOARD_TOP
    );
    expect(body.entries.map(({ image, isMe }) => [image, isMe])).toEqual([
      ["signed:ada.avif", false],
      [null, true],
    ]);
    expect(body.entries.map(({ email }) => email)).toEqual([
      "ada@laura.test",
      "me@laura.test",
    ]);
    expect(body.entries[0]?.playedAt).toBe(PLAYED.toISOString());
    expect(text).not.toContain("user-a");
    expect(text).not.toContain(session.user.id);
  });

  it("passes the caller's own place and everyone's totals through", async () => {
    const me = {
      averageMs: 55_000,
      bestMoves: 9,
      bestTimeMs: 50_000,
      rank: 30,
      totalGames: 4,
    };
    const stats = {
      averageMs: 47_000,
      fastestMs: 30_000,
      fewestMoves: 7,
      totalGames: 10,
      uniquePlayers: 2,
    };
    const session = sessionFor(LAURA_USER);
    const userMemoryStats = vi.fn(() => Promise.resolve(me));
    const res = await read(
      appWith(
        { memoryStats: () => Promise.resolve(stats), userMemoryStats },
        session
      )
    );
    const body = leaderboardBodySchema.parse(await res.json());
    expect([body.me, body.stats]).toEqual([me, stats]);
    expect(userMemoryStats).toHaveBeenCalledWith(session.user.id);
  });

  it("answers an empty Laura with no entries and nulls", async () => {
    const res = await read(appWith({}, sessionFor(LAURA_USER)));
    const body = leaderboardBodySchema.parse(await res.json());
    expect(body.entries).toEqual([]);
    expect(body.me.rank).toBeNull();
    expect(body.stats.fastestMs).toBeNull();
  });

  it("is never cached", async () => {
    const res = await read(appWith({}, sessionFor(LAURA_USER)));
    expect(res.headers.get(HTTP.HEADER.CACHE_CONTROL)).toBe(
      HTTP.CACHE_CONTROL.NO_CACHE
    );
  });
});
