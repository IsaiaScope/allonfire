// @module-tag unit

import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { answeringApi } from "@allonfire/core/features/next/api/tests/answering-api";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { DetailedError, hc } from "hono/client";
import { QUERY } from "@/shared/constants/query";
import { GALLERY_PAGE, GALLERY_PAGE_TWO } from "@/shared/tests/msw/handlers";
import { GALLERY, type GallerySource } from "../../constants/gallery";
import {
  favoritesFeedQuery,
  feedQueryFor,
  fetchFavoritesPage,
  fetchGalleryPage,
  galleryFeedQuery,
} from "../gallery-queries";

const answering = (body: unknown) =>
  answeringApi(hc<ApiType>, LOCAL.URL.TEST_API, body);
const { client: api } = answering({});

describe.each([
  ["gallery", galleryFeedQuery, QUERY.GALLERY.FEED],
  ["favorites", favoritesFeedQuery, QUERY.FAVORITES.FEED],
] as const)("%s feed query", (_name, feedQuery, key) => {
  it("is keyed so the server's first page and the client's read share it", () => {
    expect(feedQuery(api).queryKey).toEqual(key);
  });

  it("starts at the first page, without a cursor", () => {
    expect(feedQuery(api).initialPageParam).toBeNull();
  });

  it("asks for the page after a page that has a next cursor, and for none after the last", () => {
    const { getNextPageParam } = feedQuery(api);
    expect(getNextPageParam(GALLERY_PAGE, [], null, [])).toBe(
      GALLERY_PAGE.nextCursor
    );
    expect(getNextPageParam(GALLERY_PAGE_TWO, [], null, [])).toBeUndefined();
  });

  // Tasks 0 and 1: it never reads the clock at render, and `invalidateStatic`
  // is what asks for it again.
  it("is never stale, so only an action or the link refresh asks for it again", () => {
    expect(feedQuery(api).staleTime).toBe("static");
  });

  it("does not ask again after the API refused, and asks once more after a server failure", () => {
    const { retry } = feedQuery(api);
    if (typeof retry !== "function") {
      throw new TypeError("retry is a function");
    }
    const refused = new DetailedError("refused", {
      statusCode: HTTP.STATUS.UNAUTHORIZED,
    });
    const broken = new DetailedError("broken", {
      statusCode: HTTP.STATUS.INTERNAL_SERVER_ERROR,
    });
    expect(retry(0, refused)).toBe(false);
    expect(retry(0, broken)).toBe(true);
    expect(retry(GALLERY.RETRIES, broken)).toBe(false);
  });
});

describe.each([
  ["gallery", fetchGalleryPage],
  ["favorites", fetchFavoritesPage],
] as const)("fetch %s page", (_name, fetchPage) => {
  it("sends the page size and no cursor for the first page, and answers the body", async () => {
    const { client, seen } = answering(GALLERY_PAGE);
    expect(await fetchPage(client, null)).toEqual(GALLERY_PAGE);
    expect(objectFromEntries(seen[0]?.searchParams ?? [])).toEqual({
      limit: String(GALLERY.PAGE_SIZE),
    });
  });

  it("sends the cursor it was given", async () => {
    const { client, seen } = answering(GALLERY_PAGE_TWO);
    await fetchPage(client, "c1");
    expect(objectFromEntries(seen[0]?.searchParams ?? [])).toEqual({
      cursor: "c1",
      limit: String(GALLERY.PAGE_SIZE),
    });
  });
});

describe("feedQueryFor", () => {
  it("picks each source's own feed", () => {
    const sources: GallerySource[] = [
      GALLERY.SOURCE.GALLERY,
      GALLERY.SOURCE.FAVORITES,
    ];
    expect(sources.map((source) => feedQueryFor(source, api).queryKey)).toEqual(
      [QUERY.GALLERY.FEED, QUERY.FAVORITES.FEED]
    );
  });
});
