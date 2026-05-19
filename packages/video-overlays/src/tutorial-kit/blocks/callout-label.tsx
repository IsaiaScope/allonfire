import type React from "react";
import { cn } from "../lib/cn";
import { type OverlayTone, toneTextClass } from "../lib/tones";

export type CalloutLabelProps = React.ComponentProps<"div"> & {
  tone?: OverlayTone;
};

export function CalloutLabel({
  children,
  className,
  tone = "coral",
  ...props
}: CalloutLabelProps) {
  return (
    <div
      className={cn(
        "az-video-shadow inline-flex items-center gap-4 rounded-full border-2 border-az-ink/18 bg-az-bone px-7 py-4 font-az-sans font-extrabold text-2xl text-az-ink",
        className
      )}
      data-slot="callout-label"
      {...props}
    >
      <span
        className={cn("size-4 rounded-full bg-current", toneTextClass(tone))}
        data-slot="callout-label-dot"
      />
      <span data-slot="callout-label-text">{children}</span>
    </div>
  );
}
