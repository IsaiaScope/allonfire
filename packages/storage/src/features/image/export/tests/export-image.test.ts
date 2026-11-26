// @module-tag unit

import sharp from "sharp";
import { ImageTooLargeError } from "../../prepare/prepare-image";
import {
  clearAvif,
  exifOf,
  firstPixelOf,
  legacyAvif,
  plainAvif,
  SOLID_SIZE,
  sizeOf,
} from "../../tests/exif-image";
import { JPEG_SIGNATURE, signatureOf } from "../../tests/jpeg-signature";
import { pngHeader } from "../../tests/png-header";
import { exportImage } from "../export-image";

describe("exportImage", () => {
  it("writes a JPEG", async () => {
    const out = await exportImage(await plainAvif());
    expect(signatureOf(out)).toEqual(JPEG_SIGNATURE);
    expect((await sharp(out).metadata()).format).toBe("jpeg");
  });

  it("keeps the stored size", async () => {
    expect(await sizeOf(await exportImage(await plainAvif()))).toEqual(
      SOLID_SIZE
    );
  });

  // JPEG has no transparency, and sharp's own answer to it is black.
  it("lays a see-through picture on white, never black", async () => {
    const pixel = await firstPixelOf(await exportImage(await clearAvif()));
    expect(Math.min(...pixel)).toBeGreaterThan(250);
  });

  it("drops the EXIF of a stored file that carries it", async () => {
    const source = await legacyAvif();
    // The fixture really holds the data this test is about.
    expect(await exifOf(source)).toBeDefined();
    expect(await exifOf(await exportImage(source))).toBeUndefined();
  });

  it("refuses a picture over the pixel limit from its header alone", async () => {
    await expect(exportImage(pngHeader(12_000, 9000))).rejects.toBeInstanceOf(
      ImageTooLargeError
    );
  });
});
