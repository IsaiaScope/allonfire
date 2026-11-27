import type { ColorScheme } from "../constants/metadata";

/** The media query of one device theme. */
export const colorSchemeMedia = (scheme: ColorScheme) =>
  `(prefers-color-scheme: ${scheme})`;
