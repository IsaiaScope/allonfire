import type { QueryKey } from "@tanstack/react-query";
import { optimisticMutation } from "./optimistic-mutation";
import { optimisticUpdate } from "./optimistic-update";
import { perPageIn } from "./page-without";

/**
 * A bulk delete as a TanStack mutation (`optimisticMutation`): `without`
 * takes the rows out of every cached page under `pages` at once (handed the
 * page, the ids as a set and the page size its key was asked with, found under
 * `perPageParam`; a page whose key holds no size is left as it is), then the feature's server
 * `action` runs with the ids. It answers how many went (fewer than named when
 * some were gone already) and `null` when the API refused, which fails the
 * mutation and puts the rows back. It settles only once every key in
 * `invalidates` is read again, so a row never shows in between. Never retried.
 */
export const bulkDeleteMutation = <TPage, const TKey extends QueryKey>({
  action,
  invalidates,
  mutationKey,
  pages,
  perPageParam,
  without,
}: {
  action: (ids: string[]) => Promise<number | null>;
  /** The kept reads this browser holds that the deletion changes: the list and, for a file, the Storage overview. */
  invalidates: readonly QueryKey[];
  mutationKey: TKey;
  /** The key prefix of the list's cached pages. */
  pages: QueryKey;
  /** The name, in a page's key params, of the page size. */
  perPageParam: string;
  /** One cached page with the named rows taken out. */
  without: (page: TPage, ids: ReadonlySet<string>, perPage: number) => TPage;
}) =>
  optimisticMutation({
    action: async (ids: string[]) => {
      const deleted = await action(ids);
      return deleted === null ? null : { deleted };
    },
    invalidates,
    mutationKey,
    patchCache: (queryClient, ids) => {
      const named = new Set(ids);
      return optimisticUpdate<TPage>(queryClient, pages, (page, key) => {
        const perPage = perPageIn(key, perPageParam);
        return perPage === undefined ? page : without(page, named, perPage);
      });
    },
  });
