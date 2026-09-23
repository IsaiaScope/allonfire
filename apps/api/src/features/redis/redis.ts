import type { EventEmitter } from "node:events";
import type { Redis as RedisClient } from "ioredis";
import { Redis } from "ioredis";
import type { Logger } from "pino";
import { REDIS_RETRY } from "../../shared/constants/limits";
import {
  LOG_MESSAGE,
  REDIS_EVENT,
  REDIS_STATUS_READY,
} from "../../shared/constants/runtime";
import { outageLatch } from "../../shared/utils/outage";
import { logger as defaultLogger } from "../logger/logger";

/**
 * With no `error` listener, ioredis prints "Unhandled error event" to stderr on
 * every reconnect attempt: unstructured, and never shipped. This logs each
 * outage once, and its end.
 */
export function watchRedis(
  redis: EventEmitter,
  logger: Logger = defaultLogger
): void {
  const latch = outageLatch(logger, {
    down: LOG_MESSAGE.REDIS_DOWN,
    recovered: LOG_MESSAGE.REDIS_RECOVERED,
  });
  redis.on(REDIS_EVENT.ERROR, latch.fail);
  redis.on(REDIS_EVENT.READY, latch.ok);
}

export function createRedis(url: string): RedisClient {
  const redis = new Redis(url, {
    enableOfflineQueue: false,
    // Defaults retry forever and queue commands while disconnected, which
    // turns a Redis outage into hanging requests instead of fast failures.
    maxRetriesPerRequest: REDIS_RETRY.MAX_PER_REQUEST,
    retryStrategy: (times) =>
      Math.min(
        times * REDIS_RETRY.BACKOFF_STEP_MS,
        REDIS_RETRY.BACKOFF_CEILING_MS
      ),
  });
  watchRedis(redis);
  return redis;
}

/**
 * With `enableOfflineQueue: false` a command issued before the socket is
 * writable throws rather than waiting, so anything that talks to Redis at
 * startup has to wait for `ready` first.
 */
export function awaitReady(redis: RedisClient): Promise<void> {
  if (redis.status === REDIS_STATUS_READY) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      redis.off(REDIS_EVENT.ERROR, onError);
      resolve();
    };
    const onError = (err: Error) => {
      redis.off(REDIS_EVENT.READY, onReady);
      reject(err);
    };
    redis.once(REDIS_EVENT.READY, onReady);
    redis.once(REDIS_EVENT.ERROR, onError);
  });
}
