"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@allonfire/shadcn/components/tooltip";
import type { ReactElement } from "react";
import type { ComponentPropsWithoutChildren } from "../types/types";
import { cn } from "../utils/utils";

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
 * `aria-label`. A disabled control takes no pointer, so it shows none. The
 * tip lets the pointer through: opening over its control's edge (its arrow,
 * its slide in), it would take the control's hover, close and open again.
 */
export const AOFTooltip = ({
  children,
  contentProps,
  label,
  ...props
}: AOFTooltipProps) => (
  <Tooltip {...props}>
    <TooltipTrigger render={children} />
    <TooltipContent
      {...contentProps}
      className={cn("pointer-events-none text-sm", contentProps?.className)}
    >
      {label}
    </TooltipContent>
  </Tooltip>
);
