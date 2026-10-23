"use client";

import { USER } from "@allonfire/auth/features/users/constants/users";
import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import {
  AOFDataTable,
  type AOFDataTableLabels,
  AOFDataTablePagination,
  type AOFRow,
  type AOFRowSelection,
  useAOFTable,
} from "@allonfire/ui/components/aof-data-table";
import { AOFDataTableError } from "@allonfire/ui/components/aof-data-table-error";
import {
  AOFRowCheckbox,
  aofSelectColumn,
} from "@allonfire/ui/components/aof-data-table-select";
import { AOFDataTableSkeleton } from "@allonfire/ui/components/aof-data-table-skeleton";
import { AOFEmpty } from "@allonfire/ui/components/aof-empty";
import { IconUsers } from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { api } from "@/features/api/utils/api";
import { usersParams } from "../constants/users-params";
import { usersQuery } from "../utils/users-queries";
import { DeleteUsers } from "./delete-users";
import { UserCard, useUserColumns } from "./user-columns";
import { UsersToolbar } from "./users-toolbar";

const NO_USERS: UserBody[] = [];

/** The footer's words, in the page's language. */
const useLabels = (): AOFDataTableLabels => {
  const t = useTranslations("Users");
  return {
    first: t("pagination.first"),
    last: t("pagination.last"),
    next: t("pagination.next"),
    page: (page, pageCount) => t("pagination.page", { page, pageCount }),
    previous: t("pagination.previous"),
    rowsPerPage: t("pagination.rowsPerPage"),
  };
};

/**
 * The Users list: the toolbar, then one page of Users from the address,
 * read under the key the page prefetched it with, so it opens filled. A
 * new page keeps the previous rows on screen until it arrives. Rows can be
 * selected for deletion, all but the signed-in User's own (`selfId`); the
 * selection holds only for the page in view and clears when the address
 * changes.
 */
export const UsersTable = ({ selfId }: { selfId: string }) => {
  const t = useTranslations("Users");
  const labels = useLabels();
  const [params, setParams] = useQueryStates(usersParams);
  const list = useQuery({
    ...usersQuery(api, params),
    placeholderData: keepPreviousData,
  });
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
            <AOFRowCheckbox label={selectLabel(row)} row={row} />
          ) : null
        }
        user={row.original}
      />
    ),
    [selectLabel]
  );

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
    (list.data?.total ?? 0) > 0 &&
    params[USER.PARAM.PAGE] > (list.data?.pageCount ?? 1);
  const empty = pastEnd ? "pastEnd" : "empty";
  return (
    <AOFDataTable
      card={userCard}
      footer={
        <AOFDataTablePagination
          labels={labels}
          pageSizes={USER.PAGE_SIZES}
          table={table}
        />
      }
      label={t("list")}
      states={{
        empty: (
          <AOFEmpty
            description={t(`${empty}.description`)}
            icon={<IconUsers />}
            title={t(`${empty}.title`)}
          />
        ),
        error: (
          <AOFDataTableError
            description={t("error.description")}
            onRetry={list.refetch}
            retry={t("error.retry")}
            title={t("error.title")}
          />
        ),
        loading: (
          <AOFDataTableSkeleton columns={columns.length} label={t("loading")} />
        ),
      }}
      status={list.status}
      table={table}
    >
      <UsersToolbar />
      <DeleteUsers ids={objectKeys(selection)} onClear={clearSelection} />
    </AOFDataTable>
  );
};
