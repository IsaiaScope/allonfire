import { useBulkDeleteFlow } from "@allonfire/ui/features/data-table/hooks/use-bulk-delete-flow";
import { useTranslations } from "next-intl";
import { deleteImagesMutation } from "../utils/images-mutations";

/** Deleting the `selectedIds` Images: `useBulkDeleteFlow` over `deleteImagesMutation`, in the `Images.delete` words. */
export const useDeleteImagesFlow = (
  selectedIds: string[],
  onClear: () => void
) =>
  useBulkDeleteFlow({
    mutation: deleteImagesMutation,
    onClear,
    selectedIds,
    t: useTranslations("Images.delete"),
  });
