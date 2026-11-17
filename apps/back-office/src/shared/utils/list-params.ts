import type { Direction } from "@allonfire/core/features/search/constants/search";
import type { SortItem } from "@allonfire/core/features/search/sort-query";
import {
  objectEntries,
  objectFromEntries,
} from "@allonfire/core/shared/utils/object";
import type {
  AOFColumnVisibility,
  AOFSorting,
} from "@allonfire/ui/features/data-table/components/aof-data-table";
import { createParser, type Options } from "nuqs/server";

/** How a list reads one param: core's `sortQuery`, `columnsQuery`, `searchQuery`. */
type Codec<Value> = {
  parse: (raw: string) => Value;
  serialize: (value: Value) => string;
};

/**
 * A param whose value is a codec's text, cleaned as it is read: what the codec
 * does not know is dropped, the rest comes back in its spelling, and a value
 * it empties reads as the default, "" (ADR 0026, ADR 0031). A hand-edited
 * address still opens the list.
 */
export const codecParser = <Value>(codec: Codec<Value>, options: Options) =>
  createParser({
    parse: (raw) => codec.serialize(codec.parse(raw)) || null,
    serialize: String,
  })
    .withDefault("")
    .withOptions(options);

/**
 * A page the API reads: a whole number from `first` to `last`; anything else
 * reads as the list's default (the address is the visitor's to edit).
 */
export const pageParser = (first: number, last: number) =>
  createParser({
    parse: (value) => {
      const page = Number(value);
      return Number.isInteger(page) && page >= first && page <= last
        ? page
        : null;
    },
    serialize: String,
  });

/** The grammar's sort as TanStack's sorting. */
export const sortingOf = (items: readonly SortItem<string>[]): AOFSorting =>
  items.map(({ column, direction }) => ({
    desc: direction === "desc",
    id: column,
  }));

/**
 * TanStack's sorting as the grammar's sort, the columns the list knows
 * (`known`) only: the codec would drop the rest on the next read anyway.
 */
export const sortOf = <Column extends string>(
  sorting: AOFSorting,
  known: readonly Column[]
): SortItem<Column>[] =>
  sorting.flatMap(({ desc, id }) => {
    const column = known.find((one) => one === id);
    const direction: Direction = desc ? "desc" : "asc";
    return column === undefined ? [] : [{ column, direction }];
  });

/** The hidden columns as TanStack's column visibility: `{ size: false }`. */
export const visibilityOf = (hidden: readonly string[]): AOFColumnVisibility =>
  objectFromEntries(hidden.map((id) => [id, false]));

/** TanStack's column visibility as the hidden columns. */
export const hiddenOf = (state: AOFColumnVisibility): string[] =>
  objectEntries(state).flatMap(([id, shown]) => (shown ? [] : [id]));
