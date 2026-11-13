import { MUTATION } from "@/shared/constants/mutation";
import { QUERY } from "@/shared/constants/query";
import {
  bulkDeleteMutation,
  useBeingDeleted,
} from "@/shared/utils/bulk-delete";
import { deleteUsers } from "../actions/delete-users";

/**
 * Deletes the Users named through the `deleteUsers` action (a bulk delete:
 * `bulkDeleteMutation`), then reads the Users and the Storage overview again:
 * their Avatars went with them.
 */
export const deleteUsersMutation = bulkDeleteMutation({
  action: deleteUsers,
  invalidates: [QUERY.USERS.ALL, QUERY.STORAGE.ALL],
  mutationKey: MUTATION.USERS.DELETE,
});

/** The Users a deletion is on its way for, so the list fades their rows at once. */
export const useUsersBeingDeleted = () =>
  useBeingDeleted(MUTATION.USERS.DELETE);
