import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";

export type StationNumberProps = ComponentPropsWithoutChildren<"span"> & {
  /** The Section's number on the line (`stationNumber`). */
  number: string;
};

/**
 * A Section's station number, as on a JR sign: its place in the menu, in
 * the line's colour. Decoration only: the Section's name beside it says
 * where you are.
 */
export const StationNumber = ({
  className,
  number,
  ...props
}: StationNumberProps) => (
  <span
    aria-hidden
    className={cn(
      "shrink-0 font-bold text-lg text-line leading-none",
      className
    )}
    {...props}
  >
    {number}
  </span>
);
