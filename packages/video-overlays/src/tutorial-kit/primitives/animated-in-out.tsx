import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { enterProgress, exitProgress } from "../lib/motion";

export type AnimatedInOutProps = React.ComponentProps<"div"> & {
  delay?: number;
  durationInFrames?: number;
  exitAt?: number;
  exitDurationInFrames?: number;
  kind?: "rise" | "scale" | "wipe";
};

export function AnimatedInOut({
  children,
  delay = 0,
  durationInFrames = 22,
  exitAt,
  exitDurationInFrames = 14,
  kind = "rise",
  style,
  ...props
}: AnimatedInOutProps) {
  const frame = useCurrentFrame();
  const enter = enterProgress(frame, delay, durationInFrames);
  const exit =
    typeof exitAt === "number"
      ? exitProgress(frame, exitAt, exitDurationInFrames)
      : 1;
  const opacity = enter * exit;
  const y = interpolate(enter, [0, 1], [18, 0]);
  const scale = interpolate(enter, [0, 1], [0.965, 1]);
  const clip = interpolate(enter, [0, 1], [100, 0]);

  return (
    <div
      data-slot="animated-in-out"
      style={{
        ...style,
        clipPath: kind === "wipe" ? `inset(0 ${clip}% 0 0)` : style?.clipPath,
        opacity,
        transform: kind === "scale" ? `scale(${scale})` : `translateY(${y}px)`,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
