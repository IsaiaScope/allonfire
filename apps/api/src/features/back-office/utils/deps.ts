import type { UserDeps } from "@allonfire/auth/features/users/hono/utils/deps";
import type { OverviewDeps } from "../overview/utils/deps";

/** What the admin console's routes need of the stack; tests stub each. */
export type BackOfficeDeps = OverviewDeps & {
  /** The User module's list and who may read it. */
  users: UserDeps;
};
