import { emitDrops, pillAt, planFlight } from "./drops";
import { disposeScene } from "./pipeline";
import {
  type GooeyElements,
  measureStage,
  renderFrame,
  showCanvas,
  startScene,
} from "./render";
import { isAtRest, stepDrops, stepHover, stepPills } from "./step";
import type { GooeySettings, Sim } from "./types";

/** The longest step a frame takes, in seconds, so a stalled tab does not jump. */
const MAX_DT = 0.05;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const OPTION = "[data-gooey-index]";

export type GooeyEngine = {
  dispose: () => void;
  /** Sends the goo to option `index`. */
  go: (index: number) => void;
  /**
   * Redraws when `look` (the settings that change the drawing, as one string)
   * differs from the last one drawn.
   */
  refresh: (look: string) => void;
};

type EngineInput = {
  /** The option chosen now, read when the engine settles without a target. */
  index: () => number;
  settings: () => GooeySettings;
};

const createSim = (settings: () => GooeySettings): Sim => ({
  drops: [],
  hover: { alpha: 0, h: 0, index: -1, w: 0, x: 0, y: 0 },
  pills: new Map(),
  rects: [],
  reduced: window.matchMedia(REDUCED_MOTION).matches,
  settings,
  target: -1,
  view: { height: 0, width: 0 },
});

/** Points every drop already in the air at the new target. */
const redirect = (sim: Sim, index: number, now: number) => {
  for (const drop of sim.drops) {
    drop.index = index;
    if (drop.state === "absorbing") {
      drop.state = "flying";
      drop.mass *= 1 - drop.absorbed;
      drop.absorbed = 0;
    }
    if (drop.state === "flying") {
      planFlight(sim, drop, index, { fresh: false, now });
    }
  }
};

/** Starts the hover highlight on the option under the pointer. */
const hoverOver = (sim: Sim, list: HTMLUListElement, event: PointerEvent) => {
  const item =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>(OPTION)
      : null;
  if (!(item && list.contains(item))) {
    return false;
  }
  const index = Number(item.dataset.gooeyIndex);
  const rect = sim.rects[index];
  if (!rect) {
    return false;
  }
  const { hover } = sim;
  if (hover.alpha < 0.01) {
    hover.x = rect.x + rect.w / 2;
    hover.y = rect.y + rect.h / 2;
    hover.w = rect.w;
    hover.h = rect.h;
  }
  hover.index = index;
  return true;
};

/** Snaps the last fraction, so the resting pill is exactly its option. */
const snapToRest = (sim: Sim, hoverGoal: number) => {
  const host = sim.pills.get(sim.target);
  if (host) {
    host.mass = 1;
    host.scale = 1;
    host.velocity = 0;
  }
  sim.hover.alpha = hoverGoal;
};

/**
 * Follows the canvas's WebGL context: a GPU reset or a tab iOS put away
 * drops it (`lost`, the CSS pill stands in), and the browser may hand it
 * back (`restored`). Returns what stops following.
 */
const followContext = (
  canvas: HTMLCanvasElement,
  { lost, restored }: { lost: () => void; restored: () => void }
) => {
  const onLost = (event: Event) => {
    // Asks the browser to restore it.
    event.preventDefault();
    lost();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", restored);
  return () => {
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", restored);
  };
};

/**
 * Runs the goo on the component's nodes: measures them, animates only while
 * something moves, and follows resizes, late fonts and the pointer.
 */
export const createGooeyEngine = (
  elements: GooeyElements,
  { index, settings }: EngineInput
): GooeyEngine => {
  const { canvas, list, stage } = elements;
  let scene = startScene(elements);
  const sim = createSim(settings);
  let raf = 0;
  let last = 0;
  let disposed = false;
  let drawnLook = "";
  const render = () => renderFrame(sim, elements, scene);

  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min(MAX_DT, (now - last) / 1000 || 0);
    last = now;
    stepDrops(sim, { dt, now });
    stepPills(sim, dt);
    const hoverGoal = stepHover(sim, dt);
    const host = sim.pills.get(sim.target);
    if (host && isAtRest(sim, hoverGoal)) {
      snapToRest(sim, hoverGoal);
    } else {
      raf = requestAnimationFrame(frame);
    }
    render();
  };

  const wake = () => {
    if (raf || disposed) {
      return;
    }
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const settle = (target: number) => {
    sim.pills.clear();
    sim.drops.length = 0;
    sim.target = target;
    const state = pillAt(sim, target);
    state.mass = 1;
    state.scale = 1;
    state.velocity = 0;
    render();
  };

  const go = (target: number) => {
    if (target === sim.target) {
      return;
    }
    if (!sim.rects[target] || sim.reduced || sim.target < 0) {
      settle(target);
      return;
    }
    const now = performance.now();
    sim.target = target;
    pillAt(sim, target);
    redirect(sim, target, now);
    for (const from of [...sim.pills.keys()]) {
      if (from !== target) {
        emitDrops(sim, { from, now, to: target });
      }
    }
    wake();
  };

  const onOver = (event: PointerEvent) => {
    if (hoverOver(sim, list, event)) {
      wake();
    }
  };
  const onLeave = () => {
    sim.hover.index = -1;
    wake();
  };
  const remeasure = () => {
    measureStage(sim, elements);
    if (sim.drops.length) {
      render();
    } else {
      settle(sim.target < 0 ? index() : sim.target);
    }
  };

  const unfollowContext = followContext(canvas, {
    lost: () => {
      scene = null;
      showCanvas(elements, false);
      remeasure();
    },
    restored: () => {
      scene = startScene(elements);
      remeasure();
    },
  });

  const resizeObserver = new ResizeObserver(remeasure);
  resizeObserver.observe(stage);
  resizeObserver.observe(list);
  list.addEventListener("pointerover", onOver);
  list.addEventListener("pointerleave", onLeave);
  measureStage(sim, elements);
  settle(index());
  // Web fonts change every option's width once they land.
  document.fonts?.ready.then(
    () => {
      if (!disposed) {
        measureStage(sim, elements);
        if (!sim.drops.length) {
          settle(sim.target);
        }
      }
    },
    () => undefined
  );

  return {
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      list.removeEventListener("pointerover", onOver);
      list.removeEventListener("pointerleave", onLeave);
      unfollowContext();
      if (scene) {
        disposeScene(scene);
      }
    },
    go,
    refresh: (look) => {
      if (look === drawnLook) {
        return;
      }
      drawnLook = look;
      wake();
    },
  };
};
