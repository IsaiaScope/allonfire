import type { AccessUser } from "@allonfire/database/features/auth/access/access";
import type {
  createUser,
  deleteUsers,
  listUsers,
} from "@allonfire/database/features/auth/user.service";

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
};
