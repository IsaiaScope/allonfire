"use client";

import { USER } from "@allonfire/auth/features/users/constants/users";
import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { objectKeys, objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { useAOFTable } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { api } from "@/features/api/utils/api";
import { ListTable } from "@/shared/components/list-table";
import { useSelectableUsers } from "../hooks/use-selectable-users";
import { useUsersTableState } from "../hooks/use-users-table-state";
import { userRow } from "../utils/user-row";
import { useUsersBeingDeleted } from "../utils/users-mutations";
import { usersQuery } from "../utils/users-queries";
import { DeleteUsers } from "./delete-users";
import { UsersRowsSkeleton } from "./users-list-skeleton";
import { UsersNotice } from "./users-notice";
import { UsersToolbar } from "./users-toolbar";

const NO_USERS: UserBody[] = [];

/**
 * Every column but the checkboxes shares the room a wide screen leaves over,
 * each in proportion to what it holds.
 */
const FILL = ["email", ...objectValues(App), "createdAt"];

/**
 * The Users list: the toolbar, then one page of Users from the address,
 * read under the key the page prefetched it with, so it opens filled. A
 * new page keeps the previous rows on screen until it arrives. Rows can be
 * selected for deletion, all but the signed-in User's own (`selfId`), and
 * fade while their deletion is on its way; the selection holds only for the
 * page in view and clears when the address changes (`useUsersTableState`).
 */
export const UsersTable = ({ selfId }: { selfId: string }) => {
  const t = useTranslations("Users");
  const words = useTranslations("Users.pagination");
  const {
    clearSearch,
    clearSelection,
    onPaginationChange,
    pagination,
    params,
    selection,
    setSelection,
    toPage,
  } = useUsersTableState();
  const list = useQuery({
    ...usersQuery(api, params),
    placeholderData: keepPreviousData,
  });
  const deleting = useUsersBeingDeleted();
  const { card, columns } = useSelectableUsers();

  const lastPage = list.data?.pageCount ?? USER.DEFAULT_PAGE;
  const toLastPage = useCallback(() => toPage(lastPage), [lastPage, toPage]);

  const table = useAOFTable({
    columns,
    data: list.data?.users ?? NO_USERS,
    enableRowSelection: (row) => row.original.id !== selfId,
    getRowId: ({ id }) => id,
    manualPagination: true,
    onPaginationChange,
    onRowSelectionChange: setSelection,
    pageCount: list.data?.pageCount ?? -1,
    state: { pagination, rowSelection: selection },
  });

  // Past the last page (a hand-edited address): Users match, just not here.
  // When nobody matches at all, that is the plain empty state.
  const pastEnd =
    (list.data?.total ?? 0) > 0 && params[USER.PARAM.PAGE] > lastPage;
  return (
    <ListTable
      card={card}
      className={userRow()}
      deleting={deleting}
      fill={FILL}
      label={t("list")}
      pageSizes={USER.PAGE_SIZES}
      states={{
        empty: pastEnd ? (
          <UsersNotice kind="pastEnd" onAction={toLastPage} />
        ) : (
          <UsersNotice kind="empty" onAction={clearSearch} />
        ),
        error: <UsersNotice kind="error" onAction={list.refetch} />,
        loading: <UsersRowsSkeleton />,
      }}
      status={list.status}
      table={table}
      words={words}
    >
      <UsersToolbar>
        <DeleteUsers ids={objectKeys(selection)} onClear={clearSelection} />
      </UsersToolbar>
    </ListTable>
  );
};
