"use client";

import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { BulkDeleteControl } from "@/shared/components/bulk-delete-control";
import { IMAGES } from "../constants/images";
import { useDeleteImagesFlow } from "../hooks/use-delete-images-flow";

/**
 * The toolbar's Delete button for the Images selected, and the question before
 * they are deleted (`useDeleteImagesFlow`, shown by `BulkDeleteControl`).
 */
export const DeleteImages = ({
  selectedIds,
  onClear,
  shape,
}: {
  /** The Images selected. */
  selectedIds: string[];
  onClear: () => void;
  /** `labeled` where the page has room for the word beside the icon (the edit page). */
  shape?: ComponentProps<typeof BulkDeleteControl>["shape"];
}) => {
  const t = useTranslations("Images.delete");
  const flow = useDeleteImagesFlow(selectedIds, onClear);
  return (
    <BulkDeleteControl
      count={selectedIds.length}
      flow={flow}
      kanji={IMAGES.KANJI.DELETE}
      shape={shape}
      t={t}
    />
  );
};
