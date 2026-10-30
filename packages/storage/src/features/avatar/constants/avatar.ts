import { IMAGE } from "../../image/constants/image";

/** A User's Avatar: how it is stored and named. */
export const AVATAR = {
  /** The browser crops the picture to this square before sending it. */
  CROP_SIZE: 512,
  /** The most bytes a picture sent for an Avatar may hold: an Image's limit. */
  INPUT_BYTES: IMAGE.LIMIT.FILE_BYTES,
  /** Every Avatar's file starts with it: `avatar-<userId>-<uuid>.avif`. */
  KEY_PREFIX: "avatar-",
  /** Small and seen small: a little lower than an Image's source. */
  QUALITY: 60,
  /** The stored square's side. */
  SIZE: 256,
} as const;
