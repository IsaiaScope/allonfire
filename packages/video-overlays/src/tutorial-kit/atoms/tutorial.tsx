import type React from "react";
import { interpolate, spring, useCurrentFrame } from "remotion";
import { cn } from "../lib/cn";
import { type OverlayTone, toneBgClass, toneTextClass } from "../lib/tones";
import type { AtomDensity, AtomSize } from "./types";

export type CursorMarkProps = React.ComponentProps<"div"> & {
  label?: string;
  tone?: OverlayTone;
};

export function CursorMark({
  className,
  label,
  tone = "coral",
  ...props
}: CursorMarkProps) {
  return (
    <div
      className={cn("relative inline-block size-64", className)}
      data-slot="cursor-mark"
      {...props}
    >
      <div className="absolute top-12 left-24 h-40 w-24 rotate-[-18deg] rounded-[6px] border-2 border-az-paper/24 bg-az-ink shadow-[0_28px_44px_-18px_rgba(21,20,15,0.58)]" />
      {label ? (
        <div
          className={cn(
            "az-video-shadow absolute bottom-2 left-6 rounded-full border-2 border-az-ink/16 bg-az-bone px-8 py-4 font-az-sans font-extrabold text-4xl",
            toneTextClass(tone)
          )}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

export type ClickPulseProps = React.ComponentProps<"div"> & {
  size?: AtomSize;
  tone?: OverlayTone;
};

export function ClickPulse({
  className,
  size = "lg",
  tone = "coral",
  ...props
}: ClickPulseProps) {
  const frame = useCurrentFrame();
  const pulse = spring({ frame: frame - 10, fps: 30, config: { damping: 16 } });
  const progress = Math.min(1, pulse);

  return (
    <div
      className={cn(
        "rounded-full border-12 border-current shadow-[0_18px_42px_-28px_rgba(21,20,15,0.7)]",
        size === "sm" && "size-32",
        size === "md" && "size-44",
        size === "lg" && "size-64",
        size === "xl" && "size-80",
        toneTextClass(tone),
        className
      )}
      data-size={size}
      data-slot="click-pulse"
      style={{
        opacity: 1 - progress * 0.72,
        transform: `scale(${interpolate(progress, [0, 1], [0.72, 1.28])})`,
      }}
      {...props}
    />
  );
}

export type KeycapProps = React.ComponentProps<"div"> & {
  size?: AtomSize;
  tone?: OverlayTone;
};

export function Keycap({
  children,
  className,
  size = "lg",
  tone = "ink",
  ...props
}: KeycapProps) {
  return (
    <div
      className={cn(
        "inline-grid min-w-32 rounded-[12px] bg-current p-1 pb-4 font-az-mono font-extrabold uppercase shadow-[0_34px_56px_-34px_rgba(21,20,15,0.82)]",
        size === "sm" && "text-4xl",
        size === "md" && "text-5xl",
        size === "lg" && "text-7xl",
        size === "xl" && "text-8xl",
        toneTextClass(tone),
        className
      )}
      data-size={size}
      data-slot="keycap"
      {...props}
    >
      <span
        className={cn(
          "grid place-items-center rounded-[8px] border-[3px] border-current bg-az-bone leading-none shadow-[inset_0_12px_0_rgba(255,251,236,0.54),inset_0_-10px_0_rgba(21,20,15,0.12)]",
          size === "sm" && "px-7 py-5",
          size === "md" && "px-9 py-6",
          size === "lg" && "px-12 py-8",
          size === "xl" && "px-14 py-10"
        )}
        data-slot="keycap-face"
      >
        {children}
      </span>
    </div>
  );
}

export type StepPillProps = React.ComponentProps<"div"> & {
  label: string;
  tone?: OverlayTone;
  value: string;
};

export function StepPill({
  className,
  label,
  tone = "coral",
  value,
  ...props
}: StepPillProps) {
  return (
    <div
      className={cn(
        "az-video-shadow inline-flex items-center gap-7 rounded-full border-2 border-az-ink/18 bg-az-bone px-10 py-6 font-az-sans font-extrabold text-5xl text-az-ink",
        className
      )}
      data-slot="step-pill"
      {...props}
    >
      <span
        className={cn(
          "rounded-full px-6 py-3 font-az-mono text-2xl text-az-paper uppercase tracking-[0.18em]",
          toneBgClass(tone)
        )}
      >
        {value}
      </span>
      <span>{label}</span>
    </div>
  );
}

export type ProgressDotsProps = React.ComponentProps<"div"> & {
  active: number;
  tone?: OverlayTone;
  total: number;
};

export function ProgressDots({
  active,
  className,
  tone = "coral",
  total,
  ...props
}: ProgressDotsProps) {
  const dots = Array.from(
    { length: total },
    (_, index) => `progress-dot-${index + 1}`
  );

  return (
    <div
      className={cn("inline-flex items-center gap-4", className)}
      data-slot="progress-dots"
      {...props}
    >
      {dots.map((dotId, index) => (
        <span
          className={cn(
            "size-9 rounded-full shadow-[0_10px_18px_-12px_rgba(21,20,15,0.62)]",
            index <= active ? toneBgClass(tone) : "bg-az-ink/24"
          )}
          data-active={index <= active ? "true" : "false"}
          key={dotId}
        />
      ))}
    </div>
  );
}

export type CodeLineProps = React.ComponentProps<"div"> & {
  active?: boolean;
  lineNumber?: number;
  tone?: OverlayTone;
};

export function CodeLine({
  active = false,
  children,
  className,
  lineNumber,
  tone = "coral",
  ...props
}: CodeLineProps) {
  return (
    <div
      className={cn(
        "grid min-h-24 w-full grid-cols-[6rem_1fr] items-center rounded-[8px] border-2 px-8 py-6 font-az-mono text-5xl leading-none",
        active
          ? cn(
              "border-current text-az-paper shadow-[0_20px_36px_-24px_rgba(21,20,15,0.78)]",
              toneBgClass(tone)
            )
          : "border-az-paper/10 bg-az-paper/[0.06] text-az-paper/70",
        className
      )}
      data-active={active ? "true" : "false"}
      data-slot="code-line"
      {...props}
    >
      <span className={cn(active ? "text-az-paper/62" : "text-az-paper/34")}>
        {typeof lineNumber === "number"
          ? String(lineNumber).padStart(2, "0")
          : ""}
      </span>
      <span>{children}</span>
    </div>
  );
}

export type CodeBlockProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  file?: string;
  lines: string[];
};

export function CodeBlock({
  className,
  density = "normal",
  file,
  lines,
  ...props
}: CodeBlockProps) {
  return (
    <div
      className={cn(
        "az-video-shadow w-full max-w-4xl rounded-[8px] border-2 border-az-paper/14 bg-az-ink text-az-paper",
        density === "compact" && "p-5",
        density === "normal" && "p-7",
        density === "spacious" && "p-10",
        className
      )}
      data-density={density}
      data-slot="code-block"
      {...props}
    >
      {file ? (
        <div className="border-az-paper/16 border-b pb-4 font-az-mono text-az-paper/52 text-sm uppercase tracking-[0.16em]">
          {file}
        </div>
      ) : null}
      <div className="mt-5 grid gap-2">
        {lines.map((line, index) => (
          <CodeLine
            active={index === 1}
            key={`code-line-${line}`}
            lineNumber={index + 1}
          >
            {line}
          </CodeLine>
        ))}
      </div>
    </div>
  );
}
