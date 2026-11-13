import { cva } from "class-variance-authority";

/**
 * What stands in for something while it loads: the foreground faint, pulsing
 * only where motion is welcome. Every skeleton that draws bars and tiles of
 * its own (the lists', the forms') reads this one.
 */
export const ink = cva("animate-pulse motion-reduce:animate-none", {
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
