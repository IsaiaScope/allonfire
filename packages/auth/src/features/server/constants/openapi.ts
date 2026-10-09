import { AUTH_ERROR_CODE } from "../../../shared/constants/errors";
import { APP_HEADER } from "../../../shared/constants/headers";

/**
 * What the docs say about the routes this module adds to Better Auth's. No
 * summary: Better Auth's generator drops it, so every auth route is titled by
 * its path.
 */
export const JOIN_APP_DOC = {
  APP_HEADER: "The App to join, by its enum key",
  DESCRIPTION: `Any signed-in User. Adds a Membership in the App \`${APP_HEADER}\` names, at the Role its Registration gives. An App closed to Registration, an unknown name or no header answers 403 \`${AUTH_ERROR_CODE.REGISTRATION_CLOSED}\`. A Membership already there keeps its Role, so joining never lowers one.`,
  OK: "The App joined",
} as const;
