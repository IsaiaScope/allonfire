import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import type { AOFRow } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback } from "react";
import { useSelectableRows } from "@/shared/hooks/use-selectable-rows";
import { ImageCard } from "../components/image-card";
import { useAltLanguage, useImageColumns } from "../components/image-columns";

/** A row's card on a phone, around its selection box. */
const imageCard = (row: AOFRow<ImageBody>, select: ReactNode) => (
  <ImageCard image={row.original} select={select} />
);

/** The list's columns, a selection box first, and each row's card on a
 *  phone, its own box at the top. */
export const useSelectableImages = () => {
  const t = useTranslations("Images");
  const columns = useImageColumns();
  const language = useAltLanguage();
  const label = useCallback(
    (row: AOFRow<ImageBody>) =>
      t("delete.select", {
        alt: row.original.alt[language] || row.original.alt.en,
      }),
    [language, t]
  );
  return useSelectableRows({
    all: t("delete.selectAll"),
    card: imageCard,
    columns,
    label,
  });
};
