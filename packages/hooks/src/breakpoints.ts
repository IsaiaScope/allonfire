/**
 * Shared breakpoint values matching Tailwind CSS defaults.
 * Use these with `useMediaQuery` or import from `@allonfire/hooks/breakpoints`.
 */
export const BREAKPOINTS = {
  "2xl": 1536,
  lg: 1024,
  md: 768,
  sm: 640,
  xl: 1280,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
