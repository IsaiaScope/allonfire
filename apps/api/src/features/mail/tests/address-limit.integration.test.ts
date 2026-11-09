// @module-tag integration
import { randomUUID } from "node:crypto";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { env } from "../../../environment/environment";
import { awaitReady, createRedis } from "../../redis/redis";
import { EMAIL } from "../constants/email";
import { createAddressLimit } from "../utils/address-limit";

const redis = createRedis(env.API_REDIS_URL);
const limit = createAddressLimit(() => redis);
const testLimit = createAddressLimit(
  () => redis,
  EMAIL.ADDRESS_LIMIT.TEST_KEY_PREFIX
);
const address = () => `limit-${randomUUID()}@mail.allonfire.test`;

beforeAll(() => awaitReady(redis));
afterAll(async () => {
  await redis.quit();
});

/** Takes `times` emails for `email`, one after the other. */
const takeTimes = async (
  email: string,
  times: number,
  now?: number
): Promise<boolean[]> => {
  if (times === 0) {
    return [];
  }
  const first = await limit.take(email, now);
  return [first, ...(await takeTimes(email, times - 1, now))];
};

describe("createAddressLimit", () => {
  it("lets an address have its emails for the hour, then refuses", async () => {
    const taken = await takeTimes(address(), EMAIL.ADDRESS_LIMIT.MAX + 1);
    expect(taken.filter(Boolean)).toHaveLength(EMAIL.ADDRESS_LIMIT.MAX);
    expect(taken.at(-1)).toBe(false);
  });

  it("keeps a test's emails apart from the auth emails: each has its own hour", async () => {
    const email = address();
    await takeTimes(email, EMAIL.ADDRESS_LIMIT.MAX);
    expect(await limit.take(email)).toBe(false);
    expect(await testLimit.take(email)).toBe(true);
    const tests = await Promise.all(
      Array.from({ length: EMAIL.ADDRESS_LIMIT.MAX }, () =>
        testLimit.take(email)
      )
    );
    expect(tests.filter(Boolean)).toHaveLength(EMAIL.ADDRESS_LIMIT.MAX - 1);
    expect(await limit.take(email)).toBe(false);
  });

  it("counts the address however it is spelled", async () => {
    const email = address();
    await takeTimes(email, EMAIL.ADDRESS_LIMIT.MAX);
    expect(await limit.take(` ${email.toUpperCase()} `)).toBe(false);
  });

  it("rolls: an email ages out an hour after it was sent, never at a boundary", async () => {
    const email = address();
    const start = Date.now();
    await takeTimes(email, EMAIL.ADDRESS_LIMIT.MAX, start);
    const almost = start + EMAIL.ADDRESS_LIMIT.WINDOW_MS - UNIT.MS_PER_SECOND;
    expect(await limit.take(email, almost)).toBe(false);
    const past = start + EMAIL.ADDRESS_LIMIT.WINDOW_MS + UNIT.MS_PER_SECOND;
    expect(await limit.take(email, past)).toBe(true);
  });

  it("never exceeds the limit under parallel requests", async () => {
    const email = address();
    const taken = await Promise.all(
      Array.from({ length: 12 }, () => limit.take(email))
    );
    expect(taken.filter(Boolean)).toHaveLength(EMAIL.ADDRESS_LIMIT.MAX);
  });

  it("keeps no raw address in its keys", async () => {
    const email = address();
    await limit.take(email);
    const keys = await redis.keys(`${EMAIL.ADDRESS_LIMIT.KEY_PREFIX}*`);
    expect(keys.some((key) => key.includes(email))).toBe(false);
  });

  it("is ready while Redis answers", async () => {
    expect(await limit.ready()).toBe(true);
  });
});
