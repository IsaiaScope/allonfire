/// <reference path="./types/heic-decode.d.ts" />
import sharp, { type Metadata, type Sharp } from "sharp";
import { MAX_INPUT_MEGAPIXELS, MAX_INPUT_PIXELS } from "./constants/limits";

/** Longest side an Image is stored at; the optimizer never needs more. */
export const MAX_IMAGE_DIMENSION = 2560;
/**
 * The stored file is the optimizer's source, so it keeps near-full quality:
 * AVIF 64 looks like JPEG 80, at roughly a third of WebP 90's size.
 */
const SOURCE_QUALITY = 64;
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

/** Not JPEG, PNG, WebP, AVIF or HEIC, or bytes that do not decode. */
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

// AVIF and HEIC are both `heif`: AV1 compression is AVIF, HEVC is HEIC.
const isHeic = ({ format, compression }: Metadata): boolean =>
  format === "heif" && compression === "hevc";

const isAccepted = (metadata: Metadata): boolean =>
  metadata.format === "jpeg" ||
  metadata.format === "png" ||
  metadata.format === "webp" ||
  (metadata.format === "heif" && metadata.compression === "av1") ||
  isHeic(metadata);

const SHARP_OPTIONS = {
  failOn: "truncated",
  limitInputPixels: MAX_INPUT_PIXELS,
} as const;

/**
 * The prebuilt sharp leaves HEVC out (a patent question), so an iPhone's HEIC
 * decodes in libheif's WebAssembly build and reaches sharp as raw pixels,
 * already upright. ponytail: the decode holds the event loop (about half a
 * second for a 12 MP photo) and drops the Display P3 profile (colours a touch
 * flatter); move it to a worker thread if uploads ever compete with traffic.
 */
async function decode(input: Buffer, metadata: Metadata): Promise<Sharp> {
  if (!isHeic(metadata)) {
    return sharp(input, SHARP_OPTIONS).rotate();
  }
  // Loaded on the first HEIC: its WebAssembly costs about 30 MB per process.
  const { default: decodeHeic } = await import("heic-decode");
  const { data, height, width } = await decodeHeic({ buffer: input });
  return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
    ...SHARP_OPTIONS,
    raw: { channels: 4, height, width },
  });
}

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
 * Upright, metadata-free AVIF capped at `MAX_IMAGE_DIMENSION`, plus its WebP
 * blur. `.rotate()` applies the EXIF orientation first; sharp then writes no
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
    // The source is decoded once. The blur comes from the stored AVIF, at
    // most 2560px, instead of a second full decode of the original.
    const { data, info } = await (await decode(input, metadata))
      .resize({
        fit: "inside",
        height: MAX_IMAGE_DIMENSION,
        width: MAX_IMAGE_DIMENSION,
        withoutEnlargement: true,
      })
      .avif({ quality: SOURCE_QUALITY })
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
