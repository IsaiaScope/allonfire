// @module-tag unit
import { z } from "zod";
import { cacheAside, forgetCached } from "../utils/cache-aside";

const KEY = "test:key";
const TTL_MS = 1234;
const schema = z.object({ n: z.number() });

const setup = ({
  cached,
  redisFails,
}: {
  cached?: string;
  redisFails?: boolean;
} = {}) => {
  const stored = new Map<string, string>();
  if (cached !== undefined) {
    stored.set(KEY, cached);
  }
  const ttls: unknown[] = [];
  const redis = () => ({
    del: (key: string) => Promise.resolve(Number(stored.delete(key))),
    get: (key: string) =>
      redisFails
        ? Promise.reject(new Error("redis down"))
        : Promise.resolve(stored.get(key) ?? null),
    set: (key: string, value: string, _mode: "PX", ms: number) => {
      if (redisFails) {
        return Promise.reject(new Error("redis down"));
      }
      ttls.push(ms);
      stored.set(key, value);
      return Promise.resolve("OK");
    },
  });
  let loads = 0;
  const read = (answer: { n: number } | null = { n: 1 }) =>
    cacheAside({
      key: KEY,
      load: () => {
        loads += 1;
        return Promise.resolve(answer);
      },
      redis,
      schema,
      ttlMs: TTL_MS,
    });
  return { loads: () => loads, read, redis, stored, ttls };
};

describe("cacheAside", () => {
  it("loads once and answers the next read from the cache", async () => {
    const { loads, read } = setup();
    expect(await read()).toEqual({ n: 1 });
    expect(await read({ n: 2 })).toEqual({ n: 1 });
    expect(loads()).toBe(1);
  });

  it("keeps the loaded value for the given time", async () => {
    const { read, ttls } = setup();
    await read();
    expect(ttls).toEqual([TTL_MS]);
  });

  it("does not keep a null", async () => {
    const { loads, read, stored } = setup();
    expect(await read(null)).toBeNull();
    expect(stored.has(KEY)).toBe(false);
    expect(await read()).toEqual({ n: 1 });
    expect(loads()).toBe(2);
  });

  it("loads every read when the cache is down", async () => {
    const { loads, read } = setup({ redisFails: true });
    expect(await read()).toEqual({ n: 1 });
    expect(await read()).toEqual({ n: 1 });
    expect(loads()).toBe(2);
  });

  it("loads when the kept value is not the schema's", async () => {
    const { loads, read } = setup({ cached: "{not json" });
    expect(await read()).toEqual({ n: 1 });
    expect(loads()).toBe(1);
  });
});

describe("forgetCached", () => {
  it("drops the kept value, so the next read loads", async () => {
    const { redis, stored } = setup({ cached: "kept" });
    await forgetCached(redis, KEY);
    expect(stored.has(KEY)).toBe(false);
  });

  it("calls the client's own methods, which a real client needs `this` for", async () => {
    // ioredis methods read `this`: one pulled off the client and called loose
    // throws, and the forget would be swallowed as "cache down".
    class Client {
      readonly kept = new Map<string, string>([[KEY, '{"n":1}']]);
      del(key: string) {
        return Promise.resolve(Number(this.kept.delete(key)));
      }
      set(key: string, value: string, _mode: "PX", _ms: number) {
        this.kept.set(key, value);
        return Promise.resolve("OK");
      }
    }
    const client = new Client();
    await forgetCached(() => client, KEY);
    expect(client.kept.has(KEY)).toBe(false);
    expect([...client.kept.keys()]).toHaveLength(1);
  });

  it("never throws when the cache is down", async () => {
    await expect(
      forgetCached(
        () => ({
          del: () => Promise.reject(new Error("down")),
          set: () => Promise.reject(new Error("down")),
        }),
        KEY
      )
    ).resolves.toBeUndefined();
  });
});

describe("a load in flight when its key is forgotten", () => {
  const FORGOT_AT = 1000;
  const LATER = 2000;

  afterEach(() => vi.useRealTimers());

  /** A read whose load waits for `finish`, so a forget can land in the middle. */
  const slowRead = (redis: ReturnType<typeof setup>["redis"]) => {
    let release: (value: { n: number }) => void = () => undefined;
    let begun: () => void = () => undefined;
    const started = new Promise<void>((done) => {
      begun = done;
    });
    const reading = cacheAside({
      key: KEY,
      load: () => {
        begun();
        return new Promise<{ n: number }>((done) => {
          release = done;
        });
      },
      redis,
      schema,
      ttlMs: TTL_MS,
    });
    return {
      finish: async (value: { n: number }) => {
        await started;
        release(value);
      },
      reading,
      started,
    };
  };

  it("answers, but keeps nothing: it listed what the forget meant to drop", async () => {
    vi.useFakeTimers({ now: FORGOT_AT - 1 });
    const { redis, stored } = setup();
    const { finish, reading, started } = slowRead(redis);
    await started;
    vi.setSystemTime(FORGOT_AT);
    await forgetCached(redis, KEY);
    await finish({ n: 1 });
    expect(await reading).toEqual({ n: 1 });
    expect(stored.has(KEY)).toBe(false);
  });

  it("keeps the answer of a load that began after the forget", async () => {
    vi.useFakeTimers({ now: FORGOT_AT });
    const { redis, stored } = setup();
    await forgetCached(redis, KEY);
    vi.setSystemTime(LATER);
    const { finish, reading } = slowRead(redis);
    await finish({ n: 2 });
    await reading;
    expect(stored.get(KEY)).toBe('{"n":2}');
  });
});
