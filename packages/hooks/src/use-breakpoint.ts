"use client";

import { useMediaQuery } from "react-responsive";
import { BREAKPOINTS } from "./breakpoints";

/** Returns `true` when the viewport is at least `lg` (1024px). */
export function useIsDesktop() {
  return useMediaQuery({ minWidth: BREAKPOINTS.lg });
}

/** Returns `true` when the viewport is below `lg` (1024px). */
export function useIsMobile() {
  return useMediaQuery({ maxWidth: BREAKPOINTS.lg - 1 });
}

/** Returns `true` when the viewport is at least `md` (768px). */
export function useIsTablet() {
  return useMediaQuery({ minWidth: BREAKPOINTS.md });
}
