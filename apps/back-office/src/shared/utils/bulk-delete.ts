import {
  type MutationState,
  mutationOptions,
  type QueryKey,
  useMutationState,
} from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * A bulk delete as a TanStack mutation: calls the feature's server `action`
 * with the ids; answers how many went (fewer than named when some were gone
 * already), and throws when the API refused (the action answers null), so the
 * mutation fails. Never retried. It settles only once every key in
 * `invalidates` is read again (`onSettled` returns the refetch), so
 * `useBeingDeleted` keeps a row faded until the fresh list has it gone, never
 * showing it again in between.
 */
export const bulkDeleteMutation = <const Key extends QueryKey>({
  action,
  invalidates,
  mutationKey,
}: {
  action: (ids: string[]) => Promise<number | null>;
  /** The kept reads this browser holds that the deletion changes: the list and, for a file, the Storage overview. */
  invalidates: readonly QueryKey[];
  mutationKey: Key;
}) =>
  mutationOptions({
    mutationFn: async (ids: string[]) => {
      const deleted = await action(ids);
      if (deleted === null) {
        throw new Error("The API refused the deletion");
      }
      return { deleted };
    },
    mutationKey,
    // TanStack hands the client last, after the answer, error, ids and result.
    onSettled: async (...settled) => {
      const { client } = settled[4];
      await Promise.all(
        invalidates.map((queryKey) => client.invalidateQueries({ queryKey }))
      );
    },
  });

type DeleteState = MutationState<{ deleted: number }, Error, string[]>;

/**
 * The ids a deletion is on its way for, so the list fades their rows at once
 * instead of waiting for the API: a failure brings them back as they were,
 * with nothing to undo.
 */
export const useBeingDeleted = (mutationKey: QueryKey) => {
  // The same array while nothing changes, so the set keeps too.
  const pending = useMutationState<DeleteState>({
    filters: { mutationKey, status: "pending" },
  });
  return useMemo(
    () => new Set(pending.flatMap(({ variables }) => variables ?? [])),
    [pending]
  );
};
