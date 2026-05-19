import type React from "react";
import { cn } from "../lib/cn";

export type SideRailProps = React.ComponentProps<"div"> & {
  side: "left" | "right";
};

export function SideRail({
  children,
  className,
  side,
  ...props
}: SideRailProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-0 bottom-0 z-20 hidden w-9 items-center justify-center border-az-ink/5 md:flex",
        side === "left" ? "left-0 border-r" : "right-0 border-l",
        className
      )}
      data-side={side}
      data-slot="side-rail"
      {...props}
    >
      <div
        className={cn(
          "whitespace-nowrap font-az-sans font-semibold text-[10px] text-az-ink-faint uppercase tracking-[0.42em] [writing-mode:vertical-rl]",
          side === "right" && "rotate-180"
        )}
        data-slot="side-rail-text"
      >
        {children}
      </div>
    </div>
  );
}
