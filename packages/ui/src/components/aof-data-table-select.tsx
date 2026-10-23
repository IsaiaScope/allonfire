"use client";

import type { RowData, Table } from "@tanstack/react-table";
import { useCallback } from "react";
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

/** The header's checkbox: mixed while some selectable rows are selected. */
const SelectAll = <TData extends RowData>({
  label,
  table,
}: {
  label: string;
  // The core table a header receives, not the React one `useAOFTable` returns.
  table: Table<AOFTableFeatures, TData>;
}) => {
  const all = table.getIsAllPageRowsSelected();
  const toggle = useCallback(
    (checked: boolean) => table.toggleAllPageRowsSelected(checked),
    [table]
  );
  return (
    <AOFCheckbox
      aria-label={label}
      checked={all}
      indeterminate={!all && table.getIsSomePageRowsSelected()}
      onCheckedChange={toggle}
    />
  );
};

/** One row's checkbox, for its cell or for the card drawn from it. */
export const AOFRowCheckbox = <TData extends RowData>({
  label,
  row,
}: {
  label: string;
  row: AOFRow<TData>;
}) => {
  const toggle = useCallback(
    (checked: boolean) => row.toggleSelected(checked),
    [row]
  );
  return (
    <AOFCheckbox
      aria-label={label}
      checked={row.getIsSelected()}
      onCheckedChange={toggle}
    />
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
