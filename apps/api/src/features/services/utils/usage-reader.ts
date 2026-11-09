import type { MailDriver } from "@allonfire/core/features/mail/constants/mail";
import type {
  MailDriverImpl,
  MailEndpoint,
  MailFetch,
  MailLogger,
  MailUsage,
} from "@allonfire/core/features/mail/types/mail";
import {
  parseJsonWith,
  stringifyJson,
} from "@allonfire/core/shared/utils/json";
import { usageBodySchema } from "../constants/schemas";
import { SERVICES } from "../constants/services";

type UsageReaderDeps = {
  drivers: Record<MailDriver, MailDriverImpl>;
  endpoint: (slot: number) => MailEndpoint | undefined;
  fetch: MailFetch;
  logger: Pick<MailLogger, "warn">;
  /** The cache; read when used, so building the reader opens nothing. */
  redis: () => {
    get: (key: string) => Promise<string | null>;
    set: (
      key: string,
      value: string,
      mode: "PX",
      ms: number
    ) => Promise<unknown>;
  };
  now?: () => Date;
};

/** Reads the cache; anything missing, down or not a usage reads as a miss. */
const cachedUsage = async (
  deps: UsageReaderDeps,
  key: string
): Promise<MailUsage | null> => {
  try {
    const text = await deps.redis().get(key);
    return text === null ? null : parseJsonWith(text, usageBodySchema);
  } catch {
    return null;
  }
};

const usageKey = (providerId: string) =>
  `${SERVICES.USAGE_CACHE.KEY_PREFIX}${providerId}`;

/**
 * Drops a provider's kept usage, so the next read asks the vendor: a send we
 * made moved the count. A cache that is down has nothing to drop.
 */
export const forgetUsage = async (
  redis: () => { del: (key: string) => Promise<unknown> },
  providerId: string
): Promise<void> => {
  try {
    await redis().del(usageKey(providerId));
  } catch {
    // Down, the next read asks the vendor anyway.
  }
};

/**
 * What each provider's own API says it sent, for the Services page's rings:
 * kept in Redis for a few seconds, so a burst of reads asks the vendor once. A
 * provider that cannot say (no endpoint, refused, down) reads as null and is
 * logged, never thrown, and a null is not kept; a cache that is down only
 * means every read asks the provider.
 */
export const createUsageReader =
  (deps: UsageReaderDeps) =>
  async (provider: {
    dailyLimit: number;
    id: string;
    slot: number;
  }): Promise<MailUsage | null> => {
    const key = usageKey(provider.id);
    const kept = await cachedUsage(deps, key);
    if (kept) {
      return kept;
    }
    const endpoint = deps.endpoint(provider.slot);
    if (!endpoint) {
      deps.logger.warn({ provider }, SERVICES.LOG_MESSAGE.USAGE_UNREADABLE);
      return null;
    }
    let usage: MailUsage | null;
    try {
      usage = await deps.drivers[endpoint.driver].usage(
        endpoint,
        (deps.now ?? (() => new Date()))(),
        deps.fetch,
        { dailyLimit: provider.dailyLimit }
      );
    } catch (error) {
      deps.logger.warn(
        { err: error, provider },
        SERVICES.LOG_MESSAGE.USAGE_UNREADABLE
      );
      return null;
    }
    if (!usage) {
      deps.logger.warn({ provider }, SERVICES.LOG_MESSAGE.USAGE_UNREADABLE);
      return null;
    }
    try {
      await deps
        .redis()
        .set(key, stringifyJson(usage), "PX", SERVICES.USAGE_CACHE.TTL_MS);
    } catch {
      // The cache is only a saving: a read it could not keep still answers.
    }
    return usage;
  };
