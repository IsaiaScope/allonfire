// @module-tag unit
import { OCEAN_CARD_BACK } from "../card-back";
import { OCEAN_IMAGE_COLOR } from "../image-colors";
import { LI_MARK } from "../li-mark";

/** The mark's size on the card: 72% of its width, in the logo's proportions. */
const LI_WIDTH = OCEAN_CARD_BACK.WIDTH * 0.72;
const LI_HEIGHT = Math.round((LI_WIDTH * LI_MARK.HEIGHT) / LI_MARK.WIDTH);

const SCHEMES = [
  ["light", OCEAN_CARD_BACK.LIGHT, LI_MARK.PNG_BASE64.LIGHT],
  ["dark", OCEAN_CARD_BACK.DARK, LI_MARK.PNG_BASE64.DARK],
] as const;

describe("OCEAN_CARD_BACK", () => {
  it("is 300 by 400, a 3:4 card for a board's grid", () => {
    expect(OCEAN_CARD_BACK.WIDTH).toBe(300);
    expect(OCEAN_CARD_BACK.HEIGHT).toBe(400);
  });

  it.each(SCHEMES)("has a viewBox of that size in %s", (_scheme, back) => {
    expect(back.SVG).toContain('viewBox="0 0 300 400"');
  });

  it.each(SCHEMES)(
    "draws Laura's Li logo in its own colour, centred, in %s",
    (_scheme, back, png) => {
      expect(back.SVG).toContain(`href="data:image/png;base64,${png}"`);
      expect(back.SVG).toContain(
        `x="${(OCEAN_CARD_BACK.WIDTH - LI_WIDTH) / 2}"`
      );
    }
  );

  it("keeps the mark inside the card, at the logo's own proportions", () => {
    expect(LI_WIDTH).toBeLessThan(OCEAN_CARD_BACK.WIDTH);
    expect(LI_WIDTH / LI_HEIGHT).toBeCloseTo(LI_MARK.WIDTH / LI_MARK.HEIGHT, 1);
    expect(LI_HEIGHT).toBeLessThan(OCEAN_CARD_BACK.HEIGHT);
  });

  // The owner found the ink too strong by day: each card follows its scheme.
  it.each([
    ["light", OCEAN_CARD_BACK.LIGHT, OCEAN_IMAGE_COLOR.light.secondary],
    ["dark", OCEAN_CARD_BACK.DARK, OCEAN_IMAGE_COLOR.dark.card],
  ] as const)(
    "sits on the %s scheme's own ground, never the ink",
    (_scheme, back, ground) => {
      expect(back.SVG).toContain(`fill="${ground}"`);
      expect(back.SVG).not.toContain(OCEAN_IMAGE_COLOR.INK);
    }
  );

  it.each(SCHEMES)("keeps the waves of the sea in %s", (_scheme, back) => {
    expect(back.SVG.match(/<path /g)).toHaveLength(2);
  });

  // The page's card draws the corners and the edge (CSS), so none is cut here.
  it.each(SCHEMES)(
    "fills the whole card with square corners and no stroke in %s",
    (_scheme, back) => {
      expect(back.SVG).toContain(
        `<rect width="${OCEAN_CARD_BACK.WIDTH}" height="${OCEAN_CARD_BACK.HEIGHT}"`
      );
      expect(back.SVG).not.toContain("rx=");
      expect(back.SVG).not.toContain(OCEAN_IMAGE_COLOR.light.border);
      expect(back.SVG).not.toContain(OCEAN_IMAGE_COLOR.dark.border);
    }
  );

  it.each(SCHEMES)(
    "runs its waves the card's whole width in %s",
    (_scheme, back) => {
      expect(back.SVG).not.toContain("translate(");
      expect(back.SVG).toContain(`T${OCEAN_CARD_BACK.WIDTH} `);
    }
  );

  it("is a data URL with no filter", () => {
    for (const [, back] of SCHEMES) {
      expect(back.SVG).not.toContain("<filter");
      expect(back.DATA_URL.startsWith("data:image/svg+xml,")).toBe(true);
    }
  });
});
