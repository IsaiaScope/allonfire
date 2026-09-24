// @module-tag unit
import { createApp } from "../../../app";
import { appDeps } from "../../../shared/tests/app-deps";
import type { ProblemDetails } from "../../errors/middleware/error-handler";
import { CATALOGUE, DEFAULT_LOCALE, LOCALE } from "../constants/locales";

describe("error message localization", () => {
  const notFoundIn = async (headers?: Record<string, string>) => {
    const app = createApp(appDeps());
    const res = await app.request("/nothing-here", headers ? { headers } : {});
    return (await res.json()) as ProblemDetails;
  };

  it("falls back to English when no language is passed", async () => {
    const body = await notFoundIn();
    expect(body.detail).toBe(CATALOGUE[DEFAULT_LOCALE].NOT_FOUND);
  });

  it("renders the message in the language the frontend passes", async () => {
    const body = await notFoundIn({ "Accept-Language": "it" });
    expect(body.detail).toBe(CATALOGUE[LOCALE.IT_IT].NOT_FOUND);
  });

  it("falls back to English for an unsupported language", async () => {
    const body = await notFoundIn({ "Accept-Language": "ja-JP" });
    expect(body.detail).toBe(CATALOGUE[DEFAULT_LOCALE].NOT_FOUND);
  });

  it("honours an exact regional variant", async () => {
    const body = await notFoundIn({ "Accept-Language": "it-CH" });
    expect(body.detail).toBe(CATALOGUE[LOCALE.IT_CH].NOT_FOUND);
  });

  it("keeps the code stable across locales", async () => {
    const en = await notFoundIn();
    const italian = await notFoundIn({ "Accept-Language": "it" });
    expect(en.code).toBe(italian.code);
    expect(en.detail).not.toBe(italian.detail);
  });
});
