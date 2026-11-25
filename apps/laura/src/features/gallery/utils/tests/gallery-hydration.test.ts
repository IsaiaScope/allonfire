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
import { QUERY } from "@/shared/constants/query";
import { FAVORITES_PAGE, GALLERY_PAGE } from "@/shared/tests/msw/handlers";
import { GALLERY } from "../../constants/gallery";
import { favoritesHydration } from "../favorites-hydration";
import { galleryHydration } from "../gallery-hydration";

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

describe.each([
  ["galleryHydration", galleryHydration, GALLERY_PAGE, QUERY.GALLERY.FEED],
  [
    "favoritesHydration",
    favoritesHydration,
    FAVORITES_PAGE,
    QUERY.FAVORITES.FEED,
  ],
] as const)("%s", (_name, hydrate, page, key) => {
  it("reads page one as the Session's cookie and dehydrates it as the feed's first page, tagged and kept 5 minutes", async () => {
    const fetch = stubFetchJson(page);
    const state = await hydrate();
    expect(dehydratedData(state)).toEqual([
      {
        data: { pageParams: [GALLERY.FIRST_PAGE], pages: [page] },
        queryKey: key,
      },
    ]);
    expect(cacheTag).toHaveBeenCalledWith(GALLERY.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(GALLERY.CACHE.LIFE);
    expect(sentCookie(fetch)).toBe(SESSION_COOKIE);
  });

  it("never keeps a photo's link longer than it lives", () => {
    // The rows hold private links signed for an hour.
    expect(GALLERY.CACHE.LIFE.expire).toBeLessThanOrEqual(
      IMAGE_SERVER.LINK.PRIVATE_HOURS * UNIT.SECONDS_PER_HOUR
    );
    expect(GALLERY.CACHE.LIFE.stale).toBeGreaterThanOrEqual(
      5 * UNIT.SECONDS_PER_MINUTE
    );
  });

  it("throws when signed out, so no empty feed is kept", async () => {
    vi.mocked(readSessionCookie).mockResolvedValueOnce("");
    stubFetchJson({}, HTTP.STATUS.UNAUTHORIZED);
    await expect(hydrate()).rejects.toThrow();
  });
});
