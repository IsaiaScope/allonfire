import type React from "react";
import { cn } from "../lib/cn";
import { type OverlayTone, toneBgClass } from "../lib/tones";
import { PaperPanel } from "./paper-panel";

export type CaptionBandProps = React.ComponentProps<"div"> & {
  emphasis?: string;
  tone?: OverlayTone;
};

export function CaptionBand({
  children,
  className,
  emphasis,
  tone = "coral",
  ...props
}: CaptionBandProps) {
  return (
    <PaperPanel
      className={cn("w-full max-w-[940px] px-8 py-6 sm:px-10", className)}
      data-slot="caption-band"
      mode="solid"
      {...props}
    >
      <div
        className="font-az-sans font-extrabold text-[4.2rem] text-az-ink leading-[1.02]"
        data-slot="caption-band-text"
      >
        {children}
      </div>
      {emphasis ? (
        <div
          className={cn(
            "mt-4 inline-flex rounded-full px-5 py-2 font-az-mono font-semibold text-az-paper text-lg uppercase tracking-[0.18em]",
            toneBgClass(tone)
          )}
          data-slot="caption-band-emphasis"
        >
          {emphasis}
        </div>
      ) : null}
    </PaperPanel>
  );
}
