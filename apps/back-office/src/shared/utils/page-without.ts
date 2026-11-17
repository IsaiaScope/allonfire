import type { QueryKey } from "@tanstack/react-query";

/**
 * One cached page of a list with the rows named by `ids` taken out, for a
 * deletion shown before the server answers: the rows found, the `total`
 * lowered by those rows only (the other pages' rows are unknown here) and
 * the page count recomputed from the page size (`perPage`).
 *
 * Answers nothing when the page would be left empty while rows remain
 * elsewhere: the empty state must not flash before the list is read again,
 * so such a page keeps its rows until then.
 */
export const rowsWithout = <TRow extends { id: string }>(
  rows: readonly TRow[],
  total: number,
  ids: ReadonlySet<string>,
  perPage: number
) => {
  const rest = rows.filter(({ id }) => !ids.has(id));
  const remaining = total - (rows.length - rest.length);
  if (rest.length === 0 && rows.length > 0 && remaining > 0) {
    return;
  }
  return {
    pageCount: Math.max(1, Math.ceil(remaining / perPage)),
    rows: rest,
    total: remaining,
  };
};

/**
 * The page size a list's page key was asked with: the key's third part is
 * the params, and `name` is the one that holds the size. Nothing when the key
 * has no such number.
 */
export const perPageIn = (key: QueryKey, name: string) => {
  const [, , params] = key;
  if (typeof params !== "object" || params === null) {
    return;
  }
  const perPage: unknown = Reflect.get(params, name);
  return typeof perPage === "number" ? perPage : undefined;
};
