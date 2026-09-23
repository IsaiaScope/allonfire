import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { describe, expect, it } from "vitest";
import {
  onError,
  type ProblemDetails,
} from "../../errors/middleware/error-handler";
import { localeResolver } from "../../i18n/middleware/locale-resolver";
import { captureLog } from "../../logger/tests/capture";
import {
  createRateLimiter,
  failOpen,
  type RateLimitStore,
} from "../middleware/rate-limiter";

/** Like the Redis store, the window's reset time is set by its first hit. */
function stubStore(
  windowMs = 60_000
): RateLimitStore & { hits: Map<string, number> } {
  const hits = new Map<string, number>();
  return {
    decrement: () => Promise.resolve(),
    hits,
    increment: (key: string) => {
      const totalHits = (hits.get(key) ?? 0) + 1;
      hits.set(key, totalHits);
      return Promise.resolve({
        resetTime: new Date(Date.now() + windowMs),
        totalHits,
      });
    },
    resetKey: (key: string) => {
      hits.delete(key);
      return Promise.resolve();
    },
  };
}

function appWith(
  store: RateLimitStore,
  trustedHops: number,
  limit = 2,
  windowMs = 60_000
) {
  return new Hono()
    .use(requestId())
    .use(localeResolver())
    .use(createRateLimiter({ limit, store, trustedHops, windowMs }))
    .get("/ping", (context) => context.json({ ok: true }))
    .onError(onError);
}

const forwarded = (ip: string) => ({ headers: { "x-forwarded-for": ip } });

describe("rate limiter keying", () => {
  it("gives distinct forwarded clients distinct buckets", async () => {
    const store = stubStore();
    const app = appWith(store, 1);

    // One trusted proxy in front appends the client address and forwards a
    // single-entry chain — what Traefik actually sends.
    await app.request("/ping", forwarded("1.1.1.1"));
    await app.request("/ping", forwarded("2.2.2.2"));

    expect(store.hits.size).toBe(2);
    expect([...store.hits.values()]).toEqual([1, 1]);
  });

  it("ignores a client-supplied entry left of the trusted hop", async () => {
    const store = stubStore();
    const app = appWith(store, 1);

    // A client that sets its own X-Forwarded-For cannot pick its bucket: the
    // trusted proxy appends the real address to the right of the forgery, and
    // that is the entry we key on.
    await app.request("/ping", forwarded("1.1.1.1, 10.0.0.1"));
    await app.request("/ping", forwarded("2.2.2.2, 10.0.0.1"));

    expect(store.hits.size).toBe(1);
    expect([...store.hits.keys()]).toEqual(["10.0.0.1"]);
  });

  it("ignores forwarded headers when no proxy is trusted", async () => {
    const store = stubStore();
    const app = appWith(store, 0);

    await app.request("/ping", forwarded("1.1.1.1"));
    await app.request("/ping", forwarded("2.2.2.2"));

    expect(store.hits.size).toBe(1);
  });
});

describe("rate limited response", () => {
  it("returns a 429 envelope with Retry-After and RateLimit headers", async () => {
    const app = appWith(stubStore(), 1, 1);

    await app.request("/ping", forwarded("3.3.3.3"));
    const res = await app.request("/ping", forwarded("3.3.3.3"));

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(res.headers.get("ratelimit-limit")).toBe("1");

    const body = (await res.json()) as ProblemDetails;
    expect(body.code).toBe("RATE_LIMITED");
    expect(body.requestId).toBeTruthy();
  });

  it("interpolates the real retry window into the message", async () => {
    // 5s window -> the message must name 5 seconds, matching Retry-After.
    const app = appWith(stubStore(5000), 1, 1, 5000);

    await app.request("/ping", forwarded("4.4.4.4"));
    const res = await app.request("/ping", forwarded("4.4.4.4"));

    const body = (await res.json()) as ProblemDetails;
    expect(body.detail).toContain("5 seconds");
    expect(res.headers.get("retry-after")).toBe("5");
  });

  it("tells the client the time left in the window, not the whole window", async () => {
    // 60s window, but the store says it resets in 5s.
    const store: RateLimitStore = {
      decrement: () => Promise.resolve(),
      increment: () =>
        Promise.resolve({
          resetTime: new Date(Date.now() + 5000),
          totalHits: 2,
        }),
      resetKey: () => Promise.resolve(),
    };
    const res = await appWith(store, 1, 1, 60_000).request(
      "/ping",
      forwarded("5.5.5.5")
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("5");
    expect(((await res.json()) as ProblemDetails).detail).toContain(
      "5 seconds"
    );
  });

  it("renders the message in the requested locale", async () => {
    const app = appWith(stubStore(5000), 1, 1, 5000);
    const req = (ip: string) => {
      const init = forwarded(ip);
      return {
        ...init,
        headers: { ...init.headers, "Accept-Language": "it" },
      };
    };

    await app.request("/ping", req("5.5.5.5"));
    const res = await app.request("/ping", req("5.5.5.5"));

    const body = (await res.json()) as ProblemDetails;
    expect(body.code).toBe("RATE_LIMITED");
    expect(body.detail).toContain("Riprova tra 5 secondi");
  });
});

const unreachable = (): RateLimitStore => {
  const refuse = () => Promise.reject(new Error("Stream isn't writeable"));
  return { decrement: refuse, increment: refuse, resetKey: refuse };
};

describe("store outage", () => {
  it("lets requests through when the store is unreachable", async () => {
    const res = await appWith(unreachable(), 0).request("/ping");
    expect(res.status).toBe(200);
  });

  it("logs the outage once, and again only after the store recovers", async () => {
    const { lines, logger } = captureLog();
    // Redis per call: down, down, back, down again.
    const reachable = [false, false, true, false];
    const healthy = stubStore();
    const store = failOpen(
      {
        ...healthy,
        increment: (key) =>
          reachable.shift()
            ? healthy.increment(key)
            : unreachable().increment(key),
      },
      logger
    );

    await store.increment("a");
    await store.increment("a");
    await store.increment("a");
    await store.increment("a");

    expect(lines.map((line) => line.msg)).toEqual([
      "rate limit store unreachable, failing open",
      "rate limit store recovered",
      "rate limit store unreachable, failing open",
    ]);
  });
});
