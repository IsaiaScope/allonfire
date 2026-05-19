import type React from "react";
import { cn } from "../lib/cn";
import {
  type OverlayTone,
  toneBgClass,
  toneBorderClass,
  toneTextClass,
} from "../lib/tones";
import type { AtomDensity, AtomSize } from "./types";

type BaseAtomProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  size?: AtomSize;
  tone?: OverlayTone;
};

type BaseSvgAtomProps = React.ComponentProps<"svg"> & {
  density?: AtomDensity;
  size?: AtomSize;
  tone?: OverlayTone;
};

export type BarValueProps = BaseAtomProps & {
  label?: React.ReactNode;
  value?: number;
};

export function BarValue({
  className,
  label,
  value = 72,
  tone = "coral",
  ...props
}: BarValueProps) {
  return (
    <div
      className={cn("grid w-full max-w-4xl gap-5", className)}
      data-slot="bar-value"
      {...props}
    >
      {label ? <ChartLabel tone={tone}>{label}</ChartLabel> : null}
      <div className="az-video-shadow h-16 overflow-hidden rounded-full border-2 border-az-ink/18 bg-az-ink/18">
        <div
          className={cn("h-full rounded-full", toneBgClass(tone))}
          style={{ width: `${clamp(value)}%` }}
        />
      </div>
    </div>
  );
}

export type BarPairProps = BaseAtomProps & {
  left?: number;
  right?: number;
};

export function BarPair({
  className,
  left = 42,
  right = 78,
  tone = "coral",
  ...props
}: BarPairProps) {
  return (
    <div
      className={cn("grid w-full max-w-4xl gap-8", className)}
      data-slot="bar-pair"
      {...props}
    >
      <BarValue label="before" tone="ink" value={left} />
      <BarValue label="after" tone={tone} value={right} />
    </div>
  );
}

export type MiniBarChartProps = BaseAtomProps & {
  values?: number[];
};

