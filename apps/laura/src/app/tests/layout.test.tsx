// @module-tag unit
// @vitest-environment node
import { LOCAL } from "@allonfire/config/local/addresses";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { OCEAN_IMAGE_COLOR } from "@allonfire/design/designs/ocean/image-colors";
import { routing } from "@/features/i18n/routing";
import { generateStaticParams, viewport } from "../[locale]/layout";

// The env is read at import and a unit test lacks it; the layout reads only
// addresses and the mode at render.
vi.mock("@/environment/environment", () => ({
  env: { LAURA_URL: LOCAL.URL.LAURA },
}));

describe("the locale layout", () => {
  it("is built once for each language", () => {
    expect(generateStaticParams()).toEqual(
      routing.locales.map((locale) => ({ locale }))
    );
  });

  it("tints the browser with Ocean's ground in both colour schemes", () => {
    expect(viewport.themeColor).toEqual(
      expect.arrayContaining([
        {
          color: OCEAN_IMAGE_COLOR[METADATA.COLOR_SCHEME.LIGHT].background,
          media: `(prefers-color-scheme: ${METADATA.COLOR_SCHEME.LIGHT})`,
        },
        {
          color: OCEAN_IMAGE_COLOR[METADATA.COLOR_SCHEME.DARK].background,
          media: `(prefers-color-scheme: ${METADATA.COLOR_SCHEME.DARK})`,
        },
      ])
    );
  });
});
