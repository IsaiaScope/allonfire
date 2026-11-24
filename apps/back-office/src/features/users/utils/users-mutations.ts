import { USER } from "@allonfire/auth/features/users/constants/users";
import { bulkDeleteMutation } from "@allonfire/ui/features/data-table/utils/bulk-delete";
import { MUTATION } from "@/shared/constants/mutation";
import { QUERY } from "@/shared/constants/query";
import { deleteUsers } from "../actions/delete-users";
import { usersPageWithout } from "./users-page-without";

/**
 * Deletes the Users named through the `deleteUsers` action (a bulk delete:
 * `bulkDeleteMutation`) after taking their rows out of the cached pages, then reads the Users and the Storage overview again:
 * their Avatars went with them.
 */
export const deleteUsersMutation = bulkDeleteMutation({
  action: deleteUsers,
  invalidates: [QUERY.USERS.ALL, QUERY.STORAGE.ALL],
  mutationKey: MUTATION.USERS.DELETE,
  pages: QUERY.USERS.PAGES,
  perPageParam: USER.PARAM.PER_PAGE,
  without: usersPageWithout,
});