export function MiniBarChart({
  className,
  values = [36, 72, 54, 88],
  tone = "coral",
  ...props
}: MiniBarChartProps) {
  const visibleValues = values.slice(0, 5);

  return (
    <div
      className={cn(
        "az-video-shadow flex h-80 w-full max-w-3xl items-end gap-5 rounded-[8px] border-2 border-az-ink/18 bg-az-bone p-8",
        className
      )}
      data-slot="mini-bar-chart"
      {...props}
    >
      {visibleValues.map((value, index) => (
        <div className="grid h-full flex-1 items-end" key={`bar-${value}`}>
          <div
            className={cn(
              "rounded-t-[8px]",
              index === visibleValues.length - 1
                ? toneBgClass(tone)
                : "bg-az-ink"
            )}
            style={{ height: `${Math.max(12, clamp(value))}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export type ProgressBarProps = BarValueProps;

export function ProgressBar(props: ProgressBarProps) {
  return (
    <BarValue
      label={props.label ?? "progress"}
      {...props}
      data-slot="progress-bar"
    />
  );
}

export type DeltaArrowProps = BaseAtomProps & {
  direction?: "up" | "down";
  label?: React.ReactNode;
};

export function DeltaArrow({
  className,
  direction = "up",
  label = "+24%",
  size = "lg",
  tone = "olive",
  ...props
}: DeltaArrowProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-6",
        direction === "down" && "flex-row-reverse",
        className
      )}
      data-direction={direction}
      data-size={size}
      data-slot="delta-arrow"
      {...props}
    >
      <div
        className={cn(
          "size-0 border-x-[2.2rem] border-x-transparent border-b-[4rem]",
          direction === "down" && "rotate-180",
          deltaArrowBorderClass(tone)
        )}
      />
      <div
        className={cn(
          "font-az-sans font-extrabold leading-none",
          size === "xl" ? "text-[9rem]" : "text-8xl",
          toneTextClass(tone)
        )}
      >
        {label}
      </div>
    </div>
  );
}

export type MetricTileProps = BaseAtomProps & {
  label?: React.ReactNode;
  value: React.ReactNode;
};

export function MetricTile({
  className,
  label,
  value,
  tone = "coral",
  ...props
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "az-video-shadow inline-grid min-w-88 gap-5 rounded-[8px] border-2 border-az-ink/18 bg-az-bone p-10",
        className
      )}
      data-slot="metric-tile"
      {...props}
    >
      <div
        className={cn(
          "font-az-sans font-extrabold text-[8rem] leading-none",
          toneTextClass(tone)
        )}
      >
        {value}
      </div>
      {label ? (
        <div className="font-az-mono text-2xl text-az-ink-soft uppercase tracking-[0.16em]">
          {label}
        </div>
      ) : null}
    </div>
  );
}

export type GaugeArcProps = BaseSvgAtomProps & {
  value?: number;
};

export function GaugeArc({
  className,
  value = 68,
  tone = "coral",
  ...props
}: GaugeArcProps) {
  const dash = 360;
  const filled = (clamp(value) / 100) * dash;
  return (
    <svg
      aria-label={`Gauge value ${value}`}
      className={cn("size-80 overflow-visible", toneTextClass(tone), className)}
      data-slot="gauge-arc"
      role="img"
      viewBox="0 0 220 140"
      {...props}
    >
      <path
        d="M30 110 A80 80 0 0 1 190 110"
        fill="none"
        stroke="rgba(21,20,15,0.18)"
        strokeLinecap="round"
        strokeWidth="18"
      />
      <path
        d="M30 110 A80 80 0 0 1 190 110"
        fill="none"
        stroke="currentColor"
        strokeDasharray={`${filled} ${dash}`}
        strokeLinecap="round"
        strokeWidth="18"
      />
      <text
        fill="currentColor"
        fontFamily="Inter Tight, Inter, sans-serif"
        fontSize="46"
        fontWeight="800"
        textAnchor="middle"
        x="110"
        y="112"
      >
        {value}
      </text>
    </svg>
  );
}

export type DotPlotProps = BaseAtomProps & {
  values?: number[];
};

export function DotPlot({
  className,
  values = [18, 42, 63, 84],
  tone = "coral",
  ...props
}: DotPlotProps) {
  const visibleValues = values.slice(0, 6);

  return (
    <div
      className={cn("relative h-40 w-full max-w-4xl", className)}
      data-slot="dot-plot"
      {...props}
    >
      <div className="absolute top-1/2 right-0 left-0 h-3 -translate-y-1/2 rounded-full bg-az-ink/22" />
      {visibleValues.map((value, index) => (
        <div
          className={cn(
            "az-video-shadow absolute top-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-az-bone",
            index === visibleValues.length - 1 ? toneBgClass(tone) : "bg-az-ink"
          )}
          key={`dot-${value}`}
          style={{ left: `${clamp(value)}%` }}
        />
      ))}
    </div>
  );
}

export type TimelineAxisProps = BaseAtomProps & {
  vertical?: boolean;
};

export function TimelineAxis({
  className,
  tone = "coral",
  vertical = false,
  ...props
}: TimelineAxisProps) {
  return (
    <div
      className={cn(
        "grid place-items-center",
        vertical ? "h-136 w-32" : "h-32 w-full max-w-5xl",
        className
      )}
      data-slot="timeline-axis"
      {...props}
    >
      <div
        className={cn(
          vertical ? "h-full w-5" : "h-5 w-full",
          "rounded-full",
          toneBgClass(tone)
        )}
      />
    </div>
  );
}

export type MilestoneDotProps = BaseAtomProps & {
  label?: React.ReactNode;
};

export function MilestoneDot({
  className,
  label = "now",
  tone = "coral",
  ...props
}: MilestoneDotProps) {
  return (
    <div
      className={cn("inline-grid justify-items-center gap-4", className)}
      data-slot="milestone-dot"
      {...props}
    >
      <div
        className={cn(
          "az-video-shadow size-28 rounded-full border-8 border-az-bone",
          toneBgClass(tone)
        )}
      />
      <ChartLabel tone={tone}>{label}</ChartLabel>
    </div>
  );
}

export type SparkLineProps = Omit<BaseSvgAtomProps, "values"> & {
  values?: number[];
};

export function SparkLine({
  className,
  values = [18, 52, 34, 72, 88],
  tone = "olive",
  ...props
}: SparkLineProps) {
  const points = values
    .map((value, index) => `${index * 90},${100 - clamp(value)}`)
    .join(" ");
  return (
    <svg
      aria-label="Spark line"
      className={cn(
        "h-44 w-full max-w-4xl overflow-visible",
        toneTextClass(tone),
        className
      )}
      data-slot="spark-line"
      role="img"
      viewBox="0 0 360 110"
      {...props}
    >
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      />
    </svg>
  );
}

export type StackedBarProps = BaseAtomProps & {
  values?: [number, number, number];
};

export function StackedBar({
  className,
  values = [48, 28, 24],
  ...props
}: StackedBarProps) {
  return (
    <div
      className={cn(
        "az-video-shadow flex h-20 w-full max-w-5xl overflow-hidden rounded-full border-2 border-az-ink/18 bg-az-bone",
        className
      )}
      data-slot="stacked-bar"
      {...props}
    >
      <div className="bg-az-coral" style={{ width: `${values[0]}%` }} />
      <div className="bg-az-mustard" style={{ width: `${values[1]}%` }} />
      <div className="bg-az-olive" style={{ width: `${values[2]}%` }} />
    </div>
  );
}

export type RatioSplitProps = BaseAtomProps & {
  left?: number;
};

export function RatioSplit({
  className,
  left = 70,
  ...props
}: RatioSplitProps) {
  return (
    <div
      className={cn(
        "az-video-shadow flex w-full max-w-4xl overflow-hidden rounded-[8px] border-2 border-az-ink/18 text-center font-az-sans font-extrabold text-6xl",
        className
      )}
      data-slot="ratio-split"
      {...props}
    >
      <div
        className="bg-az-ink p-10 text-az-paper"
        style={{ width: `${clamp(left)}%` }}
      >
        {left}
      </div>
      <div
        className="bg-az-bone p-10 text-az-ink"
        style={{ width: `${100 - clamp(left)}%` }}
      >
        {100 - left}
      </div>
    </div>
  );
}

export type ScoreRingProps = BaseAtomProps & {
  value?: number;
};

export function ScoreRing({
  className,
  value = 84,
  tone = "olive",
  ...props
}: ScoreRingProps) {
  return (
    <div
      className={cn(
        "az-video-shadow grid size-72 place-items-center rounded-full border-16 bg-az-bone font-az-sans font-extrabold text-8xl",
        toneBorderClass(tone),
        toneTextClass(tone),
        className
      )}
      data-slot="score-ring"
      {...props}
    >
      {value}
    </div>
  );
}

function ChartLabel({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: OverlayTone;
}) {
  return (
    <div
      className={cn(
        "font-az-mono font-semibold text-2xl uppercase tracking-[0.16em]",
        toneTextClass(tone)
      )}
    >
      {children}
    </div>
  );
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function deltaArrowBorderClass(tone: OverlayTone) {
  if (tone === "ink") {
    return "border-b-az-ink";
  }

  if (tone === "mustard") {
    return "border-b-az-mustard";
  }

  if (tone === "olive") {
    return "border-b-az-olive";
  }

  return "border-b-az-coral";
}
