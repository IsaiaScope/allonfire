import { cva } from "class-variance-authority";

/**
 * A card's badge: shadcn's size on a phone, a size up from `sm` (28px, 14px
 * type, 16px icon), as every card's. `tone` tints it with one of the Design's
 * chart tokens, the text left in the foreground so it reads in both themes.
 */
export const cardBadge = cva("sm:h-7 sm:px-2.5 sm:text-sm sm:[&>svg]:size-4!", {
  variants: {
    tone: {
      chart1: "border border-chart-1/40 bg-chart-1/15 text-foreground",
      chart2: "border border-chart-2/40 bg-chart-2/15 text-foreground",
    },
  },
});
