import { AOFGateFrame } from "@allonfire/ui/features/auth/components/aof-gate-frame";
import type { AOFAuthDressing } from "@allonfire/ui/features/auth/types/auth-dressing";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { SeaLine } from "@/shared/components/sea-line";
import { OceanSign } from "./ocean-sign";

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
 * The tide pool at the door: one card on the sea glass, headed by Laura's logo
 * and the octopus (`OceanSign`), one wave behind it all. Every
 * signed-out page wears it. A Server Component over ui's `AOFGateFrame`.
 */
export const OceanGate = ({
  children,
  page,
  status,
}: ComponentProps<AOFAuthDressing["Gate"]>) => (
  <AOFGateFrame
    languageLinkClassName={{
      current: link({ current: true }),
      idle: link({ current: false }),
    }}
    page={page}
    wall={
      <SeaLine className="absolute inset-x-0 bottom-0 -z-10 h-24 w-full text-primary/30" />
    }
  >
    <OceanSign status={status}>{children}</OceanSign>
  </AOFGateFrame>
);
