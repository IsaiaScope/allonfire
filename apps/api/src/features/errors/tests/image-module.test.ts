// @module-tag unit

import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { LOCALE } from "@allonfire/core/features/i18n/constants/locales";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { AllowedApp, Role } from "@allonfire/database/enums";
import {
  imageRecord,
  stubImageDeps,
} from "@allonfire/storage/features/image/hono/tests/stub-image-deps";
import type { ImageDeps } from "@allonfire/storage/features/image/hono/utils/deps";
import { MAX_INPUT_MEGAPIXELS } from "@allonfire/storage/features/image/prepare/constants/limits";
import { ImageTooLargeError } from "@allonfire/storage/features/image/prepare/prepare-image";
import { createApp } from "../../../app";
import { REQUEST_TIMEOUT_MS } from "../../../shared/constants/limits";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { translate } from "../../i18n/translate";
import { problemOf } from "./problem-of";

const admin = sessionFor({ role: Role.ADMIN });
const PREPARED = {
  blurDataUrl: "data:image/webp;base64,AAAA",
  buffer: Buffer.from("webp"),
  bytes: 4,
  height: 600,
  width: 800,
};

const app = (images: Partial<ImageDeps>) =>
  createApp(
    appDeps({
      auth: apiAuth({ getSession: () => Promise.resolve(admin) }),
      images: stubImageDeps(images),
    })
  );

const upload = () => {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(10)], "a.jpg"));
  form.append(
    "meta",
    stringifyJson([{ alt: { en: "", it: "" }, app: AllowedApp.LAURA }])
  );
  return {
    body: form,
    headers: { "accept-language": "it" },
    method: "POST",
  };
};

describe("the Image module inside the API", () => {
  it("answers a module error as this API's localized problem document", async () => {
    const res = await app({
      prepare: () => Promise.reject(new ImageTooLargeError()),
    }).request("/v1/images", upload());
    expect(res.status).toBe(413);
    const body = await problemOf(res);
    expect(body.code).toBe("IMAGE_TOO_LARGE");
    expect(body.detail).toBe(
      translate("IMAGE_TOO_LARGE", LOCALE.IT_IT, {
        limit: MAX_INPUT_MEGAPIXELS,
      })
    );
  });

  it("is not cut off by the API-wide request timeout", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      let reach: () => void = () => undefined;
      const reached = new Promise<void>((resolve) => {
        reach = resolve;
      });
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const pending = app({
        createImages: (rows) =>
          Promise.resolve(rows.map((row) => imageRecord({ ...row }))),
        prepare: async () => {
          reach();
          await gate;
          return PREPARED;
        },
        putObject: () => Promise.resolve(),
      }).request("/v1/images", upload());
      // The handler is inside prepare; a 30 s timeout would fire now.
      await reached;
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1000);
      release();
      expect((await pending).status).toBe(201);
    } finally {
      vi.useRealTimers();
    }
  });
});
