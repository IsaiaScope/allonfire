import {
  accessUserFrom,
  canEnterApp,
} from "@allonfire/database/features/auth/access/access";
import { nextAuthEnv } from "../../../environment/next-environment";

/** Whether a User, as the API sends it, is allowed into this App (`AUTH_APP`, its row in `APP_SETTINGS`). */
export const canAccess = (user: {
  memberships: readonly { app: string; role: string }[];
}) => canEnterApp(accessUserFrom(user), nextAuthEnv.AUTH_APP);
