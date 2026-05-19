import type React from "react";
import { cn } from "../lib/cn";
import { type OverlayTone, toneBorderClass, toneTextClass } from "../lib/tones";
import type { AtomDensity, AtomSize } from "./types";

export type IdeaCardProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  kicker?: string;
  size?: AtomSize;
  tone?: OverlayTone;
};

export function IdeaCard({
  children,
  className,
  density = "normal",
  kicker,
  size = "xl",
  tone = "coral",
  ...props
}: IdeaCardProps) {
  return (
    <div
      className={cn(
        "az-video-shadow grid max-w-[980px] rounded-[8px] border-2 border-az-ink/18 bg-az-bone",
        density === "compact" && "gap-5 p-10",
        density === "normal" && "gap-7 p-14",
        density === "spacious" && "gap-9 p-16",
        size === "sm" && "max-w-[600px]",
        size === "md" && "max-w-[760px]",
        size === "lg" && "max-w-[880px]",
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="idea-card"
      {...props}
    >
      {kicker ? (
        <div
          className={cn(
            "font-az-mono font-semibold text-2xl uppercase tracking-[0.18em]",
            toneTextClass(tone)
          )}
        >
          {kicker}
        </div>
      ) : null}
      <div
        className={cn(
          "font-az-sans font-extrabold text-az-ink leading-[0.96]",
          size === "sm" && "text-5xl",
          size === "md" && "text-6xl",
          size === "lg" && "text-7xl",
          size === "xl" && "text-8xl"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export type VersusPairProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  left: React.ReactNode;
  right: React.ReactNode;
  size?: AtomSize;
  tone?: OverlayTone;
};

export function VersusPair({
  className,
  density = "normal",
  left,
  right,
  size = "xl",
  tone = "coral",
  ...props
}: VersusPairProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-[1120px] grid-cols-[1fr_auto_1fr] items-center",
        density === "compact" && "gap-6",
        density === "normal" && "gap-10",
        density === "spacious" && "gap-14",
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="versus-pair"
      {...props}
    >
      <div
        className={cn(
          "text-right font-az-sans font-extrabold text-az-ink leading-none",
          conceptTextSizeClass(size)
        )}
      >
        {left}
      </div>
      <div
        className={cn(
          "az-video-shadow grid size-28 place-items-center rounded-full border-4 border-current bg-az-bone font-az-mono font-semibold text-2xl uppercase",
          toneTextClass(tone)
        )}
      >
        vs
      </div>
      <div
        className={cn(
          "font-az-sans font-extrabold text-az-ink leading-none",
          conceptTextSizeClass(size)
        )}
      >
        {right}
      </div>
    </div>
  );
}

export type BeforeAfterProps = React.ComponentProps<"div"> & {
  after: React.ReactNode;
  before: React.ReactNode;
  density?: AtomDensity;
  orientation?: "horizontal" | "vertical";
  size?: AtomSize;
  tone?: OverlayTone;
};

export function BeforeAfter({
  after,
  before,
  className,
  density = "normal",
  orientation = "horizontal",
  size = "lg",
  tone = "olive",
  ...props
}: BeforeAfterProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-[1120px]",
        density === "compact" && "gap-4",
        density === "normal" && "gap-6",
        density === "spacious" && "gap-8",
        orientation === "horizontal" ? "grid-cols-2" : "grid-cols-1",
        className
      )}
      data-density={density}
      data-orientation={orientation}
      data-size={size}
      data-slot="before-after"
      {...props}
    >
      <ComparePanel density={density} label="before" size={size} tone="ink">
        {before}
      </ComparePanel>
      <ComparePanel density={density} label="after" size={size} tone={tone}>
        {after}
      </ComparePanel>
    </div>
  );
}

export type DecisionForkProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  left: React.ReactNode;
  prompt: React.ReactNode;
  right: React.ReactNode;
  size?: AtomSize;
  tone?: OverlayTone;
};

export function DecisionFork({
  className,
  density = "normal",
  left,
  prompt,
  right,
  size = "lg",
  tone = "mustard",
  ...props
}: DecisionForkProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-[980px]",
        density === "compact" && "gap-6",
        density === "normal" && "gap-9",
        density === "spacious" && "gap-12",
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="decision-fork"
      {...props}
    >
      <div
        className={cn(
          "text-center font-az-sans font-extrabold text-az-ink leading-none",
          conceptTextSizeClass(size)
        )}
      >
        {prompt}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-5">
        <Choice density={density} size={size} tone="coral">
          {left}
        </Choice>
        <div className={cn("h-px w-20 bg-current", toneTextClass(tone))} />
        <Choice density={density} size={size} tone="olive">
          {right}
        </Choice>
      </div>
    </div>
  );
}

