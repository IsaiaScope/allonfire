/** A colour as 0..1 channels: red, green, blue, alpha. */
export type Rgba = readonly [number, number, number, number];

/** A box in CSS px, relative to the stage. */
export type Rect = {
  h: number;
  w: number;
  x: number;
  y: number;
};

/** The same box by its centre and half extents, as the distance field reads it. */
export type Box = {
  cx: number;
  cy: number;
  hh: number;
  hw: number;
};

/** One option's pill: how much goo it holds and how far its spring has grown. */
export type PillState = {
  mass: number;
  outgoing: number;
  scale: number;
  velocity: number;
};

/** A drop's flight: a cubic Bézier, four points as x, y pairs. */
export type DropPath = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type DropPhase = "waiting" | "flying" | "absorbing";

/** A particle of goo on its way from one pill to another. */
export type Drop = {
  absorbed: number;
  duration?: number;
  emerged: number;
  given: number;
  index: number;
  leave: number;
  mass: number;
  path?: DropPath;
  size: number;
  source: number;
  start?: number;
  state: DropPhase;
  tint: Rgba | null;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

/** A drop as drawn: a capsule from its centre back along its tail. */
export type Blob = {
  r: number;
  tint: Rgba | null;
  tx: number;
  ty: number;
  x: number;
  y: number;
};

/** The highlight easing towards the hovered option. */
export type Hover = {
  alpha: number;
  h: number;
  index: number;
  w: number;
  x: number;
  y: number;
};

/** What the component hands the engine on every render. */
export type GooeySettings = {
  animationTime: number;
  gooeyness: number;
  hoverEffect: boolean;
  hoverRgb: Rgba;
  particleCount: number;
  pillRgb: Rgba;
  /** The pill's corner radius in CSS px; past half its height it is a capsule. */
  radius: number;
  shadow: number;
  spread: number;
  timeVariance: number;
  tints: readonly Rgba[];
  wobble: number;
};

/** The simulation's state, shared by the engine's steps. */
export type Sim = {
  drops: Drop[];
  hover: Hover;
  pills: Map<number, PillState>;
  rects: Rect[];
  reduced: boolean;
  settings: () => GooeySettings;
  target: number;
  view: { height: number; width: number };
};
