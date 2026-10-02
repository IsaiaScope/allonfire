import sharp, { type Metadata } from "sharp";
import { MAX_INPUT_MEGAPIXELS, MAX_INPUT_PIXELS } from "./constants/limits";

/** Longest side an Image is stored at; the optimizer never needs more. */
export const MAX_IMAGE_DIMENSION = 2560;
/** The stored file is the optimizer's source, so it keeps near-full quality. */
const SOURCE_QUALITY = 90;
/** Next recommends a placeholder of 10px or less; 16px keeps a little shape. */
const BLUR_WIDTH = 16;
const BLUR_QUALITY = 50;

export type PreparedImage = {
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
  /** `data:image/webp;base64,...`, ready for next/image's `blurDataURL`. */
  blurDataUrl: string;
};

/** Not JPEG, PNG, WebP or AVIF, or bytes sharp cannot decode. */
export class UnsupportedImageError extends Error {
  constructor(message = "Unsupported image", options?: ErrorOptions) {
    super(message, options);
    this.name = "UnsupportedImageError";
  }
}

/** More than `MAX_INPUT_PIXELS`, read from the header before any decode. */
export class ImageTooLargeError extends Error {
  constructor() {
    super(`Image over ${MAX_INPUT_MEGAPIXELS} megapixels`);
    this.name = "ImageTooLargeError";
  }
}

// AVIF and HEIC are both `heif`; only AV1 compression is AVIF, and the
// prebuilt sharp cannot decode HEIC anyway.
const isAccepted = ({ format, compression }: Metadata): boolean =>
  format === "jpeg" ||
  format === "png" ||
  format === "webp" ||
  (format === "heif" && compression === "av1");

/** The header only; bytes sharp cannot read at all are the client's error. */
async function readMetadata(input: Buffer): Promise<Metadata> {
  try {
    return await sharp(input).metadata();
  } catch (error) {
    throw new UnsupportedImageError("Unreadable image header", {
      cause: error,
    });
  }
}

/**
 * Upright, metadata-free WebP capped at `MAX_IMAGE_DIMENSION`, plus its blur.
 * `.rotate()` applies the EXIF orientation first; sharp then writes no
 * metadata unless asked, so GPS and camera data never reach the bucket.
 */
export async function prepareImage(input: Buffer): Promise<PreparedImage> {
  const metadata = await readMetadata(input);
  if (!isAccepted(metadata)) {
    throw new UnsupportedImageError();
  }
  if ((metadata.width ?? 0) * (metadata.height ?? 0) > MAX_INPUT_PIXELS) {
    throw new ImageTooLargeError();
  }
  try {
    // The source is decoded once. The blur comes from the stored WebP, at
    // most 2560px, instead of a second full decode of the original.
    const { data, info } = await sharp(input, {
      failOn: "truncated",
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        fit: "inside",
        height: MAX_IMAGE_DIMENSION,
        width: MAX_IMAGE_DIMENSION,
        withoutEnlargement: true,
      })
      .webp({ quality: SOURCE_QUALITY })
      .toBuffer({ resolveWithObject: true });
    const blur = await sharp(data)
      .resize({ width: BLUR_WIDTH })
      .webp({ quality: BLUR_QUALITY })
      .toBuffer();
    return {
      blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
      buffer: data,
      bytes: info.size,
      height: info.height,
      width: info.width,
    };
  } catch (error) {
    throw new UnsupportedImageError("Image failed to decode", {
      cause: error,
    });
  }
}
