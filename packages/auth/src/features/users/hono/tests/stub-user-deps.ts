import { UNIT } from "@allonfire/core/shared/constants/units";
import { App, Role } from "@allonfire/database/enums";
import type { UserRecord } from "@allonfire/database/features/auth/user.service";
import { sessionFor } from "../../../../shared/tests/stub-auth";
import { moduleTestHost } from "../../../../shared/tests/test-host";
import type { AuthSession } from "../../../../shared/types/auth";
import { USER } from "../../constants/users";
import { userRoutes } from "../routes/index";
import type { UserDeps } from "../utils/deps";

/** A Back Office Admin: who manages Users on `stubUserDeps`' `manageApp`. */
export const BACK_OFFICE_ADMIN = sessionFor({
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
});

/**
 * A stored User as the database answers it, on its first Version; override
 * the fields a test is about.
 */
export const userRow = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  email: "user-2@allonfire.test",
  emailVerified: true,
  id: "user-2",
  image: null,
  imageBlurDataUrl: null,
  memberships: [],
  name: null,
  version: "version-1",
  ...overrides,
});

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
  changed: () => Promise.resolve(),
  createUser: unexpected("createUser"),
  deleteAvatars: () => Promise.resolve(),
  deleteUsers: unexpected("deleteUsers"),
  listUsers: unexpected("listUsers"),
  manageApp: App.BACK_OFFICE,
  readUser: unexpected("readUser"),
  saveAvatar: unexpected("saveAvatar"),
  setUserImage: unexpected("setUserImage"),
  updateUser: unexpected("updateUser"),
  userImages: () => Promise.resolve([]),
  ...overrides,
});

/** The User module on `moduleTestHost`, at `USER.PATH.BASE`. */
export const userHost = (session: AuthSession | null, deps: UserDeps) =>
  moduleTestHost({ path: USER.PATH.BASE, routes: userRoutes(deps), session });
