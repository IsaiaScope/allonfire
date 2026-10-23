"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@allonfire/shadcn/components/table";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import {
  createColumnHelper,
  type ReactTable,
  type Row,
  type RowData,
  type RowSelectionState,
  rowPaginationFeature,
  rowSelectionFeature,
  type TableOptions,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { type ComponentProps, type ReactNode, useCallback } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";
import { AOFButton } from "./aof-button";
import { AOFDataTableSkeleton } from "./aof-data-table-skeleton";
import {
  AOFSelect,
  AOFSelectContent,
  AOFSelectItem,
  AOFSelectTrigger,
  AOFSelectValue,
} from "./aof-select";

/**
 * An AOF table's features: pages and row selection. Sorting, filtering and
 * the rest join when a list needs them; module scope, so TanStack never sees
 * a new set.
 */
export const AOF_TABLE_FEATURES = tableFeatures({
  rowPaginationFeature,
  rowSelectionFeature,
});
export type AOFTableFeatures = typeof AOF_TABLE_FEATURES;
export type AOFTable<TData extends RowData> = ReactTable<
  AOFTableFeatures,
  TData
>;
export type AOFRow<TData extends RowData> = Row<AOFTableFeatures, TData>;
/** Which rows are selected, keyed by row id. */
export type AOFRowSelection = RowSelectionState;

/** Columns for an AOF table of `TData`. */
export const aofColumnHelper = <TData extends RowData>() =>
  createColumnHelper<AOFTableFeatures, TData>();

/** TanStack Table v9's `useTable` with the AOF features. */
export const useAOFTable = <TData extends RowData>(
  options: Omit<TableOptions<AOFTableFeatures, TData>, "features">
): AOFTable<TData> => useTable({ ...options, features: AOF_TABLE_FEATURES });

/** Every word the footer says, in the page's language. */
export type AOFDataTableLabels = {
  first: string;
  last: string;
  next: string;
  /** "Page 2 of 3": the page counted from 1. */
  page: (page: number, pageCount: number) => string;
  previous: string;
  rowsPerPage: string;
};

/** Where the rows stand: TanStack Query's own names, so `status={query.status}`. */
export type AOFDataTableStatus = "pending" | "error" | "success";

export type AOFDataTableProps<TData extends RowData> = ComponentProps<"div"> & {
  /** The table's accessible name. */
  label: string;
  table: AOFTable<TData>;
  /** A row as a card, drawn instead of the table below `md`. */
  card?: ((row: AOFRow<TData>) => ReactNode) | undefined;
  /** What sits under the rows: the pagination. */
  footer?: ReactNode;
  /** What replaces the rows in each state; any left out keeps its default. */
  states?: AOFDataTableStates | undefined;
  /** Where the rows stand; `success` by default. */
  status?: AOFDataTableStatus | undefined;
};

export type AOFDataTableStates = {
  /** No rows found; the footer stays. None given: the empty table. */
  empty?: ReactNode;
  /** Loading failed and no rows are held. None given: the empty table. */
  error?: ReactNode;
  /** While pending. None given: a skeleton of the table's columns. */
  loading?: ReactNode;
};

/**
 * A TanStack table on shadcn's `table`, filling its column: the rows scroll
 * under a header that stays, the footer stays below them. With `card`, a
 * phone gets a list of cards from the same rows (after DiceUI's base-nova
 * data-table, whose built-in footer cannot be translated). Children go above,
 * as a toolbar, in every state: while pending the rows are a skeleton, after
 * a failure with no rows held they are `error`, and with none found `empty`.
 */
export const AOFDataTable = <TData extends RowData>({
  card,
  children,
  className,
  footer,
  label,
  states = {},
  status = "success",
  table,
  ...props
}: AOFDataTableProps<TData>) => {
  const { rows } = table.getRowModel();
  const { empty, error, loading } = states;
  const none = rows.length === 0;
  const failed = status === "error" && none && error !== undefined;
  let body: ReactNode;
  if (status === "pending") {
    body = loading ?? (
      <AOFDataTableSkeleton
        columns={table.getAllLeafColumns().length}
        label={label}
      />
    );
  } else if (failed) {
    body = error;
  } else {
    body = (
      <>
        {empty !== undefined && none ? (
          empty
        ) : (
          <AOFDataTableRows
            card={card}
            label={label}
            rows={rows}
            table={table}
          />
        )}
        {footer}
      </>
    );
  }
  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}
      data-slot="aof-data-table"
      {...props}
    >
      {children}
      {body}
    </div>
  );
};

