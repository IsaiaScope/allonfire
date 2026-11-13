import {
  AOFDataTableSkeleton,
  type AOFDataTableSkeletonColumn,
  aofDataTableFrame,
} from "@allonfire/ui/features/data-table/components/aof-data-table-skeleton";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import {
  tiledControl,
  toolbarLayout,
} from "@/shared/components/toolbar-action";

/** Cards a phone gets while it waits: enough to fill its screen. */
const CARDS = 4;

/** A toolbar control's outline: the real controls' edge and ground. */
const control = cva([
  tiledControl(),
  "relative flex items-center gap-2 rounded-lg border pl-1",
]);

/** What stands in for something, pulsing only where motion is welcome. */
const ink = cva("animate-pulse motion-reduce:animate-none", {
  variants: {
    tone: {
      /** Delete, disabled until a row is chosen. */
      destructive: "rounded-lg bg-destructive/10",
      /** A tile or a line of text, as the table's own placeholders. */
      faint: "rounded-sm bg-foreground/10",
      /** Add, the page's primary action. */
      primary: "rounded-lg bg-primary/30",
    },
  },
});

/**
 * A list's rows while they load: the table (at the `columns` the list lays
 * out; its browser test checks the count against the real table), cards on a
 * phone, and the pager, at the sizes the real ones take.
 */
export const ListRowsSkeleton = ({
  className,
  columns,
  label,
}: {
  /** The row's own look, as the list's rows take it. */
  className: string;
  columns: readonly AOFDataTableSkeletonColumn[];
  /** What a screen reader hears while it loads. */
  label: string;
}) => (
  <AOFDataTableSkeleton
    cards={CARDS}
    className={className}
    columns={columns}
    label={label}
    pager
  />
);

/**
 * A list before its rows arrive: the toolbar laid out as the toolbar lays
 * itself out (the search and Filter opening on their tiles, Delete, Add),
 * then the `rows`. Drawn here rather than with the real toolbar, which reads
 * the address (nuqs) and so would hold the page back with it.
 */
export const ListSkeleton = ({ rows }: { rows: ReactNode }) => (
  <div className={aofDataTableFrame()}>
    <div aria-hidden className="@container">
      <div className={toolbarLayout({ part: "row" })}>
        <div className={cn(control(), toolbarLayout({ part: "search" }))}>
          <div className={cn(ink({ tone: "faint" }), "size-(--field-tile)")} />
          <div className={cn(ink({ tone: "faint" }), "ml-2 h-3.5 w-28")} />
        </div>
        <div className={cn(control(), "w-32")}>
          <div className={cn(ink({ tone: "faint" }), "size-(--field-tile)")} />
          <div className={cn(ink({ tone: "faint" }), "h-3.5 w-12")} />
        </div>
        <div className={toolbarLayout({ part: "actions" })}>
          <div
            className={cn(
              ink({ tone: "destructive" }),
              "size-(--field-height)"
            )}
          />
          <div
            className={cn(
              ink({ tone: "primary" }),
              "h-(--field-height) @4xl:w-40 w-(--field-height)"
            )}
          />
        </div>
      </div>
    </div>
    {rows}
  </div>
);
