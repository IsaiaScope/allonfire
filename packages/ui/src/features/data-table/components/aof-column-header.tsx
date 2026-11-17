"use client";

import {
  IconEyeOff,
  IconSortAscending,
  IconSortAscendingSmallBig,
  IconSortDescending,
  IconSortDescendingSmallBig,
} from "@tabler/icons-react";
import {
  type Column,
  type RowData,
  type SortDirection,
  Subscribe,
} from "@tanstack/react-table";
import { type ComponentProps, useCallback } from "react";
import { AOFButton } from "../../../shared/components/aof-button";
import {
  AOFDropdownMenu,
  AOFDropdownMenuCheckboxItem,
  AOFDropdownMenuContent,
  AOFDropdownMenuTrigger,
} from "../../../shared/components/aof-dropdown-menu";
import { cn } from "../../../shared/utils/utils";
import { sortingAfter } from "../utils/sorting";
import type { AOFTableFeatures } from "./aof-data-table";

type ColumnProps<TData extends RowData, TValue> = {
  /**
   * The words centred in their column: the button takes no negative margin
   * and an empty space as wide as the mark stands before them, so the mark
   * does not push the words off the middle.
   */
  centred?: boolean | undefined;
  column: Column<AOFTableFeatures, TData, TValue>;
  /** The column's name: the button's text. */
  label: string;
  /** The menu's words, in the page's language. */
  labels: { asc: string; desc: string; hide: string };
};

export type AOFColumnHeaderProps<
  TData extends RowData,
  TValue = unknown,
> = Omit<ComponentProps<"div">, "children"> & ColumnProps<TData, TValue>;

/**
 * The mark on every header with a menu: small-to-big going down, the one icon
 * a column has until it is sorted ascending (small-to-big going up), a step
 * quieter while the column is unsorted and for a column that only hides.
 * Always 20px (`size-5`), which the centred header's space matches.
 */
const SortIcon = ({ sorted }: { sorted: false | SortDirection }) => {
  if (sorted === "asc") {
    return <IconSortAscendingSmallBig aria-hidden className="size-5" />;
  }
  return (
    <IconSortDescendingSmallBig
      aria-hidden
      className={cn("size-5", !sorted && "opacity-60")}
    />
  );
};

/** The button and its menu, for a column that can sort or hide. */
const ColumnMenu = <TData extends RowData, TValue>({
  centred,
  column,
  label,
  labels,
}: ColumnProps<TData, TValue>) => {
  const { table } = column;
  const choose = useCallback(
    (direction: SortDirection) =>
      table.setSorting((sorting) =>
        sortingAfter(
          sorting,
          column.id,
          direction,
          table.options.maxMultiSortColCount ?? Number.POSITIVE_INFINITY
        )
      ),
    [column, table]
  );
  const asc = useCallback(() => choose("asc"), [choose]);
  const desc = useCallback(() => choose("desc"), [choose]);
  const hide = useCallback(() => column.toggleVisibility(false), [column]);
  // A read of the table's state hidden in `column.getIsSorted()` would never
  // refresh under the React Compiler: subscribe to it (see `AOFRowCheckbox`).
  return (
    <Subscribe source={table.atoms.sorting}>
      {() => {
        const sorted = column.getIsSorted();
        return (
          <AOFDropdownMenu>
            <AOFDropdownMenuTrigger
              render={
                <AOFButton
                  className={cn(
                    "h-8 gap-1.5 font-medium text-base",
                    !centred && "-ml-2"
                  )}
                  data-sort={sorted || "none"}
                  size="sm"
                  variant="ghost"
                />
              }
            >
              {centred ? <span aria-hidden className="size-5" /> : null}
              <span>{label}</span>
              <SortIcon sorted={sorted} />
            </AOFDropdownMenuTrigger>
            <AOFDropdownMenuContent align="start">
              {column.getCanSort() ? (
                <>
                  <AOFDropdownMenuCheckboxItem
                    checked={sorted === "asc"}
                    onCheckedChange={asc}
                  >
                    <IconSortAscending aria-hidden />
                    {labels.asc}
                  </AOFDropdownMenuCheckboxItem>
                  <AOFDropdownMenuCheckboxItem
                    checked={sorted === "desc"}
                    onCheckedChange={desc}
                  >
                    <IconSortDescending aria-hidden />
                    {labels.desc}
                  </AOFDropdownMenuCheckboxItem>
                </>
              ) : null}
              {column.getCanHide() ? (
                <AOFDropdownMenuCheckboxItem
                  checked={false}
                  onCheckedChange={hide}
                >
                  <IconEyeOff aria-hidden />
                  {labels.hide}
                </AOFDropdownMenuCheckboxItem>
              ) : null}
            </AOFDropdownMenuContent>
          </AOFDropdownMenu>
        );
      }}
    </Subscribe>
  );
};

/**
 * A column's heading with a menu, as tablecn's column header draws it: the
 * label and a sort mark in a button that opens Asc, Desc (when the column can
 * sort) and Hide (when it can hide). Choosing the direction it already has
 * clears the sort; another puts this column first and keeps the others, up to
 * the table's `maxMultiSortColCount`. A column that can do neither shows its
 * label alone. The rest of the props go to the root, so a list can centre a
 * header.
 */
export const AOFColumnHeader = <TData extends RowData, TValue = unknown>({
  centred,
  className,
  column,
  label,
  labels,
  ...props
}: AOFColumnHeaderProps<TData, TValue>) => (
  <div
    className={cn("flex", centred && "justify-center", className)}
    {...props}
  >
    {column.getCanSort() || column.getCanHide() ? (
      <ColumnMenu
        centred={centred}
        column={column}
        label={label}
        labels={labels}
      />
    ) : (
      label
    )}
  </div>
);
