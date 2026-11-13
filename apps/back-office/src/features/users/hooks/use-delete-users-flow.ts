import { useTranslations } from "next-intl";
import { useBulkDeleteFlow } from "@/shared/hooks/use-bulk-delete-flow";
import { deleteUsersMutation } from "../utils/users-mutations";

/** Deleting the `selected` Users: `useBulkDeleteFlow` over `deleteUsersMutation`, in the `Users.delete` words. */
export const useDeleteUsersFlow = (selected: string[], onClear: () => void) =>
  useBulkDeleteFlow({
    mutation: deleteUsersMutation,
    onClear,
    selected,
    t: useTranslations("Users.delete"),
  });
