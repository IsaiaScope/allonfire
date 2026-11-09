import { USER } from "@allonfire/auth/features/users/constants/users";
import { useQueryStates } from "nuqs";
import { useCallback } from "react";
import { useRowSelection } from "@/shared/hooks/use-row-selection";
import {
  resolvePagination,
  type TablePagination,
  type TablePaginationUpdater,
} from "@/shared/utils/table-pagination";
import { usersParams } from "../constants/users-params";

/**
 * What the Users table holds besides its rows: the address it reads (the
 * page, its size and the search), the pagination drawn from it, and the rows
 * selected. The selection belongs to the rows in view: a new page, page
 * size or search starts it again.
 */
export const useUsersTableState = () => {
  const [params, setParams] = useQueryStates(usersParams);
  const { clearSelection, selection, setSelection } = useRowSelection(params);

  const pagination: TablePagination = {
    pageIndex: params[USER.PARAM.PAGE] - 1,
    pageSize: params[USER.PARAM.PER_PAGE],
  };
  const onPaginationChange = (updater: TablePaginationUpdater) => {
    const next = resolvePagination(updater, pagination);
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
    onPaginationChange,
    pagination,
    params,
    selection,
    setSelection,
    toPage,
  };
};
