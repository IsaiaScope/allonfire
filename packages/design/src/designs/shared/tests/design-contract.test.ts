// @module-tag unit
import { existsSync, readFileSync } from "node:fs";
import {
  declarations,
  designNames,
  HEX,
  hexTokens,
  readTheme,
} from "./theme-css";

/** Every colour a shared component reads (ui's toaster, sidebar and charts, shadcn's set). */
const REQUIRED = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "success",
  "warning",
  "info",
  "toast-foreground",
  "toast-success",
  "toast-warning",
  "toast-info",
  "toast-error",
] as const;

/** Named in `@theme inline` as `--color-<name>` for Tailwind's utilities. */
const MAPPED = [
  "success",
  "warning",
  "info",
  "toast-foreground",
  "toast-success",
  "toast-warning",
  "toast-info",
  "toast-error",
] as const;

const FONT_URL = /url\("\.\/(fonts\/[^"]+)"\)/g;
const DESIGN_NAME = /^name: .+$/m;

describe("the Designs under src/designs", () => {
  it("finds at least Japan", () => {
    expect(designNames()).toContain("japan");
  });
});

describe.each(designNames())("%s Design", (design) => {
  const css = readTheme(design);
  const light = hexTokens(css, ":root");

  it("declares every colour a shared component reads, in the light scheme", () => {
    for (const name of REQUIRED) {
      expect(light.get(name), name).toMatch(HEX);
    }
  });

  it("declares the face and the corner", () => {
    const root = declarations(css, ":root");
    expect(root.get("font-sans")).toBeTruthy();
    expect(root.get("radius")).toBeTruthy();
  });

  it("maps the notice and toast colours for Tailwind", () => {
    const theme = declarations(css, "@theme inline");
    for (const name of MAPPED) {
      expect(theme.get(`color-${name}`), name).toBe(`var(--${name})`);
    }
  });

  it("declares a .dark scheme", () => {
    expect(css).toContain(".dark {");
  });

  it("ships every font its @font-face names", () => {
    const folder = new URL(`../../${design}/`, import.meta.url);
    for (const [, path = ""] of css.matchAll(FONT_URL)) {
      expect(existsSync(new URL(path, folder)), path).toBe(true);
    }
  });

  it("has a DESIGN.md that names the Design in its frontmatter", () => {
    const text = readFileSync(
      new URL(`../../${design}/DESIGN.md`, import.meta.url),
      "utf8"
    );
    expect(text).toMatch(DESIGN_NAME);
  });
});
