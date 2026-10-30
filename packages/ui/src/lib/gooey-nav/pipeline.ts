import {
  type ElementOf,
  objectFromEntries,
} from "@allonfire/core/shared/utils/object";
import { FRAGMENT, MAX_DROPS, MAX_PILLS, UNIFORMS, VERTEX } from "./shaders";
import type { Blob, Box, GooeySettings, Hover } from "./types";

/** The canvas runs this far past the stage on every side, for goo to spill into. */
export const MARGIN = 72;

/**
 * Past any pill's half height, so the shader's `min` keeps the capsule; a
 * finite stand-in for an infinite radius, which GLSL leaves undefined.
 */
const FULLY_ROUND = 1e5;

const QUAD = [-1, -1, 1, -1, -1, 1, 1, 1] as const;

type Uniform = ElementOf<typeof UNIFORMS>;

export type Pipeline = {
  buffer: WebGLBuffer;
  position: number;
  program: WebGLProgram;
  uniforms: Record<Uniform, WebGLUniformLocation | null>;
};

/** The canvas, its program and the arrays reused for every frame's uniforms. */
export type Scene = {
  canvas: HTMLCanvasElement;
  drops: Float32Array;
  gl: WebGL2RenderingContext;
  pills: Float32Array;
  pipeline: Pipeline;
  tails: Float32Array;
  tints: Float32Array;
};

/** One frame's shapes, in stage CSS px. */
export type Frame = {
  blobs: readonly Blob[];
  boxes: readonly Box[];
  hover: Hover;
  settings: GooeySettings;
  smooth: number;
  view: { height: number; width: number };
};

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

/** Links the goo's program, or `null` when the GPU refuses it (the CSS pill takes over). */
export const buildPipeline = (gl: WebGL2RenderingContext): Pipeline | null => {
  const program = gl.createProgram();
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!(vertex && fragment)) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.deleteProgram(program);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  // The program keeps what it linked; the shaders themselves are spent.
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(QUAD), gl.STATIC_DRAW);
  return {
    buffer,
    position: gl.getAttribLocation(program, "aPosition"),
    program,
    uniforms: objectFromEntries(
      UNIFORMS.map(
        (name) => [name, gl.getUniformLocation(program, name)] as const
      )
    ),
  };
};

export const createScene = (
  gl: WebGL2RenderingContext,
  canvas: HTMLCanvasElement,
  pipeline: Pipeline
): Scene => ({
  canvas,
  drops: new Float32Array(MAX_DROPS * 4),
  gl,
  pills: new Float32Array(MAX_PILLS * 4),
  pipeline,
  tails: new Float32Array(MAX_DROPS * 2),
  tints: new Float32Array(MAX_DROPS * 3),
});

/** Packs the frame's pills and drops into the scene's arrays; returns the drop count. */
const pack = (scene: Scene, { blobs, boxes, settings }: Frame) => {
  let slot = 0;
  for (const box of boxes.slice(0, MAX_PILLS)) {
    scene.pills.set(
      [box.cx + MARGIN, box.cy + MARGIN, box.hw, box.hh],
      slot * 4
    );
    slot += 1;
  }
  scene.pills.fill(0, slot * 4);
  let count = 0;
  for (const blob of blobs.slice(0, MAX_DROPS)) {
    scene.drops.set([blob.x + MARGIN, blob.y + MARGIN, blob.r, 0], count * 4);
    scene.tails.set([blob.tx, blob.ty], count * 2);
    const [r, g, b] = blob.tint ?? settings.pillRgb;
    scene.tints.set([r, g, b], count * 3);
    count += 1;
  }
  return count;
};

/** Draws one frame of goo onto the canvas. */
export const drawScene = (scene: Scene, frame: Frame) => {
  const { canvas, gl, pipeline } = scene;
  const { hover, settings: s, smooth, view } = frame;
  const count = pack(scene, frame);
  const { buffer, position, program, uniforms: u } = pipeline;
  const width = view.width + MARGIN * 2;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(u.uSize, width, view.height + MARGIN * 2);
  gl.uniform1f(u.uRatio, canvas.width / Math.max(1, width));
  gl.uniform4fv(u.uPills, scene.pills);
  gl.uniform4f(
    u.uHover,
    hover.x + MARGIN,
    hover.y + MARGIN,
    hover.w / 2,
    hover.h / 2
  );
  gl.uniform4fv(u.uDrops, scene.drops);
  gl.uniform2fv(u.uTails, scene.tails);
  gl.uniform3fv(u.uTints, scene.tints);
  gl.uniform1i(u.uCount, count);
  gl.uniform1f(u.uSmooth, smooth);
  gl.uniform3f(u.uPill, s.pillRgb[0], s.pillRgb[1], s.pillRgb[2]);
  const [hr, hg, hb, ha] = s.hoverRgb;
  gl.uniform4f(u.uHoverColor, hr, hg, hb, ha * hover.alpha);
  gl.uniform1f(u.uShadow, s.shadow);
  // Already CSS px like the pill boxes: the shader divides out the pixel ratio.
  gl.uniform1f(u.uRadius, Math.max(0, Math.min(s.radius, FULLY_ROUND)));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

export const disposeScene = ({ gl, pipeline }: Scene) => {
  gl.deleteBuffer(pipeline.buffer);
  gl.deleteProgram(pipeline.program);
};
