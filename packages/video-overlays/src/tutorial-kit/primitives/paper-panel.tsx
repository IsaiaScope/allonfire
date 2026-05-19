import type React from "react";
import { cn } from "../lib/cn";

export type PaperPanelProps = React.ComponentProps<"div"> & {
  mode?: "solid" | "translucent";
  padding?: "none" | "sm" | "md" | "lg";
};

export function PaperPanel({
  children,
  className,
  mode = "solid",
  padding = "lg",
  ...props
}: PaperPanelProps) {
  return (
    <div
      className={cn(
        "az-video-shadow rounded-[8px] border-2 border-az-ink/18",
        mode === "solid" ? "bg-az-bone" : "bg-az-paper/88",
        padding === "none" && "p-0",
        padding === "sm" && "p-4 sm:p-5",
        padding === "md" && "p-5 sm:p-7",
        padding === "lg" && "p-5 sm:p-7 lg:p-9",
        className
      )}
      data-mode={mode}
      data-slot="paper-panel"
      {...props}
    >
      {children}
    </div>
  );
}
