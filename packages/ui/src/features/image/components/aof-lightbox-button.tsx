"use client";

import { cva } from "class-variance-authority";
import {
  AOFButton,
  type AOFButtonProps,
} from "../../../shared/components/aof-button";
import {
  AOFTooltip,
  type AOFTooltipProps,
} from "../../../shared/components/aof-tooltip";
import { cn } from "../../../shared/utils/utils";

/**
 * A control's size in the preview's capsules: a 44px target, and a 28px icon
 * unless the icon sizes itself. On its own for what is not an
 * `AOFLightboxButton`: a button with its own tip (Laura's heart).
 */
export const aofLightboxControl = cva(
  "size-11 [&_svg:not([class*='size-'])]:size-7"
);

/** The same icon where no capsule button draws it: a static mark. */
export const aofLightboxIcon = cva("size-7");

export type AOFLightboxButtonProps = Omit<AOFButtonProps, "size"> & {
  /** The tip, and the button's name unless `aria-label` says otherwise. */
  label: string;
  /** The tip's own props: its `side`. */
  tooltipProps?: AOFTooltipProps["contentProps"];
};

/**
 * An icon button in the preview's capsules (`AOFLightbox`'s own and an App's
 * `actions`), with its tip. Its child is the icon.
 */
export const AOFLightboxButton = ({
  className,
  label,
  tooltipProps,
  ...props
}: AOFLightboxButtonProps) => (
  <AOFTooltip
    label={label}
    {...(tooltipProps && { contentProps: tooltipProps })}
  >
    <AOFButton
      aria-label={label}
      // `focusableWhenDisabled` marks it `aria-disabled`, which shadcn's
      // `disabled:` styles never match.
      className={cn(
        aofLightboxControl(),
        "aria-disabled:opacity-50",
        className
      )}
      size="icon"
      variant="ghost"
      {...props}
    />
  </AOFTooltip>
);
