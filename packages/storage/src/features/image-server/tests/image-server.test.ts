// @module-tag unit
import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE_SERVER } from "../constants/image-server";

describe("IMAGE_SERVER link cache and refresh", () => {
  const MIN_LINK_SECONDS =
    IMAGE_SERVER.LINK.PRIVATE_HOURS * UNIT.SECONDS_PER_HOUR;
  const TEN_MINUTES_MS = 10 * UNIT.MS_PER_MINUTE;

  it("keeps a cache of signed private links for their minimum life, never longer", () => {
    expect(IMAGE_SERVER.LINK.CACHE_LIFE.expire).toBe(MIN_LINK_SECONDS);
  });

  it("reads the links again in the background after half of that life", () => {
    expect(IMAGE_SERVER.LINK.CACHE_LIFE.revalidate).toBe(MIN_LINK_SECONDS / 2);
  });

  it("lets another browser reuse its copy for at least five minutes", () => {
    expect(IMAGE_SERVER.LINK.CACHE_LIFE.stale).toBeGreaterThanOrEqual(
      5 * UNIT.SECONDS_PER_MINUTE
    );
  });

  it("asks the page to refresh its links ten minutes before they stop working", () => {
    expect(IMAGE_SERVER.LINK.REFRESH_MS).toBe(
      MIN_LINK_SECONDS * UNIT.MS_PER_SECOND - TEN_MINUTES_MS
    );
    expect(IMAGE_SERVER.LINK.REFRESH_MS).toBeLessThan(
      IMAGE_SERVER.LINK.CACHE_LIFE.expire * UNIT.MS_PER_SECOND
    );
  });
});

describe("IMAGE_SERVER.CACHE", () => {
  it("lets a deleted picture's link answer 404 within the cache's check plus a second", () => {
    expect(IMAGE_SERVER.CACHE.GONE_WITHIN_MS).toBe(
      (IMAGE_SERVER.CACHE.CHECK_SECONDS + 1) * UNIT.MS_PER_SECOND
    );
  });
});
