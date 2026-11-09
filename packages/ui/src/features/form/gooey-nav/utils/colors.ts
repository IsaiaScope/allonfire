import type { Rgba } from "./types";

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /rgba?\(([^)]+)\)/i;
const DIGIT = /./g;
const WHITE: Rgba = [1, 1, 1, 1];
const LIGHT_LUMINANCE = 0.55;
const INK = { DARK: "#18161d", LIGHT: "#ffffff" } as const;

/**
 * A hex (`#abc`, `#aabbcc`) or `rgb()`/`rgba()` colour as 0..1 channels; the
 * shader takes them so. Anything else reads as white.
 */
export const parseColor = (value: string): Rgba => {
  // `match`, not `exec`: Biome types `exec` as never null.
  const hex = value.trim().match(HEX)?.[1];
  if (hex) {
    const full = hex.length === 3 ? hex.replace(DIGIT, (d) => d + d) : hex;
    const channel = (start: number) =>
      Number.parseInt(full.slice(start, start + 2), 16) / 255;
    return [channel(0), channel(2), channel(4), 1];
  }
  const body = value.match(RGB)?.[1];
  if (body !== undefined) {
    const parts = body.split(",").map((part) => Number.parseFloat(part));
    return [
      (parts[0] ?? Number.NaN) / 255,
      (parts[1] ?? Number.NaN) / 255,
      (parts[2] ?? Number.NaN) / 255,
      parts[3] ?? 1,
    ];
  }
  return WHITE;
};

/** Dark text on a light pill, white on a dark one (relative luminance). */
export const contrastInk = ([r, g, b]: Rgba) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b > LIGHT_LUMINANCE ? INK.DARK : INK.LIGHT;
