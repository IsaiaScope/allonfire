/**
 * Shared breakpoint values matching Tailwind CSS defaults.
 * Use these with `useMediaQuery` or import from `@allonfire/hooks/breakpoints`.
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
