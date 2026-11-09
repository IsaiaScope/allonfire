import { createHash, randomUUID } from "node:crypto";
import type { Redis } from "ioredis";
import { z } from "zod";
import { EMAIL } from "../constants/email";

/** How many emails an address has had this rolling hour, kept in Redis. */
export type AddressLimit = {
  /** Counts one email for `email` and answers true, or false when its hour is full. */
  take: (email: string, now?: number) => Promise<boolean>;
  /** Whether Redis answers, so the limit can count. */
  ready: () => Promise<boolean>;
};

// A sorted set per address, scored by send time: drop what aged out of the
// window, refuse at the limit, else add. One script, so parallel requests,
// from any API instance, take turns.
const TAKE_SCRIPT = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', tonumber(ARGV[1]) - tonumber(ARGV[2]))
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[3]) then return 0 end
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[4])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1
`;

const takeReplySchema = z.union([z.literal(0), z.literal(1)]);

/** An address as Better Auth stores it, hashed: no raw address sits in Redis. */
const keyOf = (keyPrefix: string, email: string) =>
  `${keyPrefix}${createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")}`;

/**
 * The per-address limit on a rolling window: an email ages out exactly an
 * hour after it was counted, so no boundary lets a burst through. `redis`
 * is read when first used, so building the limit opens nothing. Each
 * `keyPrefix` is a count of its own.
 */
export const createAddressLimit = (
  redis: () => Redis,
  keyPrefix: string = EMAIL.ADDRESS_LIMIT.KEY_PREFIX
): AddressLimit => ({
  ready: async () => {
    try {
      await redis().ping();
      return true;
    } catch {
      return false;
    }
  },
  take: async (email, now = Date.now()) =>
    takeReplySchema.parse(
      await redis().eval(
        TAKE_SCRIPT,
        1,
        keyOf(keyPrefix, email),
        String(now),
        String(EMAIL.ADDRESS_LIMIT.WINDOW_MS),
        String(EMAIL.ADDRESS_LIMIT.MAX),
        `${now}:${randomUUID()}`
      )
    ) === 1,
});
