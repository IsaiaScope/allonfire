import { nextAuthEnv } from "../../../environment/next-environment";
import { allowedAppsFrom, mayEnter, roleFrom } from "../../access/access";

/** Whether a User, as the API sends it, may enter this App (`AUTH_APP`). */
export const canAccess = (user: { allowedApps: string[]; role: string }) =>
  mayEnter(
    {
      allowedApps: allowedAppsFrom(user.allowedApps),
      role: roleFrom(user.role),
    },
    nextAuthEnv.AUTH_APP
  );
