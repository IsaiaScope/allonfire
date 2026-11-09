// @module-tag unit

import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { ResourceChangedError } from "@allonfire/core/features/version/utils/resource-changed-error";
import { Hono } from "hono";
import { problemOf } from "../../../shared/tests/problem-of";
import { localeResolver } from "../../i18n/middleware/locale-resolver";
import { translate } from "../../i18n/translate";
import { onError } from "../middleware/error-handler";

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
        status: HTTP.STATUS.PAYLOAD_TOO_LARGE,
        values: { limit: 2048 },
      })
    ).request("/", { headers: { [HTTP.HEADER.ACCEPT_LANGUAGE]: "it" } });
    expect(res.status).toBe(HTTP.STATUS.PAYLOAD_TOO_LARGE);
    const body = await problemOf(res);
    expect(body.code).toBe(ERROR.CODE.PAYLOAD_TOO_LARGE);
    expect(body.detail).toBe(
      translate(ERROR.CODE.PAYLOAD_TOO_LARGE, I18N.LOCALE.IT_IT, {
        limit: 2048,
      })
    );
  });

  it("answers a service's ResourceChangedError as 409 RESOURCE_CHANGED, in the request's language", async () => {
    const res = await appThrowing(
      new ResourceChangedError(["image-1"])
    ).request("/", { headers: { [HTTP.HEADER.ACCEPT_LANGUAGE]: "it" } });
    expect(res.status).toBe(HTTP.STATUS.CONFLICT);
    const body = await problemOf(res);
    expect(body.code).toBe(ERROR.CODE.RESOURCE_CHANGED);
    expect(body.detail).toBe(
      translate(ERROR.CODE.RESOURCE_CHANGED, I18N.LOCALE.IT_IT)
    );
  });

  it("passes field errors through", async () => {
    const res = await appThrowing(
      new CodedError({
        code: ERROR.CODE.VALIDATION_FAILED,
        errors: [{ message: "Required", path: "app" }],
        status: HTTP.STATUS.BAD_REQUEST,
        values: { count: 1 },
      })
    ).request("/");
    expect((await problemOf(res)).errors).toEqual([
      { message: "Required", path: "app" },
    ]);
  });

  it.each([
    ["an unknown code", { code: "NOPE", status: HTTP.STATUS.BAD_REQUEST }],
    ["an undocumented status", { code: ERROR.CODE.NOT_FOUND, status: 418 }],
  ])("answers 500 for %s", async (_, fields) => {
    const res = await appThrowing(new CodedError(fields)).request("/");
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.INTERNAL_ERROR);
  });
});
