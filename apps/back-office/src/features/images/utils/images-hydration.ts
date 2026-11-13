import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { AOFGetQueryClient } from "@allonfire/core/features/next/query/utils/aof-get-query-client";
import { dehydrate } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { IMAGES } from "../constants/images";
import type { ImagesParams } from "../constants/images-params";
import { fetchImages, imagesListKey } from "./images-queries";

/**
 * One page of Images as the visitor's Session reads it (the API checks them),
 * ready for the table's TanStack cache under the key it reads back. Kept in
 * their browser only (`"use cache: private"`, never on this server, never
 * keyed on the Session) under `IMAGES.CACHE.TAG`, so a prefetch carries it
 * before the click; every change to Images calls `updateTag` on it
 * (ADR 0028). Dehydrated inside that cache: TanStack stamps the time into
 * what it dehydrates, and a time read outside a cache keeps the list out of
 * every prefetch. A refusal is thrown, never kept.
 */
export const imagesHydration = async (params: ImagesParams) => {
  "use cache: private";
  cacheTag(IMAGES.CACHE.TAG);
  cacheLife(IMAGES.CACHE.LIFE);
  const queryClient = AOFGetQueryClient();
  queryClient.setQueryData(
    imagesListKey(params),
    await fetchImages(sessionApi(await readSessionCookie()), params)
  );
  return dehydrate(queryClient);
};
