import { DOMAIN } from "./users";

/**
 * The MAIL provider every Test database has on: the slot the e2e stack
 * points at its fake provider, and the sender the emails it sends carry.
 */
export const MAIL_PROVIDER = {
  fromAddress: `no-reply@${DOMAIN}`,
  slot: 0,
} as const;
