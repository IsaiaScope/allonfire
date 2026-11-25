import { useSyncExternalStore } from "react";
import { SAFE_AREA } from "../constants/safe-area";

type Padding = { bottom: number; left: number; right: number; top: number };

const SIDES = ["top", "right", "bottom", "left"] as const;

/** Base UI's own gap on every side: what the server and a screen with no inset give. */
const DEFAULT: Padding = {
  bottom: SAFE_AREA.POPUP.EDGE_PX,
  left: SAFE_AREA.POPUP.EDGE_PX,
  right: SAFE_AREA.POPUP.EDGE_PX,
  top: SAFE_AREA.POPUP.EDGE_PX,
};

// One probe and one listener for the whole page, however many popups read it
// (a table row carries a tooltip): the first reader sets them up, the last
// takes them down.
const listeners = new Set<() => void>();
let probe: HTMLElement | null = null;
let current = DEFAULT;

const measure = () => {
  if (!probe) {
    return;
  }
  const style = getComputedStyle(probe);
  const next: Padding = {
    bottom: Number.parseFloat(style.paddingBottom),
    left: Number.parseFloat(style.paddingLeft),
    right: Number.parseFloat(style.paddingRight),
    top: Number.parseFloat(style.paddingTop),
  };
  if (SIDES.some((side) => current[side] !== next[side])) {
    current = next;
    for (const listener of listeners) {
      listener();
    }
  }
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) {
    probe = document.createElement("div");
    probe.dataset.safeAreaProbe = "";
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;${SIDES.map(
      (side) =>
        `padding-${side}:max(${SAFE_AREA.POPUP.EDGE_PX}px,env(safe-area-inset-${side},0px))`
    ).join(";")}`;
    document.body.append(probe);
    window.addEventListener("resize", measure);
  }
  listeners.add(listener);
  measure();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("resize", measure);
      probe?.remove();
      probe = null;
    }
  };
};

/**
 * The padding (px) a popup keeps from each screen edge: `SAFE_AREA.POPUP.EDGE_PX`, or
 * that side's safe-area inset when it is larger. Base UI's `collisionPadding`
 * takes numbers, and `env()` is CSS only, so a hidden probe element padded by
 * `max(edge, env(...))` lets the browser resolve it, again on every resize (a
 * turn is one). The first render is Base UI's own 5px, as on the server.
 */
export const useSafeAreaPadding = () =>
  useSyncExternalStore(
    subscribe,
    () => current,
    () => DEFAULT
  );
