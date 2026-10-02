// @module-tag unit
import { readFileSync } from "node:fs";

// WCAG 2.2 AA for normal text; PRODUCT.md makes it a hard requirement.
const AA = 4.5;
const HEX = /^#[0-9a-f]{6}$/i;
const DECLARATION = /--([\w-]+):\s*(#[0-9a-f]{6});/gi;
const LINEAR_THRESHOLD = 0.039_28;

const css = readFileSync(new URL("../theme.css", import.meta.url), "utf8");

const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  return css.slice(start, css.indexOf("}", start));
};

const tokens = (selector: string) =>
  new Map(
    [...block(selector).matchAll(DECLARATION)].map((match) => [
      match[1] ?? "",
      match[2] ?? "",
    ])
  );

const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= LINEAR_THRESHOLD
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

// Text token on the surface it is read against. `primary` is text too: links
// and shadcn's `link` variant set it on the ground and on cards.
const TEXT_PAIRS = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["card-foreground", "card"],
  ["muted-foreground", "card"],
  ["foreground", "muted"],
  ["destructive", "card"],
  ["primary", "background"],
  ["primary", "card"],
  ["primary-foreground", "primary"],
  ["destructive", "background"],
  ["led", "led-panel"],
] as const;

describe.each([":root", ".dark"])("Japan theme %s", (selector) => {
  const scheme = tokens(selector);
  const light = tokens(":root");
  const value = (name: string) => scheme.get(name) ?? light.get(name) ?? "";

  it.each(TEXT_PAIRS)("%s on %s meets AA", (text, surface) => {
    expect(value(text)).toMatch(HEX);
    expect(value(surface)).toMatch(HEX);
    expect(contrast(value(text), value(surface))).toBeGreaterThanOrEqual(AA);
  });
});