export type TimelineStepProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  label: React.ReactNode;
  meta?: React.ReactNode;
  size?: AtomSize;
  step: string;
  tone?: OverlayTone;
};

export function TimelineStep({
  className,
  density = "normal",
  label,
  meta,
  size = "lg",
  step,
  tone = "coral",
  ...props
}: TimelineStepProps) {
  return (
    <div
      className={cn(
        "az-video-shadow inline-grid max-w-[880px] items-center rounded-[8px] border-2 border-az-ink/18 bg-az-bone",
        density === "compact" && "gap-6 p-8",
        density === "normal" && "gap-10 p-10",
        density === "spacious" && "gap-12 p-12",
        size === "sm" && "grid-cols-[8rem_1fr]",
        size === "md" && "grid-cols-[10rem_1fr]",
        (size === "lg" || size === "xl") && "grid-cols-[12rem_1fr]",
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="timeline-step"
      {...props}
    >
      <div
        className={cn(
          "grid size-48 place-items-center rounded-full border-4 border-current font-az-sans font-extrabold text-8xl",
          size === "sm" && "size-32 text-5xl",
          size === "md" && "size-40 text-6xl",
          size === "lg" && "size-48 text-8xl",
          size === "xl" && "size-56 text-[9rem]",
          toneTextClass(tone)
        )}
      >
        {step}
      </div>
      <div className="grid gap-4">
        <div
          className={cn(
            "font-az-sans font-extrabold text-az-ink leading-none",
            conceptTextSizeClass(size)
          )}
        >
          {label}
        </div>
        {meta ? (
          <div className="font-az-mono text-2xl text-az-ink-faint uppercase tracking-[0.16em]">
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type QuoteCardProps = React.ComponentProps<"div"> & {
  attribution?: React.ReactNode;
  density?: AtomDensity;
  size?: AtomSize;
  tone?: OverlayTone;
};

export function QuoteCard({
  attribution,
  children,
  className,
  density = "normal",
  size = "lg",
  tone = "coral",
  ...props
}: QuoteCardProps) {
  return (
    <div
      className={cn(
        "az-video-shadow grid max-w-[980px] rounded-[8px] border-2 border-az-ink/18 bg-az-bone",
        density === "compact" && "gap-5 p-10",
        density === "normal" && "gap-8 p-14",
        density === "spacious" && "gap-10 p-16",
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="quote-card"
      {...props}
    >
      <div
        className={cn(
          "font-az-serif text-8xl italic leading-none",
          toneTextClass(tone)
        )}
      >
        "
      </div>
      <div
        className={cn(
          "font-az-sans font-extrabold text-az-ink leading-[0.98]",
          conceptTextSizeClass(size)
        )}
      >
        {children}
      </div>
      {attribution ? (
        <div className="font-az-mono text-2xl text-az-ink-faint uppercase tracking-[0.16em]">
          {attribution}
        </div>
      ) : null}
    </div>
  );
}

export type WarningMarkProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  label?: React.ReactNode;
  size?: AtomSize;
  tone?: OverlayTone;
};

export function WarningMark({
  className,
  density = "normal",
  label = "watch this",
  size = "lg",
  tone = "mustard",
  ...props
}: WarningMarkProps) {
  return (
    <div
      className={cn(
        "inline-grid justify-items-center",
        density === "compact" && "gap-5",
        density === "normal" && "gap-8",
        density === "spacious" && "gap-10",
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="warning-mark"
      {...props}
    >
      <div
        className={cn(
          "font-az-sans font-extrabold leading-none",
          size === "sm" && "text-[8rem]",
          size === "md" && "text-[10rem]",
          size === "lg" && "text-[13rem]",
          size === "xl" && "text-[16rem]",
          toneTextClass(tone)
        )}
      >
        !
      </div>
      <div className="rounded-full bg-az-ink px-9 py-4 font-az-sans font-extrabold text-4xl text-az-paper">
        {label}
      </div>
    </div>
  );
}

export type FormulaStripProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  items: React.ReactNode[];
  size?: AtomSize;
  tone?: OverlayTone;
};

export function FormulaStrip({
  className,
  density = "normal",
  items,
  size = "lg",
  tone = "coral",
  ...props
}: FormulaStripProps) {
  return (
    <div
      className={cn(
        "az-video-shadow inline-flex max-w-full flex-wrap items-center justify-center rounded-[8px] border-2 border-az-ink/18 bg-az-bone",
        density === "compact" && "gap-4 px-8 py-6",
        density === "normal" && "gap-7 px-10 py-8",
        density === "spacious" && "gap-9 px-12 py-10",
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="formula-strip"
      {...props}
    >
      {items.map((item, index) => (
        <div className="contents" key={`formula-${String(item)}`}>
          {index > 0 ? (
            <span
              className={cn(
                "font-az-mono font-semibold",
                size === "sm" && "text-3xl",
                size === "md" && "text-4xl",
                size === "lg" && "text-5xl",
                size === "xl" && "text-6xl",
                toneTextClass(tone)
              )}
            >
              to
            </span>
          ) : null}
          <span
            className={cn(
              "font-az-sans font-extrabold text-az-ink leading-none",
              conceptTextSizeClass(size)
            )}
          >
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

export type StatusStampProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  size?: AtomSize;
  tone?: OverlayTone;
};

export function StatusStamp({
  children,
  className,
  density = "normal",
  size = "lg",
  tone = "olive",
  ...props
}: StatusStampProps) {
  return (
    <div
      className={cn(
        "az-video-shadow inline-flex -rotate-3 items-center rounded-[8px] border-[6px] border-current bg-az-bone font-az-sans font-extrabold uppercase leading-none tracking-[0.04em]",
        density === "compact" && "px-8 py-5",
        density === "normal" && "px-12 py-7",
        density === "spacious" && "px-16 py-9",
        conceptTextSizeClass(size),
        toneTextClass(tone),
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="status-stamp"
      {...props}
    >
      {children}
    </div>
  );
}

export type ConceptNodeProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  label: React.ReactNode;
  meta?: React.ReactNode;
  size?: AtomSize;
  tone?: OverlayTone;
};

export function ConceptNode({
  className,
  density = "normal",
  label,
  meta,
  size = "lg",
  tone = "coral",
  ...props
}: ConceptNodeProps) {
  return (
    <div
      className={cn(
        "az-video-shadow inline-grid place-items-center rounded-full border-[6px] border-current bg-az-bone text-center",
        density === "compact" && "gap-3 px-12 py-9",
        density === "normal" && "gap-4 px-16 py-12",
        density === "spacious" && "gap-5 px-20 py-14",
        size === "sm" && "min-w-[16rem]",
        size === "md" && "min-w-[20rem]",
        size === "lg" && "min-w-[24rem]",
        size === "xl" && "min-w-120",
        toneTextClass(tone),
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="concept-node"
      {...props}
    >
      <div
        className={cn(
          "font-az-sans font-extrabold text-az-ink leading-none",
          conceptTextSizeClass(size)
        )}
      >
        {label}
      </div>
      {meta ? (
        <div className="font-az-mono text-az-ink-faint text-xl uppercase tracking-[0.16em]">
          {meta}
        </div>
      ) : null}
    </div>
  );
}

function ComparePanel({
  children,
  density,
  label,
  size,
  tone,
}: {
  children: React.ReactNode;
  density: AtomDensity;
  label: string;
  size: AtomSize;
  tone: OverlayTone;
}) {
  return (
    <div
      className={cn(
        "az-video-shadow grid rounded-[8px] border-2 border-az-ink/18 bg-az-bone",
        density === "compact" && "gap-4 p-8",
        density === "normal" && "gap-6 p-10",
        density === "spacious" && "gap-8 p-12"
      )}
    >
      <div
        className={cn(
          "font-az-mono text-2xl uppercase tracking-[0.16em]",
          toneTextClass(tone)
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "font-az-sans font-extrabold text-az-ink leading-none",
          conceptTextSizeClass(size)
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Choice({
  children,
  density,
  size,
  tone,
}: {
  children: React.ReactNode;
  density: AtomDensity;
  size: AtomSize;
  tone: OverlayTone;
}) {
  return (
    <div
      className={cn(
        "az-video-shadow rounded-[8px] border-4 border-current bg-az-bone text-center font-az-sans font-extrabold leading-none",
        density === "compact" && "p-6",
        density === "normal" && "p-8",
        density === "spacious" && "p-10",
        conceptTextSizeClass(size),
        toneBorderClass(tone)
      )}
    >
      {children}
    </div>
  );
}

function conceptTextSizeClass(size: AtomSize) {
  if (size === "sm") {
    return "text-5xl";
  }

  if (size === "md") {
    return "text-6xl";
  }

  if (size === "xl") {
    return "text-8xl";
  }

  return "text-7xl";
}