/** The rows as a table, and as cards on a phone when `card` is given. */
const AOFDataTableRows = <TData extends RowData>({
  card,
  label,
  rows,
  table,
}: Pick<AOFDataTableProps<TData>, "card" | "label" | "table"> & {
  rows: AOFRow<TData>[];
}) => (
  <>
    <div
      className={cn(
        // The only scroller, so the header sticks to it.
        "min-h-0 flex-1 overflow-auto rounded-lg border *:data-[slot=table-container]:overflow-visible",
        card && "hidden md:block"
      )}
    >
      <Table aria-label={label}>
        <TableHeader className="sticky top-0 z-10 bg-background">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    {card ? (
      <ul
        aria-label={label}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto md:hidden"
      >
        {rows.map((row) => (
          <li key={row.id}>{card(row)}</li>
        ))}
      </ul>
    ) : null}
  </>
);

export type AOFDataTablePaginationProps<TData extends RowData> =
  ComponentPropsWithoutChildren<"div"> & {
    labels: AOFDataTableLabels;
    pageSizes: readonly number[];
    table: AOFTable<TData>;
  };

/** Rows per page, where you are, and the four ways to move. */
export const AOFDataTablePagination = <TData extends RowData>({
  className,
  labels,
  pageSizes,
  table,
  ...props
}: AOFDataTablePaginationProps<TData>) => {
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = Math.max(table.getPageCount(), 1);
  // A hand-edited address can open past the last page: the way back then
  // goes straight to the last page, not one empty page at a time.
  const pastEnd = pageIndex >= pageCount;
  const canBack = table.getCanPreviousPage();
  const canOn = table.getCanNextPage();
  const toFirst = useCallback(() => table.firstPage(), [table]);
  const toPrevious = useCallback(
    () => (pastEnd ? table.setPageIndex(pageCount - 1) : table.previousPage()),
    [pageCount, pastEnd, table]
  );
  const toNext = useCallback(() => table.nextPage(), [table]);
  const toLast = useCallback(() => table.lastPage(), [table]);
  const resize = useCallback(
    (size: unknown) => {
      if (typeof size === "number") {
        table.setPageSize(size);
      }
    },
    [table]
  );
  return (
    <div
      className={cn(
        "flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end sm:gap-6",
        className
      )}
      data-slot="aof-data-table-pagination"
      {...props}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="whitespace-nowrap font-medium">
          {labels.rowsPerPage}
        </span>
        <AOFSelect
          items={pageSizes.map((size) => ({
            label: String(size),
            value: size,
          }))}
          onValueChange={resize}
          value={pageSize}
        >
          <AOFSelectTrigger aria-label={labels.rowsPerPage} className="w-20">
            <AOFSelectValue />
          </AOFSelectTrigger>
          <AOFSelectContent>
            {pageSizes.map((size) => (
              <AOFSelectItem key={size} value={size}>
                {size}
              </AOFSelectItem>
            ))}
          </AOFSelectContent>
        </AOFSelect>
      </div>
      <span className="whitespace-nowrap font-medium text-sm">
        {labels.page(pageIndex + 1, pageCount)}
      </span>
      <div className="flex items-center gap-2">
        <AOFButton
          aria-label={labels.first}
          className="hidden lg:inline-flex"
          disabled={!canBack}
          onClick={toFirst}
          size="icon-sm"
          variant="outline"
        >
          <IconChevronsLeft />
        </AOFButton>
        <AOFButton
          aria-label={labels.previous}
          disabled={!canBack}
          onClick={toPrevious}
          size="icon-sm"
          variant="outline"
        >
          <IconChevronLeft />
        </AOFButton>
        <AOFButton
          aria-label={labels.next}
          disabled={!canOn}
          onClick={toNext}
          size="icon-sm"
          variant="outline"
        >
          <IconChevronRight />
        </AOFButton>
        <AOFButton
          aria-label={labels.last}
          className="hidden lg:inline-flex"
          disabled={!(canOn || pastEnd)}
          onClick={toLast}
          size="icon-sm"
          variant="outline"
        >
          <IconChevronsRight />
        </AOFButton>
      </div>
    </div>
  );
};
