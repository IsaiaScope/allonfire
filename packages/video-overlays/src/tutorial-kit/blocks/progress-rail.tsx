import type React from "react";
import { cn } from "../lib/cn";
import { type OverlayTone, toneBgClass } from "../lib/tones";

export type ProgressRailProps = React.ComponentProps<"div"> & {
  active: number;
  tone?: OverlayTone;
  total: number;
};

export function ProgressRail({
  active,
  className,
  tone = "coral",
  total,
  ...props
}: ProgressRailProps) {
  const segments = Array.from(
    { length: total },
    (_, index) => `progress-rail-${index + 1}`
  );

  return (
    <div
      className={cn(
        "az-video-shadow flex w-full max-w-5xl items-center gap-4 rounded-full border-2 border-az-ink/14 bg-az-bone px-5 py-4",
        className
      )}
      data-slot="progress-rail"
      {...props}
    >
      {segments.map((segmentId, index) => (
        <div
          className={cn(
            "h-8 min-w-24 flex-1 rounded-full shadow-[0_14px_24px_-16px_rgba(21,20,15,0.72)]",
            index <= active ? toneBgClass(tone) : "bg-az-ink/24"
          )}
          data-active={index <= active ? "true" : "false"}
          data-slot="progress-rail-segment"
          key={segmentId}
        />
      ))}
    </div>
  );
}
