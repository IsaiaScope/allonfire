import { Easing, interpolate } from "remotion";

export const UI_EASE = Easing.bezier(0.16, 1, 0.3, 1);

export function enterProgress(
  frame: number,
  startFrame: number,
  durationInFrames: number
) {
  return interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [0, 1],
    {
      easing: UI_EASE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
}

export function exitProgress(
  frame: number,
  startFrame: number,
  durationInFrames: number
) {
  return interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [1, 0],
    {
      easing: Easing.in(UI_EASE),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
}
