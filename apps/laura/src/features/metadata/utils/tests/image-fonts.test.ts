// @module-tag unit
import { OCEAN_IMAGE_FONT } from "@allonfire/design/designs/ocean/image-font";
import { imageFonts } from "../image-fonts";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

describe("imageFonts", () => {
  it("gives the generated images Nunito in regular and bold", async () => {
    const fonts = await imageFonts();
    expect(fonts.map(({ weight }) => weight)).toEqual([400, 700]);
    for (const font of fonts) {
      expect(font.name).toBe(OCEAN_IMAGE_FONT.FAMILY);
      expect(font.data.byteLength).toBeGreaterThan(0);
    }
  });
});
