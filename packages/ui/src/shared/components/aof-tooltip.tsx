"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@allonfire/shadcn/components/tooltip";
import type { ReactElement } from "react";
import { useSafeAreaPadding } from "../hooks/use-safe-area-padding";
import type { ComponentPropsWithoutChildren } from "../types/types";
import { cn } from "../utils/utils";

/**
 * What the eye reads on a control: `innerText` leaves out what CSS hides, and
 * the words only a screen reader reads (`sr-only`, laid out but clipped to a
 * pixel) are taken out too, since the tip is for those who see the icon alone.
 */
const shownText = (control: HTMLElement) => {
  let text = control.innerText;
  for (const hidden of control.querySelectorAll<HTMLElement>(".sr-only")) {
    text = text.replace(hidden.innerText, "");
  }
  return text;
};

/** Base UI's tooltip root (`open`, `onOpenChange`, ...), plus the tip. */
export type AOFTooltipProps = ComponentPropsWithoutChildren<typeof Tooltip> & {
  /** The control the tip names; it keeps its own accessible name. */
  children: ReactElement;
  /** The tip's own props: its `side`, its classes. */
  contentProps?: ComponentPropsWithoutChildren<typeof TooltipContent>;
  /** What the tip says: the control's name, for a pointer that hovers. */
  label: string;
};

/**
 * A short tip over an icon-only control (shadcn's tooltip, Base UI): shown on
 * hover and keyboard focus, never the control's only name, which stays its
 * `aria-label`. A control that already shows `label` as text (a button that
 * is wide, its label unhidden) gets no tip repeating it, while the same
 * control as an icon does: it is asked when the tip would open, since a
 * container query moves it between the two. A disabled control takes no
 * pointer, so it shows none. The
 * tip lets the pointer through: opening over its control's edge (its arrow,
 * its slide in), it would take the control's hover, close and open again.
 */
export const AOFTooltip = ({
  children,
  contentProps,
  label,
  onOpenChange,
  ...props
}: AOFTooltipProps) => {
  const padding = useSafeAreaPadding();
  const open: AOFTooltipProps["onOpenChange"] = (next, details) => {
    if (
      next &&
      details.trigger instanceof HTMLElement &&
      shownText(details.trigger).includes(label)
    ) {
      details.cancel();
      return;
    }
    onOpenChange?.(next, details);
  };
  return (
    <Tooltip {...props} onOpenChange={open}>
      <TooltipTrigger render={children} />
      <TooltipContent
        collisionPadding={padding}
        {...contentProps}
        className={cn("pointer-events-none text-sm", contentProps?.className)}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
};
