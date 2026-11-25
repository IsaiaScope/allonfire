import { cn } from "@allonfire/ui/shared/utils/utils";
import type { ComponentProps, ReactNode } from "react";
import { MASCOT } from "../constants/mascots";
import { OceanArt } from "./ocean-art";

/**
 * The head of a Laura dialog: a band of ink, night in both themes, with
 * Laura's octopus at its left and the dialog's title beside it, in the
 * heading font. Every dialog of Laura wears it, the question before a removal
 * and the end of a game alike.
 */
export const OceanHead = ({
  children,
  className,
  end,
  ...props
}: ComponentProps<"div"> & {
  /** What sits at the band's far end, centred in its height (a compact action). */
  end?: ReactNode;
}) => (
  <div
    className={cn(
      "dark -mx-4 -mt-4 flex items-center gap-3 border-b bg-ink p-3 text-ink-foreground",
      className
    )}
    {...props}
  >
    <OceanArt art={MASCOT.APP} className="size-12" />
    <div className="min-w-0 flex-1 font-heading leading-snug **:data-[slot=alert-dialog-title]:font-heading **:data-[slot=dialog-title]:font-heading **:data-[slot=alert-dialog-title]:text-ink-foreground **:data-[slot=alert-dialog-title]:text-xl **:data-[slot=dialog-title]:text-ink-foreground **:data-[slot=dialog-title]:text-xl">
      {children}
    </div>
    {end ? <div className="shrink-0">{end}</div> : null}
  </div>
);
