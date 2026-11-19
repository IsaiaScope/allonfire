// @module-tag unit
import { objectValues } from "@allonfire/core/shared/utils/object";
import { OCEAN_FACE, oceanMarkMarkup, oceanMarkSvg } from "../ocean-mark";

const COLORS = { body: "#111111", ink: "#eeeeee" } as const;

describe("the octopus's faces", () => {
  it("draws every face in the two colours it is given, and no filter", () => {
    for (const face of objectValues(OCEAN_FACE)) {
      const svg = oceanMarkSvg({ ...COLORS, face });
      expect(svg).toContain(COLORS.body);
      expect(svg).toContain(COLORS.ink);
      expect(svg).not.toContain("<filter");
      expect(svg).not.toContain("gradient");
    }
  });

  it("draws a different face for each moment on the same body: a blob and four feet", () => {
    const markups = objectValues(OCEAN_FACE).map((face) =>
      oceanMarkMarkup({ ...COLORS, face })
    );
    expect(new Set(markups).size).toBe(markups.length);
    const bodyParts = new RegExp(`<ellipse[^>]*fill="${COLORS.body}"`, "g");
    for (const markup of markups) {
      expect(markup.match(bodyParts)).toHaveLength(5);
    }
  });

  it("keeps the dizzy face when none is asked for: the card back's", () => {
    expect(oceanMarkMarkup(COLORS)).toBe(
      oceanMarkMarkup({ ...COLORS, face: OCEAN_FACE.DIZZY })
    );
  });
});
