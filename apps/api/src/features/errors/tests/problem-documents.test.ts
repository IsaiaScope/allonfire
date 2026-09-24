// @module-tag unit
import { createApp } from "../../../app";
import { REQUEST_TIMEOUT_MS } from "../../../shared/constants/limits";
import { API_VERSION_PREFIX } from "../../../shared/constants/routes";
import { appDeps } from "../../../shared/tests/app-deps";
import { LOCALE } from "../../i18n/constants/locales";
import {
  fallbackMessage,
  type ProblemDetails,
} from "../middleware/error-handler";

describe("unmatched routes", () => {
  it("returns the NOT_FOUND envelope", async () => {
    const res = await createApp(appDeps()).request("/nothing-here");
    expect(res.status).toBe(404);
    expect(((await res.json()) as ProblemDetails).code).toBe("NOT_FOUND");
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
      expect(res.status).toBe(500);
      expect(res.headers.get("content-type")).toContain(
        "application/problem+json"
      );
    }
    const bodies = await Promise.all(
      responses.map((res) => res.json() as Promise<ProblemDetails>)
    );
    expect(bodies.map((body) => body.code)).toEqual([
      "INTERNAL_ERROR",
      "INTERNAL_ERROR",
    ]);
  });

  it("answers a request past the timeout with a localised 503 TIMEOUT problem", async () => {
    vi.useFakeTimers();
    const app = createApp(appDeps()).get(
      "/slow",
      () => new Promise(() => undefined)
    );

    const pending = app.request("/slow", {
      headers: { "accept-language": LOCALE.IT_IT },
    });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    const res = await pending;
    vi.useRealTimers();

    expect(res.status).toBe(503);
    const body = (await res.json()) as ProblemDetails;
    expect(body.code).toBe("TIMEOUT");
    expect(body.detail).toBe(fallbackMessage("TIMEOUT", LOCALE.IT_IT));
  });

  it("serves the problem media type, not application/json", async () => {
    const res = await createApp(appDeps()).request("/nothing-here");
    expect(res.headers.get("content-type")).toContain(
      "application/problem+json"
    );
  });

  it("carries every member the RFC requires, plus our extensions", async () => {
    const res = await createApp(appDeps()).request("/nothing-here");
    const body = (await res.json()) as ProblemDetails;

    expect(body).toMatchObject({
      code: "NOT_FOUND",
      instance: "/nothing-here",
      status: 404,
      title: "Not Found",
      type: "/errors/not-found",
    });
    expect(body.detail).toBeTruthy();
    expect(body.requestId).toBeTruthy();
  });

  it("keeps `title` invariant across locales while `detail` localises", async () => {
    const app = createApp(appDeps());
    const en = (await (
      await app.request("/nothing-here")
    ).json()) as ProblemDetails;
    const italian = (await (
      await app.request("/nothing-here", {
        headers: { "Accept-Language": "it" },
      })
    ).json()) as ProblemDetails;

    // RFC 9457 §3.1.2: title should not change from occurrence to occurrence.
    expect(en.title).toBe(italian.title);
    expect(en.type).toBe(italian.type);
    expect(en.detail).not.toBe(italian.detail);
  });

  it("reports the path the problem occurred on", async () => {
    const path = `${API_VERSION_PREFIX}/definitely-missing`;
    const res = await createApp(appDeps()).request(path);
    const body = (await res.json()) as ProblemDetails;
    expect(body.instance).toBe(path);
  });
});
