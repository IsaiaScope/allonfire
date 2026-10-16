import { AOFPage, type AOFPageProps } from "@allonfire/ui/components/aof-page";
import { cn } from "@allonfire/ui/lib/utils";

/**
 * A Section's page area, inside the frame: a `<section>` (the frame holds the
 * `<main>`) filling what the header leaves rather than the whole screen, its
 * bottom edge plain since the frame keeps it clear of the tab bar.
 */
export const SectionPage = ({ className, ...props }: AOFPageProps) => (
  <AOFPage
    as="section"
    className={cn("min-h-0 flex-1 pb-(--page-gutter)", className)}
    {...props}
  />
);
