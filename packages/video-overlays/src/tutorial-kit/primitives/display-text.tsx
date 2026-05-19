import type React from "react";
import { cn } from "../lib/cn";

export type DisplayTextProps = React.ComponentProps<"div"> & {
  size?: "hero" | "title";
};

export function DisplayText({
  children,
  className,
  size = "hero",
  ...props
}: DisplayTextProps) {
  return (
    <div
      className={cn(
        "font-az-sans font-extrabold text-az-ink leading-[0.98]",
        size === "hero" ? "text-[7rem]" : "text-[5rem]",
        className
      )}
      data-size={size}
      data-slot="display-text"
      {...props}
    >
      {children}
    </div>
  );
}
