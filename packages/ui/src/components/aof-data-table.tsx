"use client";

import { ScrollBar } from "@allonfire/shadcn/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@allonfire/shadcn/components/table";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import {
  type Column,
  columnSizingFeature,
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
import { cva } from "class-variance-authority";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "../lib/utils";
import { AOFDataTableSkeleton } from "./aof-data-table-skeleton";

/**
 * An AOF table's features: pages, row selection, and its columns' widths
 * (TanStack's column sizing: a column's `maxSize`). Sorting, filtering and
 * the rest join when a list needs them; module scope, so TanStack never sees
 * a new set.
 */
const AOF_TABLE_FEATURES = tableFeatures({
  columnSizingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
});

/**
 * A column's width comes from its definition, in px: as wide as what it
 * holds, never past `maxSize` (320 unless it says; past it a value ends in
 * an ellipsis), never under `minSize` when it gives one; both the same fix
 * it. The `fill` columns (the table's prop) share the room the rest leave,
 * each in proportion to what it holds, like flex items growing together;
 * a value stays whole when its share is enough and is cut to an ellipsis
 * when not, down to its `minSize`; under that the table scrolls sideways.
 */
const DEFAULT_COLUMN = { maxSize: 320, minSize: 0 } as const;
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
): AOFTable<TData> =>
  useTable({
    ...options,
    defaultColumn: { ...DEFAULT_COLUMN, ...options.defaultColumn },
    features: AOF_TABLE_FEATURES,
  });

/** Where the rows stand: TanStack Query's own names, so `status={query.status}`. */
export type AOFDataTableStatus = "pending" | "error" | "success";

export type AOFDataTableProps<TData extends RowData> = ComponentProps<"div"> & {
  /**
   * Whether a row is being changed (a deletion on its way): drawn faded,
   * marked busy and out of reach until the change lands.
   */
  busy?: ((row: AOFRow<TData>) => boolean) | undefined;
  /**
   * The columns that share the room a wide screen leaves over, by id, each
   * in proportion to what it holds; every other column (a row's checkbox)
   * stays as wide as what it holds. None: the browser shares the room among
   * all of them.
   */
  fill?: readonly string[] | undefined;
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
  busy,
  card,
  children,
  className,
  fill,
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
            busy={busy}
            card={card}
            fill={fill}
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

/**
 * What holds a cell's value: cut to an ellipsis at the column's width, with
 * a little room around it (taken back by the margin) so a control's focus
 * ring inside is not cut too. A checkbox is never cut: its hit area reaches
 * past the box, and a cut one leaves the rest to a link stretched over the
 * row.
 */
const valueBox = cva(
  "-m-1 truncate p-1 has-[[role=checkbox]]:overflow-visible"
);

/**
 * How a column's value is sized (`DEFAULT_COLUMN`). A fill column's value
 * spans its cell (`100%`), so the table sizes the column by what it holds
 * and can still narrow it to its `minSize` (to what it holds when it gives
 * none: `0`, the default, since TanStack's own is 20), cutting the value to
 * an ellipsis.
 */
const widths = <TData extends RowData>(
  column: Column<AOFTableFeatures, TData>,
  fill: readonly string[] | undefined
): CSSProperties =>
  fill?.includes(column.id)
    ? {
        maxWidth: column.columnDef.maxSize,
        minWidth: column.columnDef.minSize || "min-content",
        width: "100%",
      }
    : {
        maxWidth: column.columnDef.maxSize,
        minWidth: column.columnDef.minSize,
      };

/**
 * A row (or its card) while it is being changed: faded, positioned so a
 * link in it can stretch over all of it (`after:absolute after:inset-0`).
 */
const busyRow = cva(
  "relative data-busy:opacity-50 motion-safe:transition-opacity"
);

/** A busy row's marks: announced busy, and `inert`, so nothing in it acts. */
const busyProps = <TData extends RowData>(
  row: AOFRow<TData>,
  busy: ((row: AOFRow<TData>) => boolean) | undefined
) =>
  busy?.(row) ? { "aria-busy": true, "data-busy": "", inert: true } : undefined;

/**
 * The rows as a table, and as cards on a phone when `card` is given. Each
 * column is as wide as what it holds, up to its `maxSize` (past it a value
 * ends in an ellipsis); on a wide screen the `fill` columns share the room
 * left over, and when the columns need more room than the box has, the table
 * scrolls sideways, with a bar along its foot that stays drawn (a Mac's own
 * bars hide until the table scrolls), so it shows there is more to the side.
 */
const AOFDataTableRows = <TData extends RowData>({
  busy,
  card,
  fill,
  label,
  rows,
  table,
}: Pick<
  AOFDataTableProps<TData>,
  "busy" | "card" | "fill" | "label" | "table"
> & {
  rows: AOFRow<TData>[];
}) => (
  <>
    {/* Base UI's scroll area (shadcn's `scroll-area` is built on it): the
        viewport is the only scroller, both ways, so the header sticks to
        it; its own bars stay hidden. Only a horizontal bar is drawn, at the
        bottom whenever the columns need more room than the box has, never
        fading, its thumb a hand to grab; up and down scrolls by wheel,
        touch and keys alone. */}
    <ScrollAreaPrimitive.Root
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden rounded-lg border",
        card && "hidden md:block"
      )}
    >
      <ScrollAreaPrimitive.Viewport className="size-full overscroll-x-contain outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <ScrollAreaPrimitive.Content className="**:data-[slot=table-container]:overflow-visible">
          <Table aria-label={label} className="text-base">
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => (
                    <TableHead
                      className={cn(
                        "h-(--field-height) has-[[role=checkbox]]:px-3",
                        fill && !fill.includes(header.column.id) && "w-px"
                      )}
                      key={header.id}
                    >
                      <div
                        className={valueBox()}
                        style={widths(header.column, fill)}
                      >
                        {header.isPlaceholder ? null : (
                          <table.FlexRender header={header} />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  className={busyRow()}
                  key={row.id}
                  {...busyProps(row, busy)}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      className="h-(--field-height) has-[[role=checkbox]]:px-3"
                      key={cell.id}
                    >
                      <div
                        className={valueBox()}
                        style={widths(cell.column, fill)}
                      >
                        <table.FlexRender cell={cell} />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar
        className="cursor-pointer **:data-[slot=scroll-area-thumb]:cursor-grab **:data-[slot=scroll-area-thumb]:rounded-sm **:data-[slot=scroll-area-thumb]:bg-input **:data-[slot=scroll-area-thumb]:active:cursor-grabbing"
        orientation="horizontal"
      />
    </ScrollAreaPrimitive.Root>
    {card ? (
      <ul
        aria-label={label}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto md:hidden"
      >
        {rows.map((row) => (
          <li className={busyRow()} key={row.id} {...busyProps(row, busy)}>
            {card(row)}
          </li>
        ))}
      </ul>
    ) : null}
  </>
);
