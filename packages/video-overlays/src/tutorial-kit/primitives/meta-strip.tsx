import type React from "react";
import { cn } from "../lib/cn";

export type MetaStripProps = React.ComponentProps<"div"> & {
  left: React.ReactNode;
  right: React.ReactNode;
};

export function MetaStrip({
  className,
  left,
  right,
  ...props
}: MetaStripProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 border-az-ink/15 border-b pb-3 font-az-sans text-[10px] text-az-ink-faint uppercase tracking-[0.18em] sm:text-xs",
        className
      )}
      data-slot="meta-strip"
      {...props}
    >
      <div data-slot="meta-strip-left">{left}</div>
      <div className="text-right" data-slot="meta-strip-right">
        {right}
      </div>
    </div>
  );
}
