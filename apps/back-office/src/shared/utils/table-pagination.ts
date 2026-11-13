/** The page in view, as the table counts it: from 0. */
export type TablePagination = { pageIndex: number; pageSize: number };

/** What the table asks for: the next pagination, or a function of the current one. */
export type TablePaginationUpdater =
  | TablePagination
  | ((old: TablePagination) => TablePagination);

/** The pagination a table's `updater` asks for, given the one in view. */
export const resolvePagination = (
  updater: TablePaginationUpdater,
  current: TablePagination
) => (typeof updater === "function" ? updater(current) : updater);
