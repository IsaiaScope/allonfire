/** A scheme's colours where CSS variables cannot reach. */
type SchemeColors = {
  background: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
};

/**
 * The Japan Design's colours for what cannot read its CSS variables:
 * theme-color, a manifest, generated images. Keyed by color scheme, plus the
 * station furniture that is the same by day and night. A test fails when
 * theme.css changes them.
 */
export const JAPAN_IMAGE_COLOR = {
  dark: {
    background: "#16191d",
    foreground: "#eef0f2",
    mutedForeground: "#9aa3ad",
    primary: "#3a9ee0",
  },
  /** The line palette: each App picks its own (the Line Rule). */
  LINE: { GREEN: "#00a650", ORANGE: "#f39700" },
  light: {
    background: "#f6f7f8",
    foreground: "#1a1a1a",
    mutedForeground: "#5c6570",
    primary: "#006fb3",
  },
  /** The yellow tactile paving. */
  TACTILE: "#f2c200",
} as const satisfies Record<"dark" | "light", SchemeColors> &
  Record<string, unknown>;
