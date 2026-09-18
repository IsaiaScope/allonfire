import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import type { Redis } from "ioredis";
import {
  CONTENT_TYPE,
  HTTP_HEADER,
  HTTP_STATUS,
} from "../../../shared/constants/http";
import { MS_PER_SECOND } from "../../../shared/constants/limits";
import { SEPARATOR } from "../../../shared/constants/runtime";
import {
  ERROR_CODE,
  UNKNOWN_REQUEST_ID,
} from "../../errors/constants/error-codes";
import { codeForStatus, problem } from "../../errors/middleware/error-handler";
import { localeOf } from "../../i18n/middleware/locale-resolver";
import { translate } from "../../i18n/translate";
import {
  RATE_LIMIT_COMMAND,
  RATE_LIMIT_HEADER_SPEC,
  rateLimitKey,
} from "../constants/limits";

export type RateLimitStore = {
  increment(
    key: string
  ): Promise<{ totalHits: number; resetTime: Date | undefined }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
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
    numberOfKeys: 1,
    lua: INCREMENT_SCRIPT,
  });

  const client = redis as RedisWithRateLimit;

  return {
    async increment(key) {
      const namespaced = rateLimitKey(key);
      const totalHits = await client[RATE_LIMIT_COMMAND](
        namespaced,
        String(windowMs)
      );
      const ttl = await redis.pttl(namespaced);
      return {
        totalHits,
        resetTime: ttl > 0 ? new Date(Date.now() + ttl) : undefined,
      };
    },
    async decrement(key) {
      await redis.decr(rateLimitKey(key));
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

export function createRateLimiter(opts: {
  store: RateLimitStore;
  windowMs: number;
  limit: number;
  trustedHops: number;
}): MiddlewareHandler {
  return rateLimiter({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: RATE_LIMIT_HEADER_SPEC,
    keyGenerator: (context) => clientKey(context, opts.trustedHops),
    store: opts.store as never,
    handler: (context) => {
      const retryAfter = Math.ceil(opts.windowMs / MS_PER_SECOND);
      context.header(HTTP_HEADER.RETRY_AFTER, String(retryAfter));
      return context.json(
        problem(
          context,
          codeForStatus(HTTP_STATUS.TOO_MANY_REQUESTS),
          HTTP_STATUS.TOO_MANY_REQUESTS,
          translate(ERROR_CODE.RATE_LIMITED, localeOf(context), {
            seconds: retryAfter,
          })
        ),
        HTTP_STATUS.TOO_MANY_REQUESTS,
        { [HTTP_HEADER.CONTENT_TYPE]: CONTENT_TYPE.PROBLEM_JSON }
      );
    },
  });
}
