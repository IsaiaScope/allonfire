// @module-tag unit

import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "@allonfire/database/enums";
import { MAX_ALT_LENGTH } from "@allonfire/database/features/image/utils/alt";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { updateTag } from "next/cache";
import { z } from "zod";
import { FAKE_API, resetFakeApi } from "@/features/api/tests/fake-api";
import { STORAGE } from "@/features/storage/constants/storage";
import { IMAGES } from "../../constants/images";
import { imageNames } from "../../utils/image-form-data";
import { editImage } from "../edit-image";

const THE_IMAGE = { id: "image-1", version: "version-1" };

vi.mock(
  "@/features/api/utils/server-api",
  () => import("@/features/api/tests/fake-api")
);
vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));

const formOf = (languages: Record<string, string>) => {
  const form = new FormData();
  const names = imageNames("");
  form.set(names.access, ImageAccess.PRIVATE);
  form.append(names.apps, App.BACK_OFFICE);
  for (const [language, text] of objectEntries(languages)) {
    form.set(names.alt(language), text);
  }
  return form;
};
/** The alt the one PATCH item carried. */
const sentAlt = () => {
  const [item] = z
    .array(z.object({ alt: z.record(z.string(), z.string()) }))
    .parse(FAKE_API.sent[0]?.body);
  return item?.alt;
};
const BASE = { en: "The sea", it: "Il mare" };
const refused = (status: number, code?: string) =>
  FAKE_API.answers.set(HTTP.METHOD.PATCH, code ? { code, status } : { status });

beforeEach(() => {
  resetFakeApi();
  vi.mocked(updateTag).mockClear();
});

describe("editImage", () => {
  it("sends one item with the version and every posted language", async () => {
    const state = await editImage(
      THE_IMAGE,
      {},
      formOf({ ...BASE, fr: "La mer" })
    );
    expect(state).toEqual({ notice: IMAGES.EDIT_NOTICE.SAVED });
    expect(FAKE_API.sent[0]?.body).toEqual([
      {
        access: ImageAccess.PRIVATE,
        alt: { ...BASE, fr: "La mer" },
        apps: [App.BACK_OFFICE],
        id: THE_IMAGE.id,
        version: THE_IMAGE.version,
      },
    ]);
  });

  it("leaves out a language the form no longer posts", async () => {
    await editImage(THE_IMAGE, {}, formOf(BASE));
    expect(sentAlt()).not.toHaveProperty("fr");
  });

  it("clears the Images and Storage tags after a save", async () => {
    await editImage(THE_IMAGE, {}, formOf(BASE));
    expect(updateTag).toHaveBeenCalledWith(IMAGES.CACHE.TAG);
    expect(updateTag).toHaveBeenCalledWith(STORAGE.CACHE.TAG);
  });

  it("sends nothing when an alt is over the limit", async () => {
    expect(
      await editImage(
        THE_IMAGE,
        {},
        formOf({ en: "x".repeat(MAX_ALT_LENGTH + 1), it: "Il mare" })
      )
    ).toEqual({ error: IMAGES.EDIT_ERROR.INVALID });
    expect(FAKE_API.sent).toEqual([]);
  });

  it.each([
    [
      HTTP.STATUS.CONFLICT,
      ERROR.CODE.RESOURCE_CHANGED,
      IMAGES.EDIT_ERROR.CHANGED,
    ],
    [
      HTTP.STATUS.CONFLICT,
      IMAGE.ERROR_CODE.IMAGE_CHANGED,
      IMAGES.EDIT_ERROR.CHANGED,
    ],
    [HTTP.STATUS.NOT_FOUND, ERROR.CODE.NOT_FOUND, IMAGES.EDIT_ERROR.GONE],
    [HTTP.STATUS.FORBIDDEN, ERROR.CODE.FORBIDDEN, IMAGES.EDIT_ERROR.REFUSED],
    [HTTP.STATUS.INTERNAL_SERVER_ERROR, undefined, IMAGES.EDIT_ERROR.FAILED],
  ])("answers %s %s as %s and clears no tag", async (status, code, error) => {
    refused(status, code);
    expect(await editImage(THE_IMAGE, {}, formOf(BASE))).toEqual({ error });
    expect(updateTag).not.toHaveBeenCalled();
  });
});
