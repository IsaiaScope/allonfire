import { randomUUID } from "node:crypto";
import { IMAGE } from "../../image/constants/image";
import { IMAGE_SERVER } from "../../image-server/constants/image-server";
import { pictureLink, privateLinkExpiry } from "../../image-server/sign";
import { AVATAR } from "../constants/avatar";

/** A new file name for `userId`'s Avatar: a new one every time it changes. */
export const avatarKey = (userId: string): string =>
  `${AVATAR.KEY_PREFIX}${userId}-${randomUUID()}${IMAGE.FORMAT.EXTENSION}`;

/**
 * Our Avatar's file name exactly: the prefix, a User id (cuid, no hyphen or
 * dot), a uuid, `.avif`. Nothing else is ours to sign or delete.
 */
const AVATAR_KEY = new RegExp(
  `^${AVATAR.KEY_PREFIX}[A-Za-z0-9_]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\${IMAGE.FORMAT.EXTENSION}$`
);

/**
 * `User.image` as our own Avatar's file name, or null: a provider's
 * `https://` picture, an Image's file, anything else or nothing is not ours.
 */
export const avatarKeyOf = (image: string | null): string | null =>
  image && AVATAR_KEY.test(image) ? image : null;

/** A sign-in provider's picture: an `https://` address. */
const fromProvider = (image: string): boolean =>
  URL.canParse(image) && new URL(image).protocol === "https:";

/**
 * What a browser gets for `User.image`: our file as an hour-long signed link
 * at the Avatar's width, a provider's picture unchanged. Anything else (an
 * old path, a name only shaped like ours) gets none, so a page never asks
 * for a picture that cannot load and shows the initial at once.
 */
export const avatarLink = (image: string | null, now: Date): string | null => {
  const key = avatarKeyOf(image);
  if (key) {
    return pictureLink({
      expiresAt: privateLinkExpiry(now),
      key,
      width: IMAGE_SERVER.AVATAR_WIDTH,
    });
  }
  return image && fromProvider(image) ? image : null;
};
