import { MAIL, type MailDriver } from "../constants/mail";
import type { MailDriverImpl } from "../types/mail";
import { bearerFlat } from "./drivers/bearer-flat";
import { keyHeaderEnvelope } from "./drivers/key-header-envelope";

/** Every API shape's driver, by the id an endpoint's `_DRIVER` names. */
export const MAIL_DRIVERS = {
  [MAIL.DRIVER.BEARER_FLAT]: bearerFlat,
  [MAIL.DRIVER.KEY_HEADER_ENVELOPE]: keyHeaderEnvelope,
} as const satisfies Record<MailDriver, MailDriverImpl>;
