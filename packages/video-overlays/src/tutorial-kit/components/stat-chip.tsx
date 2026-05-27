import type React from "react";
import { cn } from "../lib/cn";
import { type OverlayTone, toneTextClass } from "../lib/tones";

export type StatChipProps = React.ComponentProps<"div"> & {
  label: string;
  tone?: OverlayTone;
  value: string;
};

export function StatChip({
  className,
  label,
  tone = "coral",
  value,
  ...props
}: StatChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full border border-az-ink/16 bg-az-paper px-4 py-2",
        className
      )}
      data-slot="stat-chip"
      {...props}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full border border-current font-az-sans font-bold text-xs",
          toneTextClass(tone)
        )}
        data-slot="stat-chip-value"
      >
        {value}
      </span>
      <span
        className="font-az-sans font-semibold text-[11px] text-az-ink-soft uppercase leading-tight tracking-[0.12em]"
        data-slot="stat-chip-label"
      >
        {label}
      </span>
    </div>
  );
}
