import type { ColumnSort, SortingState } from "@tanstack/react-table";

/** A column a panel lists: its id and its name. */
export type AOFPanelColumn = { id: string; label: string };

/** Whether `Add sort` can add one: under `max`, and a column left unused. */
export const canAddSort = (
  sorting: SortingState,
  ids: readonly string[],
  max: number
): boolean =>
  sorting.length < max && ids.some((id) => !sorting.some((s) => s.id === id));

/** `sorting` with the first column not yet sorted added, ascending; unchanged when it cannot. */
export const addSort = (
  sorting: SortingState,
  ids: readonly string[],
  max: number
): SortingState => {
  const next = ids.find((id) => !sorting.some((s) => s.id === id));
  return next === undefined || sorting.length >= max
    ? sorting
    : [...sorting, { desc: false, id: next }];
};

/** The columns row `index` can pick: its own, and those no other row uses. */
export const usableColumns = <C extends AOFPanelColumn>(
  columns: readonly C[],
  sorting: SortingState,
  index: number
): C[] =>
  columns.filter(
    ({ id }) => !sorting.some((sort, at) => at !== index && sort.id === id)
  );

export const removeSort = (
  sorting: SortingState,
  index: number
): SortingState => sorting.filter((_, at) => at !== index);

/** Row `index` with `patch` applied: another column, or the other direction. */
export const replaceSort = (
  sorting: SortingState,
  index: number,
  patch: Partial<ColumnSort>
): SortingState =>
  sorting.map((sort, at) => (at === index ? { ...sort, ...patch } : sort));

/**
 * The hidden columns after `id` was shown (`shown`) or hidden, in the order of
 * `ids` (the table's), so the address stays the same whichever click came first.
 */
export const shownIn = (
  ids: readonly string[],
  hidden: readonly string[],
  id: string,
  shown: boolean
): string[] =>
  ids.filter((column) => (column === id ? !shown : hidden.includes(column)));
