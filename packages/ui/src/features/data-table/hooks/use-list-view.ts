import type { SortItem } from "@allonfire/core/features/search/sort-query";
import { type SingleParserBuilder, useQueryStates } from "nuqs";
import { useCallback, useMemo } from "react";
import type {
  AOFColumnVisibility,
  AOFSorting,
} from "../components/aof-data-table";
import {
  hiddenOf,
  sortingOf,
  sortOf,
  visibilityOf,
} from "../utils/list-params";
import { resolveUpdater } from "../utils/table-pagination";

/** A sort or a View change replaces the history entry, though the page it resets pushes: Back should leave the list, not undo each choice. */
const REPLACE = { history: "replace" } as const;

/** The `sort` and `hide` params of a list, with the `page` a sort sends back to the first. */
type ListViewParsers = {
  hide: SingleParserBuilder<string> & { defaultValue: string };
  page: SingleParserBuilder<number> & { defaultValue: number };
  sort: SingleParserBuilder<string> & { defaultValue: string };
};

/**
 * A list's Sort and View, read from and written to its address (ADR 0031),
 * for both of the places that need them: its table (TanStack gets `sorting`
 * and `columnVisibility`) and its Filter panel (the panels get `sorting` and
 * `hidden`); both write the same params. A sort goes back to the first page; a
 * change to View writes `hide` alone, so the rows, the page and the selection
 * stay. The params are the list's own (`parsers`), under the names `sort`,
 * `hide` and `page`.
 */
export const useListView = <Hide extends string, Sort extends string>({
  codecs,
  hideable,
  parsers,
  sortable,
}: {
  /** How the list reads `hide` and `sort`: core's `columnsQuery` and `sortQuery`. */
  codecs: {
    hide: {
      parse: (raw: string) => Hide[];
      serialize: (list: Hide[]) => string;
    };
    sort: {
      parse: (raw: string) => SortItem<Sort>[];
      serialize: (items: SortItem<Sort>[]) => string;
    };
  };
  /** The columns the View tab can hide, and the Sort tab can sort by. */
  hideable: readonly Hide[];
  parsers: ListViewParsers;
  sortable: readonly Sort[];
}) => {
  const [view, setView] = useQueryStates(parsers);
  const sorting = useMemo(
    () => sortingOf(codecs.sort.parse(view.sort)),
    [codecs.sort, view.sort]
  );
  const hidden = useMemo(
    () => codecs.hide.parse(view.hide),
    [codecs.hide, view.hide]
  );
  const columnVisibility = useMemo(() => visibilityOf(hidden), [hidden]);

  /** TanStack's updater (a value or a function of the current one); a sort goes back to the first page. */
  const onSortingChange = useCallback(
    (updater: AOFSorting | ((old: AOFSorting) => AOFSorting)) =>
      setView(
        {
          page: null,
          sort:
            codecs.sort.serialize(
              sortOf(resolveUpdater(updater, sorting), sortable)
            ) || null,
        },
        REPLACE
      ),
    [codecs.sort, setView, sortable, sorting]
  );
  const onHiddenChange = useCallback(
    (next: readonly string[]) =>
      setView({
        hide:
          codecs.hide.serialize(hideable.filter((one) => next.includes(one))) ||
          null,
      }),
    [codecs.hide, hideable, setView]
  );
  const onColumnVisibilityChange = useCallback(
    (
      updater:
        | AOFColumnVisibility
        | ((old: AOFColumnVisibility) => AOFColumnVisibility)
    ) => onHiddenChange(hiddenOf(resolveUpdater(updater, columnVisibility))),
    [columnVisibility, onHiddenChange]
  );
  /**
   * The sort and the hidden columns cleared. A sort cleared sends the list
   * back to the first page; View alone (the rows are the same) leaves it.
   */
  const resetView = useCallback(
    () =>
      setView(
        {
          hide: null,
          sort: null,
          ...(sorting.length > 0 && { page: null }),
        },
        REPLACE
      ),
    [setView, sorting.length]
  );
  return {
    columnVisibility,
    hidden,
    onColumnVisibilityChange,
    onHiddenChange,
    onSortingChange,
    resetView,
    sorting,
  };
};
