"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@allonfire/shadcn/components/dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

// ponytail: shadcn's menu under AOF names; the account menu is its one
// user. Add behaviour here, never in packages/shadcn.
export const AOFDropdownMenu = DropdownMenu;
export const AOFDropdownMenuContent = DropdownMenuContent;
export const AOFDropdownMenuGroup = DropdownMenuGroup;
export const AOFDropdownMenuLabel = DropdownMenuLabel;
export const AOFDropdownMenuSeparator = DropdownMenuSeparator;
export const AOFDropdownMenuTrigger = DropdownMenuTrigger;

/**
 * A row of the menu, with the pointer (shadcn's is `cursor-default`). Its label is 16px; on a touch screen it grows to the
 * tap target (`--tap-target`, `--tap-icon`).
 */
export const AOFDropdownMenuItem = ({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuItem>) => (
  <DropdownMenuItem
    className={cn(
      "pointer-coarse:min-h-(--tap-target) cursor-pointer text-base pointer-coarse:[&_svg:not([class*='size-'])]:size-(--tap-icon)",
      className
    )}
    {...props}
  />
);

/**
 * A row of choices inside the menu, one of them current: a segmented
 * control (a language, light or dark). Radio semantics from Base UI, so the
 * current one is announced and the arrow keys move between them.
 */
export const AOFDropdownMenuSegments = ({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuRadioGroup>) => (
  <DropdownMenuRadioGroup
    className={cn("flex gap-0.5 rounded-lg bg-muted p-0.5", className)}
    {...props}
  />
);

/**
 * One choice of `AOFDropdownMenuSegments`: the current one in the Design's
 * primary colour, in place of shadcn's check mark, and kept there under the
 * pointer; another one lifts a little. Every choice is the same 36 × 28px
 * (the tap target on a touch screen), a word or an icon alike, so rows of choices line
 * up. Render it as a link (`render={<a href=... />}`) when choosing it
 * navigates.
 */
export const AOFDropdownMenuSegment = ({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuRadioItem>) => (
  <DropdownMenuRadioItem
    className={cn(
      // 36 × 28px, the tap target on a touch screen.
      "pointer-coarse:size-(--tap-target) h-7 w-9 cursor-pointer justify-center rounded-md px-0 pointer-coarse:text-base text-muted-foreground text-sm pointer-coarse:[&_svg:not([class*='size-'])]:size-(--tap-icon)",
      // Another choice lifts under the pointer.
      "focus:bg-background/60 focus:text-foreground focus:**:text-foreground",
      // The current one, in primary, under the pointer too; no check mark.
      "data-checked:bg-primary data-checked:text-primary-foreground data-checked:focus:bg-primary data-checked:focus:text-primary-foreground *:data-[slot=dropdown-menu-radio-item-indicator]:hidden data-checked:focus:**:text-primary-foreground",
      className
    )}
    {...props}
  />
);
