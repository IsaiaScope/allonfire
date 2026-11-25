// @module-tag unit
// jscpd:ignore-start
// The Back Office's twin: the same suite over its own App's words and files. Imports and hoisted mocks.
import {
  FAKE_API,
  resetFakeApi,
} from "@allonfire/core/features/next/api/tests/fake-api";
import { parseJson } from "@allonfire/core/shared/utils/json";
import { App, ImageAccess } from "@allonfire/database/enums";
import { IMAGE } from "@allonfire/ui/features/image/constants/image";
import {
  created,
  imageFormOf,
  REFUSALS,
  refused,
} from "@allonfire/ui/features/image/upload/tests/add-image-answers";
import { updateTag } from "next/cache";
import { STORAGE } from "@/features/storage/constants/storage";
import { IMAGES } from "../../constants/images";
import { addImage } from "../add-image";

vi.mock(
  "@/features/api/utils/server-api",
  () => import("@/features/api/tests/fake-api")
);
vi.mock(
  "next/cache",
  () => import("@allonfire/ui/shared/tests/next-cache-mock")
);
// jscpd:ignore-end

const formOf = (count: number) =>
  imageFormOf(count, {
    access: ImageAccess.PUBLIC,
    apps: [App.BACK_OFFICE],
  });

beforeEach(() => {
  resetFakeApi();
  vi.mocked(updateTag).mockClear();
});

describe("addImage", () => {
  it("posts one meta entry per file in order and answers how many were added", async () => {
    created(2);
    const state = await addImage({}, formOf(2));
    expect(state).toEqual({ added: 2, notice: IMAGE.UPLOAD.NOTICE.ADDED });
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

  // jscpd:ignore-start
  // The Back Office's twin: the same suite over its own App's words and files.
  it("sends nothing when the form holds no file", async () => {
    expect(await addImage({}, new FormData())).toEqual({
      error: IMAGE.UPLOAD.ERROR.INVALID,
    });
    expect(FAKE_API.sent).toEqual([]);
  });

  it.each(REFUSALS)(
    "answers %s as %s and clears no tag",
    async (status, code, error) => {
      refused(status, code);
      expect(await addImage({}, formOf(1))).toEqual({ error });
      expect(updateTag).not.toHaveBeenCalled();
    }
  );
  // jscpd:ignore-end
});
