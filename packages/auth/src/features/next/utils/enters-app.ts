import {
  accessUserFrom,
  canEnterApp,
} from "@allonfire/database/features/auth/access/access";
import { nextAuthEnv } from "../../../environment/next-environment";
import type { Session } from "./auth-client";

/** Whether this App (`AUTH_APP`, its row in `ACCESS.APP_SETTINGS`) lets
 *  the Session's User in. */
export const entersApp = (session: Session | null): session is Session =>
  session !== null &&
  canEnterApp(accessUserFrom(session.user), nextAuthEnv.AUTH_APP);
