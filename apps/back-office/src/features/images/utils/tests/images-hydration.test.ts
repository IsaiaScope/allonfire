// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import { cacheLife, cacheTag } from "next/cache";
import {
  dehydratedData,
  sentCookie,
  stubFetchJson,
} from "@/shared/tests/fetch-stub";
import { IMAGES_PAGE } from "@/shared/tests/msw/handlers";
import {
  readSessionCookie,
  SESSION_COOKIE,
} from "@/shared/tests/session-cookie-mock";
import { IMAGES } from "../../constants/images";
import { imageHydration, imagesHydration } from "../images-hydration";
import { imageKey, imagesListKey } from "../images-queries";

vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));
vi.mock(
  "@/environment/environment",
  () => import("@/shared/tests/environment-mock")
);
vi.mock(
  "@allonfire/auth/features/next/utils/session-cookie",
  () => import("@/shared/tests/session-cookie-mock")
);

const PARAMS = {
  [IMAGES.PARAM.PAGE]: IMAGES.DEFAULT_PAGE,
  [IMAGES.PARAM.PER_PAGE]: IMAGES.DEFAULT_PAGE_SIZE,
  [IMAGES.PARAM.SEARCH]: "",
};

describe("imagesHydration", () => {
  it("reads the page as the Session's cookie and dehydrates it under the table's key, tagged and kept 5 minutes", async () => {
    const fetch = stubFetchJson(IMAGES_PAGE);
    const state = await imagesHydration(PARAMS);
    expect(dehydratedData(state)).toEqual([
      { data: IMAGES_PAGE, queryKey: imagesListKey(PARAMS) },
    ]);
    expect(cacheTag).toHaveBeenCalledWith(IMAGES.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(IMAGES.CACHE.LIFE);
    // The rows hold private links signed for an hour: never kept longer.
    expect(IMAGES.CACHE.LIFE.expire).toBeLessThanOrEqual(
      IMAGE_SERVER.PRIVATE_LINK_HOURS * UNIT.SECONDS_PER_HOUR
    );
    expect(IMAGES.CACHE.LIFE.stale).toBeGreaterThanOrEqual(
      5 * UNIT.SECONDS_PER_MINUTE
    );
    expect(sentCookie(fetch)).toBe(SESSION_COOKIE);
  });

  it("throws when signed out, so no empty list is kept", async () => {
    vi.mocked(readSessionCookie).mockResolvedValueOnce("");
    stubFetchJson({}, HTTP.STATUS.UNAUTHORIZED);
    await expect(imagesHydration(PARAMS)).rejects.toThrow();
  });
});

const [IMAGE] = IMAGES_PAGE.images;
const ID = IMAGE?.id ?? "";

describe("imageHydration", () => {
  it("reads the Image as the Session's cookie and dehydrates it under its key, tagged under the list's tag and kept 5 minutes", async () => {
    const fetch = stubFetchJson(IMAGE);
    const state = await imageHydration(ID);
    expect(dehydratedData(state)).toEqual([
      { data: IMAGE, queryKey: imageKey(ID) },
    ]);
    expect(cacheTag).toHaveBeenCalledWith(IMAGES.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(IMAGES.CACHE.LIFE);
    expect(sentCookie(fetch)).toBe(SESSION_COOKIE);
  });

  it("throws for an unknown id, so nothing is kept and the view tells it is gone", async () => {
    stubFetchJson({}, HTTP.STATUS.NOT_FOUND);
    await expect(imageHydration("missing")).rejects.toThrow();
  });
});
