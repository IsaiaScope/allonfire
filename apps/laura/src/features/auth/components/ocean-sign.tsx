import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOFAppLogo } from "@allonfire/ui/features/navigation/components/aof-app-logo";
import { cn } from "@allonfire/ui/shared/utils/utils";
import type { ComponentProps } from "react";
import { OceanArt } from "@/shared/components/ocean-art";
import { LAURA } from "@/shared/constants/laura";
import { MASCOT } from "@/shared/constants/mascots";

export type OceanSignProps = ComponentProps<"div"> & {
  /** What the page is (Sign in, Forgot password…), under the band. */
  status: string;
};

/**
 * The gate's card, the Back Office's sign in Laura's colours: a band of ink,
 * night in both themes, carries the logo as the page's heading and the
 * gate's octopus at its far end; under it the page's name, then the form. It enters
 * once, short, and never for reduced motion. It casts no shadow: only the
 * floating frame does (the Floating Frame Rule).
 */
export const OceanSign = ({
  children,
  className,
  status,
  ...props
}: OceanSignProps) => (
  <div
    className={cn(
      "motion-safe:fade-in motion-safe:slide-in-from-bottom-3 flex w-full max-w-md flex-col overflow-hidden rounded-xl border bg-card text-card-foreground motion-safe:animate-in motion-safe:duration-500",
      className
    )}
    data-slot="ocean-sign"
    {...props}
  >
    <div className="dark flex items-center gap-3 border-b bg-ink p-3 text-ink-foreground">
      <h1>
        <AOFAppLogo
          logo={LAURA.logo}
          name={LAURA.name}
          scheme={METADATA.LOGO.SCHEME.DARK}
        />
      </h1>
      <OceanArt art={MASCOT.GATE} className="ml-auto size-16" />
    </div>
    <div className="flex flex-col">
      <p className="px-3 pt-3 font-heading text-xl">{status}</p>
      {children}
    </div>
  </div>
);
