import { AOFPage, type AOFPageProps } from "@allonfire/ui/components/aof-page";
import { cn } from "@allonfire/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// Twice the bottom gutter: a page's last row (a form's buttons, a table's
// pages) needs air above the edge; the gutter keeps the home indicator in.
// Contained inline: the frame gives the page its width, never its content,
// so a wide row (a long email) scrolls inside its table instead of pushing
// the frame past the screen.
const sectionPage = cva(
  "min-h-0 flex-1 pb-[calc(var(--gutter-bottom)*2)] contain-inline-size",
  {
    defaultVariants: { width: "full" },
    variants: {
      width: {
        /**
         * A form: centred and capped, laid out by its own width (a container,
         * `@2xl:` for two columns), never the screen's: the sidebar decides
         * how much room the page really has.
         */
        form: "@container mx-auto w-full max-w-4xl",
        /** The whole page area, as a list or a table wants. */
        full: "",
      },
    },
  }
);

export type SectionPageProps = AOFPageProps & VariantProps<typeof sectionPage>;

/**
 * A Section's page area, inside the frame: a `<section>` (the frame holds the
 * `<main>`) filling what the header leaves rather than the whole screen, as
 * wide as its content wants (`width`).
 */
export const SectionPage = ({
  className,
  width,
  ...props
}: SectionPageProps) => (
  <AOFPage
    as="section"
    className={cn(sectionPage({ width }), className)}
    {...props}
  />
);
