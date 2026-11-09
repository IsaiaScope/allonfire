// @module-tag unit

import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { HTTPException } from "hono/http-exception";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps, UNMATCHED_PATH } from "../../../shared/tests/app-deps";
import { problemOf } from "../../../shared/tests/problem-of";
import { fallbackMessage } from "../middleware/error-handler";

/** A route only this file mounts, to throw a 415 from. */
const UNSUPPORTED_ROUTE = `${API.PATH.VERSION}/unsupported`;

describe("unmatched routes", () => {
  it("returns the NOT_FOUND envelope", async () => {
    const res = await createApp(appDeps()).request(UNMATCHED_PATH);
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.NOT_FOUND);
  });
});

describe("RFC 9457 problem documents", () => {
  it("answers a thrown non-Error with a problem document, not plain text", async () => {
    const app = createApp(appDeps())
      .get("/throws-string", () => {
        const thrown: unknown = "not an Error";
        throw thrown;
      })
      .get("/rejects-object", () => Promise.reject({ reason: "not an Error" }));

    const responses = await Promise.all(
      ["/throws-string", "/rejects-object"].map((path) => app.request(path))
    );
    for (const res of responses) {
      expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
      expect(res.headers.get(HTTP.HEADER.CONTENT_TYPE)).toContain(
        HTTP.CONTENT_TYPE.PROBLEM_JSON
      );
    }
    const bodies = await Promise.all(responses.map((res) => problemOf(res)));
    expect(bodies.map((body) => body.code)).toEqual([
      ERROR.CODE.INTERNAL_ERROR,
      ERROR.CODE.INTERNAL_ERROR,
    ]);
  });

  it("answers a request past the timeout with a localised 503 TIMEOUT problem", async () => {
    vi.useFakeTimers();
    const app = createApp(appDeps()).get(
      "/slow",
      () => new Promise(() => undefined)
    );

    const pending = app.request("/slow", {
      headers: { [HTTP.HEADER.ACCEPT_LANGUAGE]: I18N.LOCALE.IT_IT },
    });
    await vi.advanceTimersByTimeAsync(API.LIMIT.REQUEST_TIMEOUT_MS);
    const res = await pending;

    expect(res.status).toBe(HTTP.STATUS.SERVICE_UNAVAILABLE);
    const body = await problemOf(res);
    expect(body.code).toBe(ERROR.CODE.TIMEOUT);
    expect(body.detail).toBe(
      fallbackMessage(ERROR.CODE.TIMEOUT, I18N.LOCALE.IT_IT)
    );
  });

  it("serves the problem media type, not application/json", async () => {
    const res = await createApp(appDeps()).request(UNMATCHED_PATH);
    expect(res.headers.get(HTTP.HEADER.CONTENT_TYPE)).toContain(
      HTTP.CONTENT_TYPE.PROBLEM_JSON
    );
  });

  it("carries every member the RFC requires, plus our extensions", async () => {
    const res = await createApp(appDeps()).request(UNMATCHED_PATH);
    const body = await problemOf(res);

    expect(body).toMatchObject({
      code: ERROR.CODE.NOT_FOUND,
      instance: UNMATCHED_PATH,
      status: HTTP.STATUS.NOT_FOUND,
      title: "Not Found",
      type: "/errors/not-found",
    });
    expect(body.detail).toBeTruthy();
    expect(body.requestId).toBeTruthy();
  });

  it("keeps `title` invariant across locales while `detail` localises", async () => {
    const app = createApp(appDeps());
    const en = await problemOf(await app.request(UNMATCHED_PATH));
    const italian = await problemOf(
      await app.request(UNMATCHED_PATH, {
        headers: { [HTTP.HEADER.ACCEPT_LANGUAGE]: "it" },
      })
    );

    // RFC 9457 §3.1.2: title should not change from occurrence to occurrence.
    expect(en.title).toBe(italian.title);
    expect(en.type).toBe(italian.type);
    expect(en.detail).not.toBe(italian.detail);
  });

  it("reports the path the problem occurred on", async () => {
    const path = `${API.PATH.VERSION}/definitely-missing`;
    const res = await createApp(appDeps()).request(path);
    const body = await problemOf(res);
    expect(body.instance).toBe(path);
  });
});

describe("415", () => {
  it("renders an unsupported image as a localised problem", async () => {
    const app = createApp(appDeps()).get(UNSUPPORTED_ROUTE, () => {
      throw new HTTPException(HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE);
    });
    const res = await app.request(UNSUPPORTED_ROUTE, {
      headers: { [HTTP.HEADER.ACCEPT_LANGUAGE]: "it" },
    });
    expect(res.status).toBe(HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE);
    const body = await problemOf(res);
    expect(body).toMatchObject({
      code: IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE,
      type: "/errors/unsupported-image",
    });
    expect(body.detail).toBe(
      "Immagine non supportata. Invia JPEG, PNG, WebP, AVIF o HEIC"
    );
  });
});
