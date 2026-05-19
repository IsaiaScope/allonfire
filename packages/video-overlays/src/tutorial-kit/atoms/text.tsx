import type React from "react";
import { cn } from "../lib/cn";
import { type OverlayTone, toneBorderClass, toneTextClass } from "../lib/tones";
import type { AtomDensity, AtomSize } from "./types";

export type HeadlineProps = React.ComponentProps<"div"> & {
  align?: "left" | "center";
  size?: AtomSize;
  tone?: OverlayTone;
};

export function Headline({
  align = "left",
  children,
  className,
  size = "xl",
  tone = "ink",
  ...props
}: HeadlineProps) {
  return (
    <div
      className={cn(
        "max-w-[11ch] font-az-sans font-extrabold text-az-ink leading-[0.92]",
        size === "sm" && "text-7xl",
        size === "md" && "text-8xl",
        size === "lg" && "text-[8.5rem]",
        size === "xl" && "text-[10rem]",
        align === "center" && "text-center",
        toneTextClass(tone),
        className
      )}
      data-size={size}
      data-slot="headline"
      {...props}
    >
      {children}
    </div>
  );
}

export type CaptionTextProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  size?: AtomSize;
  tone?: OverlayTone;
};

export function CaptionText({
  children,
  className,
  density = "normal",
  size = "lg",
  tone = "ink",
  ...props
}: CaptionTextProps) {
  return (
    <div
      className={cn(
        "max-w-[34ch] font-az-body font-medium text-az-ink-soft",
        size === "sm" && "text-3xl",
        size === "md" && "text-4xl",
        size === "lg" && "text-5xl",
        size === "xl" && "text-7xl",
        density === "compact" && "leading-[1.08]",
        density === "normal" && "leading-[1.18]",
        density === "spacious" && "leading-[1.32]",
        tone !== "ink" && toneTextClass(tone),
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="caption-text"
      {...props}
    >
      {children}
    </div>
  );
}

export type MonoLabelProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  tone?: OverlayTone;
};

export function MonoLabel({
  children,
  className,
  density = "normal",
  tone = "coral",
  ...props
}: MonoLabelProps) {
  return (
    <div
      className={cn(
        "az-video-shadow inline-flex items-center rounded-full border-2 bg-az-bone font-az-mono font-semibold text-2xl uppercase tracking-[0.16em]",
        density === "compact" && "px-5 py-3",
        density === "normal" && "px-7 py-4",
        density === "spacious" && "px-10 py-5",
        toneBorderClass(tone),
        toneTextClass(tone),
        className
      )}
      data-density={density}
      data-slot="mono-label"
      {...props}
    >
      {children}
    </div>
  );
}

export type NumberBadgeProps = React.ComponentProps<"div"> & {
  label?: string;
  size?: AtomSize;
  tone?: OverlayTone;
  value: string;
};

export function NumberBadge({
  className,
  label,
  size = "lg",
  tone = "coral",
  value,
  ...props
}: NumberBadgeProps) {
  return (
    <div
      className={cn("inline-grid justify-items-center gap-2", className)}
      data-size={size}
      data-slot="number-badge"
      {...props}
    >
      <div
        className={cn(
          "az-video-shadow grid place-items-center rounded-full border-4 border-current bg-az-bone font-az-sans font-extrabold",
          size === "sm" && "size-24 text-4xl",
          size === "md" && "size-32 text-6xl",
          size === "lg" && "size-44 text-8xl",
          size === "xl" && "size-56 text-[9rem]",
          toneTextClass(tone)
        )}
        data-slot="number-badge-value"
      >
        {value}
      </div>
      {label ? (
        <div className="font-az-mono text-az-ink-faint text-xl uppercase tracking-[0.18em]">
          {label}
        </div>
      ) : null}
    </div>
  );
}

export type ValueChipProps = React.ComponentProps<"div"> & {
  label: string;
  tone?: OverlayTone;
  value: string;
};

export function ValueChip({
  className,
  label,
  tone = "coral",
  value,
  ...props
}: ValueChipProps) {
  return (
    <div
      className={cn(
        "az-video-shadow inline-flex items-center gap-7 rounded-full border-2 border-az-ink/18 bg-az-bone px-10 py-7",
        className
      )}
      data-slot="value-chip"
      {...props}
    >
      <span
        className={cn(
          "font-az-sans font-extrabold text-8xl leading-none",
          toneTextClass(tone)
        )}
      >
        {value}
      </span>
      <span className="max-w-[10ch] font-az-mono text-2xl text-az-ink-soft uppercase leading-tight tracking-[0.16em]">
        {label}
      </span>
    </div>
  );
}
