import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const strip = cva("pattern-tactile-dots shrink-0 bg-tactile", {
  defaultVariants: { orientation: "horizontal" },
  variants: {
    orientation: {
      horizontal: "h-4 w-full",
      vertical: "w-4 self-stretch",
    },
  },
});

export type TactileStripProps = ComponentPropsWithoutChildren<"div"> &
  VariantProps<typeof strip>;

/**
 * The yellow tactile paving that marks a Japanese platform's edge and the
 * floor in front of a ticket gate. Decoration only, so hidden from
 * assistive tech; any div prop passes through.
 */
export const TactileStrip = ({
  className,
  orientation,
  ...props
}: TactileStripProps) => (
  <div
    aria-hidden
    className={cn(strip({ orientation }), className)}
    data-orientation={orientation ?? "horizontal"}
    {...props}
  />
);
