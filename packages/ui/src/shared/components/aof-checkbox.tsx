import { Checkbox } from "@allonfire/shadcn/components/checkbox";
import type { ComponentProps } from "react";
import { cn } from "../utils/utils";

/**
 * shadcn's checkbox; Base UI already draws `indeterminate` as
 * aria-checked="mixed". shadcn widens its hit area to 40×32px for a mouse;
 * on a touch screen it takes a finger's 44px, the box itself still 16px.
 * It takes the pointer cursor, as every control does (`AOFButton`).
 *
 * Mixed ("some", not all) is not a lesser check: shadcn draws it with the
 * check on the empty box's ground. Here the check goes and a short bar in the
 * primary takes its place, on a primary border and a faint primary tint, so
 * it reads as neither empty nor checked.
 */
export const AOFCheckbox = ({
  className,
  ...props
}: ComponentProps<typeof Checkbox>) => (
  <Checkbox
    className={cn(
      "cursor-pointer pointer-coarse:after:-inset-3.5 data-disabled:cursor-not-allowed",
      "data-indeterminate:border-primary data-indeterminate:bg-primary/15 data-indeterminate:*:hidden dark:data-indeterminate:bg-primary/25",
      "data-indeterminate:before:h-0.5 data-indeterminate:before:w-2 data-indeterminate:before:rounded-sm data-indeterminate:before:bg-primary data-indeterminate:before:content-['']",
      className
    )}
    {...props}
  />
);
