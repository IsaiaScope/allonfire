import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { AOFGetQueryClient } from "@allonfire/core/features/next/query/utils/aof-get-query-client";
import { dehydrate } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { IMAGES } from "../constants/images";
import type { ImagesParams } from "../constants/images-params";
import {
  fetchImage,
  fetchImages,
  imageKey,
  imagesListKey,
} from "./images-queries";

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

/**
 * One Image as the visitor's Session reads it, ready for their edit form
 * under the key it reads back. Kept in the visitor's browser only (`"use
 * cache: private"`) under the list's tag, so a link prefetches the page; the
 * form sends the Image's `version` and the API refuses a save on an older
 * one (ADR 0028). Dehydrated inside that cache, like the list. A refusal,
 * an unknown id included, is thrown, never kept: the view asks again and
 * tells it is gone.
 */
export const imageHydration = async (id: string) => {
  "use cache: private";
  cacheTag(IMAGES.CACHE.TAG);
  cacheLife(IMAGES.CACHE.LIFE);
  const queryClient = AOFGetQueryClient();
  queryClient.setQueryData(
    imageKey(id),
    await fetchImage(sessionApi(await readSessionCookie()), id)
  );
  return dehydrate(queryClient);
};
