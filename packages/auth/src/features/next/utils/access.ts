import {
  accessUserFrom,
  canEnterApp,
} from "@allonfire/database/features/auth/access/access";
import { nextAuthEnv } from "../../../environment/next-environment";

/** Whether a User, as the API sends it, is allowed into this App (`AUTH_APP`, `AUTH_MIN_ROLE`). */
export const canAccess = (user: { allowedApps: string[]; role: string }) =>
  canEnterApp(accessUserFrom(user), {
    app: nextAuthEnv.AUTH_APP,
    minRole: nextAuthEnv.AUTH_MIN_ROLE,
  });
