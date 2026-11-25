import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { badgeTone, chipTone, type Tone } from "../utils/tone";

/** The badge every figure sits in: its icon, its label and its chip. */
export const statBadge = cva(
  "h-8 @4xl:gap-1.5 gap-0.5 @4xl:pr-1.5 pr-1 @4xl:pl-3 pl-1.5 text-sm [&>svg]:size-4!"
);

/** A figure on its own chip, as a Back Office filter's count sits: Laura's `input` tone. */
export const StatValue = ({
  className,
  tone,
  ...props
}: ComponentProps<"dd"> & { tone?: Tone }) => (
  <dd
    className={cn(
      chipTone({ tone }),
      "flex h-6 min-w-6 items-center justify-center gap-1 rounded-sm @4xl:px-1.5 px-0.5 font-medium font-mono tabular-nums [&>svg]:size-3.5",
      className
    )}
    {...props}
  />
);

/**
 * One figure of the board's header as a badge: its icon and its value, and from
 * `sm` up its label too (a phone has room for the icon alone; the label stays
 * for a screen reader). The value sits on its own chip, as a Back Office
 * filter's count does, in a stronger step of the badge's tone. A `dt` and a `dd` inside a `div`, so a `dl` holds it.
 */
export const BoardStat = ({
  children,
  className,
  icon,
  iconOnly,
  label,
  labelled,
  tone,
  valueProps,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  children: ReactNode;
  icon: ReactNode;
  /** The label never shows (a tooltip says it): the icon and the value alone. */
  iconOnly?: boolean;
  label: string;
  /** The label always shows, pushing the value to the badge's end: a badge that sits in a grid of its own, where no header's width decides. */
  labelled?: boolean;
  tone: Tone;
  valueProps?: ComponentProps<"dd">;
}) => (
  <AOFBadge
    className={cn(statBadge(), badgeTone({ tone }), className)}
    render={<div />}
    variant="secondary"
    {...props}
  >
    {icon}
    <dt
      className={cn(
        "sr-only",
        !iconOnly && "@4xl:not-sr-only",
        labelled &&
          "not-sr-only line-clamp-2 min-w-0 flex-1 whitespace-normal text-left"
      )}
    >
      {label}
    </dt>
    <StatValue tone={tone} {...valueProps}>
      {children}
    </StatValue>
  </AOFBadge>
);
