// @module-tag unit
import { JAPAN_IMAGE_FONT } from "../../japan/image-font";
import { loadJapanImageFonts } from "../../japan/image-fonts";
import { OCEAN_IMAGE_FONT } from "../../ocean/image-font";
import { loadOceanImageFonts } from "../../ocean/image-fonts";

/** The signatures Satori reads: TrueType, `true`, OpenType and WOFF. */
const STATIC_FONT_SIGNATURES = [
  "\u0000\u0001\u0000\u0000",
  "true",
  "OTTO",
  "wOFF",
];
const FIRST_FOUR_BYTES = 4;

const signature = (data: ArrayBuffer) =>
  String.fromCharCode(...new Uint8Array(data.slice(0, FIRST_FOUR_BYTES)));

describe.each([
  ["Japan", loadJapanImageFonts, JAPAN_IMAGE_FONT.FAMILY],
  ["Ocean", loadOceanImageFonts, OCEAN_IMAGE_FONT.FAMILY],
] as const)("%s's image fonts", (_design, load, family) => {
  it("registers two faces of its family, regular and bold", async () => {
    const faces = await load();
    expect(faces.map((face) => face.weight)).toEqual([400, 700]);
    for (const face of faces) {
      expect(face.name).toBe(family);
      expect(face.style).toBe("normal");
      expect(face.data.byteLength).toBeGreaterThan(0);
    }
  });

  it("holds static fonts Satori can read, never WOFF2 or a variable font", async () => {
    for (const face of await load()) {
      expect(STATIC_FONT_SIGNATURES).toContain(signature(face.data));
    }
  });
});
