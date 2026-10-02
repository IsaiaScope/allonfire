import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

const page = cva(
  "relative isolate flex min-h-dvh flex-col bg-background text-foreground",
  {
    defaultVariants: { layout: "stack" },
    variants: {
      layout: {
        /** One short message and an action, centred (home, error, 404). */
        centered: "items-center justify-center gap-4 p-8",
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
  VariantProps<typeof page> & {
    /** The element to render; `main` unless the page sits inside another. */
    as?: PageTag;
  };

/**
 * A full-height page frame on the theme's ground: `<main>` by default, any
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
    className={cn(page({ layout }), className)}
    data-layout={layout ?? "stack"}
    data-slot="page"
    {...props}
  />
);
