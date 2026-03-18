"use client";

import { useEffect, useState } from "react";
import { BREAKPOINTS } from "./breakpoints";

/**
 * SSR-safe media query hook. Returns `defaultValue` on the server and during
 * the first client render (to avoid hydration mismatches), then syncs with the
 * actual viewport via `window.matchMedia` after mount.
 */
function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** Returns `true` when the viewport is at least `lg` (1024px). */
export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`, true);
}

/** Returns `true` when the viewport is below `lg` (1024px). */
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.lg - 1}px)`, false);
}

/** Returns `true` when the viewport is at least `md` (768px). */
export function useIsTablet() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`, true);
}
