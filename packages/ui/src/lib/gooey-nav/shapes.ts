import { boxDistance, clamp01 } from "./geometry";
import type { Blob, Box, Rect, Sim } from "./types";

/** A pill's scale below which it is not drawn. */
const VISIBLE_SCALE = 0.002;
/** The tracer's horizontal step, in CSS px. */
const TRACE_STEP = 2;
const FAR = 1e5;

/**
 * The pill for option `index` at a scale `amount` (0..1): it grows taller
 * first, then wider, from the option's centre; never narrower than tall.
 */
export const pillShape = (sim: Sim, index: number, amount: number) => {
  const rect = sim.rects[index];
  if (!rect || amount <= VISIBLE_SCALE) {
    return null;
  }
  const h =
    rect.h * Math.min(1.08, 0.42 + 0.58 * Math.sqrt(Math.max(0, amount)));
  const w = Math.max(h, rect.w * Math.max(0, amount) ** 0.75);
  return {
    h,
    w,
    x: rect.x + rect.w / 2 - w / 2,
    y: rect.y + rect.h / 2 - h / 2,
  } satisfies Rect;
};

export const toBox = ({ h, w, x, y }: Rect): Box => ({
  cx: x + w / 2,
  cy: y + h / 2,
  hh: h / 2,
  hw: w / 2,
});

/** Every pill's box and every flying drop's blob for this frame. */
export const collectShapes = (sim: Sim, height: number) => {
  const boxes: Box[] = [];
  const blobs: Blob[] = [];
  for (const [index, state] of sim.pills) {
    const rect = pillShape(sim, index, state.scale);
    if (rect) {
      boxes.push(toBox(rect));
    }
  }
  for (const drop of sim.drops) {
    if (drop.state === "waiting") {
      continue;
    }
    const r =
      0.26 * height * drop.size * Math.min(drop.emerged, 1 - drop.absorbed);
    if (r <= 0.05) {
      continue;
    }
    const speed = Math.hypot(drop.vx, drop.vy);
    const length = Math.min(r * 1.1, speed * 0.018);
    const moving = speed > 0.01;
    blobs.push({
      r,
      tint: drop.tint,
      tx: moving ? (drop.vx / speed) * length : 0,
      ty: moving ? (drop.vy / speed) * length : 0,
      x: drop.x,
      y: drop.y,
    });
  }
  return { blobs, boxes };
};

type Field = {
  blobs: readonly Blob[];
  boxes: readonly Box[];
  radius: number;
  smooth: number;
};

const capsuleDistance = (blob: Blob, x: number, y: number) => {
  const px = x - blob.x;
  const py = y - blob.y;
  const bx = -blob.tx;
  const by = -blob.ty;
  const span = bx * bx + by * by;
  const h = span > 0.0001 ? clamp01((px * bx + py * by) / span) : 0;
  return Math.hypot(px - bx * h, py - by * h) - blob.r;
};

/** The CPU twin of the shader's `field`: distance to the merged goo at a point. */
const distance = (
  { blobs, boxes, radius, smooth }: Field,
  x: number,
  y: number
) => {
  let d = FAR;
  const merge = (value: number) => {
    const h = clamp01(0.5 + (0.5 * (value - d)) / smooth);
    d = value + (d - value) * h - smooth * h * (1 - h);
  };
  for (const box of boxes) {
    merge(boxDistance(box, [x, y], radius));
  }
  for (const blob of blobs) {
    const value = capsuleDistance(blob, x, y);
    if (value <= d + smooth) {
      merge(value);
    }
  }
  return d;
};

/** One pixel row of the goo as SVG rectangles, found by stepping across it. */
const traceRow = (field: Field, y: number, width: number) => {
  const parts: string[] = [];
  const cy = y + 0.5;
  const row = (from: number, to: number | string) =>
    `M${from.toFixed(1)},${y}H${to}V${y + 1}H${from.toFixed(1)}Z`;
  let previous = distance(field, 0, cy);
  let start: number | null = previous < 0 ? 0 : null;
  for (let x = TRACE_STEP; x <= width + TRACE_STEP; x += TRACE_STEP) {
    const value = distance(field, Math.min(x, width), cy);
    if (previous < 0 !== value < 0) {
      const cross =
        x - TRACE_STEP + (TRACE_STEP * previous) / (previous - value);
      if (value < 0) {
        start = cross;
      } else if (start !== null) {
        parts.push(row(start, cross.toFixed(1)));
        start = null;
      }
    }
    previous = value;
  }
  if (start !== null) {
    parts.push(row(start, width));
  }
  return parts.join("");
};

/**
 * The goo's outline as an SVG path, one pixel row at a time: the clip that
 * shows the active text colour only where the goo is.
 */
export const traceGoo = (field: Field, view: Sim["view"]) => {
  const parts: string[] = [];
  for (let y = 0; y < view.height; y += 1) {
    parts.push(traceRow(field, y, view.width));
  }
  return parts.join("");
};
