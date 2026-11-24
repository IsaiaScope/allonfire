// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import {
  dehydratedData,
  sentCookie,
  stubFetchJson,
} from "@allonfire/ui/shared/tests/fetch-stub";
import {
  readSessionCookie,
  SESSION_COOKIE,
} from "@allonfire/ui/shared/tests/session-cookie-mock";
import { cacheLife, cacheTag } from "next/cache";
import { IMAGES_PAGE } from "@/shared/tests/msw/handlers";
import { IMAGES } from "../../constants/images";
import { imageHydration, imagesHydration } from "../images-hydration";
import { imageKey, imagesPageKey } from "../images-queries";

vi.mock(
  "next/cache",
  () => import("@allonfire/ui/shared/tests/next-cache-mock")
);
vi.mock(
  "@/environment/environment",
  () => import("@/shared/tests/environment-mock")
);
vi.mock(
  "@allonfire/auth/features/next/utils/session-cookie",
  () => import("@allonfire/ui/shared/tests/session-cookie-mock")
);

const PARAMS = {
  [IMAGES.PARAM.PAGE]: IMAGES.DEFAULT_PAGE,
  [IMAGES.PARAM.PER_PAGE]: IMAGES.DEFAULT_PAGE_SIZE,
  [IMAGES.PARAM.SEARCH]: "",
  [IMAGES.PARAM.SORT]: "",
};

describe("imagesHydration", () => {
  it("reads the page as the Session's cookie and dehydrates it under the table's key, tagged and kept 5 minutes", async () => {
    const fetch = stubFetchJson(IMAGES_PAGE);
    const state = await imagesHydration(PARAMS);
    expect(dehydratedData(state)).toEqual([
      { data: IMAGES_PAGE, queryKey: imagesPageKey(PARAMS) },
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

  it("hydrates a sorted page under the key the table reads, the sort in it", async () => {
    stubFetchJson(IMAGES_PAGE);
    const sorted = { ...PARAMS, [IMAGES.PARAM.SORT]: "size.desc" };
    const state = await imagesHydration(sorted);
    expect(dehydratedData(state)).toEqual([
      { data: IMAGES_PAGE, queryKey: imagesPageKey(sorted) },
    ]);
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
