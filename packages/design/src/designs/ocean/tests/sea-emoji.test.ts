// @module-tag unit
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { OCEAN_EMOJI_SET, OCEAN_SEA_EMOJI } from "../sea-emoji";

const KEY = /^[a-z0-9-]+$/;
const SOURCES = readFileSync(
  fileURLToPath(new URL("../SOURCES.md", import.meta.url)),
  "utf8"
);
const NEEDS = objectEntries(OCEAN_SEA_EMOJI);

describe("OCEAN_SEA_EMOJI", () => {
  it("names the two sets the owner chose, by their Iconify prefix", () => {
    expect(OCEAN_EMOJI_SET.NOTO).toBe("noto");
    expect(OCEAN_EMOJI_SET.FXEMOJI).toBe("fxemoji");
  });

  it.each(NEEDS)("has a Noto emoji for %s", (_need, emoji) => {
    expect(emoji.NOTO).toMatch(KEY);
  });

  it.each(NEEDS)(
    "names the Firefox emoji for %s, when it has one",
    (_need, emoji) => {
      if ("FXEMOJI" in emoji) {
        expect(emoji.FXEMOJI).toMatch(KEY);
      }
    }
  );

  it("leaves the ship out, the owner dropped it", () => {
    expect(NEEDS.map(([need]) => need)).not.toContain("SHIP");
  });

  it("covers the octopus, the Game's moments and the empty states", () => {
    const needs = NEEDS.map(([need]) => need);
    for (const need of ["OCTOPUS", "TROPHY", "DIZZY", "SLEEP", "PICTURE"]) {
      expect(needs).toContain(need);
    }
  });

  it("is credited in SOURCES.md with its licence", () => {
    expect(SOURCES).toContain("Noto");
    expect(SOURCES).toContain("Firefox");
    expect(SOURCES).toContain("Apache 2.0");
  });
});
