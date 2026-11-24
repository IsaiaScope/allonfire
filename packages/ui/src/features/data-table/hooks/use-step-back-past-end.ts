import { useEffect } from "react";

/** What a list's page query holds that the guard reads: its counts, and TanStack's own status. */
type PageQuery = {
  data: { pageCount: number; total: number } | undefined;
  /** The previous page's rows, kept on screen while the next loads. */
  isPlaceholderData: boolean;
  status: "error" | "pending" | "success";
};

/**
 * What a list does with a page past the last one that exists (its last page's
 * rows were all deleted, or the address was edited): it steps back, through
 * `stepTo`, to the last page, or to `firstPage` when nothing is left. Kept
 * rows (`isPlaceholderData`) judge nothing, and neither does a list that has
 * not answered.
 *
 * It answers the `status` the list's table draws. A page with no `rows` while
 * the list holds some elsewhere is not "nobody matches": its page is being
 * stepped back from, so the status is `pending` (the skeleton) until the
 * page that exists arrives. Otherwise it is the query's own.
 */
export const useStepBackPastEnd = ({
  firstPage,
  page,
  query,
  rows,
  stepTo,
}: {
  firstPage: number;
  page: number;
  query: PageQuery;
  /** How many rows the answer holds (`undefined` before one). */
  rows: number | undefined;
  stepTo: (last: number) => void;
}) => {
  const { data, isPlaceholderData, status } = query;
  const pageCount = isPlaceholderData ? undefined : data?.pageCount;
  useEffect(() => {
    if (pageCount === undefined) {
      return;
    }
    const last = Math.max(pageCount, firstPage);
    if (page > last) {
      stepTo(last);
    }
  }, [firstPage, page, pageCount, stepTo]);
  return data !== undefined && rows === 0 && data.total > 0
    ? "pending"
    : status;
};
