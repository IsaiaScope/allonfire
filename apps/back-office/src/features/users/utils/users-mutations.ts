import {
  type MutationState,
  mutationOptions,
  useMutationState,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { MUTATION } from "@/shared/constants/mutation";
import { QUERY } from "@/shared/constants/query";
import { deleteUsers } from "../actions/delete-users";

/**
 * Deletes the Users named through the `deleteUsers` action; answers how many
 * went, and throws when the API refused, so the mutation fails. Never retried.
 * It settles only once the list is read again (`onSettled` returns the
 * refetch), so `useUsersBeingDeleted` keeps a row faded until the fresh list
 * has it gone, never showing it again in between.
 */
export const deleteUsersMutation = mutationOptions({
  mutationFn: async (ids: string[]) => {
    const deleted = await deleteUsers(ids);
    if (deleted === null) {
      throw new Error("The API refused the deletion");
    }
    return { deleted };
  },
  mutationKey: MUTATION.USERS.DELETE,
  // TanStack hands the client last, after the answer, error, ids and result.
  onSettled: (...settled) =>
    settled[4].client.invalidateQueries({ queryKey: QUERY.USERS.ALL }),
});

type DeleteUsersState = MutationState<{ deleted: number }, Error, string[]>;

/**
 * The Users a deletion is on its way for, so the list fades their rows at
 * once instead of waiting for the API: a failure brings them back as they
 * were, with nothing to undo.
 */
export const useUsersBeingDeleted = () => {
  // The same array while nothing changes, so the set keeps too.
  const pending = useMutationState<DeleteUsersState>({
    filters: { mutationKey: MUTATION.USERS.DELETE, status: "pending" },
  });
  return useMemo(
    () => new Set(pending.flatMap(({ variables }) => variables ?? [])),
    [pending]
  );
};
