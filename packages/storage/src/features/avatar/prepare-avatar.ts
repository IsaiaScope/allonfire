import {
  blurDataUrlOf,
  decodeUpright,
  encodeAvif,
} from "../image/prepare/prepare-image";
import { AVATAR } from "./constants/avatar";

/** An Avatar ready to store: its file, and the blur shown while it loads. */
export type PreparedAvatar = { buffer: Buffer; blurDataUrl: string };

/**
 * A picture as an Avatar: its centre square at `AVATAR.SIZE`, upright,
 * metadata-free AVIF, with its blur as an Image has (`blurDataUrlOf`). Throws
 * `UnsupportedImageError` or `ImageTooLargeError` as an Image's upload does
 * (`asImageError` answers them).
 */
export const prepareAvatar = async (input: Buffer): Promise<PreparedAvatar> => {
  const { data } = await encodeAvif(await decodeUpright(input), {
    quality: AVATAR.QUALITY,
    resize: {
      fit: "cover",
      height: AVATAR.SIZE,
      position: "centre",
      width: AVATAR.SIZE,
    },
  });
  return { blurDataUrl: await blurDataUrlOf(data), buffer: data };
};
