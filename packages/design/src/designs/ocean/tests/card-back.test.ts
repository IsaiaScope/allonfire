// @module-tag unit
import { contrast, GRAPHIC } from "../../shared/tests/theme-css";
import { OCEAN_CARD_BACK } from "../card-back";
import { OCEAN_IMAGE_COLOR } from "../image-colors";
import { OCEAN_MARK, oceanMarkMarkup, oceanMarkSvg } from "../ocean-mark";

const COLORS = { body: "#111111", ink: "#eeeeee" } as const;

describe("the octopus mark", () => {
  it("draws the body and the face in the two colours it is given", () => {
    const markup = oceanMarkMarkup(COLORS);
    expect(markup).toContain(COLORS.body);
    expect(markup).toContain(COLORS.ink);
  });

  it("stands alone as a 200 square SVG", () => {
    const svg = oceanMarkSvg(COLORS);
    expect(svg).toContain(`viewBox="${OCEAN_MARK.VIEW_BOX}"`);
    expect(svg).toContain(oceanMarkMarkup(COLORS));
  });
});

describe("OCEAN_CARD_BACK", () => {
  it("is a 300 by 400 SVG with a viewBox of that size", () => {
    expect(OCEAN_CARD_BACK.WIDTH).toBe(300);
    expect(OCEAN_CARD_BACK.HEIGHT).toBe(400);
    expect(OCEAN_CARD_BACK.SVG).toContain('viewBox="0 0 300 400"');
  });

  it("sits on the ink in both schemes", () => {
    expect(OCEAN_CARD_BACK.SVG).toContain(OCEAN_IMAGE_COLOR.INK);
  });

  it("draws the octopus in the dark scheme's coral, which reads on the ink", () => {
    expect(OCEAN_CARD_BACK.SVG).toContain(OCEAN_IMAGE_COLOR.dark.coral);
    expect(
      contrast(OCEAN_IMAGE_COLOR.dark.coral, OCEAN_IMAGE_COLOR.INK)
    ).toBeGreaterThanOrEqual(GRAPHIC);
  });

  // The ink is 1.11:1 on the dark ground: an edge keeps the back visible there.
  it("edges the card in the dark primary, 3:1 against the dark ground", () => {
    expect(OCEAN_CARD_BACK.SVG).toContain(
      `stroke="${OCEAN_IMAGE_COLOR.dark.primary}"`
    );
    expect(
      contrast(
        OCEAN_IMAGE_COLOR.dark.primary,
        OCEAN_IMAGE_COLOR.dark.background
      )
    ).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it("is plain enough for Satori, and a data URL", () => {
    expect(OCEAN_CARD_BACK.SVG).not.toContain("<filter");
    expect(OCEAN_CARD_BACK.SVG).not.toContain("href=");
    expect(OCEAN_CARD_BACK.DATA_URL.startsWith("data:image/svg+xml,")).toBe(
      true
    );
  });
});
