"use client";

import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@allonfire/shadcn/components/popover";
import { IconFilter } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";
import { AOFBadge } from "./aof-badge";
import { AOFButton } from "./aof-button";

/** Base UI's popover root (`open`, `onOpenChange`, ...), plus the panel. */
export type AOFFilterPanelProps = ComponentPropsWithoutChildren<
  typeof Popover
> & {
  /** Drawn at the panel's bottom right, under the filters: what acts on
   *  every filter at once, such as a Reset button. */
  action?: ReactNode;
  /** The filters, an `AOFFaceted` each, stacked in the panel. */
  children: ReactNode;
  /** Painted behind everything in the panel and clipped to it (an App's
   *  wall decoration); the panel isolates it, so `-z-10` keeps it under the
   *  panel's own content. */
  decoration?: ReactNode;
  /** How many values the filters hold, counted on the button. */
  count: number;
  /** The button's pictogram; a funnel unless given. */
  icon?: ReactNode;
  /** The button's name and the panel's title. */
  label: string;
  /** The Filter button's own props: its classes, its size (`field` beside a
   *  form's fields). */
  triggerProps?: ComponentPropsWithoutChildren<typeof AOFButton>;
};

/**
 * A list's filters behind one Filter button, as tablecn's advanced filter
 * draws them: the button counts the values chosen and opens a panel headed
 * with its title, the filters stacked under it, `action` at the bottom right.
 */
export const AOFFilterPanel = ({
  action,
  children,
  count,
  decoration,
  icon = <IconFilter aria-hidden />,
  label,
  triggerProps,
  ...props
}: AOFFilterPanelProps) => (
  <Popover {...props}>
    <PopoverTrigger
      render={
        <AOFButton
          variant="outline"
          {...triggerProps}
          className={cn("gap-1.5 font-normal", triggerProps?.className)}
        />
      }
    >
      {icon}
      <span>{label}</span>
      {count > 0 ? (
        <AOFBadge className="h-5 min-w-5 px-1 tabular-nums" variant="secondary">
          {count}
        </AOFBadge>
      ) : null}
    </PopoverTrigger>
    <PopoverContent
      align="start"
      className="relative isolate w-[min(calc(100vw-var(--gutter-left)-var(--gutter-right)),26rem)] gap-3 overflow-hidden p-4 ring-border"
    >
      {decoration}
      <PopoverHeader>
        <PopoverTitle className="font-bold text-base">{label}</PopoverTitle>
      </PopoverHeader>
      <div className="flex flex-col gap-2 *:w-full">{children}</div>
      {action ? <div className="flex justify-end pt-1">{action}</div> : null}
    </PopoverContent>
  </Popover>
);
