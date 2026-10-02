// @module-tag unit
import { crc32, deflateSync } from "node:zlib";
import sharp from "sharp";
import {
  ImageTooLargeError,
  MAX_IMAGE_DIMENSION,
  prepareImage,
  UnsupportedImageError,
} from "../prepare-image";

const RED = { b: 40, g: 40, r: 200 };
const BLUR_MAX_BYTES = 1024;

const jpeg = (width: number, height: number, orientation = 1) =>
  sharp({ create: { background: RED, channels: 3, height, width } })
    .jpeg()
    .withMetadata({ orientation })
    .withExif({ IFD0: { Copyright: "secret" } })
    .toBuffer();

const pngChunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** A 66-byte PNG whose header claims `width` x `height`: nothing to decode. */
const pngHeader = (width: number, height: number) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.alloc(1))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
};

describe("prepareImage", () => {
  it("refuses an image over 100 megapixels from its header alone", async () => {
    await expect(prepareImage(pngHeader(12_000, 9000))).rejects.toBeInstanceOf(
      ImageTooLargeError
    );
  });

  it("caps the longest side at 2560px and keeps the aspect ratio", async () => {
    const image = await prepareImage(await jpeg(4000, 2000));
    expect(image.width).toBe(MAX_IMAGE_DIMENSION);
    expect(image.height).toBe(1280);
    expect(image.bytes).toBe(image.buffer.length);
  });

  it("never enlarges a small image", async () => {
    const image = await prepareImage(await jpeg(800, 600));
    expect([image.width, image.height]).toEqual([800, 600]);
  });

  it("writes WebP without EXIF", async () => {
    const image = await prepareImage(await jpeg(800, 600));
    const meta = await sharp(image.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });

  it("turns a sideways phone photo upright before dropping its orientation", async () => {
    const image = await prepareImage(await jpeg(800, 600, 6));
    expect([image.width, image.height]).toEqual([600, 800]);
  });

  it("makes a tiny WebP data URL for the blur placeholder", async () => {
    const { blurDataUrl } = await prepareImage(await jpeg(800, 600));
    expect(blurDataUrl.startsWith("data:image/webp;base64,")).toBe(true);
    expect(blurDataUrl.length).toBeLessThan(BLUR_MAX_BYTES);
  });

  it("rejects a GIF", async () => {
    const gif = await sharp({
      create: { background: RED, channels: 3, height: 10, width: 10 },
    })
      .gif()
      .toBuffer();
    await expect(prepareImage(gif)).rejects.toBeInstanceOf(
      UnsupportedImageError
    );
  });

  it("rejects bytes that are not an image", async () => {
    await expect(
      prepareImage(Buffer.from("not an image"))
    ).rejects.toBeInstanceOf(UnsupportedImageError);
  });

  it("rejects a truncated JPEG", async () => {
    const whole = await jpeg(800, 600);
    await expect(
      prepareImage(whole.subarray(0, whole.length / 2))
    ).rejects.toBeInstanceOf(UnsupportedImageError);
  });
});
