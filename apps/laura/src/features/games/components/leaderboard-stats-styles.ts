import { cva } from "class-variance-authority";

// Apart from the stats (which read the leaderboard) so the skeleton can wear the
// same sizes and count.

/** A tile's box: the figure's tint is added by its tone (the skeleton has the same box). */
export const statTile = cva(
  "relative isolate flex h-12 min-w-0 items-center gap-2 overflow-hidden rounded-lg px-2"
);

/** A column's tiles: one across, two from `@2xl` (the skeleton has the same). */
export const statGrid = cva("grid @2xl:grid-cols-2 grid-cols-1 gap-2");
