import type { Box, Rect } from "./types";

/** Below this a pill is too small to clip text to. */
const MIN_PATH_SIZE = 0.5;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Ease-in-out cubic: a drop leaves slowly, hurries, and lands softly. */
export const travelEase = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

/** One axis of a cubic Bézier through `a`, `b`, `c`, `d`. */
export const bezier = (
  [a, b, c, d]: readonly [number, number, number, number],
  t: number
) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/**
 * The corner radius a box of these half extents draws with: the Design's
 * `radius`, never past half the shorter side (a capsule).
 */
export const cornerRadius = (hw: number, hh: number, radius: number) =>
  Math.max(0, Math.min(hw, hh, radius));

/**
 * Signed distance from a point to a rounded box: negative inside. The CPU twin
 * of the shader's `sdPill`, so the text clip matches the painted goo.
 */
export const boxDistance = (
  { cx, cy, hh, hw }: Box,
  [x, y]: readonly [number, number],
  radius: number
) => {
  const r = cornerRadius(hw, hh, radius);
  const qx = Math.abs(x - cx) - hw + r;
  const qy = Math.abs(y - cy) - hh + r;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    r
  );
};

/** An SVG path of a rounded box, for the settled pill's text clip. */
export const pillPath = ({ h, w, x, y }: Rect, radius: number) => {
  if (w <= MIN_PATH_SIZE || h <= MIN_PATH_SIZE) {
    return "";
  }
  const r = cornerRadius(w / 2, h / 2, radius);
  const arc = `A${r},${r} 0 0 1`;
  return `M${x + r},${y}H${x + w - r}${arc} ${x + w},${y + r}V${y + h - r}${arc} ${x + w - r},${y + h}H${x + r}${arc} ${x},${y + h - r}V${y + r}${arc} ${x + r},${y}Z`;
};
