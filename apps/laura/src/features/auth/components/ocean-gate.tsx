import { OCEAN_FACE } from "@allonfire/design/designs/ocean/ocean-mark";
import { AOFGateFrame } from "@allonfire/ui/features/auth/components/aof-gate-frame";
import type { AOFAuthDressing } from "@allonfire/ui/features/auth/types/auth-dressing";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { LauraLogo } from "@/shared/components/laura-logo";
import { OceanMark } from "@/shared/components/ocean-mark";
import { SeaLine } from "@/shared/components/sea-line";

const link = cva(
  "rounded-md px-3 py-1 font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      current: {
        false: "text-muted-foreground hover:bg-muted hover:text-foreground",
        // The ink pill: the language the page speaks now.
        true: "bg-ink text-ink-foreground",
      },
    },
  }
);

/**
 * The tide pool at the door: a smiling octopus over Laura's logo and what
 * the page is, the card resting on the sea glass, one wave behind it all.
 * Every signed-out page wears it. A Server Component over ui's `AOFGateFrame`.
 */
export const OceanGate = ({
  children,
  page,
  status,
}: ComponentProps<AOFAuthDressing["Gate"]>) => (
  <AOFGateFrame
    header={
      <header className="motion-safe:fade-in motion-safe:slide-in-from-top-2 flex flex-col items-center gap-2 text-center motion-safe:animate-in motion-safe:duration-500">
        <OceanMark className="size-16" face={OCEAN_FACE.HAPPY} tone="teal" />
        <h1>
          <LauraLogo />
        </h1>
        <p className="font-heading text-xl">{status}</p>
      </header>
    }
    languageLinkClassName={{
      current: link({ current: true }),
      idle: link({ current: false }),
    }}
    page={page}
    wall={
      <SeaLine className="absolute inset-x-0 bottom-0 -z-10 h-24 w-full text-primary/30" />
    }
  >
    <div className="w-full rounded-xl border bg-card p-6 text-card-foreground">
      {children}
    </div>
  </AOFGateFrame>
);
