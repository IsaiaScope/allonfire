import type { Platform } from "@allonfire/database";
import sharp from "sharp";
import { PLATFORM_IMAGE_SPECS } from "./specs";

const MIN_QUALITY = 40;
const QUALITY_STEP = 10;
const INITIAL_QUALITY = 90;

export async function resizeAllForPlatform(
  images: Array<{ buffer: Buffer; mimeType: string }>,
  platform: Platform
): Promise<Array<{ buffer: Buffer; mimeType: string }>> {
  const results: Array<{ buffer: Buffer; mimeType: string }> = [];
  for (const img of images) {
    const resized = await resizeForPlatform(img.buffer, platform);
    results.push({ buffer: resized, mimeType: "image/jpeg" });
  }
  return results;
}

export async function resizeForPlatform(
  imageBuffer: Buffer,
  platform: Platform
): Promise<Buffer> {
  const spec = PLATFORM_IMAGE_SPECS[platform];

  if (!spec) {
    throw new Error(`No image spec defined for platform: ${platform}`);
  }

  const resizeOptions = {
    width: spec.maxWidth,
    height: spec.maxHeight,
    fit: "inside" as const,
    withoutEnlargement: true,
  };

  let quality = INITIAL_QUALITY;
  let result = await sharp(imageBuffer)
    .resize(resizeOptions)
    .jpeg({ quality })
    .toBuffer();

  const maxSizeBytes = spec.maxSizeKb * 1024;

  while (result.length > maxSizeBytes && quality > MIN_QUALITY) {
    quality -= QUALITY_STEP;
    result = await sharp(imageBuffer)
      .resize(resizeOptions)
      .jpeg({ quality })
      .toBuffer();
  }

  return result;
}
