import type React from "react";
import { cn } from "../lib/cn";
import { type OverlayTone, toneTextClass } from "../lib/tones";

export type AccentRuleProps = React.ComponentProps<"div"> & {
  glyph?: React.ReactNode;
  tone?: OverlayTone;
};

export function AccentRule({
  className,
  glyph = "§",
  tone = "coral",
  ...props
}: AccentRuleProps) {
  return (
    <div
      className={cn("flex items-center gap-3", className)}
      data-slot="accent-rule"
      {...props}
    >
      <div className="h-px flex-1 bg-az-ink/16" data-slot="accent-rule-line" />
      <div
        className={cn("font-az-serif text-xl italic", toneTextClass(tone))}
        data-slot="accent-rule-glyph"
      >
        {glyph}
      </div>
    </div>
  );
}
