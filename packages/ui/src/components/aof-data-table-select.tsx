"use client";

import { type RowData, Subscribe, type Table } from "@tanstack/react-table";
import { type ComponentProps, useCallback } from "react";
import { cn } from "../lib/utils";
import { AOFCheckbox } from "./aof-checkbox";
import {
  type AOFRow,
  type AOFTableFeatures,
  aofColumnHelper,
} from "./aof-data-table";

/** The selection checkboxes' names, in the page's language. */
export type AOFSelectLabels<TData extends RowData> = {
  /** The header's checkbox: every selectable row on this page. */
  all: string;
  /** One row's checkbox, named after what it holds. */
  row: (row: AOFRow<TData>) => string;
};

// Each checkbox subscribes to the selection itself: the React Compiler keeps
// a component whose props (a stable row or table) did not change, so a read
// hidden in `row.getIsSelected()` would never refresh (TanStack's React
// Compiler guide).

/** The header's checkbox: mixed while some selectable rows are selected. */
const SelectAll = <TData extends RowData>({
  label,
  table,
}: {
  label: string;
  // The core table a header receives, not the React one `useAOFTable` returns.
  table: Table<AOFTableFeatures, TData>;
}) => {
  const toggle = useCallback(
    (checked: boolean) => table.toggleAllPageRowsSelected(checked),
    [table]
  );
  return (
    <Subscribe source={table.atoms.rowSelection}>
      {() => {
        const all = table.getIsAllPageRowsSelected();
        return (
          <AOFCheckbox
            aria-label={label}
            checked={all}
            indeterminate={!all && table.getIsSomePageRowsSelected()}
            onCheckedChange={toggle}
          />
        );
      }}
    </Subscribe>
  );
};

/** One row's checkbox, for its cell or for the card drawn from it. */
export const AOFRowCheckbox = <TData extends RowData>({
  className,
  label,
  row,
  ...props
}: Omit<
  ComponentProps<typeof AOFCheckbox>,
  "aria-label" | "checked" | "onCheckedChange"
> & {
  /** Its name aloud: whose row it selects. */
  label: string;
  row: AOFRow<TData>;
}) => {
  const toggle = useCallback(
    (checked: boolean) => row.toggleSelected(checked),
    [row]
  );
  const isSelected = useCallback(
    (selection: Record<string, boolean>) => selection[row.id] === true,
    [row]
  );
  return (
    <Subscribe selector={isSelected} source={row.table.atoms.rowSelection}>
      {(selected) => (
        <AOFCheckbox
          {...props}
          aria-label={label}
          checked={selected}
          // Above a link stretched over the row.
          className={cn("z-1", className)}
          onCheckedChange={toggle}
        />
      )}
    </Subscribe>
  );
};

/**
 * A first column of checkboxes: one per row the table lets be selected
 * (`enableRowSelection`), none for the rest, and one in the header for every
 * selectable row on the page.
 */
export const aofSelectColumn = <TData extends RowData>(
  labels: AOFSelectLabels<TData>
) =>
  aofColumnHelper<TData>().display({
    cell: ({ row }) =>
      row.getCanSelect() ? (
        <AOFRowCheckbox label={labels.row(row)} row={row} />
      ) : null,
    header: ({ table }) => <SelectAll label={labels.all} table={table} />,
    id: "select",
  });
