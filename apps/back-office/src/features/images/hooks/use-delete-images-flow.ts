import { useTranslations } from "next-intl";
import { useBulkDeleteFlow } from "@/shared/hooks/use-bulk-delete-flow";
import { deleteImagesMutation } from "../utils/images-mutations";

/** Deleting the `selected` Images: `useBulkDeleteFlow` over `deleteImagesMutation`, in the `Images.delete` words. */
export const useDeleteImagesFlow = (selected: string[], onClear: () => void) =>
  useBulkDeleteFlow({
    mutation: deleteImagesMutation,
    onClear,
    selected,
    t: useTranslations("Images.delete"),
  });
