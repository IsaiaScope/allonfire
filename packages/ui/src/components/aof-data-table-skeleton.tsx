import { Skeleton } from "@allonfire/shadcn/components/skeleton";
import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";

/** A column of the skeleton: its share of the width and what it holds. */
export type AOFDataTableSkeletonColumn = {
  /** A selection column: a checkbox's box instead of a bar. */
  check?: boolean | undefined;
  /** Its width, a CSS grid track (`3rem`, `minmax(0,2fr)`); an equal share
   *  unless given. */
  track?: string | undefined;
};

export type AOFDataTableSkeletonProps = ComponentPropsWithoutChildren<"div"> & {
  /** How many cards a phone gets instead of the table, as `AOFDataTable`
   *  draws with `card`; none, and the table shows at every width. */
  cards?: number | undefined;
  /** The columns, or only how many (equal shares, text). */
  columns: number | readonly AOFDataTableSkeletonColumn[];
  /** Said to screen readers while the rows load. */
  label: string;
  /** Also the pager's controls, which the real table hides while loading. */
  pager?: boolean | undefined;
  rows?: number | undefined;
};

/** The rows drawn when not told how many. */
const DEFAULT_ROWS = 10;

/** `count` stable keys for placeholders that never reorder. */
const placeholders = (name: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${name}-${index}`);

/**
 * A placeholder's ink: the foreground faint (shadcn's `bg-muted` all but
 * vanishes on the light ground), pulsing only where motion is welcome.
 */
const ink = cva("rounded-sm bg-foreground/10 motion-reduce:animate-none", {
  variants: {
    shape: {
      /** A checkbox's box. */
      box: "size-4 shrink-0",
      /** A control as tall as a field. */
      field: "h-(--field-height)",
      /** A header's label, short and fixed. */
      head: "h-3 w-16 max-w-full",
      /** A line of body text (16px), its length varied row to row. */
      text: "h-3.5",
    },
  },
});

/** Text lengths, cycled through the cells so the rows read as real text. */
const width = cva("", {
  variants: {
    step: {
      0: "w-3/4",
      1: "w-1/2",
      2: "w-2/3",
      3: "w-5/12",
      4: "w-7/12",
    },
  },
});
const STEPS = [0, 1, 2, 3, 4] as const;
const stepOf = (row: number, column: number) =>
  STEPS[(row * 3 + column * 2) % STEPS.length];

/**
 * The table's shape while its first rows load, as `AOFDataTable` draws it, so
 * nothing moves when they arrive: a header and rows as tall as a field
 * (`--field-height`) in a bordered box, a box for a selection column, text
 * bars of varied lengths; with `cards`, cards on a phone instead; with
 * `pager`, the pager under it.
 */
export const AOFDataTableSkeleton = ({
  cards,
  className,
  columns,
  label,
  pager,
  rows = DEFAULT_ROWS,
  ...props
}: AOFDataTableSkeletonProps) => {
  const list: readonly AOFDataTableSkeletonColumn[] =
    typeof columns === "number"
      ? Array.from({ length: columns }, () => ({}))
      : columns;
  const gridTemplateColumns = list
    .map((column) => column.track ?? "minmax(0,1fr)")
    .join(" ");
  const keyed = list.map((column, index) => ({
    column,
    index,
    key: `column-${index}`,
  }));
  const line = (
    cells: (column: AOFDataTableSkeletonColumn, index: number) => ReactNode
  ) =>
    keyed.map(({ column, index, key }) => (
      // Padded as shadcn's cells are, so the bars start where the text will.
      <div className="flex min-w-0 items-center px-2" key={key}>
        {cells(column, index)}
      </div>
    ));
  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}
      data-slot="aof-data-table-skeleton"
      role="status"
      {...props}
    >
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className={cn(
          "min-h-0 flex-1 overflow-hidden rounded-lg border",
          cards && "hidden md:block"
        )}
      >
        <div
          className="grid h-(--field-height) border-b"
          style={{ gridTemplateColumns }}
        >
          {line((column) => (
            <Skeleton
              className={ink({ shape: column.check ? "box" : "head" })}
              data-skeleton={column.check ? "check" : "head"}
            />
          ))}
        </div>
        {placeholders("row", rows).map((row, rowIndex) => (
          <div
            className="grid h-(--field-height) border-b last:border-b-0"
            key={row}
            style={{ gridTemplateColumns }}
          >
            {line((column, index) =>
              column.check ? (
                <Skeleton
                  className={ink({ shape: "box" })}
                  data-skeleton="check"
                />
              ) : (
                <Skeleton
                  className={cn(
                    ink({ shape: "text" }),
                    width({ step: stepOf(rowIndex, index) })
                  )}
                  data-skeleton="cell"
                />
              )
            )}
          </div>
        ))}
      </div>
      {cards ? (
        <ul
          aria-hidden="true"
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:hidden"
        >
          {placeholders("card", cards).map((card, index) => (
            <li
              className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
              data-skeleton="card"
              key={card}
            >
              <div className="flex items-center gap-3">
                <Skeleton className={ink({ shape: "box" })} />
                <Skeleton
                  className={cn(
                    ink({ shape: "text" }),
                    width({ step: stepOf(index, 0) })
                  )}
                />
              </div>
              <Skeleton className={cn(ink({ shape: "text" }), "h-3 w-2/5")} />
              <Skeleton className={cn(ink({ shape: "text" }), "h-3 w-1/3")} />
            </li>
          ))}
        </ul>
      ) : null}
      {pager ? (
        <div
          aria-hidden="true"
          className="flex items-center justify-between gap-3 sm:justify-end sm:gap-6"
          data-skeleton="pager"
        >
          <div className="flex items-center gap-2">
            <Skeleton
              className={cn(ink({ shape: "text" }), "hidden w-28 sm:block")}
            />
            <Skeleton className={cn(ink({ shape: "field" }), "w-20")} />
          </div>
          <Skeleton className={cn(ink({ shape: "text" }), "w-24")} />
          <div className="flex items-center gap-2">
            {placeholders("arrow", 4).map((arrow, index) => (
              <Skeleton
                className={cn(
                  ink({ shape: "field" }),
                  "w-(--field-height)",
                  // First and last, as the real pager, only on a wide screen.
                  (index === 0 || index === 3) && "hidden lg:block"
                )}
                key={arrow}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
