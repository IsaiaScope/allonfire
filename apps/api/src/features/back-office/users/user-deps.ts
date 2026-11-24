import type { UserDeps } from "@allonfire/auth/features/users/hono/utils/deps";
import { App } from "@allonfire/database/enums";
import { isBackOfficeAdmin } from "@allonfire/database/features/auth/access/access";
import {
  createUser,
  deleteUsers,
  listUsers,
  readUser,
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
import { adminOf } from "../../../shared/utils/admin-of";
import { forgetBuckets } from "../overview/storage/buckets";

/** The User module on the real stack. */
export const userDeps = (log: LeftoverLog): UserDeps => ({
  avatarLink,
  avatarMaxBytes: AVATAR.INPUT_BYTES,
  // The Session's User, its Memberships read for this request.
  canListUsers: isBackOfficeAdmin,
  // Added, edited or deleted by a Back Office Admin, read fresh on a live
  // Session. Listing (`canListUsers`) needs only the Session's User.
  canManageUsers: adminOf(App.BACK_OFFICE),
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
