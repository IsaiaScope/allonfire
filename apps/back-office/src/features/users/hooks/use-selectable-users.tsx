import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import type { AOFRow } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback } from "react";
import { useSelectableRows } from "@/shared/hooks/use-selectable-rows";
import { UserCard } from "../components/user-card";
import { useUserColumns } from "../components/user-columns";

/** A row's card on a phone, around its selection box. */
const userCard = (row: AOFRow<UserBody>, select: ReactNode) => (
  <UserCard select={select} user={row.original} />
);

/** The list's columns, a selection box first, and each row's card on a
 *  phone, its own box at the top. */
export const useSelectableUsers = () => {
  const t = useTranslations("Users");
  const columns = useUserColumns();
  const label = useCallback(
    (row: AOFRow<UserBody>) =>
      t("delete.select", { email: row.original.email }),
    [t]
  );
  return useSelectableRows({
    all: t("delete.selectAll"),
    card: userCard,
    columns,
    label,
  });
};
