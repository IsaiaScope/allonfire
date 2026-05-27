function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function cubicBezierY(t: number, y1: number, y2: number): number {
  const inv = 1 - t;
  return 3 * inv * inv * t * y1 + 3 * inv * t * t * y2 + t * t * t;
}

export function UI_EASE(progress: number): number {
  return cubicBezierY(clamp01(progress), 1, 1);
}

function interpolateProgress(
  frame: number,
  startFrame: number,
  durationInFrames: number
): number {
  if (durationInFrames <= 0) {
    return frame >= startFrame ? 1 : 0;
  }
  return clamp01((frame - startFrame) / durationInFrames);
}

export function enterProgress(
  frame: number,
  startFrame: number,
  durationInFrames: number
) {
  return UI_EASE(interpolateProgress(frame, startFrame, durationInFrames));
}

export function exitProgress(
  frame: number,
  startFrame: number,
  durationInFrames: number
) {
  return 1 - UI_EASE(interpolateProgress(frame, startFrame, durationInFrames));
}
