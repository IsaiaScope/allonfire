// @module-tag unit

import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import { API } from "../../../shared/constants/api";
import { problemOf } from "../../../shared/tests/problem-of";
import { translate } from "../../i18n/translate";
import { LAURA } from "../constants/laura";
import { appWith, BACK_OFFICE_ADMIN, LAURA_USER } from "./laura-app";

const GOOD = { moves: 8, timeMs: 8 * MEMORY_RULE.TIME.MIN_MS_PER_MOVE };
const SAVED = {
  id: "score-1",
  isGlobalBest: false,
  isPersonalBest: true,
  rank: 3,
};

const post = <T>(app: ReturnType<typeof appWith>, body: T & Json<T>) =>
  app.request(API.PATH.LAURA.GAMES.SCORES, {
    body: stringifyJson<T>(body),
    headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
    method: HTTP.METHOD.POST,
  });

describe("POST /laura/games/memory/scores", () => {
  it("answers 401 without a Session", async () => {
    expect((await post(appWith({}, null), GOOD)).status).toBe(
      HTTP.STATUS.UNAUTHORIZED
    );
  });

  it("answers 403 to someone Laura does not let in, and writes nothing", async () => {
    const submitMemoryScore = vi.fn(() => Promise.resolve({ saved: SAVED }));
    const res = await post(
      appWith({ submitMemoryScore }, sessionFor(BACK_OFFICE_ADMIN)),
      GOOD
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(submitMemoryScore).not.toHaveBeenCalled();
  });

  it("refuses a Session that is gone or a User Laura no longer lets in, even with a fresh-looking cookie", async () => {
    const submitMemoryScore = vi.fn(() => Promise.resolve({ saved: SAVED }));
    const res = await post(
      appWith(
        { canPlay: () => Promise.resolve(false), submitMemoryScore },
        sessionFor(LAURA_USER)
      ),
      GOOD
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(submitMemoryScore).not.toHaveBeenCalled();
  });

  it("refuses a Member whose Profile went while their game was saved", async () => {
    const res = await post(
      appWith(
        {
          submitMemoryScore: () => Promise.resolve({ refused: "noProfile" }),
        },
        sessionFor(LAURA_USER)
      ),
      GOOD
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("answers 429 RATE_LIMITED, with the seconds to wait, to a game that ends sooner than it takes to play", async () => {
    const res = await post(
      appWith(
        {
          submitMemoryScore: () =>
            Promise.resolve({ refused: "tooSoon", retryAfterMs: 12_300 }),
        },
        sessionFor(LAURA_USER)
      ),
      GOOD
    );
    expect(res.status).toBe(HTTP.STATUS.TOO_MANY_REQUESTS);
    const problem = await problemOf(res);
    expect(problem.code).toBe(ERROR.CODE.RATE_LIMITED);
    expect(problem.detail).toBe(
      translate(ERROR.CODE.RATE_LIMITED, I18N.LOCALE.EN_US, { seconds: 13 })
    );
  });

  it("refuses a Member whose Profile cannot be made", async () => {
    const submitMemoryScore = vi.fn(() => Promise.resolve({ saved: SAVED }));
    const res = await post(
      appWith(
        { ensureProfile: () => Promise.resolve(false), submitMemoryScore },
        sessionFor(LAURA_USER)
      ),
      GOOD
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(submitMemoryScore).not.toHaveBeenCalled();
  });

  it("saves a good game for the Session's User and answers 201", async () => {
    const submitMemoryScore = vi.fn(() => Promise.resolve({ saved: SAVED }));
    const session = sessionFor(LAURA_USER);
    const res = await post(appWith({ submitMemoryScore }, session), GOOD);
    expect(res.status).toBe(HTTP.STATUS.CREATED);
    expect(await res.json()).toEqual(SAVED);
    expect(submitMemoryScore).toHaveBeenCalledWith({
      ...GOOD,
      userId: session.user.id,
    });
  });

  it("ignores a user id in the body", async () => {
    const submitMemoryScore = vi.fn(() => Promise.resolve({ saved: SAVED }));
    const session = sessionFor(LAURA_USER);
    await post(appWith({ submitMemoryScore }, session), {
      ...GOOD,
      userId: "someone-else",
    });
    expect(submitMemoryScore).toHaveBeenCalledWith({
      ...GOOD,
      userId: session.user.id,
    });
  });

  it("answers 400 VALIDATION_FAILED to a malformed body", async () => {
    const res = await post(appWith({}, sessionFor(LAURA_USER)), {
      moves: "8",
      timeMs: 1,
    });
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
  });

  it.each([
    [{ moves: 3, timeMs: 60_000 }],
    [{ moves: 8, timeMs: 1000 }],
    [{ moves: 8, timeMs: MEMORY_RULE.TIME.MAX_MS + 1 }],
  ])("refuses the impossible game %j with IMPLAUSIBLE_SCORE", async (body) => {
    const submitMemoryScore = vi.fn(() => Promise.resolve({ saved: SAVED }));
    const res = await post(
      appWith({ submitMemoryScore }, sessionFor(LAURA_USER)),
      body
    );
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    const problem = await problemOf(res);
    expect(problem.code).toBe(LAURA.GAMES.ERROR_CODE.IMPLAUSIBLE_SCORE);
    expect(problem.detail).toBe(
      translate(LAURA.GAMES.ERROR_CODE.IMPLAUSIBLE_SCORE, I18N.LOCALE.EN_US)
    );
    expect(submitMemoryScore).not.toHaveBeenCalled();
  });
});
