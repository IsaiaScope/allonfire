import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import type { AOFDataTableSkeletonColumn } from "@allonfire/ui/features/data-table/components/aof-data-table-skeleton";
import { useTranslations } from "next-intl";
import {
  ListRowsSkeleton,
  ListSkeleton,
} from "@/shared/components/list-skeleton";
import { userRow } from "../utils/user-row";

/** The table's columns as the list lays them out: the selection box, the
 *  email (the widest, filling the rest), a Role per App, the date (the
 *  link to the User), at the sizes `useUserColumns` gives them.
 *  The table's browser test checks the count against the real table. */
const COLUMNS: readonly AOFDataTableSkeletonColumn[] = [
  { check: true, track: "48px" },
  { track: "minmax(0,1fr)" },
  ...objectValues(App).map(() => ({ track: "140px" })),
  { track: "140px" },
];

/** The Users list's rows while they load (`ListRowsSkeleton`). */
export const UsersRowsSkeleton = () => {
  const t = useTranslations("Users");
  return (
    <ListRowsSkeleton
      className={userRow()}
      columns={COLUMNS}
      label={t("loading")}
    />
  );
};

/** The Users list before its rows arrive (`ListSkeleton`). */
export const UsersListSkeleton = () => (
  <ListSkeleton rows={<UsersRowsSkeleton />} />
);
