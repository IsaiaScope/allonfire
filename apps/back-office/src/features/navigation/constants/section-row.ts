import { cva } from "class-variance-authority";

/**
 * A Section's row, with room for a bar along its left edge. The Section you
 * are on is marked by the yellow of the tactile paving: that bar and a faint
 * wash of it behind the row, both following light and dark. The frame's
 * only yellow.
 */
export const sectionRow = cva(
  "relative pl-2.5 before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-sm before:bg-tactile motion-safe:before:transition-opacity",
  {
    variants: {
      current: {
        false: "before:opacity-0",
        // `data-active:`, to outrank shadcn's own active background.
        true: "before:opacity-100 data-active:bg-tactile/15",
      },
    },
  }
);
