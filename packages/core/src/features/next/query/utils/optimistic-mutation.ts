import {
  mutationOptions,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { invalidateStatic } from "./invalidate-static";
import type { Rollback } from "./optimistic-update";

/** Writes the cache before the server answers; answers how to undo it. */
export type PatchCache<TVariables> = (
  queryClient: QueryClient,
  variables: TVariables
) => Promise<Rollback>;

/**
 * Reads every key again in this browser; settles once all of them have
 * answered. A `staleTime: "static"` query is read again too (`invalidateStatic`),
 * except an active one under a `keep` key.
 */
export const invalidateAll = async (
  queryClient: QueryClient,
  keys: readonly QueryKey[],
  keep: readonly QueryKey[] = []
) => {
  await Promise.all(
    keys.map((queryKey) => invalidateStatic(queryClient, queryKey, { keep }))
  );
};

const NOTHING_TO_UNDO: Rollback = () => undefined;

/**
 * A write the server almost never refuses, as a TanStack mutation that shows
 * its result at once: `patchCache` writes the cache first (see
 * `optimisticUpdate`), then the server `action` runs. The action answers its
 * result, or `null` when the API refused (a thrown error reaches the browser
 * without its message in production), and a `null` fails the mutation. Any
 * failure undoes the patch. It settles only once every key in `invalidates`
 * is read again (`onSettled` returns the refetch), so nothing shows the old
 * answer in between. Two mutations of the same `scope` run one after the
 * other. Never retried.
 */
export const optimisticMutation = <
  TVariables,
  TResult,
  const TKey extends QueryKey,
>({
  action,
  invalidates,
  keeps,
  mutationKey,
  patchCache,
  scope,
}: {
  action: (variables: TVariables) => Promise<TResult | null>;
  /** The kept reads this browser holds that the change moves. */
  invalidates: readonly QueryKey[];
  /**
   * Keys under `invalidates` the patch left exactly right (the action's answer
   * is the state it wrote): once saved, an active read there is kept as
   * patched, not read again page after page. A save that fails reads them all.
   */
  keeps?: (variables: TVariables) => readonly QueryKey[];
  mutationKey: TKey;
  patchCache?: PatchCache<TVariables>;
  scope?: string;
}) =>
  mutationOptions({
    mutationFn: async (variables: TVariables): Promise<TResult> => {
      const result = await action(variables);
      if (result === null) {
        throw new Error("The API refused the change");
      }
      return result;
    },
    mutationKey,
    onError: (_error, _variables, rollback: Rollback | undefined) =>
      rollback?.(),
    onMutate: (variables, { client: queryClient }): Promise<Rollback> =>
      patchCache
        ? patchCache(queryClient, variables)
        : Promise.resolve(NOTHING_TO_UNDO),
    // TanStack hands the client last, after the answer, error, variables and
    // the patch's rollback.
    onSettled: async (...callbackArgs) => {
      const [, error, variables, , { client: queryClient }] = callbackArgs;
      await invalidateAll(
        queryClient,
        invalidates,
        error === null && keeps ? keeps(variables) : []
      );
    },
    retry: false,
    ...(scope === undefined ? {} : { scope: { id: scope } }),
  });
