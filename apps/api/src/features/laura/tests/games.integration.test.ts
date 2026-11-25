// @module-tag integration

import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, Role } from "@allonfire/database/enums";
import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import { createImages } from "@allonfire/database/features/image/image.service";
import { prisma } from "@allonfire/database/features/prisma/client";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";
import { problemOf } from "../../../shared/tests/problem-of";
import { seedUser } from "../../../shared/tests/seed-user";
import { cookieFor, ORIGIN, type TestApp } from "../../../shared/tests/sign-in";
import { auth } from "../../auth/auth";
import { LAURA } from "../constants/laura";
import {
  deckBodySchema,
  leaderboardBodySchema,
  scoreBodySchema,
} from "../games/constants/schemas";
import { lauraDeps } from "../laura-deps";

// Runs against DATABASE_URL, shared with other test files: the players live in
// their own domain, and the Images the deck test makes share a key prefix.
const DOMAIN = "laura-games.test";
const FIRST = `first@${DOMAIN}`;
const SECOND = `second@${DOMAIN}`;
const KEY_PREFIX = "laura-games-test-";
const { DECK, LEADERBOARD, SCORES } = API.PATH.LAURA.GAMES;
const SLOWEST_GOOD_MOVES = 8;
const GOOD = {
  moves: SLOWEST_GOOD_MOVES,
  timeMs: SLOWEST_GOOD_MOVES * MEMORY_RULE.TIME.MIN_MS_PER_MOVE,
};

let app: TestApp;
const removeOwn = async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await prisma.image.deleteMany({ where: { key: { startsWith: KEY_PREFIX } } });
};

beforeEach(async () => {
  app = createApp(appDeps({ auth, laura: lauraDeps }));
  await removeOwn();
});

afterAll(async () => {
  await removeOwn();
  await prisma.$disconnect();
});

const player = (email: string) =>
  seedUser(email, "player", [{ app: App.LAURA, role: Role.USER }]);

const request = (path: string, cookie: string, body?: unknown) =>
  app.request(path, {
    headers: {
      cookie,
      origin: ORIGIN,
      ...(body !== undefined && {
        [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
      }),
    },
    ...(body !== undefined && {
      body: stringifyJson(body),
      method: HTTP.METHOD.POST,
    }),
  });

const leaderboardFor = async (cookie: string) =>
  leaderboardBodySchema.parse(
    await (await request(LEADERBOARD, cookie)).json()
  );

describe("the Memory deck", () => {
  it("draws six distinct Images placed in Laura", async () => {
    await createImages(
      Array.from({ length: MEMORY_RULE.PAIRS + 2 }, (_, index) => ({
        alt: { en: `Deck ${index}`, it: `Mazzo ${index}` },
        apps: [App.LAURA],
        blurDataUrl: "data:image/webp;base64,AAAA",
        bytes: 1000,
        height: 600,
        key: `${KEY_PREFIX}${index}.avif`,
        uploadedBy: null,
        width: 800,
      }))
    );
    const cookie = await cookieFor(app, FIXTURE.USER.LAURA.USER);
    const res = await request(DECK, cookie);
    expect(res.status).toBe(HTTP.STATUS.OK);
    const { images, needed } = deckBodySchema.parse(await res.json());
    expect(needed).toBe(MEMORY_RULE.PAIRS);
    expect(images).toHaveLength(MEMORY_RULE.PAIRS);
    const ids = images.map(({ id }) => id);
    expect(new Set(ids).size).toBe(MEMORY_RULE.PAIRS);
    const inLaura = await prisma.imageApp.count({
      where: { app: App.LAURA, imageId: { in: ids } },
    });
    expect(inLaura).toBe(MEMORY_RULE.PAIRS);
  });

  it("refuses a Back Office Admin who is no Laura Member", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    expect((await request(DECK, cookie)).status).toBe(HTTP.STATUS.FORBIDDEN);
    expect((await request(LEADERBOARD, cookie)).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect((await request(SCORES, cookie, GOOD)).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
  });
});

describe("playing and the leaderboard", () => {
  it("shows the game just played, the caller marked", async () => {
    const cookie = await cookieFor(app, await player(FIRST));
    const saved = await request(SCORES, cookie, GOOD);
    expect(saved.status).toBe(HTTP.STATUS.CREATED);
    expect(scoreBodySchema.parse(await saved.json())).toMatchObject({
      isGlobalBest: true,
      isPersonalBest: true,
      rank: 1,
    });
    const { entries, me } = await leaderboardFor(cookie);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ isMe: true, moves: GOOD.moves });
    expect(me).toMatchObject({ bestMoves: GOOD.moves, rank: 1, totalGames: 1 });
  });

  it("lets a better game of a second player take rank 1, and the mark follows the caller", async () => {
    const first = await cookieFor(app, await player(FIRST));
    const second = await cookieFor(app, await player(SECOND));
    await request(SCORES, first, GOOD);
    const better = await request(SCORES, second, {
      moves: GOOD.moves - 1,
      timeMs: GOOD.timeMs,
    });
    expect(scoreBodySchema.parse(await better.json()).rank).toBe(1);
    const seenByFirst = await leaderboardFor(first);
    expect(seenByFirst.entries.map(({ isMe }) => isMe)).toEqual([false, true]);
    expect(seenByFirst.me.rank).toBe(2);
  });

  it("refuses an impossible game with a coded 400 and leaves the leaderboard as it was", async () => {
    const cookie = await cookieFor(app, await player(FIRST));
    const res = await request(SCORES, cookie, { moves: 3, timeMs: 60_000 });
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect((await problemOf(res)).code).toBe(
      LAURA.GAMES.ERROR_CODE.IMPLAUSIBLE_SCORE
    );
    expect((await leaderboardFor(cookie)).entries).toEqual([]);
  });

  it("refuses a malformed body", async () => {
    const cookie = await cookieFor(app, await player(FIRST));
    const res = await request(SCORES, cookie, { moves: "8", timeMs: 1 });
    expect((await problemOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
  });
});
