import {
  partialMatchKey,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

/**
 * Whether the query's last observer read it as static: the options TanStack
 * keeps on a query carry the observer's `staleTime`, though its type omits it.
 */
const wasStatic = (options: object) =>
  "staleTime" in options && options.staleTime === "static";

/**
 * `invalidateQueries` that also reads a `staleTime: "static"` query again.
 * The installed TanStack never refetches an active static query on an
 * invalidation (pinned by `static-stale-time.test.ts`), and such a query is
 * still never stale once it is invalidated, so:
 *
 * 1. `invalidateQueries` marks everything under `queryKey` and reads the
 *    active numeric queries again.
 * 2. Each observer of an active static query reads it again (an infinite query
 *    reads every loaded page, in order).
 * 3. An inactive static query is removed, so the page's next hydration fills
 *    it: the server's copy is newer after the action's `updateTag`.
 *
 * `keep` names keys whose active static queries step 2 skips: a change that
 * patched them exactly (a heart on a photo) has nothing new to read, and
 * reading every loaded page of an infinite feed would cost one request each.
 * Step 3 still removes them when inactive.
 */
export const invalidateStatic = async (
  queryClient: QueryClient,
  queryKey: QueryKey,
  { keep = [] }: { keep?: readonly QueryKey[] } = {}
) => {
  await queryClient.invalidateQueries({ queryKey });
  const reads: Promise<unknown>[] = [];
  for (const query of queryClient.getQueryCache().findAll({ queryKey })) {
    if (query.isActive() && query.isStatic()) {
      if (keep.some((kept) => partialMatchKey(query.queryKey, kept))) {
        continue;
      }
      for (const observer of query.observers) {
        reads.push(observer.refetch());
      }
    } else if (!query.isActive() && wasStatic(query.options)) {
      queryClient.removeQueries({ exact: true, queryKey: query.queryKey });
    }
  }
  await Promise.all(reads);
};
