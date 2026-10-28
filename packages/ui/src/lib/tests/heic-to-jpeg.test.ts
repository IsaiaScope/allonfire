// @module-tag unit
import { heicToJpeg, isHeic } from "../heic-to-jpeg";

const file = (name: string, type: string) => new File(["x"], name, { type });

describe("isHeic", () => {
  it("knows an iPhone's picture by its type, or by its extension when the browser gives none", () => {
    expect(isHeic(file("IMG_0001.HEIC", "image/heic"))).toBe(true);
    expect(isHeic(file("IMG_0001.heif", "image/heif"))).toBe(true);
    expect(isHeic(file("IMG_0001.HEIC", ""))).toBe(true);
    expect(isHeic(file("photo.jpg", "image/jpeg"))).toBe(false);
  });
});

describe("heicToJpeg", () => {
  it("hands any other picture back as it is", async () => {
    const jpeg = file("photo.jpg", "image/jpeg");
    expect(await heicToJpeg(jpeg)).toBe(jpeg);
  });
});
