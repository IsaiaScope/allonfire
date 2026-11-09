import { clamp01, pillPath } from "./geometry";
import {
  buildPipeline,
  createScene,
  drawScene,
  MARGIN,
  type Scene,
} from "./pipeline";
import { collectShapes, pillShape, traceGoo } from "./shapes";
import type { Box, Sim } from "./types";

/** The nodes the engine draws into, all rendered by the component. */
export type GooeyElements = {
  canvas: HTMLCanvasElement;
  /** The plain pill drawn when WebGL is missing. */
  fallback: HTMLSpanElement;
  list: HTMLUListElement;
  /** The labels again in the active text colour, clipped to the goo. */
  overlay: HTMLUListElement;
  stage: HTMLDivElement;
};

/** The canvas is at most 2x: sharper costs fill rate for nothing visible. */
const MAX_RATIO = 2;
/** The pill height used before any option is measured. */
const DEFAULT_HEIGHT = 36;
const EMPTY_PATH = "M0,0Z";

/** Shows the WebGL canvas, or the CSS pill in its place. */
export const showCanvas = (
  { canvas, fallback }: GooeyElements,
  shown: boolean
) => {
  fallback.style.display = shown ? "none" : "block";
  canvas.style.display = shown ? "block" : "none";
};

/** A WebGL scene on the canvas, or `null` for the CSS pill; shows whichever runs. */
export const startScene = (elements: GooeyElements) => {
  const gl = elements.canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
  });
  const pipeline = gl ? buildPipeline(gl) : null;
  showCanvas(elements, pipeline !== null);
  return gl && pipeline ? createScene(gl, elements.canvas, pipeline) : null;
};

/** Sizes the canvas to the stage plus its margin and measures every option. */
export const measureStage = (
  sim: Sim,
  { canvas, list, stage }: GooeyElements
) => {
  const box = stage.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
  sim.view.width = box.width;
  sim.view.height = box.height;
  const outerWidth = box.width + MARGIN * 2;
  const outerHeight = box.height + MARGIN * 2;
  canvas.style.height = `${outerHeight}px`;
  canvas.style.left = `${-MARGIN}px`;
  canvas.style.top = `${-MARGIN}px`;
  canvas.style.width = `${outerWidth}px`;
  const width = Math.max(1, Math.round(outerWidth * ratio));
  const height = Math.max(1, Math.round(outerHeight * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  sim.rects = Array.from(list.children, (item) => {
    const rect = item.getBoundingClientRect();
    return {
      h: rect.height,
      w: rect.width,
      x: rect.left - box.left,
      y: rect.top - box.top,
    };
  });
};

const boxPath = ({ cx, cy, hh, hw }: Box, radius: number) =>
  pillPath({ h: hh * 2, w: hw * 2, x: cx - hw, y: cy - hh }, radius);

/**
 * Draws the current state: clips the active-colour labels to the goo (a
 * plain rounded box once it has settled, which is cheaper than tracing),
 * then paints the goo with WebGL or moves the CSS pill.
 */
export const renderFrame = (
  sim: Sim,
  { fallback, overlay }: GooeyElements,
  scene: Scene | null
) => {
  const settings = sim.settings();
  const height = sim.rects[sim.target]?.h ?? sim.rects[0]?.h ?? DEFAULT_HEIGHT;
  const smooth = height * (0.18 + 0.5 * clamp01(settings.gooeyness));
  const { blobs, boxes } = collectShapes(sim, height);
  const [only] = boxes;
  const path =
    only && boxes.length === 1 && blobs.length === 0
      ? boxPath(only, settings.radius)
      : traceGoo({ blobs, boxes, radius: settings.radius, smooth }, sim.view) ||
        EMPTY_PATH;
  overlay.style.clipPath = `path('${path}')`;
  overlay.style.visibility = "visible";

  if (!scene) {
    const box = pillShape(sim, sim.target, 1);
    if (box) {
      fallback.style.transform = `translate(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px)`;
      fallback.style.width = `${box.w}px`;
      fallback.style.height = `${box.h}px`;
    }
    fallback.style.opacity = box ? "1" : "0";
    return;
  }
  drawScene(scene, {
    blobs,
    boxes,
    hover: sim.hover,
    settings,
    smooth,
    view: sim.view,
  });
};

/** The corner, in px, the options draw with in CSS (`rounded-md`). */
export const optionCorner = (list: HTMLElement) => {
  const option = list.querySelector("button, a");
  const corner = option
    ? Number.parseFloat(getComputedStyle(option).borderTopLeftRadius)
    : Number.NaN;
  return Number.isNaN(corner) ? Number.POSITIVE_INFINITY : corner;
};
