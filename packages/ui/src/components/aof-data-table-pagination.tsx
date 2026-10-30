"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import type { RowData } from "@tanstack/react-table";
import { type ReactNode, useCallback } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";
import { AOFButton } from "./aof-button";
import type { AOFTable } from "./aof-data-table";
import {
  AOFSelect,
  AOFSelectContent,
  AOFSelectItem,
  AOFSelectTrigger,
  AOFSelectValue,
} from "./aof-select";

/** Every word the footer says, in the page's language. */
export type AOFDataTableLabels = {
  first: string;
  last: string;
  next: string;
  /** "Page 3 of 7": the words muted like a placeholder, the numbers not
   *  (the caller wraps them, `t.rich`). */
  page: (page: number, pageCount: number) => ReactNode;
  previous: string;
  rowsPerPage: string;
};

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
        // One row everywhere: on a phone the rows-per-page select, the page
        // as "2/3" and the arrows spread across it, their words left to
        // assistive tech; from `sm` the words show, gathered to the right.
        "flex items-center justify-between gap-3 sm:justify-end sm:gap-6",
        className
      )}
      data-slot="aof-data-table-pagination"
      {...props}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="sr-only whitespace-nowrap font-medium text-muted-foreground sm:not-sr-only">
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
          <AOFSelectTrigger
            aria-label={labels.rowsPerPage}
            className="w-20 data-[size=default]:h-(--field-height)"
          >
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
      <span className="whitespace-nowrap font-medium text-muted-foreground text-sm tabular-nums">
        <span className="sr-only sm:not-sr-only">
          {labels.page(pageIndex + 1, pageCount)}
        </span>
        <span aria-hidden className="text-foreground sm:hidden">
          {pageIndex + 1}/{pageCount}
        </span>
      </span>
      <div className="flex items-center gap-2">
        <AOFButton
          aria-label={labels.first}
          className="hidden lg:inline-flex"
          disabled={!canBack}
          onClick={toFirst}
          size="icon-field"
          variant="outline"
        >
          <IconChevronsLeft />
        </AOFButton>
        <AOFButton
          aria-label={labels.previous}
          disabled={!canBack}
          onClick={toPrevious}
          size="icon-field"
          variant="outline"
        >
          <IconChevronLeft />
        </AOFButton>
        <AOFButton
          aria-label={labels.next}
          disabled={!canOn}
          onClick={toNext}
          size="icon-field"
          variant="outline"
        >
          <IconChevronRight />
        </AOFButton>
        <AOFButton
          aria-label={labels.last}
          className="hidden lg:inline-flex"
          disabled={!(canOn || pastEnd)}
          onClick={toLast}
          size="icon-field"
          variant="outline"
        >
          <IconChevronsRight />
        </AOFButton>
      </div>
    </div>
  );
};
