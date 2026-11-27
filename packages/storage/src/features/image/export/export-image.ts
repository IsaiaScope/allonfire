import { IMAGE } from "../constants/image";
import { decodeUpright } from "../prepare/prepare-image";

/**
 * The Export of a stored Image (ADR 0036): `source` decoded at its stored
 * size and written as a JPEG. sharp writes no metadata unless asked, so the
 * JPEG holds no location or camera data even when a legacy stored file does.
 * What is see-through is laid on `IMAGE.EXPORT.BACKGROUND`.
 * Throws `ImageTooLargeError` above `IMAGE.LIMIT.INPUT.PIXELS`, read from the
 * header before any decode.
 */
export const exportImage = async (source: Buffer): Promise<Buffer> =>
  (await decodeUpright(source))
    .flatten({ background: IMAGE.EXPORT.BACKGROUND })
    .jpeg({ quality: IMAGE.EXPORT.QUALITY })
    .toBuffer();
