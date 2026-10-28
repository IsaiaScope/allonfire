import { UNIT } from "@allonfire/core/shared/constants/units";
import type { UserDeps } from "../utils/deps";

const unexpected = (name: string) => () =>
  Promise.reject(new Error(`${name} must not be called`));

/**
 * The User module's deps for a test, every Host and package alike: nobody
 * may list or manage Users, no write is expected (each throws if called),
 * and Avatars are quiet (a link as it is, nothing to delete). Override what
 * the test is about.
 */
export const stubUserDeps = (overrides: Partial<UserDeps> = {}): UserDeps => ({
  avatarLink: (image) => image,
  avatarMaxBytes: UNIT.BYTES_PER_MIB,
  canListUsers: () => false,
  canManageUsers: () => Promise.resolve(false),
  createUser: unexpected("createUser"),
  deleteAvatars: () => Promise.resolve(),
  deleteUsers: unexpected("deleteUsers"),
  listUsers: unexpected("listUsers"),
  saveAvatar: unexpected("saveAvatar"),
  setUserImage: unexpected("setUserImage"),
  userImages: () => Promise.resolve([]),
  ...overrides,
});
