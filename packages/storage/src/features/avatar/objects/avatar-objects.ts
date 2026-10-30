import type { UserPicture } from "@allonfire/database/features/auth/user.service";
import { asImageError } from "../../image/hono/utils/errors";
import {
  deleteLeftovers,
  type LeftoverLog,
} from "../../image/objects/delete-leftovers";
import {
  deleteImageObjects,
  putImageObject,
} from "../../image/objects/image-objects";
import { prepareAvatar } from "../prepare-avatar";
import { avatarKey, avatarKeyOf } from "../utils/avatar-key";

/**
 * A picture processed and stored as `userId`'s Avatar under a new name, in
 * the pictures' bucket beside the Images; it answers the name for
 * `User.image` and the blur for `User.imageBlurDataUrl`. A picture it cannot
 * read is the client's 413 or 415.
 */
export const saveAvatar = async (
  userId: string,
  file: Buffer
): Promise<UserPicture> => {
  const image = avatarKey(userId);
  const { blurDataUrl, buffer } = await prepareAvatar(file).catch(asImageError);
  await putImageObject(image, buffer);
  return { image, imageBlurDataUrl: blurDataUrl };
};

const LOG_MESSAGE = {
  DELETE_FAILED: "avatar file delete failed",
} as const;

/**
 * Deletes our own Avatars' files among `images`; a provider's picture and
 * none are left alone. It runs after the change it follows is written, so it
 * never fails that change: a file left behind is invisible (no row names it)
 * and logged.
 */
export const deleteAvatarsWith =
  (log: LeftoverLog) =>
  (images: readonly (string | null)[]): Promise<void> =>
    deleteLeftovers({
      keys: images.flatMap((image) => {
        const key = avatarKeyOf(image);
        return key ? [key] : [];
      }),
      log,
      reason: LOG_MESSAGE.DELETE_FAILED,
      remove: deleteImageObjects,
    });
