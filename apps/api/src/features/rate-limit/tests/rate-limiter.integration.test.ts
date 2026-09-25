// @module-tag integration
import { awaitReady, createRedis } from "../../redis/redis";
import { createRedisStore } from "../middleware/rate-limiter";

const url = process.env.REDIS_URL ?? "redis://localhost:6379/0";
const redis = createRedis(url);

beforeAll(async () => {
  try {
    await awaitReady(redis);
    await redis.ping();
  } catch (cause) {
    throw new Error(
      `Redis unavailable at ${url} — run: docker compose -f docker/docker-compose.dev.yml up -d redis`,
      { cause }
    );
  }
});

afterAll(async () => {
  await redis.quit();
});

describe("redis rate limit store", () => {
  it("sets an expiry on the first increment only", async () => {
    const key = `test-${Date.now()}-first`;
    const store = createRedisStore(redis);
    const windowMs = 2000;

    const first = await store.increment(key, windowMs);
    expect(first.totalHits).toBe(1);

    const ttl = await redis.pttl(`ratelimit:${key}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(windowMs);

    const second = await store.increment(key, windowMs);
    expect(second.totalHits).toBe(2);

    const ttlAfter = await redis.pttl(`ratelimit:${key}`);
    expect(ttlAfter).toBeLessThanOrEqual(ttl);

    await store.resetKey(key);
  });

  it("gives a counter left without a TTL one on its next hit", async () => {
    const key = `test-${Date.now()}-orphan`;
    const store = createRedisStore(redis);
    const windowMs = 2000;

    // `decrement` on an expired key leaves -1 with no TTL; the next INCR is 0,
    // never 1, so a first-hit-only PEXPIRE would never fire.
    await store.decrement(key);
    await store.increment(key, windowMs);

    const ttl = await redis.pttl(`ratelimit:${key}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(windowMs);

    await store.resetKey(key);
  });

  it("starts a fresh count once the window expires", async () => {
    const key = `test-${Date.now()}-expiry`;
    const store = createRedisStore(redis);
    const windowMs = 300;

    await store.increment(key, windowMs);
    await store.increment(key, windowMs);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const afterWindow = await store.increment(key, windowMs);
    expect(afterWindow.totalHits).toBe(1);

    await store.resetKey(key);
  });
});
