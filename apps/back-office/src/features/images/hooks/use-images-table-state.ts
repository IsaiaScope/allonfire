import { useQueryStates } from "nuqs";
import { useCallback, useEffect } from "react";
import { useRowSelection } from "@/shared/hooks/use-row-selection";
import {
  resolvePagination,
  type TablePagination,
  type TablePaginationUpdater,
} from "@/shared/utils/table-pagination";
import { IMAGES } from "../constants/images";
import { imagesParams } from "../constants/images-params";

/**
 * What the Images table holds besides its rows: the address it reads (the
 * page, its size and the search), the pagination drawn from it, and the
 * rows selected. The selection belongs to the rows in view: a new page, page
 * size or search starts it again.
 */
export const useImagesTableState = () => {
  const [params, setParams] = useQueryStates(imagesParams);
  const { clearSelection, selection, setSelection } = useRowSelection(params);

  const pagination: TablePagination = {
    pageIndex: params[IMAGES.PARAM.PAGE] - 1,
    pageSize: params[IMAGES.PARAM.PER_PAGE],
  };
  const onPaginationChange = (updater: TablePaginationUpdater) => {
    const next = resolvePagination(updater, pagination);
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
  return {
    clearSearch,
    clearSelection,
    onPaginationChange,
    pagination,
    params,
    selection,
    setSelection,
  };
};

/**
 * A page past the last one that exists (the last page's Images were deleted,
 * or the address was edited) steps back, in place, to that last page, or to
 * the first when no Image is left. `pageCount` is the list's, once it has
 * answered for the address in view; `undefined` before, when nothing is judged.
 */
export const useStepBackPastEnd = (pageCount: number | undefined) => {
  const [params, setParams] = useQueryStates(imagesParams);
  const page = params[IMAGES.PARAM.PAGE];
  useEffect(() => {
    if (pageCount === undefined) {
      return;
    }
    const last = Math.max(pageCount, IMAGES.DEFAULT_PAGE);
    if (page > last) {
      setParams({ [IMAGES.PARAM.PAGE]: last }, { history: "replace" });
    }
  }, [page, pageCount, setParams]);
};
