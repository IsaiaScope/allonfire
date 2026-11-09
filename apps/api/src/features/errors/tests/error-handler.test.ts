// @module-tag unit

import { invalidHook } from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { validator } from "hono-openapi";
import { z } from "zod";
import { problemOf } from "../../../shared/tests/problem-of";
import { localeResolver } from "../../i18n/middleware/locale-resolver";
import { translate } from "../../i18n/translate";
import { notFound, onError } from "../middleware/error-handler";

function testApp() {
  return new Hono()
    .use(requestId())
    .use(localeResolver())
    .get("/boom", () => {
      throw new Error(
        "Invalid `prisma.user.findMany()` on column `secret_col`"
      );
    })
    .get("/nope", () => {
      // Hono's validators throw English text like this.
      throw new HTTPException(403, {
        message: "Malformed JSON in request body",
      });
    })
    .get("/teapot", () => {
      throw new HTTPException(418);
    })
    .onError(onError)
    .notFound(notFound);
}

describe("onError", () => {
  it("maps an HTTPException to its status, a code and the catalogue's text", async () => {
    const res = await testApp().request("/nope");
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    const body = await problemOf(res);
    expect(body.code).toBe(ERROR.CODE.FORBIDDEN);
    expect(body.detail).toBe(
      translate(ERROR.CODE.FORBIDDEN, I18N.LOCALE.EN_US)
    );
    expect(body.requestId).toBeTruthy();
  });

  it("answers an HTTPException in the request's language", async () => {
    const res = await testApp().request("/nope", {
      headers: { [HTTP.HEADER.ACCEPT_LANGUAGE]: "it" },
    });
    expect((await problemOf(res)).detail).toBe(
      translate(ERROR.CODE.FORBIDDEN, I18N.LOCALE.IT_IT)
    );
  });

  it("answers 500 for a status the API does not document", async () => {
    const res = await testApp().request("/teapot");
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.INTERNAL_ERROR);
  });

  it("never leaks an unknown error's message", async () => {
    const res = await testApp().request("/boom");
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    const body = await problemOf(res);
    expect(body.code).toBe(ERROR.CODE.INTERNAL_ERROR);
    expect(body.detail).toBe(
      translate(ERROR.CODE.INTERNAL_ERROR, I18N.LOCALE.EN_US)
    );
    expect(stringifyJson(body)).not.toContain("secret_col");
  });

  it("returns NOT_FOUND in the same envelope for unmatched routes", async () => {
    const res = await testApp().request("/missing");
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    const body = await problemOf(res);
    expect(body.code).toBe(ERROR.CODE.NOT_FOUND);
  });
});

// The modules' validator hook, rendered by the API's `onError`.
describe("invalidHook", () => {
  const app = new Hono()
    .use(requestId())
    .post(
      "/echo",
      validator(
        "json",
        z.object({ age: z.number(), email: z.email() }),
        invalidHook
      ),
      (context) => context.json(context.req.valid("json"))
    )
    .onError(onError);

  it("returns 400 with field paths and no schema dump", async () => {
    const res = await app.request("/echo", {
      body: stringifyJson({ age: "old", email: "nope" }),
      headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
      method: HTTP.METHOD.POST,
    });

    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    const body = await problemOf(res);
    expect(body.code).toBe(ERROR.CODE.VALIDATION_FAILED);
    const paths = (body.errors ?? []).map((d: { path: string }) => d.path);
    expect(paths).toContain("email");
    expect(paths).toContain("age");
    expect(stringifyJson(body)).not.toContain("ZodError");
  });
});
