import type { Json } from "@allonfire/core/shared/utils/json";
import {
  parseJsonWith,
  stringifyJson,
} from "@allonfire/core/shared/utils/json";
import type { z } from "zod";
import { REDIS } from "../constants/redis";

type RedisSet = (
  key: string,
  value: string,
  mode: "PX",
  ms: number
) => Promise<unknown>;

/** The two commands a cache needs, behind a thunk so a test hands in its own client. */
export type CacheRedis = () => {
  get: (key: string) => Promise<string | null>;
  set: RedisSet;
};

/** The commands a forget needs: drop the value, leave the mark. */
export type ForgetRedis = () => {
  del: (key: string) => Promise<unknown>;
  set: RedisSet;
};

const forgottenKey = (key: string) =>
  `${key}${REDIS.CACHE_ASIDE.FORGOTTEN_SUFFIX}`;

/**
 * Drops what is kept under `key`, so the next read loads, and marks when: a
 * load already in flight began before it and read what this meant to drop, so
 * `cacheAside` keeps nothing it loads from before the mark. A cache that is
 * down has nothing to drop, and never throws.
 */
export const forgetCached = async (
  redis: ForgetRedis,
  key: string
): Promise<void> => {
  try {
    // Called on the client, never pulled off it: a real client's methods need `this`.
    const client = redis();
    await Promise.all([
      client.del(key),
      client.set(
        forgottenKey(key),
        String(Date.now()),
        "PX",
        REDIS.CACHE_ASIDE.FORGOTTEN_MS
      ),
    ]);
  } catch {
    // Down, the next read loads anyway.
  }
};

/** Whether `key` was forgotten at or after `since` (ms): a cache that is down says no. */
const forgottenSince = async (
  redis: CacheRedis,
  key: string,
  since: number
) => {
  try {
    const at = await redis().get(forgottenKey(key));
    return at !== null && Number(at) >= since;
  } catch {
    return false;
  }
};

/**
 * `load`'s answer, kept in Redis under `key` for `ttlMs`. The cache is only a
 * saving: one that is down, empty or holding something that is not `schema`
 * reads as a miss, one that cannot keep the answer still returns it, and a
 * null is never kept, nor is what a `load` read from before the key was
 * forgotten (`forgetCached`). `load` owns its own failures (it answers null).
 */
export const cacheAside = async <T>({
  key,
  load,
  redis,
  schema,
  ttlMs,
}: {
  key: string;
  load: () => Promise<(T & Json<T>) | null>;
  redis: CacheRedis;
  schema: z.ZodType<T>;
  ttlMs: number;
}): Promise<T | null> => {
  try {
    const text = await redis().get(key);
    if (text !== null) {
      return parseJsonWith(text, schema);
    }
  } catch {
    // Down, or not a value of ours: read it again.
  }
  const startedAt = Date.now();
  const value = await load();
  if (value === null || (await forgottenSince(redis, key, startedAt))) {
    return value;
  }
  try {
    await redis().set(key, stringifyJson(value), "PX", ttlMs);
  } catch {
    // A value it could not keep still answers.
  }
  return value;
};
