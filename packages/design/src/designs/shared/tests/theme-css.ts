import { readdirSync, readFileSync } from "node:fs";

// Test helpers every Design's theme test shares: reading `theme.css`, the
// colour maths, the pairs every Design must keep readable, and the contrast
// suite that runs them over both schemes.

// WCAG 2.2 AA for normal text; PRODUCT.md makes it a hard requirement.
export const AA = 4.5;
// WCAG 1.4.11: a bar or a ring against the surface it is drawn on.
export const GRAPHIC = 3;
export const HEX = /^#[0-9a-f]{6}$/i;

const CHART_TOKENS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;
const DECLARATION = /--([\w-]+):\s*([^;]+);/g;
const LINEAR_THRESHOLD = 0.039_28;
const SIDECAR = "._";
const DESIGNS = new URL("../../", import.meta.url);

type Selector = ":root" | ".dark" | "@theme inline";
type Pairs = readonly (readonly [text: string, surface: string])[];

/** The Designs under `src/designs`: the folders that hold a `theme.css`. */
export const designNames = (): string[] =>
  readdirSync(DESIGNS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(SIDECAR))
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        readFileSync(new URL(`${name}/theme.css`, DESIGNS));
        return true;
      } catch {
        return false;
      }
    })
    .sort();

export const readTheme = (design: string): string =>
  readFileSync(new URL(`${design}/theme.css`, DESIGNS), "utf8");

const block = (css: string, selector: Selector) => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

/** Every `--name: value` a selector's block declares, the value as written. */
export const declarations = (
  css: string,
  selector: Selector
): Map<string, string> =>
  new Map(
    [...block(css, selector).matchAll(DECLARATION)].map(([, name, value]) => [
      name ?? "",
      (value ?? "").replace(/\s+/g, " ").trim(),
    ])
  );

/** Only the `#rrggbb` declarations of a scheme. */
export const hexTokens = (
  css: string,
  selector: ":root" | ".dark"
): Map<string, string> =>
  new Map(
    [...declarations(css, selector)].filter(([, value]) => HEX.test(value))
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

export const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

/**
 * Text token on the surface it is read against, for every Design: what no
 * Design's own furniture is named in. `primary` is text too: links and
 * shadcn's `link` variant set it on the ground and on cards.
 */
export const COMMON_TEXT_PAIRS = [
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
  // A row's second line in the sidebar (the switcher's brand), at rest and
  // lit (hovered, or its menu open).
  ["muted-foreground", "sidebar"],
  ["muted-foreground", "sidebar-accent"],
  // A popup's placeholder and a chosen row's or badge's text.
  ["muted-foreground", "popover"],
  ["muted-foreground", "muted"],
  ["popover-foreground", "muted"],
  // A toast's pictogram and edge, in how its notice went, on the popover.
  ["success", "popover"],
  ["warning", "popover"],
  ["info", "popover"],
  ["destructive", "popover"],
  // A toast filled with how its notice went, and its words on it.
  ["toast-foreground", "toast-success"],
  ["toast-foreground", "toast-warning"],
  ["toast-foreground", "toast-info"],
  ["toast-foreground", "toast-error"],
] as const satisfies Pairs;

/**
 * Registers, for `:root` and `.dark`, one test per text pair (AA), per
 * graphic pair (3:1), per chart token (3:1 on the card), and one that the
 * first series is drawn in the primary.
 */
export const describeContrast = (
  label: string,
  css: string,
  pairs: Pairs,
  graphics: Pairs = []
): void => {
  describe.each([":root", ".dark"] as const)(
    `${label} theme %s`,
    (selector) => {
      const scheme = hexTokens(css, selector);
      const light = hexTokens(css, ":root");
      const value = (name: string) => scheme.get(name) ?? light.get(name) ?? "";

      it.each(pairs)("%s on %s meets AA", (text, surface) => {
        expect(value(text)).toMatch(HEX);
        expect(value(surface)).toMatch(HEX);
        expect(contrast(value(text), value(surface))).toBeGreaterThanOrEqual(
          AA
        );
      });

      it.each(graphics)("%s on %s meets the graphic ratio", (mark, surface) => {
        expect(value(mark)).toMatch(HEX);
        expect(value(surface)).toMatch(HEX);
        expect(contrast(value(mark), value(surface))).toBeGreaterThanOrEqual(
          GRAPHIC
        );
      });

      it.each(CHART_TOKENS)("%s reads on a card as a graphic", (chart) => {
        expect(value(chart)).toMatch(HEX);
        expect(contrast(value(chart), value("card"))).toBeGreaterThanOrEqual(
          GRAPHIC
        );
      });

      it("draws the first series in the theme's primary", () => {
        expect(value("chart-1")).toBe(value("primary"));
      });
    }
  );
};
