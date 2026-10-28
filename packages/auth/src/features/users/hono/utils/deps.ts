import type { AccessUser } from "@allonfire/database/features/auth/access/access";
import type {
  createUser,
  deleteUsers,
  listUsers,
  setUserImage,
  UserPicture,
  userImages,
} from "@allonfire/database/features/auth/user.service";
import type { AvatarLink } from "../../../../shared/utils/linked-picture";

/** What the User module needs; the Host passes the real ones, tests stubs. */
export type UserDeps = {
  listUsers: typeof listUsers;
  /** Who may list Users: the Host decides, the module only asks. */
  canListUsers: (user: AccessUser) => boolean;
  createUser: typeof createUser;
  deleteUsers: typeof deleteUsers;
  /**
   * Who may add or delete Users, asked with the caller's id so the Host
   * reads them fresh: a cached Session may hold a Role the User no longer
   * has.
   */
  canManageUsers: (userId: string) => Promise<boolean>;
  setUserImage: typeof setUserImage;
  userImages: typeof userImages;
  /**
   * Processes and stores a picture as `userId`'s Avatar, answering the file's
   * name for `User.image` and its blur; a picture it cannot read throws a
   * `CodedError` (413 or 415).
   */
  saveAvatar: (userId: string, file: Buffer) => Promise<UserPicture>;
  /** What a browser gets for `User.image`: our file signed for now, anything else as it is. */
  avatarLink: AvatarLink;
  /** Deletes the stored Avatars among `images`, ignoring a provider's picture and none. */
  deleteAvatars: (images: readonly (string | null)[]) => Promise<void>;
  /** The most bytes an Avatar's request may carry. */
  avatarMaxBytes: number;
};
