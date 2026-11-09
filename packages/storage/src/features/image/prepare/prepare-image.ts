/// <reference path="./types/heic-decode.d.ts" />

import sharp, {
  type Metadata,
  type OutputInfo,
  type ResizeOptions,
  type Sharp,
} from "sharp";
import { IMAGE } from "../constants/image";

export type PreparedImage = {
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
  /** `IMAGE.BLUR.DATA_URL_PREFIX` and the WebP, ready for next/image's `blurDataURL`. */
  blurDataUrl: string;
};

/** Not JPEG, PNG, WebP, AVIF or HEIC, or bytes that do not decode. */
export class UnsupportedImageError extends Error {
  constructor(message = "Unsupported image", options?: ErrorOptions) {
    super(message, options);
    this.name = "UnsupportedImageError";
  }
}

/** More than `IMAGE.LIMIT.INPUT_PIXELS`, read from the header before any decode. */
export class ImageTooLargeError extends Error {
  constructor() {
    super(`Image over ${IMAGE.LIMIT.INPUT_MEGAPIXELS} megapixels`);
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
  limitInputPixels: IMAGE.LIMIT.INPUT_PIXELS,
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
 * `input` checked and ready to transform: an accepted format (else
 * `UnsupportedImageError`) within `IMAGE.LIMIT.INPUT_PIXELS` (else
 * `ImageTooLargeError`), read from the header before any decode, upright
 * (`.rotate()` applies the EXIF orientation; sharp writes no metadata unless
 * asked, so GPS and camera data never reach the bucket). An Image and an
 * Avatar both start here.
 */
export async function decodeUpright(input: Buffer): Promise<Sharp> {
  const metadata = await readMetadata(input);
  if (!isAccepted(metadata)) {
    throw new UnsupportedImageError();
  }
  if (
    (metadata.width ?? 0) * (metadata.height ?? 0) >
    IMAGE.LIMIT.INPUT_PIXELS
  ) {
    throw new ImageTooLargeError();
  }
  return decode(input, metadata);
}

/**
 * A stored picture's blur, what next/image shows while it loads: a tiny WebP
 * as a data URL, ready for `blurDataURL`. Made from the stored file, already
 * small, instead of the original.
 */
export const blurDataUrlOf = async (stored: Buffer): Promise<string> => {
  const blur = await sharp(stored)
    .resize({ width: IMAGE.BLUR.WIDTH })
    .webp({ quality: IMAGE.BLUR.QUALITY })
    .toBuffer();
  return `${IMAGE.BLUR.DATA_URL_PREFIX}${blur.toString("base64")}`;
};

/**
 * `image` resized and encoded as metadata-free AVIF. sharp decodes lazily, so
 * a picture whose header reads but whose body is broken (a truncated JPEG)
 * fails only here: any failure is the client's bytes, `UnsupportedImageError`.
 */
export async function encodeAvif(
  image: Sharp,
  { quality, resize }: { quality: number; resize: ResizeOptions }
): Promise<{ data: Buffer; info: OutputInfo }> {
  try {
    return await image
      .resize(resize)
      .avif({ quality })
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    throw new UnsupportedImageError("Image failed to decode", {
      cause: error,
    });
  }
}

/**
 * Upright, metadata-free AVIF capped at `IMAGE.LIMIT.DIMENSION`, plus its WebP
 * blur.
 */
export async function prepareImage(input: Buffer): Promise<PreparedImage> {
  // The source is decoded once. The blur comes from the stored AVIF, at most
  // 2560px, instead of a second full decode of the original.
  const { data, info } = await encodeAvif(await decodeUpright(input), {
    quality: IMAGE.FORMAT.QUALITY,
    resize: {
      fit: "inside",
      height: IMAGE.LIMIT.DIMENSION,
      width: IMAGE.LIMIT.DIMENSION,
      withoutEnlargement: true,
    },
  });
  return {
    blurDataUrl: await blurDataUrlOf(data),
    buffer: data,
    bytes: info.size,
    height: info.height,
    width: info.width,
  };
}
