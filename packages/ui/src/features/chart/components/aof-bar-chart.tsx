"use client";

import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@allonfire/shadcn/components/chart";
import { useIsMobile } from "@allonfire/shadcn/hooks/use-mobile";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "../../../shared/utils/utils";
import { CHART } from "../constants/chart";
import { barChartHeight } from "../utils/bar-chart-height";

/**
 * Every axis label, in the foreground colour (the chart's default is the
 * muted one, too faint on a card) and a size up from `md`.
 */
const tickText = cva("fill-foreground md:text-sm");
const TICK = { className: tickText() };

type Row = Readonly<Record<string, string | number>>;

type TickProps = {
  payload?: { value?: unknown };
  x?: number | string;
  y?: number | string;
};

/**
 * A category label turned a quarter, reading upward beside its rows: the
 * recharts guide's own customised tick (`rotate` on the label), for a phone's
 * narrow axis.
 */
const TurnedTick = ({ payload, x = 0, y: row = 0 }: TickProps) => {
  const at = Number(x) - CHART.TURNED.LABEL_OFFSET_PX;
  const y = Number(row);
  return (
    <text
      className={TICK.className}
      dominantBaseline="central"
      textAnchor="middle"
      transform={`rotate(-90 ${at} ${y})`}
      x={at}
      y={y}
    >
      {String(payload?.value ?? "")}
    </text>
  );
};

export type AOFBarChartProps = Omit<
  ComponentProps<typeof ChartContainer>,
  "children" | "config"
> & {
  /** What the chart shows, in full, as its accessible name. */
  "aria-label": string;
  /** The row key on the category axis (`app`). */
  category: string;
  data: readonly Row[];
  /** The words in place of the chart when there is nothing to draw. */
  emptyLabel: string;
  /** One bar per series in each row, one under another. */
  series: readonly { color: string; key: string; label: string }[];
  /** How a value reads on the value axis and in the tooltip (`12 KB`). */
  valueFormat?: (value: number) => string;
  /** The values are counts: the value axis keeps to whole numbers. */
  wholeValues?: boolean;
};

const hasValue = (data: readonly Row[], keys: readonly string[]) =>
  data.some((row) => keys.some((key) => Number(row[key]) > 0));

/**
 * shadcn's bar chart, horizontal so it scales down the page with more rows:
 * one group per row, one bar per series, coloured from the Design's chart
 * tokens. Its height follows its rows. Recharts draws it in the browser;
 * the chart is one image to assistive tech, named by `aria-label`. With no
 * row, or only zeros, it says `emptyLabel` instead of drawing empty axes.
 */
export const AOFBarChart = ({
  category,
  className,
  data,
  emptyLabel,
  series,
  style,
  valueFormat,
  wholeValues = false,
  ...props
}: AOFBarChartProps) => {
  const phone = useIsMobile();
  if (
    !hasValue(
      data,
      series.map(({ key }) => key)
    )
  ) {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        {emptyLabel}
      </p>
    );
  }
  const config = objectFromEntries(
    series.map(({ color, key, label }) => [key, { color, label }])
  );
  const height = barChartHeight(data.length, series.length);
  return (
    <ChartContainer
      className={cn("w-full", className)}
      config={config}
      initialDimension={{ ...CHART.INITIAL_SIZE, height }}
      role="img"
      style={{ height, ...style }}
      {...props}
    >
      <BarChart
        // One image already, named by the frame: no focusable chart inside it.
        accessibilityLayer={false}
        data={[...data]}
        layout="vertical"
        {...(phone && { margin: CHART.PHONE_MARGIN })}
      >
        <CartesianGrid horizontal={false} />
        <XAxis
          allowDecimals={!wholeValues}
          axisLine={false}
          tick={TICK}
          tickCount={CHART.VALUE_TICKS}
          tickMargin={8}
          type="number"
          {...(valueFormat && { tickFormatter: valueFormat })}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          dataKey={category}
          tick={phone ? TurnedTick : TICK}
          tickLine={false}
          tickMargin={8}
          type="category"
          width={phone ? CHART.TURNED.AXIS_WIDTH_PX : "auto"}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              {...(valueFormat && {
                formatter: (value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-medium font-mono tabular-nums">
                      {valueFormat(Number(value))}
                    </span>
                  </span>
                ),
              })}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map(({ color, key }) => (
          <Bar dataKey={key} fill={color} key={key} radius={4} />
        ))}
      </BarChart>
    </ChartContainer>
  );
};
