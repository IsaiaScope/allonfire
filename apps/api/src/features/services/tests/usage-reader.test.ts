// @module-tag unit
import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import type {
  MailDriverImpl,
  MailEndpoint,
  MailUsage,
} from "@allonfire/core/features/mail/types/mail";
import { SERVICES } from "../constants/services";
import { createUsageReader, forgetUsage } from "../utils/usage-reader";

const USAGE: MailUsage = { day: 3, dayLimit: 300, month: 40, monthLimit: null };
const PROVIDER = { dailyLimit: 300, id: "provider-0", slot: 0 };
const ENDPOINT: MailEndpoint = {
  driver: MAIL.DRIVER.BEARER_FLAT,
  key: "key-for-the-test",
  url: "https://usage.test",
};

type Setup = {
  answers?: (MailUsage | null | Error)[];
  /** `null`: the slot has no usable endpoint. */
  endpoint?: MailEndpoint | null;
  redisFails?: boolean;
  /** What the cache already holds for the provider, as text. */
  cached?: string;
};

const setup = ({
  answers = [USAGE],
  cached,
  endpoint = ENDPOINT,
  redisFails,
}: Setup = {}) => {
  let asked = 0;
  const stored = new Map<string, string>();
  if (cached !== undefined) {
    stored.set(`${SERVICES.USAGE_CACHE.KEY_PREFIX}${PROVIDER.id}`, cached);
  }
  const warned: string[] = [];
  const limitsSeen: unknown[] = [];
  const driver: MailDriverImpl = {
    send: () => Promise.resolve(MAIL.ATTEMPT.ACCEPTED),
    usage: (_endpoint, _now, _fetch, limits) => {
      limitsSeen.push(limits);
      const answer = answers[Math.min(asked, answers.length - 1)];
      asked += 1;
      return answer instanceof Error
        ? Promise.reject(answer)
        : Promise.resolve(answer ?? null);
    },
  };
  const redis = () => ({
    get: (key: string) =>
      redisFails
        ? Promise.reject(new Error("redis down"))
        : Promise.resolve(stored.get(key) ?? null),
    set: (key: string, value: string) => {
      if (redisFails) {
        return Promise.reject(new Error("redis down"));
      }
      stored.set(key, value);
      return Promise.resolve("OK");
    },
  });
  const read = createUsageReader({
    drivers: {
      [MAIL.DRIVER.BEARER_FLAT]: driver,
      [MAIL.DRIVER.KEY_HEADER_ENVELOPE]: driver,
    },
    endpoint: () => endpoint ?? undefined,
    fetch: () => Promise.reject(new Error("the driver is stubbed")),
    logger: {
      warn: (_bindings, message) => {
        warned.push(message);
      },
    },
    redis,
  });
  return { asked: () => asked, limitsSeen, read, warned };
};

describe("createUsageReader", () => {
  it("asks the provider once and answers the next read from the cache", async () => {
    const { asked, read } = setup();
    expect(await read(PROVIDER)).toEqual(USAGE);
    expect(await read(PROVIDER)).toEqual(USAGE);
    expect(asked()).toBe(1);
  });

  it("does not cache an answer of null", async () => {
    const { asked, read } = setup({ answers: [null, USAGE] });
    expect(await read(PROVIDER)).toBeNull();
    expect(await read(PROVIDER)).toEqual(USAGE);
    expect(asked()).toBe(2);
  });

  it("answers null and logs when the driver throws", async () => {
    const { read, warned } = setup({ answers: [new Error("boom")] });
    expect(await read(PROVIDER)).toBeNull();
    expect(warned).toContain(SERVICES.LOG_MESSAGE.USAGE_UNREADABLE);
  });

  it("answers null without asking when the slot has no endpoint", async () => {
    const { asked, read, warned } = setup({ endpoint: null });
    expect(await read(PROVIDER)).toBeNull();
    expect(asked()).toBe(0);
    expect(warned).toContain(SERVICES.LOG_MESSAGE.USAGE_UNREADABLE);
  });

  it("reads the provider live when the cache is down", async () => {
    const { asked, read } = setup({ redisFails: true });
    expect(await read(PROVIDER)).toEqual(USAGE);
    expect(await read(PROVIDER)).toEqual(USAGE);
    expect(asked()).toBe(2);
  });

  it("ignores a cached value that is not a usage and asks the provider", async () => {
    const { asked, read } = setup({ cached: "{not json" });
    expect(await read(PROVIDER)).toEqual(USAGE);
    expect(asked()).toBe(1);
  });

  it("hands the driver the daily limit set on the provider's card", async () => {
    const { limitsSeen, read } = setup();
    await read(PROVIDER);
    expect(limitsSeen).toEqual([{ dailyLimit: 300 }]);
  });

  it("keeps a usage under a minute: the vendors' counts trail a send by seconds", () => {
    expect(SERVICES.USAGE_CACHE.TTL_MS).toBeLessThanOrEqual(60_000);
  });
});

describe("forgetUsage", () => {
  const key = `${SERVICES.USAGE_CACHE.KEY_PREFIX}${PROVIDER.id}`;

  it("drops the provider's kept usage, so the next read asks the vendor", async () => {
    const stored = new Map([[key, "kept"]]);
    await forgetUsage(
      () => ({
        del: (name: string) => Promise.resolve(Number(stored.delete(name))),
      }),
      PROVIDER.id
    );
    expect(stored.has(key)).toBe(false);
  });

  it("never throws when the cache is down", async () => {
    await expect(
      forgetUsage(
        () => ({ del: () => Promise.reject(new Error("down")) }),
        PROVIDER.id
      )
    ).resolves.toBeUndefined();
  });
});
