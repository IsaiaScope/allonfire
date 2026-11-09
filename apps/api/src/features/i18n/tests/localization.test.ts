// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";

import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { createApp } from "../../../app";
import { appDeps, UNMATCHED_PATH } from "../../../shared/tests/app-deps";
import { problemOf } from "../../../shared/tests/problem-of";
import { TRANSLATION } from "../constants/locales";

describe("error message localization", () => {
  const notFoundIn = async (headers?: Record<string, string>) => {
    const app = createApp(appDeps());
    const res = await app.request(UNMATCHED_PATH, headers ? { headers } : {});
    return await problemOf(res);
  };

  it("falls back to English when no language is passed", async () => {
    const body = await notFoundIn();
    expect(body.detail).toBe(
      TRANSLATION.CATALOGUE[TRANSLATION.DEFAULT_LOCALE].NOT_FOUND
    );
  });

  it("renders the message in the language the frontend passes", async () => {
    const body = await notFoundIn({ [HTTP.HEADER.ACCEPT_LANGUAGE]: "it" });
    expect(body.detail).toBe(
      TRANSLATION.CATALOGUE[I18N.LOCALE.IT_IT].NOT_FOUND
    );
  });

  it("falls back to English for an unsupported language", async () => {
    const body = await notFoundIn({ [HTTP.HEADER.ACCEPT_LANGUAGE]: "ja-JP" });
    expect(body.detail).toBe(
      TRANSLATION.CATALOGUE[TRANSLATION.DEFAULT_LOCALE].NOT_FOUND
    );
  });

  it("honours an exact regional variant", async () => {
    const body = await notFoundIn({ [HTTP.HEADER.ACCEPT_LANGUAGE]: "it-CH" });
    expect(body.detail).toBe(
      TRANSLATION.CATALOGUE[I18N.LOCALE.IT_CH].NOT_FOUND
    );
  });

  it("keeps the code stable across locales", async () => {
    const en = await notFoundIn();
    const italian = await notFoundIn({ [HTTP.HEADER.ACCEPT_LANGUAGE]: "it" });
    expect(en.code).toBe(italian.code);
    expect(en.detail).not.toBe(italian.detail);
  });
});
