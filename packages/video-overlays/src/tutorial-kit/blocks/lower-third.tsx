import type React from "react";
import { cn } from "../lib/cn";
import type { OverlayTone } from "../lib/tones";
import { Kicker } from "../primitives/kicker";
import { PaperPanel } from "../primitives/paper-panel";

export type LowerThirdProps = React.ComponentProps<"div"> & {
  eyebrow: string;
  title: string;
  tone?: OverlayTone;
};

export function LowerThird({
  className,
  eyebrow,
  title,
  tone = "coral",
  ...props
}: LowerThirdProps) {
  return (
    <PaperPanel
      className={cn("w-[min(720px,82vw)] py-6", className)}
      data-slot="lower-third"
      mode="translucent"
      {...props}
    >
      <Kicker tone={tone}>{eyebrow}</Kicker>
      <div
        className="mt-3 font-az-sans font-extrabold text-5xl text-az-ink leading-none"
        data-slot="lower-third-title"
      >
        {title}
      </div>
    </PaperPanel>
  );
}
