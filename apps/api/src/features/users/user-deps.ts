import type { UserDeps } from "@allonfire/auth/features/users/hono/utils/deps";
import { App } from "@allonfire/database/enums";
import { isBackOfficeAdmin } from "@allonfire/database/features/auth/access/access";
import {
  accessUserById,
  createUser,
  deleteUsers,
  listUsers,
  readUser,
  sessionAlive,
  setUserImage,
  updateUser,
  userImages,
} from "@allonfire/database/features/auth/user.service";
import { AVATAR } from "@allonfire/storage/features/avatar/constants/avatar";
import {
  deleteAvatarsWith,
  saveAvatar,
} from "@allonfire/storage/features/avatar/objects/avatar-objects";
import { avatarLink } from "@allonfire/storage/features/avatar/utils/avatar-key";
import type { LeftoverLog } from "@allonfire/storage/features/image/objects/utils/delete-leftovers";
import { forgetBuckets } from "../storage-usage/buckets";

/**
 * Who may add, edit or delete Users: `isBackOfficeAdmin` on the User read
 * from the database now, and their Session still there, which the Session's
 * cookie copy can outlive (a new password deleted it, and the 5-minute cookie
 * cache can hide that). Listing (`canListUsers`) needs only the Session's
 * User, whose Memberships `customSession` reads on every request. The User's
 * own read repeats what `customSession` already read for this request.
 */
export const canManageUsers = async ({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}): Promise<boolean> => {
  const [user, alive] = await Promise.all([
    accessUserById(userId),
    sessionAlive(sessionId),
  ]);
  return alive && user !== null && isBackOfficeAdmin(user);
};

/** The User module on the real stack. */
export const userDeps = (log: LeftoverLog): UserDeps => ({
  avatarLink,
  avatarMaxBytes: AVATAR.INPUT_BYTES,
  // The Session's User, its Memberships read for this request.
  canListUsers: isBackOfficeAdmin,
  canManageUsers,
  // An Avatar or a deleted User moves the bucket's total.
  changed: forgetBuckets,
  createUser,
  deleteAvatars: deleteAvatarsWith(log),
  deleteUsers,
  listUsers,
  // The App isBackOfficeAdmin checks: nobody changes their own Role there.
  manageApp: App.BACK_OFFICE,
  readUser,
  saveAvatar,
  setUserImage,
  updateUser,
  userImages,
});
