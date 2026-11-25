import { cva, type VariantProps } from "class-variance-authority";

/**
 * The tint of a figure, from the Design's own colours so each is told apart:
 * the teal primary (moves, a rank), the success green (time, a personal best),
 * the warning amber, a trophy's gold (a record). Never the coral, which is the
 * Favorites'. A fifth of the colour over the card keeps the text at the
 * foreground's contrast in both themes. One table for every shape a figure
 * takes: its badge or tile, the chip a value sits on, and its icon.
 */
export const badgeTone = cva("", {
  variants: {
    tone: {
      primary: "bg-primary/15",
      success: "bg-success/15",
      warning: "bg-warning/20",
    },
  },
});

/** The chip's tint, a step stronger than its badge's. */
export const chipTone = cva("", {
  defaultVariants: { tone: "primary" },
  variants: {
    tone: {
      primary: "bg-primary/30",
      success: "bg-success/30",
      warning: "bg-warning/35",
    },
  },
});

/** An icon's colour follows its tone (a colour picture keeps its own). */
export const iconTone = cva("", {
  variants: {
    tone: {
      primary: "text-primary",
      success: "text-success",
      warning: "text-warning",
    },
  },
});

export type Tone = NonNullable<VariantProps<typeof badgeTone>["tone"]>;
