import * as React from "react";
import { DayPicker, type DayButton, type Locale } from "react-day-picker";
import { Button } from "@allonfire/shadcn/components/button";
declare function Calendar({ className, classNames, showOutsideDays, captionLayout, buttonVariant, locale, formatters, components, ...props }: React.ComponentProps<typeof DayPicker> & {
    buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}): React.JSX.Element;
declare function CalendarDayButton({ className, day, modifiers, locale, ...props }: React.ComponentProps<typeof DayButton> & {
    locale?: Partial<Locale>;
}): React.JSX.Element;
export { Calendar, CalendarDayButton };
