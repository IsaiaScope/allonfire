// @module-tag unit

import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { problemOf } from "../../../shared/tests/problem-of";
import { LAURA } from "../constants/laura";
import { LAURA_USER } from "./laura-app";
import { stubLauraDeps } from "./stub-laura-deps";

const GOOD = { moves: 8, timeMs: 8 * MEMORY_RULE.TIME.MIN_MS_PER_MOVE };

/** One API (so one rate-limit store) whose caller is whoever `caller.id` names now. */
const apiWithCaller = (caller: { id: string }) =>
  createApp(
    appDeps({
      auth: apiAuth({
        getSession: () =>
          Promise.resolve(sessionFor({ ...LAURA_USER, id: caller.id })),
      }),
      laura: stubLauraDeps(),
    })
  );

const save = (app: ReturnType<typeof apiWithCaller>) =>
  app.request(API.PATH.LAURA.GAMES.SCORES, {
    body: stringifyJson(GOOD),
    headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
    method: HTTP.METHOD.POST,
  });

/** Saves as many games as a window allows, and answers their statuses. */
const saveUpToTheLimit = async (app: ReturnType<typeof apiWithCaller>) =>
  (
    await Promise.all(
      Array.from({ length: LAURA.GAMES.LIMIT.SAVES }, () => save(app))
    )
  ).map(({ status }) => status);

describe("POST /laura/games/memory/scores, how often", () => {
  it("answers 429 RATE_LIMITED once a User has saved as many games as a window allows", async () => {
    const app = apiWithCaller({ id: "fast" });
    expect(new Set(await saveUpToTheLimit(app))).toEqual(
      new Set([HTTP.STATUS.CREATED])
    );
    const refused = await save(app);
    expect(refused.status).toBe(HTTP.STATUS.TOO_MANY_REQUESTS);
    expect((await problemOf(refused)).code).toBe(ERROR.CODE.RATE_LIMITED);
  });

  it("counts each User on their own, however many share an address", async () => {
    const caller = { id: "one" };
    const app = apiWithCaller(caller);
    await saveUpToTheLimit(app);
    expect((await save(app)).status).toBe(HTTP.STATUS.TOO_MANY_REQUESTS);
    caller.id = "two";
    expect((await save(app)).status).toBe(HTTP.STATUS.CREATED);
  });
});
