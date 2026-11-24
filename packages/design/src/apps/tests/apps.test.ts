// @module-tag unit
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { parseJson } from "@allonfire/core/shared/utils/json";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { syncDesigns, wornDesigns } from "../../../scripts/sync-core";
import { HEX } from "../../designs/shared/tests/theme-css";

const PACKAGE = join(REPO.PACKAGES, "design");
const SRC = join(PACKAGE, "src");
const APPS = join(SRC, "apps");
const DESIGNS = join(SRC, "designs");
const SIDECAR = "._";
const HEX_COLOR = /#[0-9a-fA-F]{6}\b/g;
const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const NEVER_LINE = /\bnever\b/i;
const VIEWER = /\bViewer\b/;
const QUIZ = /\bquiz\b/i;

const exportsOf = parseJson<{ exports: Record<string, string> }>(
  readFileSync(join(PACKAGE, "package.json"), "utf8")
).exports;
const exportedPaths = new Set(objectValues(exportsOf));

const folders = (parent: string) =>
  readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(SIDECAR))
    .map((entry) => entry.name);

const read = (...path: string[]) => readFileSync(join(...path), "utf8");
const hexes = (text: string) =>
  [...text.matchAll(HEX_COLOR)].map(([hex]) => hex.toLowerCase());

describe("the Apps and Designs under src", () => {
  it("has an export key for every App stylesheet", () => {
    for (const app of folders(APPS).filter((name) => name !== "tests")) {
      expect(exportedPaths, app).toContain(`./src/apps/${app}/styles.css`);
    }
  });

  it("has an export key and a theme.css for every Design", () => {
    for (const design of folders(DESIGNS).filter((name) => name !== "shared")) {
      expect(existsSync(join(DESIGNS, design, "theme.css")), design).toBe(true);
      expect(exportedPaths, design).toContain(
        `./src/designs/${design}/theme.css`
      );
    }
  });

  it("has an export key per ocean constant file", () => {
    const files = readdirSync(join(DESIGNS, "ocean")).filter(
      (name) => name.endsWith(".ts") && !name.startsWith(SIDECAR)
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(exportedPaths, file).toContain(`./src/designs/ocean/${file}`);
    }
  });

  it("lets Laura wear ocean", () => {
    expect(wornDesigns(REPO.ROOT).get("laura")).toBe("ocean");
  });

  it("keeps every Design copy in step", () => {
    expect(syncDesigns(REPO.ROOT, { check: true }).changed).toEqual([]);
  });
});

describe("Laura's product context", () => {
  const product = read(APPS, "laura", "PRODUCT.md");
  const reference = read(APPS, "back-office", "PRODUCT.md");
  const HEADING = /^## .+$/gm;

  it("is impeccable's schema", () => {
    expect(product).toContain("<!-- impeccable:product-schema 1 -->");
    expect(product.match(HEADING)).toEqual(reference.match(HEADING));
  });

  it("speaks the domain's words", () => {
    for (const word of [
      "Gallery",
      "Favorite",
      "Memory game",
      "Admin",
      "User",
    ]) {
      expect(product, word).toContain(word);
    }
  });

  it("keeps what was removed out", () => {
    // "Never ..." lines name the forbidden words, so they are skipped.
    const used = product
      .split("\n")
      .filter((line) => !NEVER_LINE.test(line))
      .join("\n");
    expect(used).not.toMatch(VIEWER);
    expect(used).not.toMatch(QUIZ);
  });
});

describe("Laura's stylesheet", () => {
  const styles = read(APPS, "laura", "styles.css");

  it("adds no rule Laura shares with the Back Office: ui's base holds them", () => {
    expect(styles).not.toContain("scrollbar-width");
    expect(styles).not.toContain("[data-sonner-toaster]");
  });

  it("is the Design import and Laura-only rules", () => {
    expect(styles).toContain('@import "../../designs/ocean/theme.css";');
  });
});

describe("ocean's DESIGN.md", () => {
  it("names only colours theme.css has: theme.css wins when they disagree", () => {
    const md = read(DESIGNS, "ocean", "DESIGN.md");
    const frontmatter = md.match(FRONTMATTER)?.[1] ?? "";
    const theme = new Set(hexes(read(DESIGNS, "ocean", "theme.css")));
    const named = hexes(frontmatter);
    expect(named.length).toBeGreaterThan(0);
    for (const hex of named) {
      expect(HEX.test(hex), hex).toBe(true);
      expect(theme, hex).toContain(hex);
    }
  });
});
