// @module-tag unit
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { parseJson } from "@allonfire/core/shared/utils/json";
import { App, ImageAccess } from "@allonfire/database/enums";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { updateTag } from "next/cache";
import { FAKE_API, resetFakeApi } from "@/features/api/tests/fake-api";
import { STORAGE } from "@/features/storage/constants/storage";
import { IMAGES } from "../../constants/images";
import { imageNames, rowPrefix } from "../../utils/image-form-data";
import { addImage } from "../add-image";

vi.mock(
  "@/features/api/utils/server-api",
  () => import("@/features/api/tests/fake-api")
);
vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));

const formOf = (count: number) => {
  const form = new FormData();
  for (let index = 0; index < count; index += 1) {
    const names = imageNames(rowPrefix(index));
    form.set(
      names.file,
      new File(["x"], `p${index}.jpg`, { type: "image/jpeg" })
    );
    form.set(names.access, ImageAccess.PUBLIC);
    form.set(names.alt("en"), `en ${index}`);
    form.set(names.alt("it"), `it ${index}`);
    form.append(names.apps, App.BACK_OFFICE);
  }
  return form;
};
const created = (count: number) =>
  FAKE_API.answers.set(HTTP.METHOD.POST, {
    body: Array.from({ length: count }, (_, id) => ({ id: String(id) })),
    status: HTTP.STATUS.CREATED,
  });
const refused = (status: number, code?: string) =>
  FAKE_API.answers.set(HTTP.METHOD.POST, code ? { code, status } : { status });

beforeEach(() => {
  resetFakeApi();
  vi.mocked(updateTag).mockClear();
});

describe("addImage", () => {
  it("posts one meta entry per file in order and answers how many were added", async () => {
    created(2);
    const state = await addImage({}, formOf(2));
    expect(state).toEqual({ added: 2, notice: IMAGES.ADD_NOTICE.ADDED });
    const body = FAKE_API.sent[0]?.body;
    const meta = parseJson<{ alt: { en: string } }[]>(
      typeof body === "object" && body !== null && "meta" in body
        ? String(body.meta)
        : ""
    );
    expect(meta.map(({ alt }) => alt.en)).toEqual(["en 0", "en 1"]);
  });

  it("clears the Images and Storage tags after a save", async () => {
    created(1);
    await addImage({}, formOf(1));
    expect(updateTag).toHaveBeenCalledWith(IMAGES.CACHE.TAG);
    expect(updateTag).toHaveBeenCalledWith(STORAGE.CACHE.TAG);
  });

  it("sends nothing when the form holds no file", async () => {
    expect(await addImage({}, new FormData())).toEqual({
      error: IMAGES.ADD_ERROR.INVALID,
    });
    expect(FAKE_API.sent).toEqual([]);
  });

  it.each([
    [
      HTTP.STATUS.PAYLOAD_TOO_LARGE,
      IMAGE.ERROR_CODE.IMAGE_TOO_LARGE,
      IMAGES.ADD_ERROR.TOO_LARGE,
    ],
    [
      HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
      IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE,
      IMAGES.ADD_ERROR.UNSUPPORTED,
    ],
    [HTTP.STATUS.FORBIDDEN, ERROR.CODE.FORBIDDEN, IMAGES.ADD_ERROR.REFUSED],
    [HTTP.STATUS.INTERNAL_SERVER_ERROR, undefined, IMAGES.ADD_ERROR.FAILED],
  ])("answers %s as %s and clears no tag", async (status, code, error) => {
    refused(status, code);
    expect(await addImage({}, formOf(1))).toEqual({ error });
    expect(updateTag).not.toHaveBeenCalled();
  });
});
