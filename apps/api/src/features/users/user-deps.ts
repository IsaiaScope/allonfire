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
import type { LeftoverLog } from "@allonfire/storage/features/image/objects/delete-leftovers";
import { avatarLinkNow } from "../../shared/utils/avatar-link";

/**
 * The rule for managing Users: an Admin in the Back Office. Written as that
 * Role, not as the App's floor (`canEnterApp`), so lowering the Back
 * Office's `minRole` one day never opens Users to anyone else.
 *
 * Two checks apply it, alike but for how fresh the User they read is:
 * - listing (`canListUsers`) reads the Session's User, which Better Auth
 *   keeps in a signed cookie for `AUTH.SESSION.COOKIE_CACHE_MAX_AGE_S`
 *   (5 minutes) before asking the database again: no query, but up to 5
 *   minutes behind;
 * - adding, editing and deleting (`canManageUsers`) read the User and their
 *   Session from the database at the time of the request: two queries side
 *   by side, never behind.
 * Say an Admin's Role is taken away at 10:00. Until their cookie copy runs
 * out, at 10:05 at most, they can still see the list; from 10:00 they can
 * no longer add, edit or delete anyone. Seeing the list a few minutes too long is
 * a small risk; changing Users with a Role already gone cannot be undone,
 * so only those requests pay for the queries.
 */
export const isBackOfficeAdmin = (user: AccessUser): boolean =>
  hasRoleIn(user, App.BACK_OFFICE, Role.ADMIN);

/**
 * Who may add, edit or delete Users: `isBackOfficeAdmin` on the User read
 * from the database now, and their Session still there, never the Session's
 * cookie copy, which may still hold a Role since taken away or outlive a
 * Session a new password deleted.
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
  avatarLink: avatarLinkNow,
  avatarMaxBytes: AVATAR.INPUT_BYTES,
  // The Session's User: cheap, up to 5 minutes behind (see isBackOfficeAdmin).
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
