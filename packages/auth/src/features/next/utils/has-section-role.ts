import type { Role } from "@allonfire/database/enums";
import {
  accessUserFrom,
  hasRoleIn,
} from "@allonfire/database/features/auth/access/access";
import { nextAuthEnv } from "../../../environment/next-environment";
import type { Session } from "./auth-client";

/**
 * Whether the Session's User holds at least a Section's `minRole` in this
 * App (`AUTH_APP`, never named here): always when the Section names none,
 * never without a Session. The App's floor is `entersApp`'s; this is the
 * rung above it a Section can ask for.
 */
export const hasSectionRole = (
  session: Session | null,
  minRole: Role | undefined
): boolean =>
  minRole === undefined ||
  (session !== null &&
    hasRoleIn(accessUserFrom(session.user), nextAuthEnv.AUTH_APP, minRole));
