import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { AOFGetQueryClient } from "@allonfire/core/features/next/query/utils/aof-get-query-client";
import { dehydrate } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { GALLERY } from "../constants/gallery";
import { favoritesFeedQuery, fetchFavoritesPage } from "./gallery-queries";

/**
 * The Favorites' first page as the visitor's Session reads it, ready for the
 * feed's TanStack cache under the key it reads back. Kept like the Gallery's
 * (`galleryHydration`): in the visitor's browser only, under
 * `GALLERY.CACHE.TAG`, dehydrated inside the cache. Written out beside it, not
 * shared, because the cache directive must be literal in each function. A
 * refusal is thrown, never kept.
 */
export const favoritesHydration = async () => {
  "use cache: private";
  cacheTag(GALLERY.CACHE.TAG);
  cacheLife(GALLERY.CACHE.LIFE);
  const client = sessionApi(await readSessionCookie());
  const queryClient = AOFGetQueryClient();
  queryClient.setQueryData(favoritesFeedQuery(client).queryKey, {
    pageParams: [GALLERY.FIRST_PAGE],
    pages: [await fetchFavoritesPage(client, GALLERY.FIRST_PAGE)],
  });
  return dehydrate(queryClient);
};
