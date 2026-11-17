"use client";

import type { DayRange } from "@allonfire/core/features/search/utc-day-range";
import {
  Calendar,
  CalendarDayButton,
} from "@allonfire/shadcn/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@allonfire/shadcn/components/popover";
import { IconCalendar, IconCircleX } from "@tabler/icons-react";
import {
  type ComponentProps,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { AOFButton } from "../../../shared/components/aof-button";
import { AOFTooltip } from "../../../shared/components/aof-tooltip";
import type { ComponentPropsWithoutChildren } from "../../../shared/types/types";
import { cn } from "../../../shared/utils/utils";
import { calendarLocaleOf } from "../utils/calendar-locale";
import { dateOf, rangeOf } from "../utils/day-range";
import { AOFControlBarSeparator } from "./aof-control-bar";

/**
 * A day's button, which takes the focus when the calendar's arrow keys land on
 * it. shadcn's own never does: it makes a ref for that and never attaches it.
 */
const FocusingDay: NonNullable<
  ComponentProps<typeof Calendar>["components"]
>["DayButton"] = ({ modifiers, ...props }) => {
  const around = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (modifiers.focused) {
      around.current?.querySelector("button")?.focus();
    }
  }, [modifiers.focused]);
  return (
    <span className="contents" ref={around}>
      <CalendarDayButton modifiers={modifiers} {...props} />
    </span>
  );
};

/**
 * shadcn's calendar defines its root and day button inline, so each render
 * makes new component types and React re-mounts every day: the keyboard focus
 * is lost on each pick. These two stand at module level, so the days stay.
 */
const CALENDAR_COMPONENTS: NonNullable<
  ComponentProps<typeof Calendar>["components"]
> = {
  DayButton: FocusingDay,
  Root: ({ className, rootRef, ...props }) => (
    <div
      className={cn(className)}
      data-slot="calendar"
      ref={rootRef}
      {...props}
    />
  ),
};

/**
 * The calendar's heading and weekday names at the size of its 40px cells (the
 * month and year 16px, the weekdays 14px): shadcn draws them for 28px cells.
 */
const CALENDAR_CLASSES = {
  caption_label:
    "flex items-center gap-1 rounded-(--cell-radius) px-2.5 font-medium text-base select-none [&>svg]:size-4 [&>svg]:text-muted-foreground",
  // The month and the year each on a chip, a step above the popover, and a
  // hand over them: the native select sits transparent on top of the label.
  dropdown: "absolute inset-0 cursor-pointer bg-popover opacity-0",
  dropdown_root:
    "relative rounded-md border border-input bg-muted transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted/70",
  dropdowns:
    "flex h-(--cell-size) w-full items-center justify-center gap-3 font-medium text-base",
  weekday:
    "flex-1 rounded-(--cell-radius) font-normal text-muted-foreground text-sm select-none",
};

export type AOFDateRangeFilterProps = {
  /** Writes a day (`YYYY-MM-DD`) in the page's language: `Nov 26, 2026`. */
  format: (day: string) => string;
  /** The filter's name: the button's label. */
  label: string;
  labels: {
    /** The cross on the button and the button under the calendar. */
    clear: string;
  };
  /** The page's language (`useLocale()`): the calendar's months, weekdays,
   *  week start and spoken labels follow it. The default language when left out. */
  language?: string | undefined;
  onValueChange: (next: DayRange | null) => void;
  /** The trigger's own props: its classes, its size (`field` beside a
   *  form's fields), as `AOFFaceted` takes them, so the two line up. */
  triggerProps?: ComponentPropsWithoutChildren<typeof AOFButton>;
  /** The days chosen, or none. */
  value: DayRange | null;
};

/**
 * A date range filter, drawn as `AOFFaceted`'s trigger and tablecn's date
 * filter: a dashed button with a calendar and the label; once a range is
 * chosen the calendar becomes a cross at the start that clears it, then a
 * divider and `from – to` (one day once). The popover holds a calendar in
 * range mode, a dropdown caption and, while a value is set, a full-width
 * Clear. The day clicked is the day stored (the calendar's local parts); the
 * first click alone is a one-day range, the second one ends it.
 */
export const AOFDateRangeFilter = ({
  format,
  label,
  labels,
  language,
  onValueChange,
  triggerProps,
  value,
}: AOFDateRangeFilterProps) => {
  const clear = useCallback(() => onValueChange(null), [onValueChange]);
  // The cross inside the trigger clears without opening the calendar; the
  // keyboard clears through the Clear button under it.
  const clearFromTrigger = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onValueChange(null);
    },
    [onValueChange]
  );
  const select = useCallback(
    (picked: { from?: Date | undefined; to?: Date | undefined } | undefined) =>
      onValueChange(rangeOf(picked)),
    [onValueChange]
  );
  const selected = value
    ? { from: dateOf(value.from), to: dateOf(value.to) }
    : undefined;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <AOFButton
            variant="outline"
            {...triggerProps}
            className={cn(
              "justify-start gap-1.5 border-dashed font-normal",
              triggerProps?.className
            )}
          />
        }
      >
        {value ? (
          <AOFTooltip contentProps={{ side: "left" }} label={labels.clear}>
            <span
              aria-hidden="true"
              className="text-muted-foreground transition-colors hover:text-foreground"
              onClick={clearFromTrigger}
            >
              <IconCircleX />
            </span>
          </AOFTooltip>
        ) : (
          <span aria-hidden="true" className="text-muted-foreground">
            <IconCalendar />
          </span>
        )}
        <span className="shrink-0">{label}</span>
        {value ? (
          <>
            <AOFControlBarSeparator className="mx-0.5" />
            <span className="min-w-0 truncate text-muted-foreground">
              {value.from === value.to
                ? format(value.from)
                : `${format(value.from)} – ${format(value.to)}`}
            </span>
          </>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-2 p-0 ring-input">
        <Calendar
          captionLayout="dropdown"
          className="p-3 text-base [--cell-size:--spacing(10)] **:data-[slot=button]:text-base [&_button>svg]:size-5"
          classNames={CALENDAR_CLASSES}
          components={CALENDAR_COMPONENTS}
          mode="range"
          {...(selected && { defaultMonth: selected.from })}
          locale={calendarLocaleOf(language)}
          onSelect={select}
          selected={selected}
        />
        {value ? (
          <div className="px-3 pb-3">
            <AOFButton className="w-full" onClick={clear} variant="outline">
              {labels.clear}
            </AOFButton>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
