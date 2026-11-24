// @module-tag unit
import { contrast, GRAPHIC } from "../../shared/tests/theme-css";
import { OCEAN_CARD_BACK } from "../card-back";
import { OCEAN_IMAGE_COLOR } from "../image-colors";
import { OCEAN_ART } from "../mascot-art";

/** What lies between the art's own `<svg>` tags: what the card back places in its own. */
const inner = (svg: string) =>
  svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));

describe("OCEAN_CARD_BACK", () => {
  it("is a 300 by 400 SVG with a viewBox of that size", () => {
    expect(OCEAN_CARD_BACK.WIDTH).toBe(300);
    expect(OCEAN_CARD_BACK.HEIGHT).toBe(400);
    expect(OCEAN_CARD_BACK.SVG).toContain('viewBox="0 0 300 400"');
  });

  it("sits on the ink in both schemes", () => {
    expect(OCEAN_CARD_BACK.SVG).toContain(OCEAN_IMAGE_COLOR.INK);
  });

  it("draws the Noto octopus, in its own colours, on the ink", () => {
    expect(OCEAN_CARD_BACK.SVG).toContain(inner(OCEAN_ART.OCTOPUS_NOTO.SVG));
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
