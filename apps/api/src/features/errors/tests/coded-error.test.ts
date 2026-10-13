// @module-tag unit

import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { Hono } from "hono";
import { localeResolver } from "../../i18n/middleware/locale-resolver";
import { translate } from "../../i18n/translate";
import { onError } from "../middleware/error-handler";
import { problemOf } from "./problem-of";

const appThrowing = (error: Error) =>
  new Hono()
    .use(localeResolver())
    .get("/", () => {
      throw error;
    })
    .onError(onError);

describe("onError with a CodedError", () => {
  it("renders the code with its values in the request's language", async () => {
    const res = await appThrowing(
      new CodedError({
        code: ERROR.CODE.PAYLOAD_TOO_LARGE,
        status: 413,
        values: { limit: 2048 },
      })
    ).request("/", { headers: { "accept-language": "it" } });
    expect(res.status).toBe(413);
    const body = await problemOf(res);
    expect(body.code).toBe(ERROR.CODE.PAYLOAD_TOO_LARGE);
    expect(body.detail).toBe(
      translate(ERROR.CODE.PAYLOAD_TOO_LARGE, I18N.LOCALE.IT_IT, {
        limit: 2048,
      })
    );
  });

  it("passes field errors through", async () => {
    const res = await appThrowing(
      new CodedError({
        code: ERROR.CODE.VALIDATION_FAILED,
        errors: [{ message: "Required", path: "app" }],
        status: 400,
        values: { count: 1 },
      })
    ).request("/");
    expect((await problemOf(res)).errors).toEqual([
      { message: "Required", path: "app" },
    ]);
  });

  it.each([
    ["an unknown code", { code: "NOPE", status: 400 }],
    ["an undocumented status", { code: ERROR.CODE.NOT_FOUND, status: 418 }],
  ])("answers 500 for %s", async (_, fields) => {
    const res = await appThrowing(new CodedError(fields)).request("/");
    expect(res.status).toBe(500);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.INTERNAL_ERROR);
  });
});
