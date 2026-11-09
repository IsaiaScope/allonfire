import type { MailDriver } from "@allonfire/core/features/mail/constants/mail";
import type {
  MailDriverImpl,
  MailEndpoint,
  MailFetch,
  MailLogger,
  MailUsage,
} from "@allonfire/core/features/mail/types/mail";
import {
  type CacheRedis,
  cacheAside,
  type ForgetRedis,
  forgetCached,
} from "../../redis/utils/cache-aside";
import { usageBodySchema } from "../constants/schemas";
import { SERVICES } from "../constants/services";

type UsageReaderDeps = {
  drivers: Record<MailDriver, MailDriverImpl>;
  endpoint: (slot: number) => MailEndpoint | undefined;
  fetch: MailFetch;
  logger: Pick<MailLogger, "warn">;
  redis: CacheRedis;
  now?: () => Date;
};

const usageKey = (providerId: string) =>
  `${SERVICES.USAGE_CACHE.KEY_PREFIX}${providerId}`;

/**
 * Drops a provider's kept usage, so the next read asks the vendor: a send we
 * made moved the count. A cache that is down has nothing to drop.
 */
export const forgetUsage = (
  redis: ForgetRedis,
  providerId: string
): Promise<void> => forgetCached(redis, usageKey(providerId));

/**
 * What each provider's own API says it sent, for the Services page's rings:
 * kept in Redis for a few seconds, so a burst of reads asks the vendor once. A
 * provider that cannot say (no endpoint, refused, down) reads as null and is
 * logged, never thrown, and a null is not kept; a cache that is down only
 * means every read asks the provider.
 */
export const createUsageReader =
  (deps: UsageReaderDeps) =>
  (provider: {
    dailyLimit: number;
    id: string;
    slot: number;
  }): Promise<MailUsage | null> =>
    cacheAside({
      key: usageKey(provider.id),
      load: async () => {
        const endpoint = deps.endpoint(provider.slot);
        if (!endpoint) {
          deps.logger.warn({ provider }, SERVICES.LOG_MESSAGE.USAGE_UNREADABLE);
          return null;
        }
        try {
          const usage = await deps.drivers[endpoint.driver].usage(
            endpoint,
            (deps.now ?? (() => new Date()))(),
            deps.fetch,
            { dailyLimit: provider.dailyLimit }
          );
          if (!usage) {
            deps.logger.warn(
              { provider },
              SERVICES.LOG_MESSAGE.USAGE_UNREADABLE
            );
          }
          return usage;
        } catch (error) {
          deps.logger.warn(
            { err: error, provider },
            SERVICES.LOG_MESSAGE.USAGE_UNREADABLE
          );
          return null;
        }
      },
      redis: deps.redis,
      schema: usageBodySchema,
      ttlMs: SERVICES.USAGE_CACHE.TTL_MS,
    });
