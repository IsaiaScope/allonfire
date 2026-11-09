import { USER } from "@allonfire/auth/features/users/constants/users";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import type { AOFRowSelection } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { useQueryStates } from "nuqs";
import { useCallback, useState } from "react";
import { usersParams } from "../constants/users-params";

/** The page in view, as the table counts it: from 0. */
type Pagination = { pageIndex: number; pageSize: number };

/**
 * What the Users table holds besides its rows: the address it reads (the
 * page, its size and the search), the pagination drawn from it, and the rows
 * selected. The selection belongs to the rows in view: a new page, page
 * size or search starts it again.
 */
export const useUsersTableState = () => {
  const [params, setParams] = useQueryStates(usersParams);

  const [selection, setSelection] = useState<AOFRowSelection>({});
  const view = stringifyJson(params);
  const [seenView, setSeenView] = useState(view);
  if (view !== seenView) {
    setSeenView(view);
    setSelection({});
  }
  const clearSelection = useCallback(() => setSelection({}), []);

  const pagination: Pagination = {
    pageIndex: params[USER.PARAM.PAGE] - 1,
    pageSize: params[USER.PARAM.PER_PAGE],
  };
  const onPaginationChange = (
    updater: Pagination | ((old: Pagination) => Pagination)
  ) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
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
