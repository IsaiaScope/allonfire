import type React from "react";
import { interpolate, spring, useCurrentFrame } from "remotion";
import { cn } from "../lib/cn";
import { type OverlayTone, toneBorderClass } from "../lib/tones";
import { CalloutLabel } from "./callout-label";

export type TargetHighlightProps = React.ComponentProps<"div"> & {
  label: string;
  tone?: OverlayTone;
};

export function TargetHighlight({
  className,
  label,
  tone = "coral",
  ...props
}: TargetHighlightProps) {
  const frame = useCurrentFrame();
  const pulse = spring({ frame: frame - 24, fps: 30, config: { damping: 18 } });
  const progress = Math.min(1, pulse);

  return (
    <div
      className={cn("relative h-44 w-64 sm:h-56 sm:w-80", className)}
      data-slot="target-highlight"
      {...props}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-[12px] border-10 bg-az-paper/18 shadow-[0_18px_42px_-28px_rgba(21,20,15,0.7)]",
          toneBorderClass(tone)
        )}
        data-slot="target-highlight-frame"
        style={{
          opacity: progress,
          transform: `scale(${interpolate(progress, [0, 1], [0.96, 1])})`,
        }}
      />
      <div
        className="absolute -top-4 -right-4"
        data-slot="target-highlight-label"
      >
        <CalloutLabel tone={tone}>{label}</CalloutLabel>
      </div>
    </div>
  );
}
