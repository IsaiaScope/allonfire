import { providerEndpoint } from "@allonfire/core/environment/mail-environment";
import type { MailDeps } from "@allonfire/core/features/mail/types/mail";
import { MAIL_DRIVERS } from "@allonfire/core/features/mail/utils/drivers";
import { sendMail } from "@allonfire/core/features/mail/utils/send-mail";
import { env } from "../../environment/environment";
import { logger } from "../logger/logger";
import { createRedis } from "../redis/redis";
import { EMAIL } from "./constants/email";
import { databaseMailStore } from "./database-store";
import { createAddressLimit } from "./utils/address-limit";
import { createAuthMail } from "./utils/auth-mail";

/** The MAIL Service on the real stack: the providers in Postgres, their endpoints in the env. */
export const mailDeps: MailDeps = {
  drivers: MAIL_DRIVERS,
  endpoint: (slot) => providerEndpoint(slot),
  fetch,
  logger,
  store: databaseMailStore,
};

// Its own client, connecting at import, so the first email finds it ready.
const limitRedis = createRedis(env.API_REDIS_URL);

/** Closes the per-address limit's Redis client, at shutdown. */
export const closeMailRedis = async () => {
  await limitRedis.quit();
};

/** The Redis client the per-address limit and the usage cache share. */
export const mailRedis = () => limitRedis;

/** Five emails per address in any rolling hour, whichever route asks. */
const limitAddress = createAddressLimit(() => limitRedis);

/** An Admin's provider test: five per address in any rolling hour too, but a count of its own. */
export const limitTestAddress = createAddressLimit(
  () => limitRedis,
  EMAIL.ADDRESS_LIMIT.TEST_KEY_PREFIX
);

/** The auth emails on the real stack. */
export const authMail = createAuthMail({
  limit: limitAddress,
  logger,
  send: (message, purpose) => sendMail(message, { purpose }, mailDeps),
});
