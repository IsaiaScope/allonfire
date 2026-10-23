/**
 * Tailwind's default breakpoints in px (its rem × 16): the widths `sm:`,
 * `md:` and the rest switch at.
 */
const BREAKPOINT = {
  "2XL": 1536,
  LG: 1024,
  MD: 768,
  SM: 640,
  XL: 1280,
} as const;

/** Screen widths, Tailwind's, and the windows tests draw at. */
export const SCREEN = {
  BREAKPOINT,
  /**
   * A desktop at `xl`, and a phone below `sm` (an iPhone's 390 × 844), where
   * the sidebar is a drawer and lists show cards.
   */
  VIEWPORT: {
    DESKTOP: { HEIGHT: 800, WIDTH: BREAKPOINT.XL },
    PHONE: { HEIGHT: 844, WIDTH: 390 },
  },
} as const;
