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
    const store = createRedisStore(redis, 2000);

    const first = await store.increment(key);
    expect(first.totalHits).toBe(1);

    const ttl = await redis.pttl(`ratelimit:${key}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(2000);

    const second = await store.increment(key);
    expect(second.totalHits).toBe(2);

    const ttlAfter = await redis.pttl(`ratelimit:${key}`);
    expect(ttlAfter).toBeLessThanOrEqual(ttl);

    await store.resetKey(key);
  });

  it("starts a fresh count once the window expires", async () => {
    const key = `test-${Date.now()}-expiry`;
    const store = createRedisStore(redis, 300);

    await store.increment(key);
    await store.increment(key);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const afterWindow = await store.increment(key);
    expect(afterWindow.totalHits).toBe(1);

    await store.resetKey(key);
  });
});
