// @module-tag unit
import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  answerDeleted,
  FAKE_API,
  resetFakeApi,
} from "@allonfire/core/features/next/api/tests/fake-api";
import { updateTag } from "next/cache";
import { LAURA } from "@/shared/constants/laura";
import { GALLERY } from "../../constants/gallery";
import { removePhoto } from "../remove-photo";

const IMAGE_ID = "photo-a";

vi.mock(
  "@/features/api/utils/server-api",
  () => import("@/features/api/tests/fake-api")
);
vi.mock(
  "next/cache",
  () => import("@allonfire/ui/shared/tests/next-cache-mock")
);

beforeEach(() => {
  resetFakeApi();
  vi.mocked(updateTag).mockClear();
});

describe("removePhoto", () => {
  it("deletes the Image from Laura only, updates the Gallery tag and answers how many went", async () => {
    answerDeleted(1);
    expect(await removePhoto(IMAGE_ID)).toBe(1);
    expect(FAKE_API.sent).toEqual([
      {
        body: { app: LAURA.app, ids: [IMAGE_ID] },
        method: HTTP.METHOD.DELETE,
        path: API.PATH.IMAGES,
      },
    ]);
    expect(updateTag).toHaveBeenCalledWith(GALLERY.CACHE.TAG);
  });

  it("answers 0, still a success, when another Admin removed it first", async () => {
    answerDeleted(0);
    expect(await removePhoto(IMAGE_ID)).toBe(0);
    expect(updateTag).toHaveBeenCalledWith(GALLERY.CACHE.TAG);
  });

  it("answers null and updates no tag when the API refuses", async () => {
    FAKE_API.answers.set(HTTP.METHOD.DELETE, {
      status: HTTP.STATUS.FORBIDDEN,
    });
    expect(await removePhoto(IMAGE_ID)).toBeNull();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
