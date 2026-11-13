import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { AOFGetQueryClient } from "@allonfire/core/features/next/query/utils/aof-get-query-client";
import { dehydrate } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { STORAGE } from "../constants/storage";
import {
  fetchStorageOverview,
  storageOverviewKey,
} from "./storage-overview-queries";

/**
 * The Storage overview as the visitor's Session reads it, ready for the
 * view's TanStack cache under the key it reads back. Kept in their browser
 * only (`"use cache: private"`, ADR 0028) under `STORAGE.CACHE`, so a link can
 * prefetch Home; dehydrated inside that cache, since TanStack stamps the time
 * into what it dehydrates. The numbers can be minutes old, and every Image
 * change drops this copy (`updateTag`). A refusal (a member who is not an
 * Admin) is thrown, never kept: the page leaves it to the view.
 */
export const storageOverviewHydration = async () => {
  "use cache: private";
  cacheTag(STORAGE.CACHE.TAG);
  cacheLife(STORAGE.CACHE.LIFE);
  const queryClient = AOFGetQueryClient();
  queryClient.setQueryData(
    storageOverviewKey,
    await fetchStorageOverview(sessionApi(await readSessionCookie()))
  );
  return dehydrate(queryClient);
};
