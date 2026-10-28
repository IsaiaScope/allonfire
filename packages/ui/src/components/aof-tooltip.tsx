"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@allonfire/shadcn/components/tooltip";
import type { ReactElement } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";

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
 * `aria-label`. A disabled control takes no pointer, so it shows none.
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
      className={cn("text-sm", contentProps?.className)}
    >
      {label}
    </TooltipContent>
  </Tooltip>
);
