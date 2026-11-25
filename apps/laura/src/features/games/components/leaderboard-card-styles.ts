import { cva } from "class-variance-authority";

// Apart from the card so the skeleton can wear the same box.

/** The card's box, its foot (`foot`) a line in the primary colour (the skeleton has the same). */
export const playerCard = cva("gap-2 after:bg-primary/40");
