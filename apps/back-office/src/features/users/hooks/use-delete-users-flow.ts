import { useTranslations } from "next-intl";
import { useBulkDeleteFlow } from "@/shared/hooks/use-bulk-delete-flow";
import { deleteUsersMutation } from "../utils/users-mutations";

/** Deleting the `selectedIds` Users: `useBulkDeleteFlow` over `deleteUsersMutation`, in the `Users.delete` words. */
export const useDeleteUsersFlow = (
  selectedIds: string[],
  onClear: () => void
) =>
  useBulkDeleteFlow({
    mutation: deleteUsersMutation,
    onClear,
    selectedIds,
    t: useTranslations("Users.delete"),
  });
