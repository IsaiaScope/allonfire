import { decode } from "blurhash";

const WIDTH = 32;
const HEIGHT = 32;

/**
 * Decode a blurhash string to a small base64 BMP data URL.
 * Suitable for Next.js Image's blurDataURL prop.
 */
export function blurHashToDataURL(hash: string): string {
  const pixels = decode(hash, WIDTH, HEIGHT);
  const bmp = encodeBMP(pixels, WIDTH, HEIGHT);
  const base64 = Buffer.from(bmp).toString("base64");
  return `data:image/bmp;base64,${base64}`;
}

function encodeBMP(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = new Uint8Array(fileSize);
  const view = new DataView(buffer.buffer);

  // BMP header
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true); // pixel data offset

  // DIB header
  view.setUint32(14, 40, true); // header size
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true); // negative = top-down
  view.setUint16(26, 1, true); // color planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(34, pixelArraySize, true);

  // Pixel data (BGR)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = 54 + y * rowSize + x * 3;
      buffer[dstIdx] = pixels[srcIdx + 2] ?? 0; // B
      buffer[dstIdx + 1] = pixels[srcIdx + 1] ?? 0; // G
      buffer[dstIdx + 2] = pixels[srcIdx] ?? 0; // R
    }
  }

  return buffer;
}
