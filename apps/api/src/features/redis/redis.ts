import type { Redis as RedisClient } from "ioredis";
import { Redis } from "ioredis";
import { REDIS_RETRY } from "../../shared/constants/limits";
import {
  REDIS_EVENT,
  REDIS_STATUS_READY,
} from "../../shared/constants/runtime";

export function createRedis(url: string): RedisClient {
  return new Redis(url, {
    // Defaults retry forever and queue commands while disconnected, which
    // turns a Redis outage into hanging requests instead of fast failures.
    maxRetriesPerRequest: REDIS_RETRY.MAX_PER_REQUEST,
    enableOfflineQueue: false,
    retryStrategy: (times) =>
      Math.min(
        times * REDIS_RETRY.BACKOFF_STEP_MS,
        REDIS_RETRY.BACKOFF_CEILING_MS
      ),
  });
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
