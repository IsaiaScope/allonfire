import type React from "react";
import { useVideoConfig } from "remotion";
import { cn } from "../lib/cn";
import type { OverlayMode } from "../lib/tones";
import { SideRail } from "./side-rail";

export type OverlayStageProps = React.ComponentProps<"div"> & {
  mode: OverlayMode;
  railLeft?: React.ReactNode;
  railRight?: React.ReactNode;
  showRails?: boolean;
};

export function OverlayStage({
  children,
  className,
  mode,
  railLeft = "ALLONFIRE",
  railRight = "TUTORIAL",
  showRails = true,
  ...props
}: OverlayStageProps) {
  const { height, width } = useVideoConfig();
  const portrait = height > width;

  return (
    <div
      className={cn(
        "atelier-zero-root az-paper-texture relative flex size-full overflow-hidden",
        mode === "fullscreen"
          ? "bg-az-paper"
          : "bg-transparent p-[5.5%] sm:p-[5%] lg:p-[4.4%]",
        className
      )}
      data-mode={mode}
      data-orientation={portrait ? "portrait" : "landscape"}
      data-slot="overlay-stage"
      {...props}
    >
      {mode === "over-video" ? <VideoPlaceholder /> : null}
      {showRails ? <SideRail side="left">{railLeft}</SideRail> : null}
      {showRails ? <SideRail side="right">{railRight}</SideRail> : null}
      <div
        className={cn(
          "relative z-10 flex size-full",
          mode === "fullscreen"
            ? "p-[5.6%] sm:p-[5%] lg:p-[4.2%]"
            : "items-end justify-start"
        )}
        data-slot="overlay-stage-content"
      >
        {children}
      </div>
    </div>
  );
}

function VideoPlaceholder() {
  return (
    <div
      className="absolute inset-0 bg-[linear-gradient(135deg,rgba(21,20,15,0.86),rgba(42,38,32,0.62)),linear-gradient(90deg,#221f1b,#484235)]"
      data-slot="overlay-stage-video-placeholder"
    >
      <div className="az-video-grid absolute inset-0 opacity-45" />
    </div>
  );
}
