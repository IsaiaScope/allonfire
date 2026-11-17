import { SEPARATOR } from "../../shared/constants/separators";
import { type ColumnAlias, columnOf } from "./column-name";
import { type Direction, directionSchema, SEARCH } from "./constants/search";

/** One sort: a column and the way it goes. */
export type SortItem<C extends string = string> = {
  column: C;
  direction: Direction;
};

/**
 * A list's sort in one string, `created.desc,size.asc` (ADR 0031): a column
 * and a direction, in order. A column the list does not know, a direction that
 * is not `asc` or `desc`, a column without one and a second mention of a column
 * are dropped, as is every sort past `SEARCH.SORT.MAX`; a hand-edited address
 * still reads. Columns come back in the spelling `columns` gives; an old
 * spelling of a renamed column (`aliases`) reads as the new one, so a link
 * kept before the rename still opens.
 */
export const sortQuery = <const C extends readonly string[]>(
  columns: C,
  aliases: readonly ColumnAlias<C[number]>[] = []
) => {
  // `C` itself would find a `string`: this keeps the column type.
  const all: readonly C[number][] = columns;
  const parse = (raw: string | null | undefined): SortItem<C[number]>[] => {
    const items: SortItem<C[number]>[] = [];
    for (const part of (raw ?? "").split(SEPARATOR.LIST)) {
      const at = part.lastIndexOf(SEPARATOR.DIRECTION);
      const column = columnOf(all, aliases, part.slice(0, at));
      const direction = directionSchema.safeParse(
        part.slice(at + 1).toLowerCase()
      );
      if (
        at > 0 &&
        column !== undefined &&
        direction.success &&
        !items.some((item) => item.column === column)
      ) {
        items.push({ column, direction: direction.data });
      }
    }
    return items.slice(0, SEARCH.SORT.MAX);
  };

  const serialize = (items: readonly SortItem<C[number]>[]): string =>
    items
      .map(
        ({ column, direction }) => `${column}${SEPARATOR.DIRECTION}${direction}`
      )
      .join(SEPARATOR.LIST);

  return { parse, serialize };
};
