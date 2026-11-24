import type { ColorScheme } from "@allonfire/core/features/metadata/constants/metadata";

/** A scheme's colours where CSS variables cannot reach. */
type SchemeColors = {
  background: string;
  card: string;
  coral: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
};

/**
 * The Ocean Design's colours for what cannot read its CSS variables:
 * theme-color, a manifest, generated images. Keyed by color scheme, plus what
 * is the same by day and night. A test fails when theme.css changes them.
 */
export const OCEAN_IMAGE_COLOR = {
  /**
   * The logo banner, left to right, deeper to lighter: each stop carries
   * white text at AA, which the dark primary would not.
   */
  BANNER: ["#08505e", "#0b6b7c", "#0f7a8b"],
  dark: {
    background: "#0c1b21",
    card: "#142a32",
    coral: "#ff7a72",
    foreground: "#e8f2f3",
    mutedForeground: "#9db8be",
    primary: "#4fc3d4",
  },
  /** The octopus's own dark: the card back, a pill carrying pale text. */
  INK: "#0a2530",
  light: {
    background: "#f2f8f8",
    card: "#ffffff",
    coral: "#c93d3a",
    foreground: "#0f2a30",
    mutedForeground: "#4a6168",
    primary: "#0b6b7c",
  },
} as const satisfies Record<ColorScheme, SchemeColors> &
  Record<string, unknown>;
