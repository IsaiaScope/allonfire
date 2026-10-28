import { mutationOptions } from "@tanstack/react-query";
import { MUTATION } from "@/shared/constants/mutation";
import { deleteUsers } from "../actions/delete-users";

/**
 * Deletes the Users named through the `deleteUsers` action; answers how many
 * went, and throws when the API refused, so the mutation fails. Never retried.
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
});
