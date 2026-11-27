import sharp from "sharp";

/** The pixel size of every picture made here. */
export const SOLID_SIZE = { height: 48, width: 64 } as const;
const BACKGROUND = { b: 40, g: 40, r: 200 };

const solid = () =>
  sharp({ create: { background: BACKGROUND, channels: 3, ...SOLID_SIZE } });

/** A small stored-style AVIF without metadata. */
export const plainAvif = (): Promise<Buffer> => solid().avif().toBuffer();

/**
 * A small AVIF carrying EXIF, as a legacy object written without
 * `prepare-image` could: what an Export must never pass on.
 */
export const legacyAvif = (): Promise<Buffer> =>
  solid()
    .withExif({ IFD0: { Copyright: "secret" } })
    .avif()
    .toBuffer();

/** A stored-style AVIF that is see-through all over, white underneath. */
export const clearAvif = (): Promise<Buffer> =>
  sharp({
    create: {
      background: { alpha: 0, b: 255, g: 255, r: 255 },
      channels: 4,
      ...SOLID_SIZE,
    },
  })
    .avif()
    .toBuffer();

/** The red, green and blue of `image`'s first pixel. */
export const firstPixelOf = async (image: Buffer): Promise<number[]> => [
  ...(await sharp(image).raw().toBuffer()).subarray(0, 3),
];

/** The EXIF block `image` carries, or `undefined` when it holds none. */
export const exifOf = async (image: Buffer): Promise<Buffer | undefined> =>
  (await sharp(image).metadata()).exif;

/** The pixel size of `image`, from its header. */
export const sizeOf = async (image: Buffer) => {
  const { height, width } = await sharp(image).metadata();
  return { height, width };
};
