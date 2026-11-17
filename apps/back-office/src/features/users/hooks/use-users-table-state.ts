import { USER } from "@allonfire/auth/features/users/constants/users";
import { useQueryStates } from "nuqs";
import { useCallback } from "react";
import { useRowSelection } from "@/shared/hooks/use-row-selection";
import {
  resolveUpdater,
  type TablePagination,
  type TablePaginationUpdater,
} from "@/shared/utils/table-pagination";
import { queryOf, usersParams } from "../constants/users-params";
import { useUsersView } from "./use-users-view";

/**
 * What the Users table holds besides its rows: the address it reads (the
 * page, its size, the search, the sort and the hidden columns), the
 * pagination, the sorting and the column visibility drawn from it, and the
 * rows selected. The selection belongs to the rows in view (`queryOf`): a new
 * page, page size, search or sort starts it again; a View change keeps it.
 */
export const useUsersTableState = () => {
  const [params, setParams] = useQueryStates(usersParams);
  const { clearSelection, selection, setSelection } = useRowSelection(
    queryOf(params)
  );
  const view = useUsersView();

  const pagination: TablePagination = {
    pageIndex: params[USER.PARAM.PAGE] - 1,
    pageSize: params[USER.PARAM.PER_PAGE],
  };
  const onPaginationChange = (updater: TablePaginationUpdater) => {
    const next = resolveUpdater(updater, pagination);
    setParams({
      [USER.PARAM.PAGE]: next.pageIndex + 1,
      [USER.PARAM.PER_PAGE]:
        USER.PAGE_SIZES.find((size) => size === next.pageSize) ?? null,
    });
  };
  /** Back to every User: the search cleared, the first page. */
  const clearSearch = useCallback(
    () => setParams({ [USER.PARAM.PAGE]: null, [USER.PARAM.SEARCH]: null }),
    [setParams]
  );
  const toPage = useCallback(
    (page: number) => setParams({ [USER.PARAM.PAGE]: page }),
    [setParams]
  );

  return {
    clearSearch,
    clearSelection,
    columnVisibility: view.columnVisibility,
    onColumnVisibilityChange: view.onColumnVisibilityChange,
    onPaginationChange,
    onSortingChange: view.onSortingChange,
    pagination,
    params,
    selection,
    setSelection,
    sorting: view.sorting,
    toPage,
  };
};
