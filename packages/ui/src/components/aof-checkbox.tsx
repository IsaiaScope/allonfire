import { Checkbox } from "@allonfire/shadcn/components/checkbox";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * shadcn's checkbox; Base UI already draws `indeterminate` as
 * aria-checked="mixed". shadcn widens its hit area to 40×32px for a mouse;
 * on a touch screen it takes a finger's 44px, the box itself still 16px.
 * It takes the pointer cursor, as every control does (`AOFButton`).
 */
export const AOFCheckbox = ({
  className,
  ...props
}: ComponentProps<typeof Checkbox>) => (
  <Checkbox
    className={cn(
      "cursor-pointer pointer-coarse:after:-inset-3.5 data-disabled:cursor-not-allowed",
      className
    )}
    {...props}
  />
);
