"use client";

import { USER } from "@allonfire/auth/features/users/constants/users";
import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { objectKeys, objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import {
  AOFDataTable,
  type AOFRow,
  type AOFRowSelection,
  useAOFTable,
} from "@allonfire/ui/components/aof-data-table";
import {
  type AOFDataTableLabels,
  AOFDataTablePagination,
} from "@allonfire/ui/components/aof-data-table-pagination";
import {
  AOFRowCheckbox,
  aofSelectColumn,
} from "@allonfire/ui/components/aof-data-table-select";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { api } from "@/features/api/utils/api";
import { usersParams } from "../constants/users-params";
import { userRow } from "../utils/user-row";
import { useUsersBeingDeleted } from "../utils/users-mutations";
import { usersQuery } from "../utils/users-queries";
import { DeleteUsers } from "./delete-users";
import { cardCheckbox, UserCard } from "./user-card";
import { useUserColumns } from "./user-columns";
import { UsersRowsSkeleton } from "./users-list-skeleton";
import { UsersNotice } from "./users-notice";
import { UsersToolbar } from "./users-toolbar";

const NO_USERS: UserBody[] = [];

/**
 * Every column but the checkboxes shares the room a wide screen leaves over,
 * each in proportion to what it holds.
 */
const FILL = ["email", ...objectValues(App), "createdAt"];

/** The footer's words, in the page's language. */
const useLabels = (): AOFDataTableLabels => {
  const t = useTranslations("Users");
  return {
    first: t("pagination.first"),
    last: t("pagination.last"),
    next: t("pagination.next"),
    page: (page, pageCount) =>
      t.rich("pagination.page", {
        n: (number) => <span className="text-foreground">{number}</span>,
        page,
        pageCount,
      }),
    previous: t("pagination.previous"),
    rowsPerPage: t("pagination.rowsPerPage"),
  };
};

/** The list's columns, a selection box first, and each row's card on a
 *  phone, its own box at the top. */
const useSelectableRows = () => {
  const t = useTranslations("Users");
  const userColumns = useUserColumns();
  const selectLabel = useCallback(
    (row: AOFRow<UserBody>) =>
      t("delete.select", { email: row.original.email }),
    [t]
  );
  const columns = useMemo(
    () => [
      aofSelectColumn<UserBody>({
        all: t("delete.selectAll"),
        row: selectLabel,
      }),
      ...userColumns,
    ],
    [selectLabel, t, userColumns]
  );
  const userCard = useCallback(
    (row: AOFRow<UserBody>) => (
      <UserCard
        select={
          row.getCanSelect() ? (
            <AOFRowCheckbox
              className={cardCheckbox()}
              label={selectLabel(row)}
              row={row}
            />
          ) : null
        }
        user={row.original}
      />
    ),
    [selectLabel]
  );
  return { columns, userCard };
};

/**
 * The Users list: the toolbar, then one page of Users from the address,
 * read under the key the page prefetched it with, so it opens filled. A
 * new page keeps the previous rows on screen until it arrives. Rows can be
 * selected for deletion, all but the signed-in User's own (`selfId`), and
 * fade while their deletion is on its way; the selection holds only for the
 * page in view and clears when the address changes.
 */
export const UsersTable = ({ selfId }: { selfId: string }) => {
  const t = useTranslations("Users");
  const labels = useLabels();
  const [params, setParams] = useQueryStates(usersParams);
  const list = useQuery({
    ...usersQuery(api, params),
    placeholderData: keepPreviousData,
  });
  const deleting = useUsersBeingDeleted();
  const isDeleting = useCallback(
    (row: AOFRow<UserBody>) => deleting.has(row.id),
    [deleting]
  );
  const { columns, userCard } = useSelectableRows();

  // Selection belongs to the rows in view: a new page, page size or search
  // starts it again.
  const [selection, setSelection] = useState<AOFRowSelection>({});
  const view = stringifyJson(params);
  const [seenView, setSeenView] = useState(view);
  if (view !== seenView) {
    setSeenView(view);
    setSelection({});
  }
  const clearSelection = useCallback(() => setSelection({}), []);
  const lastPage = list.data?.pageCount ?? USER.DEFAULT_PAGE;
  const clearSearch = useCallback(
    () => setParams({ [USER.PARAM.PAGE]: null, [USER.PARAM.SEARCH]: null }),
    [setParams]
  );
  const toLastPage = useCallback(
    () => setParams({ [USER.PARAM.PAGE]: lastPage }),
    [lastPage, setParams]
  );

  const pagination = {
    pageIndex: params[USER.PARAM.PAGE] - 1,
    pageSize: params[USER.PARAM.PER_PAGE],
  };
  const table = useAOFTable({
    columns,
    data: list.data?.users ?? NO_USERS,
    enableRowSelection: (row) => row.original.id !== selfId,
    getRowId: ({ id }) => id,
    manualPagination: true,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      setParams({
        [USER.PARAM.PAGE]: next.pageIndex + 1,
        [USER.PARAM.PER_PAGE]:
          USER.PAGE_SIZES.find((size) => size === next.pageSize) ?? null,
      });
    },
    onRowSelectionChange: setSelection,
    pageCount: list.data?.pageCount ?? -1,
    state: { pagination, rowSelection: selection },
  });

  // Past the last page (a hand-edited address): Users match, just not here.
  // When nobody matches at all, that is the plain empty state.
  const pastEnd =
    (list.data?.total ?? 0) > 0 && params[USER.PARAM.PAGE] > lastPage;
  return (
    <AOFDataTable
      busy={isDeleting}
      card={userCard}
      className={userRow()}
      fill={FILL}
      footer={
        <AOFDataTablePagination
          labels={labels}
          pageSizes={USER.PAGE_SIZES}
          table={table}
        />
      }
      label={t("list")}
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
    >
      <UsersToolbar>
        <DeleteUsers ids={objectKeys(selection)} onClear={clearSelection} />
      </UsersToolbar>
    </AOFDataTable>
  );
};
