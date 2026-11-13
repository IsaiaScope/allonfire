import type { AOFDataTableSkeletonColumn } from "@allonfire/ui/features/data-table/components/aof-data-table-skeleton";
import { useTranslations } from "next-intl";
import {
  ListRowsSkeleton,
  ListSkeleton,
} from "@/shared/components/list-skeleton";
import { imageRow } from "../utils/image-row";

/** The table's columns as the list lays them out: the selection box, the
 *  picture and alt (the widest, filling the rest), its dimensions, file size,
 *  access, Apps and date, at the sizes `useImageColumns` gives them. The table's browser
 *  test checks the count against the real table. */
const COLUMNS: readonly AOFDataTableSkeletonColumn[] = [
  { check: true, track: "48px" },
  { track: "minmax(0,1fr)" },
  { track: "130px" },
  { track: "100px" },
  { track: "100px" },
  { track: "200px" },
  { track: "170px" },
];

/** The Images list's rows while they load (`ListRowsSkeleton`). */
export const ImagesRowsSkeleton = () => {
  const t = useTranslations("Images");
  return (
    <ListRowsSkeleton
      className={imageRow()}
      columns={COLUMNS}
      label={t("loading")}
    />
  );
};

/** The Images list before its rows arrive (`ListSkeleton`). */
export const ImagesListSkeleton = () => (
  <ListSkeleton rows={<ImagesRowsSkeleton />} />
);
