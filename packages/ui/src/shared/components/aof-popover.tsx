"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@allonfire/shadcn/components/popover";
import type { ComponentProps } from "react";
import { useSafeAreaPadding } from "../hooks/use-safe-area-padding";
import { cn } from "../utils/utils";

// ponytail: shadcn's popover (Base UI) under AOF names; add behaviour here,
// never in packages/shadcn.
export const AOFPopover = Popover;
export const AOFPopoverTrigger = PopoverTrigger;

/**
 * The popover's box, kept clear of a notch and the home indicator
 * (`useSafeAreaPadding`) and never taller than the room it has: past that it
 * scrolls, as a menu does (shadcn's popover has no such cap).
 */
export const AOFPopoverContent = ({
  className,
  ...props
}: ComponentProps<typeof PopoverContent>) => (
  <PopoverContent
    className={cn("max-h-(--available-height) overflow-y-auto", className)}
    collisionPadding={useSafeAreaPadding()}
    {...props}
  />
);
