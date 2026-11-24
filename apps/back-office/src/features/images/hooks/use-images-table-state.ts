import { useRowSelection } from "@allonfire/ui/features/data-table/hooks/use-row-selection";
import {
  resolveUpdater,
  type TablePagination,
  type TablePaginationUpdater,
} from "@allonfire/ui/features/data-table/utils/table-pagination";
import { useQueryStates } from "nuqs";
import { useCallback } from "react";
import { IMAGES } from "../constants/images";
import { imagesParams, queryOf } from "../constants/images-params";
import { useImagesView } from "./use-images-view";

/**
 * What the Images table holds besides its rows: the address it reads (the
 * page, its size, the search, the sort and the hidden columns), the
 * pagination, the sorting and the column visibility drawn from it, and the
 * rows selected. The selection belongs to the rows in view (`queryOf`): a new
 * page, page size, search or sort starts it again; a View change keeps it.
 */
export const useImagesTableState = () => {
  const [params, setParams] = useQueryStates(imagesParams);
  const { clearSelection, selection, setSelection } = useRowSelection(
    queryOf(params)
  );
  const view = useImagesView();

  const pagination: TablePagination = {
    pageIndex: params[IMAGES.PARAM.PAGE] - 1,
    pageSize: params[IMAGES.PARAM.PER_PAGE],
  };
  const onPaginationChange = (updater: TablePaginationUpdater) => {
    const next = resolveUpdater(updater, pagination);
    setParams({
      [IMAGES.PARAM.PAGE]: next.pageIndex + 1,
      [IMAGES.PARAM.PER_PAGE]:
        IMAGES.PAGE_SIZES.find((size) => size === next.pageSize) ?? null,
    });
  };
  /** Back to every Image: the search cleared, the first page. */
  const clearSearch = useCallback(
    () => setParams({ [IMAGES.PARAM.PAGE]: null, [IMAGES.PARAM.SEARCH]: null }),
    [setParams]
  );
  // jscpd:ignore-start
  // The Images and Users state hooks hand a list the same shape: one return.
  /** The page past the last one steps back to `last`, replacing its history entry. */
  const stepBackTo = useCallback(
    (last: number) =>
      setParams({ [IMAGES.PARAM.PAGE]: last }, { history: "replace" }),
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
    stepBackTo,
  };
  // jscpd:ignore-end
};
