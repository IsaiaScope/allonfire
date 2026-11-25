import { cva } from "class-variance-authority";

// Apart from the podium (a client component) so the skeleton, a Server
// Component, can wear the same sizes.

/**
 * Each step is as tall as its place is high, in the tint of its medal: gold,
 * then the Design's quiet greys and teal. Its number and its trophy sit in the
 * middle with the same gap, each as big as the step lets them be.
 */
export const step = cva(
  "mt-2 flex w-full flex-col items-center justify-center gap-1 rounded-t-lg font-bold font-mono leading-none",
  {
    variants: {
      place: {
        1: "h-24 bg-warning/30 text-2xl",
        2: "h-20 bg-secondary text-xl",
        3: "h-16 bg-primary/15 text-base",
      },
    },
  }
);

/** The podium's box: three places side by side on a fixed height (the skeleton has the same). */
export const podiumBox = cva(
  "mx-auto grid h-56 w-full max-w-md grid-cols-3 items-end gap-2"
);
