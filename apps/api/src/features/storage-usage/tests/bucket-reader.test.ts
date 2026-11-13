// @module-tag unit
import { STORAGE_USAGE } from "../constants/storage-usage";
import { createBucketReader, forgetBucket } from "../utils/bucket-reader";

const T0 = new Date("2026-11-09T10:00:00Z");
const T0_ISO = T0.toISOString();
const LISTED = { bytes: 900, objects: 4 };

/** A Redis that keeps what it is given and forgets it after its TTL on the fake clock. */
const fakeRedis = (clock: { now: Date }) => {
  const kept = new Map<string, { expires: number; value: string }>();
  return {
    del: (key: string) => Promise.resolve(Number(kept.delete(key))),
    get: (key: string) => {
      const row = kept.get(key);
      return Promise.resolve(
        row && row.expires > clock.now.getTime() ? row.value : null
      );
    },
    set: (key: string, value: string, _mode: "PX", ms: number) => {
      kept.set(key, { expires: clock.now.getTime() + ms, value });
      return Promise.resolve("OK");
    },
  };
};

const setup = (list = vi.fn(() => Promise.resolve(LISTED))) => {
  const clock = { now: T0 };
  const warn = vi.fn();
  const redis = fakeRedis(clock);
  const read = createBucketReader({
    id: "image",
    list,
    logger: { warn },
    now: () => clock.now,
    redis: () => redis,
  });
  return { clock, list, read, redis, warn };
};

describe("createBucketReader", () => {
  it("lists once and keeps the totals for five minutes", async () => {
    const { clock, list, read } = setup();
    expect(await read()).toEqual({ ...LISTED, asOf: T0_ISO });
    clock.now = new Date(T0.getTime() + STORAGE_USAGE.CACHE.TTL_MS - 1);
    await read();
    expect(list).toHaveBeenCalledOnce();
  });

  it("answers the kept time for a cache hit", async () => {
    const { clock, read } = setup();
    await read();
    clock.now = new Date(T0.getTime() + 1000);
    expect((await read())?.asOf).toEqual(T0_ISO);
  });

  it("lists again after the TTL", async () => {
    const { clock, list, read } = setup();
    await read();
    clock.now = new Date(T0.getTime() + STORAGE_USAGE.CACHE.TTL_MS);
    await read();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("lists every time when Redis is down", async () => {
    const list = vi.fn(() => Promise.resolve(LISTED));
    const down = () => Promise.reject(new Error("redis down"));
    const read = createBucketReader({
      id: "image",
      list,
      logger: { warn: vi.fn() },
      now: () => T0,
      redis: () => ({ get: down, set: down }),
    });
    expect(await read()).toEqual({ ...LISTED, asOf: T0_ISO });
    await read();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("answers null, logs and keeps nothing when the listing throws", async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error("AccessDenied"))
      .mockResolvedValueOnce(LISTED);
    const { read, warn } = setup(list);
    expect(await read()).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      STORAGE_USAGE.LOG_MESSAGE.BUCKET_UNREADABLE
    );
    expect(await read()).not.toBeNull();
  });
});

describe("createBucketReader keys", () => {
  it("keeps each bucket's totals under its own key", async () => {
    const clock = { now: T0 };
    const redis = fakeRedis(clock);
    const reader = (id: string, bytes: number) =>
      createBucketReader({
        id,
        list: () => Promise.resolve({ bytes, objects: 1 }),
        logger: { warn: vi.fn() },
        now: () => clock.now,
        redis: () => redis,
      });
    const [first, second] = [reader("image", 1), reader("backups", 2)];
    await first();
    await second();
    expect((await first())?.bytes).toBe(1);
    expect((await second())?.bytes).toBe(2);
  });
});

describe("forgetBucket", () => {
  it("drops the kept totals, so the next read lists again", async () => {
    const { list, read, redis } = setup();
    await read();
    await forgetBucket(() => redis, "image");
    await read();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
