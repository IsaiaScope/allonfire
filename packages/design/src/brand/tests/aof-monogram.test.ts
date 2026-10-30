// @module-tag unit
import { BRAND } from "../aof-monogram";

const HEX_COLOR = /^#[0-9a-f]{6}$/;

describe("the Brand monogram", () => {
  it("is the monogram alone: no background, no App label", () => {
    expect(BRAND.MONOGRAM_SVG).toContain(
      `viewBox="0 0 ${BRAND.EDGE} ${BRAND.EDGE}"`
    );
    expect(BRAND.MONOGRAM_SVG).not.toContain("<rect");
    expect(BRAND.MONOGRAM_SVG).not.toContain("<text");
  });

  it("offers its markup for an App to set inside its own logo", () => {
    expect(BRAND.MONOGRAM_MARKUP).not.toContain("<svg");
    expect(BRAND.MONOGRAM_SVG).toContain(BRAND.MONOGRAM_MARKUP);
  });

  it("names the dark ground every App's logo sits on", () => {
    expect(BRAND.GROUND).toMatch(HEX_COLOR);
  });
});
