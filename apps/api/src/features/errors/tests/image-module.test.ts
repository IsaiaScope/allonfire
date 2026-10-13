// @module-tag unit

import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, Role } from "@allonfire/database/enums";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import {
  imageRecord,
  PREPARED,
  stubImageDeps,
} from "@allonfire/storage/features/image/hono/tests/stub-image-deps";
import type { ImageDeps } from "@allonfire/storage/features/image/hono/utils/deps";
import { ImageTooLargeError } from "@allonfire/storage/features/image/prepare/prepare-image";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { translate } from "../../i18n/translate";
import { problemOf } from "./problem-of";

const admin = sessionFor({ memberships: membershipsIn(Role.ADMIN) });

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
    stringifyJson([{ alt: { en: "", it: "" }, apps: [{ app: App.LAURA }] }])
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
    }).request(API.PATH.IMAGES, upload());
    expect(res.status).toBe(413);
    const body = await problemOf(res);
    expect(body.code).toBe(IMAGE.ERROR_CODE.IMAGE_TOO_LARGE);
    expect(body.detail).toBe(
      translate(IMAGE.ERROR_CODE.IMAGE_TOO_LARGE, I18N.LOCALE.IT_IT, {
        limit: IMAGE.LIMIT.INPUT_MEGAPIXELS,
      })
    );
  });

  it("is not cut off by the API-wide request timeout", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
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
    }).request(API.PATH.IMAGES, upload());
    // The handler is inside prepare; a 30 s timeout would fire now.
    await reached;
    await vi.advanceTimersByTimeAsync(API.LIMIT.REQUEST_TIMEOUT_MS + 1000);
    release();
    expect((await pending).status).toBe(201);
  });
});

describe("the Image module's reads and writes inside the API", () => {
  it("lists for a visitor: no Session, no App entered", async () => {
    const listImages = vi.fn<ImageDeps["listImages"]>(async () => []);
    const res = await createApp(
      appDeps({ images: stubImageDeps({ listImages }) })
    ).request(`${API.PATH.IMAGES}?app=${App.LAURA}`);
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: App.LAURA,
      enterable: [],
      limit: 30,
    });
  });

  it("asks a visitor to sign in before a write, as a problem document", async () => {
    const res = await createApp(appDeps()).request(API.PATH.IMAGES, {
      body: stringifyJson({ ids: ["image-1"] }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });
    expect(res.status).toBe(401);
    expect((await problemOf(res)).status).toBe(401);
  });
});
