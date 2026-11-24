// @module-tag unit
import { type AppLogo, aofLogoSvg } from "../../../brand/aof-logo";
import { AA, contrast } from "../../shared/tests/theme-css";
import { OCEAN_IMAGE_COLOR } from "../image-colors";
import { OCEAN_IMAGE_FONT } from "../image-font";

const WHITE = "#ffffff";
const APP = {
  banner: OCEAN_IMAGE_COLOR.BANNER,
  fontFamily: OCEAN_IMAGE_FONT.FAMILY,
  name: "Laura",
} as const satisfies AppLogo;

const LAYOUTS = ["square", "horizontal"] as const;
const SCHEMES = ["light", "dark", "auto"] as const;

describe("Ocean's Laura logo", () => {
  it.each(LAYOUTS)(
    "draws the %s logo in the Design's banner for every scheme",
    (layout) => {
      for (const scheme of SCHEMES) {
        const svg = aofLogoSvg({ app: APP, layout, scheme });
        expect(svg).toContain(`>${APP.name.toUpperCase()}<`);
        expect(svg).toContain(
          `font-family="${OCEAN_IMAGE_FONT.FAMILY}, sans-serif"`
        );
        for (const stop of OCEAN_IMAGE_COLOR.BANNER) {
          expect(svg).toContain(`stop-color="${stop}"`);
        }
      }
    }
  );

  it.each(OCEAN_IMAGE_COLOR.BANNER)(
    "the banner stop %s carries white text at AA",
    (stop) => {
      expect(contrast(WHITE, stop)).toBeGreaterThanOrEqual(AA);
    }
  );

  it("steps the banner from deeper to lighter", () => {
    const [from, middle, to] = OCEAN_IMAGE_COLOR.BANNER;
    // White's contrast falls as a stop lightens.
    expect(contrast(WHITE, from)).toBeGreaterThan(contrast(WHITE, middle));
    expect(contrast(WHITE, middle)).toBeGreaterThan(contrast(WHITE, to));
  });
});
