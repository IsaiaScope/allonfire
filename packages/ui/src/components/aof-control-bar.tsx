import { Separator } from "@allonfire/shadcn/components/separator";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export type AOFControlBarProps = ComponentProps<"fieldset">;

/**
 * A floating capsule holding a few page-level controls (language, theme). A
 * `<fieldset>`, so assistive tech reads it as a group; give it an
 * `aria-label` when the controls inside do not name themselves. Where it sits
 * is the caller's `className`.
 */
export const AOFControlBar = ({ className, ...props }: AOFControlBarProps) => (
  <fieldset
    className={cn(
      // min-w-0: a fieldset is min-content wide by default, unlike a div.
      "flex min-w-0 items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm",
      className
    )}
    data-slot="control-bar"
    {...props}
  />
);

export type AOFControlBarSeparatorProps = ComponentProps<typeof Separator>;

/** A short vertical rule between two controls, from shadcn's Separator. */
export const AOFControlBarSeparator = ({
  className,
  orientation = "vertical",
  ...props
}: AOFControlBarSeparatorProps) => (
  <Separator
    className={cn(
      "mx-1 data-vertical:h-5 data-vertical:self-center",
      className
    )}
    orientation={orientation}
    {...props}
  />
);
