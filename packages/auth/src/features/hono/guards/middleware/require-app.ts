import {
  type AppPolicy,
  canEnterApp,
} from "@allonfire/database/features/auth/access/access";
import { guard } from "../utils/guard";

/**
 * 403 unless the User is allowed into the App (`canEnterApp`). The host declares
 * the policy: `requireApp({ app: AllowedApp.LAURA, minRole: Role.VIEWER })`.
 */
export const requireApp = (policy: AppPolicy) =>
  guard(({ user }) => canEnterApp(user, policy));
