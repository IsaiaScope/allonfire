import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { AOFGetQueryClient } from "@allonfire/core/features/next/query/utils/aof-get-query-client";
import { dehydrate } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { GALLERY } from "../constants/gallery";
import { fetchGalleryPage, galleryFeedQuery } from "./gallery-queries";

/**
 * The Gallery's first page as the visitor's Session reads it (the API checks
 * it), ready for the feed's TanStack cache under the key it reads back. Kept
 * in their browser only (`"use cache: private"`, never on this server, never
 * keyed on the Session) under `GALLERY.CACHE.TAG`, so a prefetch carries it
 * before the click; every change to the photos calls `updateTag` on it
 * (ADR 0028). Dehydrated inside that cache: TanStack stamps the time into
 * what it dehydrates, and a time read outside a cache keeps the page out of
 * every prefetch. A refusal is thrown, never kept.
 */
export const galleryHydration = async () => {
  "use cache: private";
  cacheTag(GALLERY.CACHE.TAG);
  cacheLife(GALLERY.CACHE.LIFE);
  const client = sessionApi(await readSessionCookie());
  const queryClient = AOFGetQueryClient();
  queryClient.setQueryData(galleryFeedQuery(client).queryKey, {
    pageParams: [GALLERY.FIRST_PAGE],
    pages: [await fetchGalleryPage(client, GALLERY.FIRST_PAGE)],
  });
  return dehydrate(queryClient);
};
