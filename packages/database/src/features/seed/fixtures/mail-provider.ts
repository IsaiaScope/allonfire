import { DOMAIN } from "./users";

/**
 * The MAIL providers every Test database has on: the slots the e2e stack
 * points at its fake provider (two, so a send can fail over), and the sender
 * the emails they send carry.
 */
export const MAIL_PROVIDER = {
  fromAddress: `no-reply@${DOMAIN}`,
  slots: [0, 1],
} as const;
