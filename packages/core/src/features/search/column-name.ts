/** An old spelling of a column (`from`) and the column it is now called (`to`). */
export type ColumnAlias<C extends string> = { from: string; to: C };

/**
 * The column `name` stands for, whatever its case: a column the list has, or
 * an old spelling of one (`aliases`, ADR 0031). `undefined` when it is neither.
 */
export const columnOf = <C extends string>(
  columns: readonly C[],
  aliases: readonly ColumnAlias<C>[],
  name: string
): C | undefined => {
  const lower = name.toLowerCase();
  return (
    columns.find((column) => column.toLowerCase() === lower) ??
    aliases.find((alias) => alias.from.toLowerCase() === lower)?.to
  );
};
