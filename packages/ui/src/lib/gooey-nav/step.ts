import { pillAt, planFlight } from "./drops";
import { bezier, clamp01, travelEase } from "./geometry";
import type { Drop, Sim } from "./types";

/** Seconds a drop takes to swell out of its pill, and to sink into the next. */
const EMERGE_TIME = 0.09;
const ABSORB_TIME = 0.12;
/** The pills' spring: stiffness, and the substep it is integrated at. */
const OMEGA = 26;
const SUBSTEP = 1 / 240;
const EMPTY = 0.002;

type Tick = { dt: number; now: number };

/** A flying drop drains its source as it swells, then follows its curve. */
const fly = (sim: Sim, drop: Drop, { dt, now }: Tick) => {
  drop.emerged = Math.min(1, drop.emerged + dt / EMERGE_TIME);
  const source = sim.pills.get(drop.source);
  if (source && drop.given < drop.mass) {
    const step = Math.min(
      drop.mass * (dt / EMERGE_TIME),
      drop.mass - drop.given
    );
    source.mass = Math.max(0, source.mass - step);
    source.outgoing = Math.max(0, source.outgoing - step);
    drop.given += step;
  }
  const t = clamp01((now - (drop.start ?? now)) / 1000 / (drop.duration ?? 1));
  const eased = travelEase(t);
  const { x, y } = drop;
  const [x0, y0, x1, y1, x2, y2, x3, y3] = drop.path ?? [
    x,
    y,
    x,
    y,
    x,
    y,
    x,
    y,
  ];
  const nextX = bezier([x0, x1, x2, x3], eased);
  const nextY = bezier([y0, y1, y2, y3], eased);
  if (dt > 0) {
    drop.vx = (nextX - x) / dt;
    drop.vy = (nextY - y) / dt;
  }
  drop.x = nextX;
  drop.y = nextY;
  if (t >= 1) {
    drop.state = "absorbing";
  }
};

/** An absorbing drop hands its mass to its host pill; true once it is gone. */
const absorb = (sim: Sim, drop: Drop, dt: number) => {
  const step = Math.min(1 - drop.absorbed, dt / ABSORB_TIME);
  drop.absorbed += step;
  drop.vx *= 0.8;
  drop.vy *= 0.8;
  const host = pillAt(sim, drop.index);
  host.mass = Math.min(1, host.mass + drop.mass * step);
  return drop.absorbed >= 1;
};

/** Moves every drop through its phases: waiting, flying, absorbing. */
export const stepDrops = (sim: Sim, tick: Tick) => {
  for (let i = sim.drops.length - 1; i >= 0; i -= 1) {
    const drop = sim.drops.at(i);
    if (!drop || (drop.state === "waiting" && tick.now < drop.leave)) {
      continue;
    }
    if (drop.state === "waiting") {
      drop.state = "flying";
      planFlight(sim, drop, drop.index, { fresh: true, now: tick.now });
    }
    if (drop.state === "flying") {
      fly(sim, drop, tick);
    }
    if (drop.state === "absorbing" && absorb(sim, drop, tick.dt)) {
      sim.drops.splice(i, 1);
    }
  }
};

/**
 * Springs every pill's scale towards its mass (less damped with `wobble`,
 * critically damped for reduced motion) and drops the ones emptied.
 */
export const stepPills = (sim: Sim, dt: number) => {
  const zeta = sim.reduced ? 1 : 1 - 0.72 * clamp01(sim.settings().wobble);
  const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
  const h = dt / steps;
  for (const [index, state] of sim.pills) {
    for (let n = 0; n < steps; n += 1) {
      state.velocity +=
        (OMEGA * OMEGA * (state.mass - state.scale) -
          2 * zeta * OMEGA * state.velocity) *
        h;
      state.scale += state.velocity * h;
    }
    const empty =
      state.mass <= EMPTY &&
      state.outgoing <= EMPTY &&
      Math.abs(state.scale) < 0.004;
    if (index !== sim.target && empty) {
      sim.pills.delete(index);
    }
  }
};

/** Eases the hover highlight towards the hovered option; returns its goal alpha. */
export const stepHover = (sim: Sim, dt: number) => {
  const { hover } = sim;
  const rect = sim.rects[hover.index];
  if (hover.index >= 0 && rect) {
    const k = 1 - Math.exp(-dt / 0.06);
    hover.x += (rect.x + rect.w / 2 - hover.x) * k;
    hover.y += (rect.y + rect.h / 2 - hover.y) * k;
    hover.w += (rect.w - hover.w) * k;
    hover.h += (rect.h - hover.h) * k;
  }
  const shows =
    sim.settings().hoverEffect &&
    hover.index >= 0 &&
    hover.index !== sim.target;
  const goal = shows ? 1 : 0;
  hover.alpha += (goal - hover.alpha) * (1 - Math.exp(-dt / 0.08));
  return goal;
};

/** Whether nothing is left to animate: one full pill at rest, hover arrived. */
export const isAtRest = (sim: Sim, hoverGoal: number) => {
  const host = sim.pills.get(sim.target);
  const resting =
    sim.drops.length === 0 &&
    sim.pills.size === 1 &&
    host !== undefined &&
    Math.abs(host.mass - host.scale) < 0.0008 &&
    Math.abs(host.velocity) < 0.004;
  const { hover } = sim;
  const rect = sim.rects[hover.index];
  const hovering =
    Math.abs(hoverGoal - hover.alpha) > 0.003 ||
    (rect !== undefined &&
      Math.abs(rect.x + rect.w / 2 - hover.x) + Math.abs(rect.w - hover.w) >
        0.1);
  return resting && !hovering;
};
