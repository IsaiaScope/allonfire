import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../../shared/utils/utils";

/**
 * Every page keeps to the safe edges (base.css): clear of a phone's corners,
 * notch and home indicator. Its ground still runs to the screen's edges,
 * under them. A page overrides one side (`pb-24`) and keeps the rest; never
 * a whole `p-*`, which drops them all.
 */
const page = cva(
  "relative isolate flex flex-col bg-background pt-(--gutter-top) pr-(--gutter-right) pb-(--gutter-bottom) pl-(--gutter-left) text-foreground",
  {
    defaultVariants: { as: "main", layout: "stack" },
    variants: {
      /**
       * Only the page that is the screen fills its height; one nested in a
       * frame (`section`, `article`) is as tall as the frame lets it be.
       */
      as: { article: "", main: "min-h-dvh", section: "" },
      layout: {
        /** One short message and an action, centred (home, error, 404). */
        centered: "items-center justify-center gap-4",
        /** Stacked on a phone, side by side from `lg` up. */
        split: "lg:flex-row",
        /** Top to bottom at every size. */
        stack: "",
      },
    },
  }
);

// Plain landmark tags only: a Server Component cannot take Base UI's `render`
// prop, whose hooks run on the client. All three are plain HTMLElements, so
// one `ref` type fits whichever renders.
type PageTag = "article" | "main" | "section";

export type AOFPageProps = ComponentProps<"main"> &
  Omit<VariantProps<typeof page>, "as"> & {
    /** The element to render; `main` unless the page sits inside another. */
    as?: PageTag;
  };

/**
 * A page frame (screen-high as the `<main>`) on the theme's ground: `<main>` by default, any
 * prop passed through. `isolate` gives it its own stacking context, so a
 * backdrop behind it can sit at `-z-10`.
 */
export const AOFPage = ({
  as: Tag = "main",
  className,
  layout,
  ...props
}: AOFPageProps) => (
  <Tag
    className={cn(page({ as: Tag, layout }), className)}
    data-layout={layout ?? "stack"}
    data-slot="page"
    {...props}
  />
);
