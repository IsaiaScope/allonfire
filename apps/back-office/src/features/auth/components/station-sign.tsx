import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOFAppLogo } from "@allonfire/ui/features/navigation/components/aof-app-logo";
import { cn } from "@allonfire/ui/shared/utils/utils";
import type { ComponentProps, ReactNode } from "react";
import { BACK_OFFICE } from "@/shared/constants/back-office";

export type StationSignProps = ComponentProps<"div"> & {
  /** What sits at the band's far end (the hanko). */
  seal: ReactNode;
  /** What the page is (Sign in, Forgot password…), under the band. */
  status: string;
};

/**
 * A station sign: the Sign in's card. A night band carries the App's logo,
 * the page's heading, and a seal; under it the page's name, then the body,
 * the form, which follows the theme.
 * Both are a little see-through, so the kanji painted behind the page shows
 * through. It enters once, short, and never for reduced motion.
 */
export const StationSign = ({
  children,
  className,
  seal,
  status,
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
        <AOFAppLogo
          logo={BACK_OFFICE.logo}
          name={BACK_OFFICE.name}
          scheme={METADATA.LOGO.SCHEME.DARK}
        />
      </h1>
      <span className="ml-auto">{seal}</span>
    </div>
    <p className="px-3 pt-3 font-bold text-xl">{status}</p>
    {children}
  </div>
);
