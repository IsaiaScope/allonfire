import { SEPARATOR } from "../../shared/constants/separators";
import { type ColumnAlias, columnOf } from "./column-name";

/**
 * A list's hidden columns in one string, `size,apps` (ADR 0031), read in the
 * table's order, each once. A column the list does not know, and one in
 * `options.never` (a column that identifies a row or opens it), are dropped; a
 * hand-edited address still reads. Columns come back in the spelling `columns`
 * gives; an old spelling of a renamed column (`options.aliases`) reads as the
 * new one, so a link kept before the rename still opens.
 */
export const columnsQuery = <const C extends readonly string[]>(
  columns: C,
  options: {
    aliases?: readonly ColumnAlias<C[number]>[];
    never?: readonly C[number][];
  } = {}
) => {
  // `C` itself would filter to `string[]`: this keeps the column type.
  const all: readonly C[number][] = columns;
  const shown = (listed: readonly string[]): C[number][] => {
    const asked = new Set(
      listed.map((name) => columnOf(all, options.aliases ?? [], name))
    );
    return all.filter(
      (column) => asked.has(column) && !options.never?.includes(column)
    );
  };

  const parse = (raw: string | null | undefined): C[number][] =>
    shown((raw ?? "").split(SEPARATOR.LIST));

  const serialize = (list: readonly C[number][]): string =>
    shown(list).join(SEPARATOR.LIST);

  return { parse, serialize };
};
