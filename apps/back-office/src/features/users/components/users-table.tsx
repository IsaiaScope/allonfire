"use client";

import { USER } from "@allonfire/auth/features/users/constants/users";
import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { objectKeys, objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { useListTable } from "@allonfire/ui/features/data-table/hooks/use-list-table";
import { useStepBackPastEnd } from "@allonfire/ui/features/data-table/hooks/use-step-back-past-end";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/features/api/utils/api";
import { ListTable } from "@/shared/components/list-table";
import { queryOf } from "../constants/users-params";
import { useSelectableUsers } from "../hooks/use-selectable-users";
import { useUsersTableState } from "../hooks/use-users-table-state";
import { userRow } from "../utils/user-row";
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
const FILL_COLUMNS = ["email", ...objectValues(App), "created"];

/**
 * The Users list: the toolbar, then one page of Users from the address,
 * read under the key the page prefetched it with, so it opens filled. A
 * new page keeps the previous rows on screen until it arrives. Rows can be
 * selected for deletion, all but the signed-in User's own (`selfId`), and
 * leave the list the moment it is confirmed (`bulkDeleteMutation`); the selection holds only for the
 * page in view and clears when the address changes (`useUsersTableState`).
 */
export const UsersTable = ({ selfId }: { selfId: string }) => {
  const t = useTranslations("Users");
  const paginationWords = useTranslations("Users.pagination");
  const tableState = useUsersTableState();
  const { clearSearch, clearSelection, params, selection, stepBackTo } =
    tableState;
  // The API is asked, and the cache keyed, by the query alone: hiding a
  // column asks nothing again.
  const pageQuery = useQuery({
    ...usersQuery(api, queryOf(params)),
    placeholderData: keepPreviousData,
  });
  // A page past the last one (its Users all deleted, or an edited address)
  // steps back; until it has, the skeleton stands in, not "nobody matches".
  const status = useStepBackPastEnd({
    firstPage: USER.DEFAULT_PAGE,
    page: params[USER.PARAM.PAGE],
    query: pageQuery,
    rows: pageQuery.data?.users.length,
    stepTo: stepBackTo,
  });
  const { card, columns } = useSelectableUsers();

  const table = useListTable({
    columns,
    data: pageQuery.data?.users ?? NO_USERS,
    enableRowSelection: (row) => row.original.id !== selfId,
    getRowId: ({ id }) => id,
    pageCount: pageQuery.data?.pageCount ?? -1,
    state: tableState,
  });

  return (
    <ListTable
      card={card}
      className={userRow()}
      fill={FILL_COLUMNS}
      label={t("list")}
      pageSizes={USER.PAGE_SIZES}
      states={{
        empty: <UsersNotice kind="empty" onAction={clearSearch} />,
        error: <UsersNotice kind="error" onAction={pageQuery.refetch} />,
        loading: <UsersRowsSkeleton />,
      }}
      status={status}
      table={table}
      words={paginationWords}
    >
      <UsersToolbar>
        <DeleteUsers
          onClear={clearSelection}
          selectedIds={objectKeys(selection)}
        />
      </UsersToolbar>
    </ListTable>
  );
};
