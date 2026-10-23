import { MAX_DROPS } from "./shaders";
import type { Drop, PillState, Sim } from "./types";

const MS_PER_SECOND = 1000;
/** The shortest a flight lasts, in seconds, however low `animationTime` is. */
const MIN_FLIGHT = 0.15;
const EMPTY = 0.002;

/** Option `index`'s pill, created empty the first time it is asked for. */
export const pillAt = (sim: Sim, index: number): PillState => {
  const existing = sim.pills.get(index);
  if (existing) {
    return existing;
  }
  const created = { mass: 0, outgoing: 0, scale: 0, velocity: 0 };
  sim.pills.set(index, created);
  return created;
};

const jitter = () => Math.random() - 0.5;

/**
 * Charts a drop's flight to option `index`: a fresh drop bursts out of its
 * pill first; one already flying carries its speed into the turn.
 */
export const planFlight = (
  sim: Sim,
  drop: Drop,
  index: number,
  { fresh, now }: { fresh: boolean; now: number }
) => {
  const s = sim.settings();
  const rect = sim.rects[index];
  if (!rect) {
    return;
  }
  const reach = Math.max(0, s.spread);
  const ex = rect.x + rect.w / 2 + jitter() * rect.w * 0.45;
  const ey = rect.y + rect.h / 2 + jitter() * rect.h * 0.2;
  const base = Math.max(MIN_FLIGHT, s.animationTime / MS_PER_SECOND);
  const variance = jitter() * (Math.max(0, s.timeVariance) / MS_PER_SECOND);
  const duration = Math.max(
    MIN_FLIGHT,
    base * (0.62 + Math.random() * 0.32) + variance * 0.6
  );
  const out = Math.random() * Math.PI * 2;
  const into = Math.random() * Math.PI * 2;
  const burst = reach * (0.7 + Math.random() * 0.6);
  const swing = reach * (0.55 + Math.random() * 0.55);
  const carry = Math.min(duration / 3, 0.12);
  drop.index = index;
  drop.start = now;
  drop.duration = duration;
  drop.path = [
    drop.x,
    drop.y,
    fresh ? drop.x + Math.cos(out) * burst * 1.6 : drop.x + drop.vx * carry,
    fresh ? drop.y + Math.sin(out) * burst * 1.6 : drop.y + drop.vy * carry,
    ex + Math.cos(into) * swing * 1.5,
    ey + Math.sin(into) * swing * 1.5,
    ex,
    ey,
  ];
};

/**
 * Splits what pill `from` still holds into drops bound for `to`, leaving
 * over a short window so they do not all lift at once.
 */
export const emitDrops = (
  sim: Sim,
  { from, now, to }: { from: number; now: number; to: number }
) => {
  const s = sim.settings();
  const source = sim.pills.get(from);
  const rect = sim.rects[from];
  if (!(source && rect && sim.rects[to])) {
    return;
  }
  const available = source.mass - source.outgoing;
  if (available <= EMPTY) {
    return;
  }
  const room = MAX_DROPS - sim.drops.length;
  const count = Math.min(
    room,
    Math.max(1, Math.round(Math.max(1, s.particleCount) * available))
  );
  if (count <= 0) {
    return;
  }
  const spread = Math.max(MIN_FLIGHT, s.animationTime / MS_PER_SECOND) * 0.16;
  for (let i = 0; i < count; i += 1) {
    const mass = available / count;
    source.outgoing += mass;
    sim.drops.push({
      absorbed: 0,
      emerged: 0,
      given: 0,
      index: to,
      leave: now + Math.random() * spread * MS_PER_SECOND,
      mass,
      size: 0.8 + Math.random() * 0.4,
      source: from,
      state: "waiting",
      tint: s.tints[Math.floor(Math.random() * s.tints.length)] ?? null,
      vx: 0,
      vy: 0,
      x: rect.x + rect.w / 2 + jitter() * rect.w * 0.6,
      y: rect.y + rect.h / 2 + jitter() * rect.h * 0.3,
    });
  }
};
