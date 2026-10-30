import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOF_LOGO, aofLogoDataUrl } from "@allonfire/design/brand/aof-logo";
import { AOFImage } from "@allonfire/ui/components/aof-image";
import { cn } from "@allonfire/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { BACK_OFFICE } from "@/shared/constants/back-office";

// The logo's width at `h-16` (64px tall, 740 by 220).
const LOGO_SIZES = "216px";

// The band is always night. Inlined in the HTML, so it paints with the sign
// instead of waiting for its own request.
const LOGO_SRC = aofLogoDataUrl({
  app: BACK_OFFICE.LOGO,
  layout: METADATA.LOGO.LAYOUT.HORIZONTAL,
  scheme: METADATA.LOGO.SCHEME.DARK,
});

export type StationSignProps = ComponentProps<"div"> & {
  /** What sits at the band's far end (the hanko). */
  seal: ReactNode;
};

/**
 * A station sign: the Sign in's card. A night band carries the App's logo,
 * the page's heading, and a seal; the body, the form, follows the theme.
 * Both are a little see-through, so the kanji painted behind the page shows
 * through. It enters once, short, and never for reduced motion.
 */
export const StationSign = ({
  children,
  className,
  seal,
  ...props
}: StationSignProps) => (
  <div
    className={cn(
      "motion-safe:fade-in motion-safe:slide-in-from-bottom-3 flex w-full max-w-md flex-col overflow-hidden rounded-lg border border-border bg-card/75 text-card-foreground shadow-lg motion-safe:animate-in motion-safe:duration-500",
      className
    )}
    data-slot="station-sign"
    {...props}
  >
    <div className="dark flex items-center gap-3 border-led border-b bg-led-panel/75 p-3 text-foreground dark:border-led-dim">
      <h1>
        <AOFImage
          alt={BACK_OFFICE.NAME}
          className="h-16 w-auto"
          height={AOF_LOGO.LAYOUT.horizontal.HEIGHT}
          sizes={LOGO_SIZES}
          src={LOGO_SRC}
          width={AOF_LOGO.LAYOUT.horizontal.WIDTH}
        />
      </h1>
      <span className="ml-auto">{seal}</span>
    </div>
    {children}
  </div>
);
