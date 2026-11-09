import { providerEndpoint } from "@allonfire/core/environment/mail-environment";
import { sendMail } from "@allonfire/core/features/mail/utils/send-mail";
import { ServiceType } from "@allonfire/database/enums";
import { readUser } from "@allonfire/database/features/auth/user.service";
import {
  enabledProviders,
  findProvider,
  listServices,
  updateProvider,
  updateService,
} from "@allonfire/database/features/service/provider.service";
import { env } from "../../environment/environment";
import { logger } from "../logger/logger";
import { limitTestAddress, mailDeps, mailRedis } from "../mail/mail-deps";
import { canManageUsers } from "../users/user-deps";
import type { ServicesDeps } from "./utils/deps";
import { mailKeepAlive, runKeepAlives } from "./utils/keep-alive";
import { createProviderCheck } from "./utils/provider-check";
import { createUsageReader, forgetUsage } from "./utils/usage-reader";

const usageOf = createUsageReader({
  drivers: mailDeps.drivers,
  endpoint: mailDeps.endpoint,
  fetch: mailDeps.fetch,
  logger,
  redis: mailRedis,
});

const forgetProviderUsage = (providerId: string) =>
  forgetUsage(mailRedis, providerId);

const providerCheck = createProviderCheck({
  findProvider,
  forgetUsage: forgetProviderUsage,
  logger,
  recipient: env.API_KEEP_ALIVE_RECIPIENT,
  send: (message, options) => sendMail(message, options, mailDeps),
});

/** The Services routes on the real stack. */
export const servicesDeps: ServicesDeps = {
  canManage: canManageUsers,
  configured: (slot) => providerEndpoint(slot) !== undefined,
  emailOf: async (userId) => (await readUser(userId))?.email ?? null,
  forgetUsage: forgetProviderUsage,
  keepAlive: () =>
    runKeepAlives([
      mailKeepAlive({
        providers: () => enabledProviders(ServiceType.MAIL),
        send: providerCheck.keepAlive,
      }),
    ]),
  keepAliveToken: env.API_KEEP_ALIVE_TOKEN,
  listServices: () => listServices(),
  sendTest: providerCheck.test,
  takeAddress: (email) => limitTestAddress.take(email),
  updateProvider,
  updateService,
  usageOf,
};
