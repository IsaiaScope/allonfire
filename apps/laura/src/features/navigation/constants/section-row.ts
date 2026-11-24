import { cva } from "class-variance-authority";

/**
 * A Section's row. The Section you are on is an ink pill (the ink, with
 * its pale text, in both schemes), the frame's only dark furniture.
 */
export const sectionRow = cva("", {
  variants: {
    current: {
      false: "",
      // `data-active:`, to outrank shadcn's own active background. The `svg`
      // part is a sub-menu row's icon, which shadcn paints in the sidebar
      // accent's text colour: dark in the light scheme, lost on the pill.
      true: "data-active:bg-ink data-active:text-ink-foreground data-active:hover:bg-ink data-active:hover:text-ink-foreground data-active:[&>svg]:text-ink-foreground",
    },
  },
});
