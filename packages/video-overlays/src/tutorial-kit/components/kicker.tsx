import type React from "react";
import { cn } from "../lib/cn";
import { type OverlayTone, toneTextClass } from "../lib/tones";

export type KickerProps = React.ComponentProps<"div"> & {
  tone?: OverlayTone;
};

export function Kicker({
  children,
  className,
  tone = "coral",
  ...props
}: KickerProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-4 font-az-sans font-extrabold text-2xl uppercase tracking-[0.2em]",
        toneTextClass(tone),
        className
      )}
      data-slot="kicker"
      {...props}
    >
      <span
        className="h-1 w-12 rounded-full bg-current"
        data-slot="kicker-rule"
      />
      <span data-slot="kicker-text">{children}</span>
    </div>
  );
}
