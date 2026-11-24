// @module-tag unit
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { objectEntries, objectKeys } from "@allonfire/core/shared/utils/object";
import { OCEAN_ART, OCEAN_MASCOT_POOL } from "../mascot-art";

const SOURCES = readFileSync(
  fileURLToPath(new URL("../SOURCES.md", import.meta.url)),
  "utf8"
);
const ART = objectEntries(OCEAN_ART);
const SVG_OPEN = /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*>/;
const VIEW_BOX = /viewBox="0 0 \d+ \d+"/;
/** The licences the art can fall under. */
const LICENCES = ["Apache 2.0", "CC BY 3.0", "MIT"];
const FILL = /fill="#[0-9a-fA-F]{3,8}"/;

/** The owner's pool, the pictures the pages show. */
const PRIMARY = [
  "OCTOPUS_NOTO",
  "OCTOPUS_FIREFOX",
  "OCTOPUS_CLASSIC",
  "SQUID_NOTO",
  "JELLYFISH_NOTO",
  "OCTOPUS_MONO",
] as const;

/** The details, and the pictures a page uses when it already shows a primary one. */
const SECONDARY = [
  "JELLYFISH_MONO",
  "LIGHTHOUSE_MONO",
  "CRAB_MONO",
  "JELLYFISH_FLUENT",
  "SQUID_FLUENT",
  "WAVE_FLUENT",
  "SHARK_NOTO",
  "LIGHTHOUSE_NOTO",
  "WHALE_NOTO",
] as const;

describe("OCEAN_ART", () => {
  it("holds the owner's pool and nothing else", () => {
    expect(new Set(objectKeys(OCEAN_ART))).toEqual(
      new Set([...PRIMARY, ...SECONDARY])
    );
  });

  it.each(ART)("%s is a whole SVG document with a view box", (_key, art) => {
    expect(art.SVG).toMatch(SVG_OPEN);
    expect(art.SVG).toMatch(VIEW_BOX);
    expect(art.SVG.endsWith("</svg>")).toBe(true);
    expect(art.SVG).not.toContain("<script");
  });

  it.each(ART)(
    "%s is one colour that takes the page's, or full colour, never both",
    (_key, art) => {
      if ("MONO" in art) {
        expect(art.SVG).toContain("currentColor");
        return;
      }
      expect(art.SVG).not.toContain("currentColor");
      expect(art.SVG).toMatch(FILL);
    }
  );

  it("marks as one colour exactly the game-icons octopus and the three mono details", () => {
    const mono = ART.filter(([, art]) => "MONO" in art).map(([key]) => key);
    expect(new Set(mono)).toEqual(
      new Set([
        "OCTOPUS_MONO",
        "JELLYFISH_MONO",
        "LIGHTHOUSE_MONO",
        "CRAB_MONO",
      ])
    );
  });

  it.each(ART)("%s names a licence SOURCES.md lists", (_key, art) => {
    expect(LICENCES).toContain(art.LICENCE);
    expect(SOURCES).toContain(art.LICENCE);
  });

  it.each(ART)("%s has its own row in SOURCES.md", (key) => {
    expect(SOURCES).toContain(`\`${key}\``);
  });

  it("credits the CC BY 3.0 octopus where the Apps list their credits", () => {
    expect(OCEAN_ART.OCTOPUS_MONO.LICENCE).toBe("CC BY 3.0");
    expect(SOURCES).toContain("game-icons.net");
    expect(SOURCES).toContain("CC BY 3.0");
    // Both pictures are Lorc's: the credit names the author, never "contributors".
    expect(SOURCES).toContain("Lorc");
    expect(SOURCES).not.toContain("contributors");
  });
});

describe("OCEAN_MASCOT_POOL", () => {
  it("is the six primary pictures", () => {
    expect(new Set(OCEAN_MASCOT_POOL)).toEqual(new Set(PRIMARY));
  });

  it("names pictures that exist", () => {
    for (const key of OCEAN_MASCOT_POOL) {
      expect(OCEAN_ART[key].SVG).toContain("<svg");
    }
  });
});
