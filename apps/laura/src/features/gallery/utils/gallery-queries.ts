import { API } from "@allonfire/api/shared/constants/api";
import { staticQuery } from "@allonfire/core/features/next/query/utils/static-query";
import { type InfiniteData, infiniteQueryOptions } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import type { ApiClient } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";
import { GALLERY } from "../constants/gallery";
import type { GallerySource } from "../constants/gallery-schema";

/** Where a page starts: the `nextCursor` of the page before, `null` for the first. */
export type GalleryCursor = string | null;

/** The first page's cursor, typed as any page's (`GALLERY.FIRST_PAGE` alone is only `null`). */
const FIRST_PAGE: GalleryCursor = GALLERY.FIRST_PAGE;

/** What a page's request asks: its size, and where it starts. */
const pageQuery = (cursor: GalleryCursor) => ({
  limit: String(GALLERY.DEFAULT.PAGE_SIZE),
  ...(cursor === null ? {} : { cursor }),
});

/** One page of the Gallery from the API; an error throws `DetailedError`. */
export const fetchGalleryPage = (client: ApiClient, cursor: GalleryCursor) =>
  parseResponse(
    client[API.VERSION.CURRENT][API.SEGMENT.LAURA].gallery.$get({
      query: pageQuery(cursor),
    })
  );

/** One page of the Favorites from the API; an error throws `DetailedError`. */
export const fetchFavoritesPage = (client: ApiClient, cursor: GalleryCursor) =>
  parseResponse(
    client[API.VERSION.CURRENT][API.SEGMENT.LAURA].favorites.$get({
      query: pageQuery(cursor),
    })
  );

/** A page as either list answers it: both lists share one body. */
export type GalleryPage = Awaited<ReturnType<typeof fetchGalleryPage>>;

/** Every page loaded so far, with the cursor each was asked with. */
export type GalleryFeed = InfiniteData<GalleryPage, GalleryCursor>;

/**
 * A list read page after page. Never stale (`staleTime: "static"`: it never
 * reads the clock at render), so it is asked again only by `invalidateAll`'s
 * `invalidateStatic` or the link refresh. The key is tagged with the feed it
 * holds, so a hydration under it cannot hold a wrong body. It asks once more
 * after a server or network failure, never after a refusal; a failed first
 * load has no data, so the provider never toasts it, and a failed later page
 * toasts by itself.
 */
const feedQuery =
  (
    queryKey: typeof QUERY.GALLERY.FEED | typeof QUERY.FAVORITES.FEED,
    fetchPage: (
      client: ApiClient,
      cursor: GalleryCursor
    ) => Promise<GalleryPage>
  ) =>
  (client: ApiClient) =>
    infiniteQueryOptions({
      getNextPageParam: (last: GalleryPage): GalleryCursor | undefined =>
        last.nextCursor ?? undefined,
      initialPageParam: FIRST_PAGE,
      queryFn: ({ pageParam }) => fetchPage(client, pageParam),
      queryKey,
      ...staticQuery({ retries: GALLERY.LIMIT.RETRIES }),
    });

/** The Gallery, page after page. */
export const galleryFeedQuery = feedQuery(QUERY.GALLERY.FEED, fetchGalleryPage);

/** The Favorites, page after page. */
export const favoritesFeedQuery = feedQuery(
  QUERY.FAVORITES.FEED,
  fetchFavoritesPage
);

/** The feed a source reads. */
export const feedQueryFor = (source: GallerySource, client: ApiClient) =>
  source === GALLERY.SOURCE.FAVORITES
    ? favoritesFeedQuery(client)
    : galleryFeedQuery(client);
