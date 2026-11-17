/** The page in view, as the table counts it: from 0. */
export type TablePagination = { pageIndex: number; pageSize: number };

/** What the table asks for: the next pagination, or a function of the current one. */
export type TablePaginationUpdater =
  | TablePagination
  | ((old: TablePagination) => TablePagination);

/**
 * What a table's `updater` asks for (TanStack's `Updater`: the next value, or
 * a function of the current one), given the one in view.
 */
export const resolveUpdater = <Value>(
  updater: Value | ((old: Value) => Value),
  current: Value
): Value => (updater instanceof Function ? updater(current) : updater);
