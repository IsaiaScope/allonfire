"use client";

import { ChartContainer } from "@allonfire/shadcn/components/chart";
import type { ComponentProps } from "react";
import {
  Label,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { cn } from "../../../shared/utils/utils";

/** The ring's first measure, before the browser has one: the page's own HTML. */
const SIZE_PX = 144;
/** The caption's drop under the number. */
const LINE_PX = 22;

export type AOFRadialMeterProps = Omit<
  ComponentProps<typeof ChartContainer>,
  "children" | "config"
> & {
  /** What the ring counts, in full, as its accessible name. */
  "aria-label": string;
  /** The words under the number (`of 300`, `no limit`). */
  caption: string;
  /** The ring's colour, a CSS colour (`var(--chart-1)`). */
  color: string;
  /** The ring's full turn; null when nothing caps it, so the ring stays empty. */
  max: number | null;
  value: number;
};

/** The ring's middle: the number, `caption` under it. Recharts hands it the
 *  ring's `viewBox` when it clones it. */
const MeterLabel = ({
  caption,
  value,
  viewBox,
}: {
  caption: string;
  value: number;
  viewBox?: { cx?: number; cy?: number } | undefined;
}) =>
  viewBox?.cx === undefined || viewBox.cy === undefined ? null : (
    <text
      dominantBaseline="middle"
      textAnchor="middle"
      x={viewBox.cx}
      y={viewBox.cy}
    >
      <tspan
        className="fill-foreground font-bold text-3xl"
        x={viewBox.cx}
        y={viewBox.cy}
      >
        {value}
      </tspan>
      <tspan
        className="fill-muted-foreground text-xs"
        x={viewBox.cx}
        y={viewBox.cy + LINE_PX}
      >
        {caption}
      </tspan>
    </text>
  );

/**
 * shadcn's radial chart as a meter (its "shape" example): one ring that fills
 * clockwise from the top as `value` nears `max`, the number in its middle
 * and `caption` under it. Recharts draws it in the browser; the ring is one
 * image to assistive tech, named by `aria-label`.
 */
export const AOFRadialMeter = ({
  caption,
  className,
  color,
  max,
  value,
  ...props
}: AOFRadialMeterProps) => (
  <ChartContainer
    className={cn("aspect-square size-36", className)}
    config={{ value: { color, label: caption } }}
    initialDimension={{ height: SIZE_PX, width: SIZE_PX }}
    role="img"
    {...props}
  >
    <RadialBarChart
      // One image already, named by the frame: no focusable chart inside it.
      accessibilityLayer={false}
      data={[{ fill: color, value: max === null ? 0 : value }]}
      endAngle={-270}
      innerRadius="80%"
      outerRadius="100%"
      startAngle={90}
    >
      <PolarAngleAxis
        dataKey="value"
        domain={[0, Math.max(max ?? 1, 1)]}
        tick={false}
        type="number"
      />
      <RadialBar background cornerRadius={4} dataKey="value" />
      <PolarRadiusAxis axisLine={false} tick={false} tickLine={false}>
        <Label content={<MeterLabel caption={caption} value={value} />} />
      </PolarRadiusAxis>
    </RadialBarChart>
  </ChartContainer>
);
