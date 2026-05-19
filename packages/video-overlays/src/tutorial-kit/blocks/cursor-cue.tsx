import type React from "react";
import { interpolate, spring, useCurrentFrame } from "remotion";
import { cn } from "../lib/cn";
import type { OverlayTone } from "../lib/tones";
import { CalloutLabel } from "./callout-label";

export type CursorCueProps = React.ComponentProps<"div"> & {
  label: string;
  tone?: OverlayTone;
};

export function CursorCue({
  className,
  label,
  tone = "coral",
  ...props
}: CursorCueProps) {
  const frame = useCurrentFrame();
  const click = spring({ frame: frame - 38, fps: 30, config: { damping: 16 } });
  const progress = Math.min(1, click);
  const ring = interpolate(click, [0, 1], [0.8, 1.4]);

  return (
    <div
      className={cn("relative size-28", className)}
      data-slot="cursor-cue"
      {...props}
    >
      <div
        className="absolute top-6 left-6 size-16 rounded-full border-[6px] border-az-coral shadow-[0_18px_34px_-24px_rgba(21,20,15,0.58)]"
        data-slot="cursor-cue-ring"
        style={{ opacity: 1 - progress, transform: `scale(${ring})` }}
      />
      <div
        className="absolute top-8 left-10 h-12 w-8 rotate-[-18deg] rounded-[3px] border-2 border-az-paper/24 bg-az-ink shadow-[0_18px_28px_-16px_rgba(21,20,15,0.58)]"
        data-slot="cursor-cue-pointer"
      />
      <div className="absolute bottom-0 left-0" data-slot="cursor-cue-label">
        <CalloutLabel tone={tone}>{label}</CalloutLabel>
      </div>
    </div>
  );
}
