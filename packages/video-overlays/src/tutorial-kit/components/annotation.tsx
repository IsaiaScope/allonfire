import type React from "react";
import { interpolate, spring, useCurrentFrame } from "remotion";
import { cn } from "../lib/cn";
import {
  type OverlayTone,
  toneBgClass,
  toneBorderClass,
  toneTextClass,
} from "../lib/tones";
import type { ComponentDensity, ComponentSize } from "./types";

export type FocusRingProps = React.ComponentProps<"div"> & {
  size?: ComponentSize;
  tone?: OverlayTone;
};

export function FocusRing({
  className,
  size = "lg",
  tone = "coral",
  ...props
}: FocusRingProps) {
  const frame = useCurrentFrame();
  const pulse = spring({ frame: frame - 8, fps: 30, config: { damping: 18 } });
  const progress = Math.min(1, pulse);

  return (
    <div
      className={cn(
        "rounded-full border-12 border-current bg-transparent shadow-[0_18px_42px_-28px_rgba(21,20,15,0.7)]",
        size === "sm" && "size-40",
        size === "md" && "size-56",
        size === "lg" && "size-80",
        size === "xl" && "size-120",
        toneTextClass(tone),
        className
      )}
      data-size={size}
      data-slot="focus-ring"
      style={{
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.92, 1])})`,
      }}
      {...props}
    />
  );
}

export type FocusFrameProps = React.ComponentProps<"div"> & {
  label?: string;
  size?: ComponentSize;
  tone?: OverlayTone;
};

export function FocusFrame({
  className,
  label,
  size = "lg",
  tone = "olive",
  ...props
}: FocusFrameProps) {
  return (
    <div
      className={cn(
        "relative rounded-[12px] border-12 bg-az-paper/18 shadow-[0_18px_42px_-28px_rgba(21,20,15,0.7)]",
        size === "sm" && "h-52 w-80",
        size === "md" && "h-64 w-120",
        size === "lg" && "h-80 w-2xl",
        size === "xl" && "h-120 w-4xl",
        toneBorderClass(tone),
        className
      )}
      data-size={size}
      data-slot="focus-frame"
      {...props}
    >
      {label ? (
        <div
          className={cn(
            "az-video-shadow absolute -top-8 -right-5 rounded-full border-2 border-az-ink/14 bg-az-bone px-7 py-4 font-az-sans font-bold text-3xl",
            toneTextClass(tone)
          )}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

export type BracketProps = React.ComponentProps<"div"> & {
  orientation?: "left" | "right" | "top" | "bottom";
  size?: ComponentSize;
  tone?: OverlayTone;
};

export function Bracket({
  className,
  orientation = "left",
  size = "lg",
  tone = "coral",
  ...props
}: BracketProps) {
  const vertical = orientation === "left" || orientation === "right";

  return (
    <div
      className={cn(
        "border-current drop-shadow-[0_18px_22px_rgba(21,20,15,0.18)]",
        vertical ? "h-96 w-24" : "h-24 w-96",
        size === "sm" && (vertical ? "h-56 w-14" : "h-14 w-56"),
        size === "md" && (vertical ? "h-72 w-18" : "h-18 w-72"),
        size === "xl" && (vertical ? "h-136 w-28" : "h-28 w-136"),
        orientation === "left" && "border-y-10 border-l-10",
        orientation === "right" && "border-y-10 border-r-10",
        orientation === "top" && "border-x-10 border-t-10",
        orientation === "bottom" && "border-x-10 border-b-10",
        toneTextClass(tone),
        className
      )}
      data-orientation={orientation}
      data-slot="bracket"
      {...props}
    />
  );
}

export type ArrowProps = React.ComponentProps<"div"> & {
  direction?: "right" | "left" | "up" | "down";
  size?: ComponentSize;
  tone?: OverlayTone;
};

export function Arrow({
  className,
  direction = "right",
  size = "lg",
  tone = "coral",
  ...props
}: ArrowProps) {
  const rotate = arrowRotationClass(direction);

  return (
    <div
      className={cn(
        "flex items-center text-current drop-shadow-[0_18px_22px_rgba(21,20,15,0.18)]",
        size === "sm" && "w-56",
        size === "md" && "w-72",
        size === "lg" && "w-120",
        size === "xl" && "w-2xl",
        rotate,
        toneTextClass(tone),
        className
      )}
      data-direction={direction}
      data-slot="arrow"
      {...props}
    >
      <div className="h-3 flex-1 rounded-full bg-current" />
      <div className="size-10 rotate-45 border-current border-t-10 border-r-10" />
    </div>
  );
}

function arrowRotationClass(direction: NonNullable<ArrowProps["direction"]>) {
  if (direction === "left") {
    return "rotate-180";
  }

  if (direction === "up") {
    return "-rotate-90";
  }

  if (direction === "down") {
    return "rotate-90";
  }

  return "";
}

export type ConnectorLineProps = React.ComponentProps<"div"> & {
  density?: ComponentDensity;
  tone?: OverlayTone;
};

export function ConnectorLine({
  className,
  density = "normal",
  tone = "ink",
  ...props
}: ConnectorLineProps) {
  return (
    <div
      className={cn(
        "w-full rounded-full bg-current shadow-[0_14px_30px_-18px_rgba(21,20,15,0.72)]",
        density === "compact" && "h-3 max-w-2xl opacity-80",
        density === "normal" && "h-5 max-w-4xl opacity-90",
        density === "spacious" && "h-7 max-w-6xl opacity-100",
        toneTextClass(tone),
        className
      )}
      data-density={density}
      data-slot="connector-line"
      {...props}
    />
  );
}

export type DotMarkerProps = React.ComponentProps<"div"> & {
  label?: string;
  size?: ComponentSize;
  tone?: OverlayTone;
};

export function DotMarker({
  className,
  label,
  size = "lg",
  tone = "coral",
  ...props
}: DotMarkerProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-4", className)}
      data-slot="dot-marker"
      {...props}
    >
      <span
        className={cn(
          "rounded-full bg-current",
          size === "sm" && "size-8",
          size === "md" && "size-12",
          size === "lg" && "size-18",
          size === "xl" && "size-28",
          toneTextClass(tone)
        )}
      />
      {label ? (
        <span className="font-az-sans font-extrabold text-6xl text-az-ink">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export type TargetPinProps = React.ComponentProps<"div"> & {
  label?: string;
  tone?: OverlayTone;
};

export function TargetPin({
  className,
  label,
  tone = "coral",
  ...props
}: TargetPinProps) {
  return (
    <div
      className={cn("inline-grid justify-items-center gap-3", className)}
      data-slot="target-pin"
      {...props}
    >
      <div
        className={cn(
          "az-video-shadow grid size-56 place-items-center rounded-full border-12 border-current bg-az-bone",
          toneTextClass(tone)
        )}
      >
        <span className={cn("size-10 rounded-full", toneBgClass(tone))} />
      </div>
      {label ? (
        <div className="rounded-full bg-az-ink px-8 py-4 font-az-sans font-bold text-4xl text-az-paper">
          {label}
        </div>
      ) : null}
    </div>
  );
}

export type HighlightBarProps = React.ComponentProps<"div"> & {
  density?: ComponentDensity;
  tone?: OverlayTone;
};

export function HighlightBar({
  children,
  className,
  density = "normal",
  tone = "mustard",
  ...props
}: HighlightBarProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[8px] font-az-sans font-extrabold text-az-ink",
        density === "compact" && "px-7 py-4 text-5xl",
        density === "normal" && "px-10 py-6 text-7xl",
        density === "spacious" && "px-14 py-8 text-8xl",
        toneBgClass(tone),
        className
      )}
      data-density={density}
      data-slot="highlight-bar"
      {...props}
    >
      {children}
    </div>
  );
}
