import type { UserDeps } from "@allonfire/auth/features/users/hono/utils/deps";
import { App, Role } from "@allonfire/database/enums";
import {
  type AccessUser,
  hasRoleIn,
} from "@allonfire/database/features/auth/access/access";
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
import type { LeftoverLog } from "@allonfire/storage/features/image/objects/delete-leftovers";

/**
 * The rule for managing Users: an Admin in the Back Office. Written as that
 * Role, not as the App's floor (`canEnterApp`), so lowering the Back
 * Office's `minRole` one day never opens Users to anyone else.
 *
 * Two checks apply it. Listing (`canListUsers`) reads the Session's User,
 * whose Memberships auth's `customSession` reads on every request, cookie
 * cache hits included: never behind. Adding, editing and deleting
 * (`canManageUsers`) also ask whether the Session is still there, which the
 * 5-minute cookie cache can hide: a new password deletes every other
 * Session, and from then on that one changes nobody, though it may still
 * list Users until its cookie copy runs out.
 */
export const isBackOfficeAdmin = (user: AccessUser): boolean =>
  hasRoleIn(user, App.BACK_OFFICE, Role.ADMIN);

/**
 * Who may add, edit or delete Users: `isBackOfficeAdmin` on the User read
 * from the database now, and their Session still there, which the Session's
 * cookie copy can outlive (a new password deleted it). The User's own read
 * repeats what `customSession` already read for this request.
 */
const canManageUsers = async ({
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
