import type { SortDirection, SortingState } from "@tanstack/react-table";

/**
 * A list's sorting after `direction` was chosen for column `id` (a column's
 * header menu): the column goes first and the others stay behind it, cut to
 * `max`; the direction it already has clears it instead, and `null` clears it
 * outright.
 */
export const sortingAfter = (
  sorting: SortingState,
  id: string,
  direction: SortDirection | null,
  max: number
): SortingState => {
  const others = sorting.filter((sort) => sort.id !== id);
  const current = sorting.find((sort) => sort.id === id);
  const same = current && (current.desc ? "desc" : "asc") === direction;
  if (direction === null || same) {
    return others;
  }
  return [{ desc: direction === "desc", id }, ...others].slice(0, max);
};
