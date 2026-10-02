import { canEnterApp } from "@allonfire/auth/features/access/access";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { AllowedApp } from "@allonfire/database/enums";
import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import { CodedError } from "@allonfire/utils/helpers/coded-error";
import { IMAGE_ERROR_CODE } from "../constants/errors";

/** An ALL Image is for every signed-in User; any other, for that App's Users. */
export const canSee = (session: AuthSession, app: AllowedApp): boolean =>
  app === AllowedApp.ALL || canEnterApp(session.user.allowedApps, app);

/**
 * `requireApp` is fixed when mounted; here the App comes from the query, so
 * the same check runs per request and throws the host's 403.
 */
export function assertCanSee(session: AuthSession, app: AllowedApp): void {
  if (!canSee(session, app)) {
    throw new CodedError({
      code: IMAGE_ERROR_CODE.FORBIDDEN,
      status: HTTP_STATUS.FORBIDDEN,
    });
  }
}
