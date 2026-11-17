import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** Puts every cache entry a patch changed back as it was. */
export type Rollback = () => void;

/**
 * Writes to the cache before the server answers: stops the reads under
 * `prefix` (a slower answer would overwrite the patch), patches each cached
 * query under it with `patch` (handed its own key), and answers one rollback
 * that restores every snapshot taken. A query under the prefix that holds no
 * data is skipped; an empty cache is a no-op.
 */
export const optimisticUpdate = async <TData>(
  queryClient: QueryClient,
  prefix: QueryKey,
  patch: (cached: TData, key: QueryKey) => TData
): Promise<Rollback> => {
  await queryClient.cancelQueries({ queryKey: prefix });
  const snapshots: [QueryKey, TData][] = [];
  for (const [key, cached] of queryClient.getQueriesData<TData>({
    queryKey: prefix,
  })) {
    if (cached !== undefined) {
      snapshots.push([key, cached]);
      queryClient.setQueryData<TData>(key, patch(cached, key));
    }
  }
  return () => {
    for (const [key, cached] of snapshots) {
      queryClient.setQueryData<TData>(key, cached);
    }
  };
};
