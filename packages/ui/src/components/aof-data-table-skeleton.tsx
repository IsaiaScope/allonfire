import { Skeleton } from "@allonfire/shadcn/components/skeleton";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";

export type AOFDataTableSkeletonProps = ComponentPropsWithoutChildren<"div"> & {
  columns: number;
  /** Said to screen readers while the rows load. */
  label: string;
  rows?: number | undefined;
};

/** The rows drawn when not told how many. */
const DEFAULT_ROWS = 10;

/** `count` stable keys for placeholders that never reorder. */
const placeholders = (name: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${name}-${index}`);

/** The table's shape while its first rows load. */
export const AOFDataTableSkeleton = ({
  className,
  columns,
  label,
  rows = DEFAULT_ROWS,
  ...props
}: AOFDataTableSkeletonProps) => (
  <div
    className={cn(
      "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-lg border p-3",
      className
    )}
    data-slot="aof-data-table-skeleton"
    role="status"
    {...props}
  >
    <span className="sr-only">{label}</span>
    {placeholders("row", rows).map((row) => (
      <div
        aria-hidden="true"
        className="grid gap-3"
        key={row}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {placeholders(`${row}-cell`, columns).map((cell) => (
          <Skeleton className="h-6" key={cell} />
        ))}
      </div>
    ))}
  </div>
);
