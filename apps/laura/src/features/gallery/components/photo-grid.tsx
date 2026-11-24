import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { tileSpan } from "../utils/tile-span";

/**
 * The columns a page's width gives (one, two, three, four: the Section's
 * container), and the row: one 40th of a column's width (`GALLERY.GRID.PRECISION`,
 * which `tileSpan` counts in), so a tile that spans `tileSpan(width, height)`
 * rows keeps its picture's ratio. The grid is a `ul` filling its container,
 * which is what `100cqw` measures. The columns and the row change together,
 * and with the tile's `sizes`.
 */
const grid = cva(
  "grid auto-rows-[calc(100cqw/(var(--cols)*40))] grid-cols-[repeat(var(--cols),minmax(0,1fr))] @3xl:[--cols:4] @[20rem]:[--cols:2] @xl:[--cols:3] [--cols:1]"
);

/** What stacks under the grid: the sentinel, the status line, the buttons. The skeleton stacks the same. */
export const feedFrame = cva("flex flex-col gap-4");

/** Every loaded photo (or skeleton tile) in one list, so nothing seams between pages. */
export const PhotoGrid = ({ className, ...props }: ComponentProps<"ul">) => (
  <ul className={cn(grid(), className)} {...props} />
);

export type PhotoCellProps = ComponentProps<"li"> & {
  height: number;
  width: number;
};

/** One cell of the grid: as many rows as the picture's ratio asks, its gutter its padding. */
export const PhotoCell = ({
  height,
  style,
  width,
  ...props
}: PhotoCellProps) => (
  <li
    style={{ ...style, gridRow: `span ${tileSpan(width, height)}` }}
    {...props}
  />
);
