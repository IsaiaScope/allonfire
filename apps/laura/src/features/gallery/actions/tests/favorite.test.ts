// @module-tag unit
import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  FAKE_API,
  resetFakeApi,
} from "@allonfire/core/features/next/api/tests/fake-api";
import { updateTag } from "next/cache";
import { GALLERY } from "../../constants/gallery";
import { setFavorite } from "../favorite";

const IMAGE_ID = "photo-a";
const FAVORITE_PATH = `${API.PATH.LAURA.FAVORITES}/${IMAGE_ID}`;

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

describe("setFavorite", () => {
  it("marks with a PUT to the Image's favorite path, updates the Gallery tag and answers the state", async () => {
    FAKE_API.answers.set(HTTP.METHOD.PUT, {
      body: { favorite: true, imageId: IMAGE_ID },
      status: HTTP.STATUS.OK,
    });
    expect(await setFavorite(IMAGE_ID, true)).toEqual({ favorite: true });
    expect(FAKE_API.sent).toEqual([
      { body: null, method: HTTP.METHOD.PUT, path: FAVORITE_PATH },
    ]);
    expect(updateTag).toHaveBeenCalledWith(GALLERY.CACHE.TAG);
  });

  it("clears with a DELETE to the same path and answers the state", async () => {
    FAKE_API.answers.set(HTTP.METHOD.DELETE, {
      body: { favorite: false, imageId: IMAGE_ID },
      status: HTTP.STATUS.OK,
    });
    expect(await setFavorite(IMAGE_ID, false)).toEqual({ favorite: false });
    expect(FAKE_API.sent[0]).toMatchObject({
      method: HTTP.METHOD.DELETE,
      path: FAVORITE_PATH,
    });
    expect(updateTag).toHaveBeenCalledWith(GALLERY.CACHE.TAG);
  });

  it("answers null and updates no tag when the API refuses", async () => {
    FAKE_API.answers.set(HTTP.METHOD.PUT, { status: HTTP.STATUS.FORBIDDEN });
    expect(await setFavorite(IMAGE_ID, true)).toBeNull();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("answers null but drops the kept copy when the photo is gone (404)", async () => {
    FAKE_API.answers.set(HTTP.METHOD.PUT, { status: HTTP.STATUS.NOT_FOUND });
    expect(await setFavorite(IMAGE_ID, true)).toBeNull();
    expect(updateTag).toHaveBeenCalledWith(GALLERY.CACHE.TAG);
  });
});
