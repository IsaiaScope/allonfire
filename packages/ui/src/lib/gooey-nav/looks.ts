export type GooeyPalette = "dark" | "light";
export type GooeySize = "sm" | "md" | "lg";

/** The frame's glass and the labels' ink, per palette. */
export const GOOEY_THEMES = {
  dark: {
    "--gn-frame": "rgba(38, 35, 46, 0.66)",
    "--gn-frame-edge": "rgba(255, 255, 255, 0.08)",
    "--gn-frame-highlight": "rgba(255, 255, 255, 0.07)",
    "--gn-frame-shadow":
      "0 22px 44px -20px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)",
    "--gn-ink": "#f4f4f5",
    "--gn-muted": "rgba(244, 244, 245, 0.62)",
  },
  light: {
    "--gn-frame": "rgba(240, 240, 243, 0.8)",
    "--gn-frame-edge": "rgba(24, 24, 27, 0.07)",
    "--gn-frame-highlight": "rgba(255, 255, 255, 0.95)",
    "--gn-frame-shadow":
      "0 22px 44px -22px rgba(24, 24, 27, 0.3), 0 6px 16px -10px rgba(24, 24, 27, 0.16)",
    "--gn-ink": "#27272a",
    "--gn-muted": "rgba(39, 39, 42, 0.62)",
  },
} as const satisfies Record<GooeyPalette, Record<`--gn-${string}`, string>>;

/** The pill's default colour, the hover's tint and the shadow's strength. */
export const GOOEY_PILLS = {
  dark: { color: "#f4f4f5", hover: "rgba(255, 255, 255, 0.08)", shadow: 0.4 },
  light: { color: "#27272a", hover: "rgba(24, 24, 27, 0.06)", shadow: 0.2 },
} as const satisfies Record<
  GooeyPalette,
  { color: string; hover: string; shadow: number }
>;

/** Type size, gaps and padding, per size. */
export const GOOEY_SIZES = {
  lg: {
    "--gn-font": "16px",
    "--gn-gap": "6px",
    "--gn-pad": "7px",
    "--gn-x": "20px",
    "--gn-y": "11px",
  },
  md: {
    "--gn-font": "14px",
    "--gn-gap": "4px",
    "--gn-pad": "6px",
    "--gn-x": "16px",
    "--gn-y": "9px",
  },
  sm: {
    "--gn-font": "13px",
    "--gn-gap": "2px",
    "--gn-pad": "5px",
    "--gn-x": "13px",
    "--gn-y": "7px",
  },
} as const satisfies Record<GooeySize, Record<`--gn-${string}`, string>>;

/** No drop colours: every drop takes the pill's. One array, so props stay stable. */
export const GOOEY_NO_TINTS: string[] = [];
