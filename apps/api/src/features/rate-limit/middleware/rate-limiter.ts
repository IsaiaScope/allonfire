import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import { HTTP_HEADER, HTTP_STATUS } from "../../../shared/constants/http";
import { MS_PER_SECOND } from "../../../shared/constants/limits";
import { LOG_MESSAGE, SEPARATOR } from "../../../shared/constants/runtime";
import { outageLatch } from "../../../shared/utils/outage";
import { isProbe } from "../../../shared/utils/probe";
import { env } from "../../environment/environment";
import {
  ERROR_CODE,
  UNKNOWN_REQUEST_ID,
} from "../../errors/constants/error-codes";
import { problemResponse } from "../../errors/middleware/error-handler";
import { localeOf } from "../../i18n/middleware/locale-resolver";
import { translate } from "../../i18n/translate";
import { logger as defaultLogger } from "../../logger/logger";
import {
  RATE_LIMIT_COMMAND,
  RATE_LIMIT_HEADER_SPEC,
  RATE_LIMIT_INFO,
  rateLimitKey,
} from "../constants/limits";

export type RateLimitStore = {
  increment: (
    key: string
  ) => Promise<{ totalHits: number; resetTime: Date | undefined }>;
  decrement: (key: string) => Promise<void>;
  resetKey: (key: string) => Promise<void>;
};

// ponytail: fixed window — a client can burst up to 2x the limit across a
// window boundary. Upgrade to a sorted-set sliding window if that shows up
// in the logs.
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return count
`;

/**
 * `defineCommand` adds a method to the client at runtime that its published
 * types know nothing about. Declaring the shape once here is what lets the
 * call below type-check instead of carrying a `@ts-expect-error`.
 */
type RedisWithRateLimit = Redis & {
  [RATE_LIMIT_COMMAND]: (key: string, windowMs: string) => Promise<number>;
};

export function createRedisStore(
  redis: Redis,
  windowMs: number
): RateLimitStore {
  redis.defineCommand(RATE_LIMIT_COMMAND, {
    lua: INCREMENT_SCRIPT,
    numberOfKeys: 1,
  });

  const client = redis as RedisWithRateLimit;

  return {
    async decrement(key) {
      await redis.decr(rateLimitKey(key));
    },
    async increment(key) {
      const namespaced = rateLimitKey(key);
      const totalHits = await client[RATE_LIMIT_COMMAND](
        namespaced,
        String(windowMs)
      );
      const ttl = await redis.pttl(namespaced);
      return {
        resetTime: ttl > 0 ? new Date(Date.now() + ttl) : undefined,
        totalHits,
      };
    },
    async resetKey(key) {
      await redis.del(rateLimitKey(key));
    },
  };
}

export function clientKey(context: Context, trustedHops: number): string {
  if (trustedHops > 0) {
    const chain = (context.req.header(HTTP_HEADER.X_FORWARDED_FOR) ?? "")
      .split(SEPARATOR.LIST)
      .map((entry) => entry.trim())
      .filter(Boolean);

    // Take the entry the closest trusted proxy appended. Never the leftmost
    // value — that one is client-supplied and spoofable.
    const index = chain.length - trustedHops;
    const candidate = chain[index];
    if (candidate) {
      return candidate;
    }
  }

  return remoteAddress(context) ?? UNKNOWN_REQUEST_ID;
}

function remoteAddress(context: Context): string | undefined {
  try {
    return getConnInfo(context).remote.address;
  } catch {
    // `app.request()` has no underlying socket, and neither does a runtime
    // other than node-server. An unkeyable client shares one bucket.
    return undefined;
  }
}

/** A store that can't count reports zero hits, so the limiter lets the request through. */
const UNCOUNTED = { resetTime: undefined, totalHits: 0 };

/**
 * The limiter fails open: a Redis blip must not turn a working API into a
 * wall of 500s. Uncounted requests pass, and the outage is logged once, not
 * once per request.
 */
export function failOpen(
  store: RateLimitStore,
  logger: Logger = defaultLogger
): RateLimitStore {
  const latch = outageLatch(logger, {
    down: LOG_MESSAGE.RATE_LIMIT_STORE_DOWN,
    recovered: LOG_MESSAGE.RATE_LIMIT_STORE_RECOVERED,
  });

  const guard = async <T>(call: () => Promise<T>, fallback: T) => {
    try {
      const result = await call();
      latch.ok();
      return result;
    } catch (err) {
      latch.fail(err);
      return fallback;
    }
  };

  return {
    decrement: (key) => guard(() => store.decrement(key), undefined),
    increment: (key) => guard(() => store.increment(key), UNCOUNTED),
    resetKey: (key) => guard(() => store.resetKey(key), undefined),
  };
}

export function createRateLimiter(opts: {
  store: RateLimitStore;
  windowMs: number;
  limit: number;
  trustedHops: number;
}): MiddlewareHandler {
  const store = failOpen(opts.store);
  return rateLimiter({
    handler: (context) => {
      // The time left in the window, which is what the library already put in
      // `Retry-After`. The full window only when the store has no reset time.
      const resetTime = context.get(RATE_LIMIT_INFO)?.resetTime;
      const retryAfter = resetTime
        ? Math.max(
            0,
            Math.ceil((resetTime.getTime() - Date.now()) / MS_PER_SECOND)
          )
        : Math.ceil(opts.windowMs / MS_PER_SECOND);
      context.header(HTTP_HEADER.RETRY_AFTER, String(retryAfter));
      return problemResponse(context, {
        code: ERROR_CODE.RATE_LIMITED,
        detail: translate(ERROR_CODE.RATE_LIMITED, localeOf(context), {
          seconds: retryAfter,
        }),
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
      });
    },
    keyGenerator: (context) => clientKey(context, opts.trustedHops),
    limit: opts.limit,
    requestPropertyName: RATE_LIMIT_INFO,
    standardHeaders: RATE_LIMIT_HEADER_SPEC,
    store: store as never,
    windowMs: opts.windowMs,
  });
}

/** The app's limiter, tuned from env. Probes bypass it. */
export const rateLimit = (store: RateLimitStore): MiddlewareHandler => {
  const limiter = createRateLimiter({
    limit: env.RATE_LIMIT_MAX,
    store,
    trustedHops: env.TRUSTED_PROXY_HOPS,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
  });
  return (context, next) =>
    isProbe(context.req.path) ? next() : limiter(context, next);
};
