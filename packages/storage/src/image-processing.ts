import { encode } from "blurhash";
import sharp from "sharp";

const FULL_MAX_DIMENSION = 1600;
const THUMBNAIL_WIDTH = 400;
const FULL_QUALITY = 85;
const THUMBNAIL_QUALITY = 80;
const BLURHASH_X = 4;
const BLURHASH_Y = 3;

export type ProcessedPhoto = {
  full: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
  blurHash: string;
};

export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  const source = sharp(input).rotate();

  const [{ data: full, info }, thumbnail] = await Promise.all([
    source
      .clone()
      .resize({
        width: FULL_MAX_DIMENSION,
        height: FULL_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: FULL_QUALITY })
      .toBuffer({ resolveWithObject: true }),
    source
      .clone()
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer(),
  ]);

  const { width, height } = info;

  const blurHash = await generateBlurHash(thumbnail);

  return { full, thumbnail, width, height, blurHash };
}

async function generateBlurHash(thumbnailBuffer: Buffer): Promise<string> {
  const { data, info } = await sharp(thumbnailBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  return encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    BLURHASH_X,
    BLURHASH_Y
  );
}
