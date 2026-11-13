import { API } from "@allonfire/api/shared/constants/api";
import { queryOptions } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import type { ApiClient } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";
import { retryUnlessRefused } from "@/shared/utils/retry";
import { STORAGE } from "../constants/storage";

/**
 * Asks once more after a server or network failure; never after the API
 * refused (a 401 or 403), so a member who is not an Admin sees Home at once.
 * @internal
 */
export const retryStorageOverview = retryUnlessRefused(STORAGE.RETRIES);

/** The Storage overview, as the API answers an Admin. */
export const fetchStorageOverview = (client: ApiClient) =>
  parseResponse(client[API.VERSION.CURRENT].storage.overview.$get());

type StorageOverview = Awaited<ReturnType<typeof fetchStorageOverview>>;
export type StorageBucket = StorageOverview["buckets"][number];
export type StorageImages = StorageOverview["images"];
export type StorageAvatars = StorageOverview["avatars"];

/**
 * The overview's key, tagged with the body it holds: the page hydrates under
 * it, so a wrong body fails to compile, never a skipped hydration.
 */
export const storageOverviewKey = queryOptions<StorageOverview>({
  queryKey: QUERY.STORAGE.OVERVIEW,
}).queryKey;

/**
 * The overview. The page reads it on the server (`storageOverviewHydration`,
 * a copy kept up to `STORAGE.CACHE.LIFE`) and the view reads it back under
 * the same key. It is asked again only when an Image change refreshed it
 * (the Images mutations), never on a clock: `"static"`,
 * since a number makes TanStack read the time while the page prerenders, and
 * a time read there blocks a navigation to the page.
 */
export const storageOverviewQuery = (client: ApiClient) =>
  queryOptions({
    queryFn: () => fetchStorageOverview(client),
    queryKey: storageOverviewKey,
    retry: retryStorageOverview,
    staleTime: "static",
  });
