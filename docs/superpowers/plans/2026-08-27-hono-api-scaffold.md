# Hono API Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `apps/api`, a Hono backend that boots, validates its config, logs and fails predictably, and rate-limits with Redis — running locally and in CI, with no auth and no domain endpoints.

**Status:** implemented (uncommitted) @ 2026-08-27T14:02:02Z

**Architecture:** A `createApp(deps)` factory builds a chained Hono app with an injected rate-limit store and health checkers, so tests construct it with stubs and never open a socket. `index.ts` is the only file touching the network or `process`. Domain services stay in `@allonfire/database`; the API does not duplicate them. No bundler — `tsx` in dev, `tsc --noEmit` for types.

**Tech Stack:** Hono, `@hono/node-server`, `hono-openapi`, `@scalar/hono-api-reference`, `hono-rate-limiter`, `ioredis`, `pino` + `hono-pino`, `@t3-oss/env-core`, zod 4, vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-hono-api-scaffold-design.md`

## Global Constraints

- Package is `@allonfire/api` at `apps/api`. Never `server` — that word is taken by `packages/auth/src/server.ts` and by Next Server Components.
- Every route is written as a **chained** `.get(...)`/`.post(...)` off a single `new Hono()`. Separate `app.get(...)` statements silently destroy `hc<AppType>` inference. Task 7 guards this with a type test.
- `apps/api` must not be imported by `apps/laura` in this plan. Laura's only change is a new `.env.example`.
- Node 22, pnpm, ESM (`"type": "module"`).
- zod is `^4.3.6` — already in the workspace. Do not add zod 3.
- No `build` script and no bundler for this package.
- Redis is mandatory: `REDIS_URL` is required, with no in-memory fallback.
- **Do not run `git commit`.** This repo's owner writes their own commits. Each task ends with a Checkpoint step instead; the human commits via `/iso-commit` when they choose.

---

### Task 1: Package skeleton, env schema, logger

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/env.ts`
- Create: `apps/api/src/lib/logger.ts`
- Test: `apps/api/src/env.test.ts`
- Test: `apps/api/src/lib/logger.test.ts`
- Modify: `turbo.json` (add env vars to `globalPassThroughEnv`)

**Interfaces:**
- Produces: `parseEnv(raw: Record<string, string | undefined>): Env` and `env: Env` from `src/env.ts`. `Env` has `NODE_ENV`, `PORT: number`, `LOG_LEVEL`, `DATABASE_URL: string`, `REDIS_URL: string`, `CORS_ORIGINS: string[]`, `RATE_LIMIT_WINDOW_MS: number`, `RATE_LIMIT_MAX: number`, `TRUSTED_PROXY_HOPS: number`, `ENABLE_DOCS: boolean`.
- Produces: `createLogger(opts?: { destination?: pino.DestinationStream }): pino.Logger` from `src/lib/logger.ts`.

- [x] **Step 1: Create the package manifest**

`apps/api/package.json`:

```json
{
  "name": "@allonfire/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./client": "./src/app.ts"
  },
  "scripts": {
    "predev": "docker compose -f ../../docker/docker-compose.dev.yml up -d redis",
    "dev": "tsx watch src/index.ts",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@allonfire/database": "workspace:*",
    "@allonfire/utils": "workspace:*",
    "@hono/node-server": "^1.14.0",
    "@scalar/hono-api-reference": "^0.9.0",
    "@t3-oss/env-core": "^0.13.10",
    "hono": "^4.9.0",
    "hono-openapi": "^1.1.0",
    "hono-pino": "^0.10.0",
    "hono-rate-limiter": "^0.7.0",
    "ioredis": "^5.6.0",
    "pino": "^9.6.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@allonfire/config": "workspace:*",
    "pino-pretty": "^13.0.0",
    "tsx": "^4.19.0",
    "typescript": "~5.8.2",
    "vitest": "^4.1.0"
  }
}
```

Then run `pnpm install` from the repo root. If any version above does not resolve, take the latest matching major and note the actual version — do not downgrade zod.

- [x] **Step 2: Create tsconfig and vitest config**

`apps/api/tsconfig.json` — mirrors the workspace paths Laura declares, so package resolution behaves identically:

```json
{
  "extends": "../../packages/config/typescript/library.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@allonfire/database": ["../../packages/database/src/index.ts"],
      "@allonfire/database/*": ["../../packages/database/src/*"],
      "@allonfire/utils": ["../../packages/utils/src/index.ts"],
      "@allonfire/utils/*": ["../../packages/utils/src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

`apps/api/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [x] **Step 3: Write the failing env test**

`apps/api/src/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379/0",
  CORS_ORIGINS: "http://localhost:3200",
};

describe("parseEnv", () => {
  it("applies defaults for optional values", () => {
    const env = parseEnv(valid);
    expect(env.PORT).toBe(3300);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.TRUSTED_PROXY_HOPS).toBe(0);
    expect(env.ENABLE_DOCS).toBe(false);
  });

  it("splits CORS_ORIGINS into a trimmed array", () => {
    const env = parseEnv({ ...valid, CORS_ORIGINS: "http://a.test, http://b.test" });
    expect(env.CORS_ORIGINS).toEqual(["http://a.test", "http://b.test"]);
  });

  it("coerces numeric values", () => {
    const env = parseEnv({ ...valid, PORT: "4000" });
    expect(env.PORT).toBe(4000);
  });

  it("rejects a missing REDIS_URL", () => {
    const { REDIS_URL, ...withoutRedis } = valid;
    expect(() => parseEnv(withoutRedis)).toThrow();
  });

  it("rejects a non-numeric PORT", () => {
    expect(() => parseEnv({ ...valid, PORT: "banana" })).toThrow();
  });
});
```

- [x] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @allonfire/api test`
Expected: FAIL — cannot resolve `./env`.

- [x] **Step 5: Implement the env module**

`apps/api/src/env.ts`:

```ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export function parseEnv(raw: Record<string, string | undefined>) {
  return createEnv({
    server: {
      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
      PORT: z.coerce.number().int().positive().default(3300),
      LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace"])
        .default("info"),
      DATABASE_URL: z.url(),
      REDIS_URL: z.url(),
      CORS_ORIGINS: z
        .string()
        .transform((value) =>
          value
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean)
        ),
      RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
      RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
      TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
      ENABLE_DOCS: z
        .enum(["true", "false"])
        .default("false")
        .transform((value) => value === "true"),
    },
    runtimeEnv: raw,
    emptyStringAsUndefined: true,
  });
}

export type Env = ReturnType<typeof parseEnv>;

export const env = parseEnv(process.env);
```

`z.url()` is zod 4 syntax and matches `packages/database/src/env.ts`. Do not use `z.string().url()`.

- [x] **Step 6: Run the env test to verify it passes**

Run: `pnpm --filter @allonfire/api test src/env.test.ts`
Expected: PASS, 5 tests.

Note: `env.ts` calls `parseEnv(process.env)` at import, so this test file must import only `parseEnv`. If the module-level `env` throws during collection, set the three required variables in your shell or in `apps/api/.env`.

- [x] **Step 7: Write the failing logger test**

`apps/api/src/lib/logger.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createLogger } from "./logger";

function captureLines() {
  const lines: string[] = [];
  return {
    lines,
    stream: { write: (chunk: string) => void lines.push(chunk) },
  };
}

describe("createLogger", () => {
  it("redacts the authorization header", () => {
    const { lines, stream } = captureLines();
    const logger = createLogger({ destination: stream });

    logger.info({ req: { headers: { authorization: "Bearer secret-token" } } }, "req");

    expect(lines.join("")).not.toContain("secret-token");
    expect(lines.join("")).toContain("[Redacted]");
  });

  it("redacts nested password fields", () => {
    const { lines, stream } = captureLines();
    const logger = createLogger({ destination: stream });

    logger.info({ body: { password: "hunter2" } }, "login");

    expect(lines.join("")).not.toContain("hunter2");
  });
});
```

- [x] **Step 8: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api test src/lib/logger.test.ts`
Expected: FAIL — cannot resolve `./logger`.

- [x] **Step 9: Implement the logger**

`apps/api/src/lib/logger.ts`:

```ts
import pino, { type DestinationStream, type Logger } from "pino";
import { env } from "../env";

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "*.password",
  "*.token",
];

export function createLogger(opts?: { destination?: DestinationStream }): Logger {
  const options = {
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: "[Redacted]" },
  };

  if (opts?.destination) {
    return pino(options, opts.destination);
  }

  if (env.NODE_ENV === "development") {
    return pino({
      ...options,
      transport: { target: "pino-pretty", options: { colorize: true } },
    });
  }

  return pino(options);
}

export const logger = createLogger();
```

- [x] **Step 10: Run the logger test to verify it passes**

Run: `pnpm --filter @allonfire/api test`
Expected: PASS, 7 tests total.

- [x] **Step 11: Write `.env.example`**

`apps/api/.env.example`:

```bash
# Postgres connection. Shares the database with apps/laura.
DATABASE_URL="postgresql://allonfire:allonfire@localhost:5432/allonfire"

# Redis connection. Required — start it with `pnpm --filter @allonfire/api predev`.
# The trailing /0 selects the database index used for rate-limit counters.
REDIS_URL="redis://localhost:6379/0"

# Comma-separated browser origins allowed to call this API.
# React Native needs no entry here — CORS is a browser mechanism.
CORS_ORIGINS="http://localhost:3200"

# Port this API listens on. Laura uses 3200/3201.
PORT="3300"

# fatal | error | warn | info | debug | trace
LOG_LEVEL="debug"

# Rate limit: requests per window, per client.
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX="100"

# Trusted reverse-proxy hops in front of this process.
# 0 locally (no proxy). 1 behind Traefik.
TRUSTED_PROXY_HOPS="0"

# Serve /openapi.json and /reference in production. Always on in development.
ENABLE_DOCS="false"
```

- [x] **Step 12: Add env vars to turbo passthrough**

In `turbo.json`, extend `globalPassThroughEnv` with these five entries, keeping the existing ones:

```json
"REDIS_URL",
"PORT",
"LOG_LEVEL",
"CORS_ORIGINS",
"TRUSTED_PROXY_HOPS",
"ENABLE_DOCS"
```

- [x] **Step 13: Checkpoint**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: tests pass, no type errors. Leave the changes uncommitted for review.

---

### Task 2: Error envelope and global error handler

**Files:**
- Create: `apps/api/src/lib/errors.ts`
- Test: `apps/api/src/lib/errors.test.ts`

**Interfaces:**
- Produces: `type ErrorCode = "BAD_REQUEST" | "VALIDATION_FAILED" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "RATE_LIMITED" | "TIMEOUT" | "PAYLOAD_TOO_LARGE" | "INTERNAL_ERROR"`.
- Produces: `type ErrorBody = { error: { code: ErrorCode; message: string; requestId: string; details?: { path: string; message: string }[] } }`.
- Produces: `onError(err: Error, c: Context): Response` and `notFound(c: Context): Response`.

- [x] **Step 1: Write the failing test**

`apps/api/src/lib/errors.test.ts`:

```ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { describe, expect, it } from "vitest";
import { notFound, onError } from "./errors";

function testApp() {
  return new Hono()
    .use(requestId())
    .get("/boom", () => {
      throw new Error("Invalid `prisma.user.findMany()` on column `secret_col`");
    })
    .get("/nope", () => {
      throw new HTTPException(403, { message: "not allowed" });
    })
    .onError(onError)
    .notFound(notFound);
}

describe("onError", () => {
  it("maps an HTTPException to its status and a code", async () => {
    const res = await testApp().request("/nope");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toBe("not allowed");
    expect(body.error.requestId).toBeTruthy();
  });

  it("never leaks an unknown error's message", async () => {
    const res = await testApp().request("/boom");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("secret_col");
  });

  it("returns NOT_FOUND in the same envelope for unmatched routes", async () => {
    const res = await testApp().request("/missing");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api test src/lib/errors.test.ts`
Expected: FAIL — cannot resolve `./errors`.

- [x] **Step 3: Implement the error module**

`apps/api/src/lib/errors.ts`:

```ts
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { logger } from "./logger";

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL_ERROR";

export type ErrorDetail = { path: string; message: string };

export type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: ErrorDetail[];
  };
};

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  408: "TIMEOUT",
  413: "PAYLOAD_TOO_LARGE",
  429: "RATE_LIMITED",
};

export function codeForStatus(status: number): ErrorCode {
  return STATUS_TO_CODE[status] ?? "INTERNAL_ERROR";
}

export function errorBody(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: ErrorDetail[]
): ErrorBody {
  return { error: { code, message, requestId, ...(details ? { details } : {}) } };
}

function requestIdOf(c: Context): string {
  return (c.get("requestId") as string | undefined) ?? "unknown";
}

export function onError(err: Error, c: Context): Response {
  const requestId = requestIdOf(c);

  if (err instanceof HTTPException) {
    const status = err.status as ContentfulStatusCode;
    return c.json(errorBody(codeForStatus(status), err.message, requestId), status);
  }

  logger.error({ err, requestId }, "unhandled error");

  return c.json(
    errorBody("INTERNAL_ERROR", "Internal server error", requestId),
    500
  );
}

export function notFound(c: Context): Response {
  return c.json(errorBody("NOT_FOUND", "Not found", requestIdOf(c)), 404);
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @allonfire/api test src/lib/errors.test.ts`
Expected: PASS, 3 tests.

- [x] **Step 5: Write the failing validation-error test**

Append to `apps/api/src/lib/errors.test.ts`:

```ts
import { validator } from "hono-openapi";
import { z } from "zod";
import { validationHook } from "./errors";

describe("validationHook", () => {
  const app = new Hono()
    .use(requestId())
    .post(
      "/echo",
      validator("json", z.object({ email: z.email(), age: z.number() }), validationHook),
      (c) => c.json(c.req.valid("json"))
    )
    .onError(onError);

  it("returns 400 with field paths and no schema dump", async () => {
    const res = await app.request("/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "nope", age: "old" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_FAILED");
    const paths = body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toContain("email");
    expect(paths).toContain("age");
    expect(JSON.stringify(body)).not.toContain("ZodError");
  });
});
```

- [x] **Step 6: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api test src/lib/errors.test.ts`
Expected: FAIL — `validationHook` is not exported.

- [x] **Step 7: Implement the validation hook**

Append to `apps/api/src/lib/errors.ts`:

```ts
type StandardIssue = {
  message: string;
  path?: readonly (PropertyKey | { key: PropertyKey })[];
};

type ValidationResult =
  | { success: true }
  | { success: false; error?: { issues?: readonly StandardIssue[] } };

function issuePath(issue: StandardIssue): string {
  return (issue.path ?? [])
    .map((segment) =>
      typeof segment === "object" && segment !== null && "key" in segment
        ? String(segment.key)
        : String(segment)
    )
    .join(".");
}

export function validationHook(result: ValidationResult, c: Context) {
  if (result.success) {
    return;
  }

  const details: ErrorDetail[] = (result.error?.issues ?? []).map((issue) => ({
    path: issuePath(issue),
    message: issue.message,
  }));

  return c.json(
    errorBody("VALIDATION_FAILED", "Request validation failed", requestIdOf(c), details),
    400
  );
}
```

The `path` segments are read defensively because Standard Schema issue paths may be plain keys or `{ key }` objects depending on the validator. If `hono-openapi`'s installed types name the hook signature differently, match the installed type rather than this sketch — the assertions in the test define the contract.

- [x] **Step 8: Run the test to verify it passes**

Run: `pnpm --filter @allonfire/api test src/lib/errors.test.ts`
Expected: PASS, 4 tests.

- [x] **Step 9: Checkpoint**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: all green.

---

### Task 3: Redis client, Lua rate-limit store, limiter middleware

**Files:**
- Modify: `docker/docker-compose.dev.yml` (add a `redis` service)
- Create: `apps/api/src/lib/redis.ts`
- Create: `apps/api/src/lib/rate-limit.ts`
- Test: `apps/api/src/lib/rate-limit.test.ts`
- Test: `apps/api/src/lib/rate-limit.integration.test.ts`

**Interfaces:**
- Produces: `createRedis(url: string): Redis` from `src/lib/redis.ts`.
- Produces: `type RateLimitStore` matching `hono-rate-limiter`'s `Store`, `createRedisStore(redis: Redis, windowMs: number): RateLimitStore`, `clientKey(c: Context, trustedHops: number): string`, and `createRateLimiter(opts: { store: RateLimitStore; windowMs: number; limit: number; trustedHops: number }): MiddlewareHandler` from `src/lib/rate-limit.ts`.

- [x] **Step 1: Add Redis to the dev compose file**

In `docker/docker-compose.dev.yml`, add alongside the existing `postgres` service:

```yaml
  redis:
    container_name: allonfire-redis
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: >
      redis-server
      --maxmemory-policy volatile-lru
      --save ""
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
```

No password in development, so `redis-cli` works without flags. `volatile-lru` and `--save ""` match the production target so both environments behave the same under memory pressure.

Start it: `docker compose -f docker/docker-compose.dev.yml up -d redis`

- [x] **Step 2: Read the installed Store type**

Open `node_modules/hono-rate-limiter/dist/types.d.ts` and read the `Store` interface. The expected shape is:

```ts
interface Store {
  init?(options: ConfigType): void;
  increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
}
```

If the installed version differs, implement against the installed one — the tests below define the behaviour, not the signature.

- [x] **Step 3: Write the failing keying test**

`apps/api/src/lib/rate-limit.test.ts`:

```ts
import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { describe, expect, it } from "vitest";
import { onError } from "./errors";
import { createRateLimiter, type RateLimitStore } from "./rate-limit";

function stubStore(): RateLimitStore & { hits: Map<string, number> } {
  const hits = new Map<string, number>();
  return {
    hits,
    increment: async (key: string) => {
      const totalHits = (hits.get(key) ?? 0) + 1;
      hits.set(key, totalHits);
      return { totalHits, resetTime: new Date(Date.now() + 60_000) };
    },
    decrement: async () => undefined,
    resetKey: async (key: string) => void hits.delete(key),
  };
}

function appWith(store: RateLimitStore, trustedHops: number, limit = 2) {
  return new Hono()
    .use(requestId())
    .use(createRateLimiter({ store, windowMs: 60_000, limit, trustedHops }))
    .get("/ping", (c) => c.json({ ok: true }))
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

    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.requestId).toBeTruthy();
  });
});
```

- [x] **Step 4: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api test src/lib/rate-limit.test.ts`
Expected: FAIL — cannot resolve `./rate-limit`.

- [x] **Step 5: Implement the Redis client**

`apps/api/src/lib/redis.ts`:

```ts
import { Redis } from "ioredis";

export function createRedis(url: string): Redis {
  return new Redis(url, {
    // Defaults retry forever and queue commands while disconnected, which
    // turns a Redis outage into hanging requests instead of fast failures.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
}
```

- [x] **Step 6: Implement the store, key function, and limiter**

`apps/api/src/lib/rate-limit.ts`:

```ts
import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import type { Redis } from "ioredis";
import { codeForStatus, errorBody } from "./errors";

export type RateLimitStore = {
  increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
};

// ponytail: fixed window — a client can burst up to 2x the limit across a
// window boundary. Upgrade to a sorted-set sliding window if that shows up
// in the logs.
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return count
`;

export function createRedisStore(redis: Redis, windowMs: number): RateLimitStore {
  redis.defineCommand("rateLimitIncrement", {
    numberOfKeys: 1,
    lua: INCREMENT_SCRIPT,
  });

  return {
    async increment(key) {
      const namespaced = `ratelimit:${key}`;
      // @ts-expect-error defineCommand augments the client at runtime
      const totalHits = (await redis.rateLimitIncrement(
        namespaced,
        String(windowMs)
      )) as number;
      const ttl = await redis.pttl(namespaced);
      return {
        totalHits,
        resetTime: ttl > 0 ? new Date(Date.now() + ttl) : undefined,
      };
    },
    async decrement(key) {
      await redis.decr(`ratelimit:${key}`);
    },
    async resetKey(key) {
      await redis.del(`ratelimit:${key}`);
    },
  };
}

export function clientKey(c: Context, trustedHops: number): string {
  if (trustedHops > 0) {
    const chain = (c.req.header("x-forwarded-for") ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    // Take the entry the closest trusted proxy appended. Never the leftmost
    // value — that one is client-supplied and spoofable.
    const index = chain.length - trustedHops;
    const candidate = chain[index];
    if (candidate) {
      return candidate;
    }
  }

  return getConnInfo(c).remote.address ?? "unknown";
}

export function createRateLimiter(opts: {
  store: RateLimitStore;
  windowMs: number;
  limit: number;
  trustedHops: number;
}): MiddlewareHandler {
  return rateLimiter({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: "draft-6",
    keyGenerator: (c) => clientKey(c, opts.trustedHops),
    store: opts.store as never,
    handler: (c) => {
      const retryAfter = Math.ceil(opts.windowMs / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json(
        errorBody(
          codeForStatus(429),
          "Too many requests",
          (c.get("requestId") as string | undefined) ?? "unknown"
        ),
        429
      );
    },
  });
}
```

- [x] **Step 7: Run the keying tests to verify they pass**

Run: `pnpm --filter @allonfire/api test src/lib/rate-limit.test.ts`
Expected: PASS, 4 tests.

If `ratelimit-limit` is absent, check whether the installed `hono-rate-limiter` names the option `standardHeaders: true` or a different draft string, and adjust. The header must be present — do not weaken the assertion.

- [x] **Step 8: Write the failing Redis integration test**

`apps/api/src/lib/rate-limit.integration.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRedis } from "./redis";
import { createRedisStore } from "./rate-limit";

const url = process.env.REDIS_URL ?? "redis://localhost:6379/0";
const redis = createRedis(url);

beforeAll(async () => {
  try {
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
```

- [x] **Step 9: Run it to verify it fails, then passes**

Run: `pnpm --filter @allonfire/api test src/lib/rate-limit.integration.test.ts`

With Redis stopped, expect FAIL with the actionable message naming the compose command. Start Redis (`docker compose -f docker/docker-compose.dev.yml up -d redis`) and run again.
Expected: PASS, 2 tests.

- [x] **Step 10: Checkpoint**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: 12 tests pass, no type errors.

---

### Task 4: createApp, middleware chain, health routes

**Files:**
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/app.ts`
- Test: `apps/api/src/app.test.ts`

**Interfaces:**
- Produces: `type AppBindings = { Variables: { requestId: string; logger: Logger } }`.
- Produces: `type AppDeps = { store: RateLimitStore; checkDatabase: () => Promise<boolean>; checkRedis: () => Promise<boolean>; logger?: Logger }` — `logger` is optional and exists so tests can capture output.
- Produces: `createHealthRoutes(deps: Pick<AppDeps, "checkDatabase" | "checkRedis">)` from `src/routes/health.ts`.
- Produces: `createApp(deps: AppDeps)` and `type AppType = ReturnType<typeof createApp>` from `src/app.ts`.
- Consumes: `createRateLimiter`, `RateLimitStore` (Task 3); `onError`, `notFound` (Task 2); `logger` (Task 1).

- [x] **Step 1: Write the failing app test**

`apps/api/src/app.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createApp, type AppDeps } from "./app";

function deps(overrides: Partial<AppDeps> = {}): AppDeps {
  const hits = new Map<string, number>();
  return {
    store: {
      increment: async (key: string) => {
        const totalHits = (hits.get(key) ?? 0) + 1;
        hits.set(key, totalHits);
        return { totalHits, resetTime: new Date(Date.now() + 60_000) };
      },
      decrement: async () => undefined,
      resetKey: async () => undefined,
    },
    checkDatabase: async () => true,
    checkRedis: async () => true,
    ...overrides,
  };
}

describe("GET /health", () => {
  it("returns status, version and uptime without touching dependencies", async () => {
    const app = createApp(
      deps({
        checkDatabase: async () => {
          throw new Error("must not be called");
        },
      })
    );

    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(typeof body.uptime).toBe("number");
  });
});

describe("GET /ready", () => {
  it("returns 200 when both dependencies are healthy", async () => {
    const res = await createApp(deps()).request("/ready");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      checks: { database: "ok", redis: "ok" },
    });
  });

  it("returns 503 when Postgres is down", async () => {
    const app = createApp(deps({ checkDatabase: async () => false }));
    const res = await app.request("/ready");

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.checks.database).toBe("unreachable");
  });

  it("stays 200 when only Redis is down", async () => {
    const app = createApp(deps({ checkRedis: async () => false }));
    const res = await app.request("/ready");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.checks.redis).toBe("unreachable");
  });
});

describe("probe exemption", () => {
  it("never rate-limits /health or /ready", async () => {
    const store = deps().store;
    let increments = 0;
    const counting: AppDeps["store"] = {
      ...store,
      increment: async (key) => {
        increments += 1;
        return store.increment(key);
      },
    };

    const app = createApp(deps({ store: counting }));
    await app.request("/health");
    await app.request("/ready");

    expect(increments).toBe(0);
  });
});

describe("unmatched routes", () => {
  it("returns the NOT_FOUND envelope", async () => {
    const res = await createApp(deps()).request("/nothing-here");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api test src/app.test.ts`
Expected: FAIL — cannot resolve `./app`.

- [x] **Step 3: Implement the health routes**

`apps/api/src/routes/health.ts`:

```ts
import { Hono } from "hono";
import pkg from "../../package.json" with { type: "json" };

export type HealthDeps = {
  checkDatabase: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
};

export const createHealthRoutes = (deps: HealthDeps) =>
  new Hono()
    .get("/health", (c) =>
      c.json({
        status: "ok",
        version: pkg.version,
        uptime: process.uptime(),
      } as const)
    )
    .get("/ready", async (c) => {
      const [database, redis] = await Promise.all([
        deps.checkDatabase().catch(() => false),
        deps.checkRedis().catch(() => false),
      ]);

      const body = {
        status: database ? (redis ? "ok" : "degraded") : "unavailable",
        checks: {
          database: database ? "ok" : "unreachable",
          redis: redis ? "ok" : "unreachable",
        },
      } as const;

      // Postgres is required; Redis failing open must not remove a container
      // that is still serving traffic correctly.
      return c.json(body, database ? 200 : 503);
    });
```

`import ... with { type: "json" }` requires `resolveJsonModule`, which `packages/config/typescript/base.json` already sets.

- [x] **Step 4: Implement createApp**

`apps/api/src/app.ts`:

```ts
import { securityHeaders } from "@allonfire/utils/security-headers";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { pinoLogger } from "hono-pino";
import type { Logger } from "pino";
import { env } from "./env";
import { notFound, onError } from "./lib/errors";
import { logger as defaultLogger } from "./lib/logger";
import { createRateLimiter, type RateLimitStore } from "./lib/rate-limit";
import { createHealthRoutes, type HealthDeps } from "./routes/health";

export type AppBindings = {
  Variables: {
    requestId: string;
    logger: Logger;
  };
};

export type AppDeps = HealthDeps & {
  store: RateLimitStore;
  /** Optional so tests can capture log output. Defaults to the shared logger. */
  logger?: Logger;
};

const PROBE_PATHS = new Set(["/health", "/ready"]);
const isProbe = (path: string) => PROBE_PATHS.has(path);

const BODY_LIMIT_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;

export const createApp = (deps: AppDeps) => {
  const limiter = createRateLimiter({
    store: deps.store,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    trustedHops: env.TRUSTED_PROXY_HOPS,
  });

  return new Hono<AppBindings>()
    .use(requestId())
    .use(
      pinoLogger({
        pino: deps.logger ?? defaultLogger,
        http: {
          // Probes are self-generated on a fixed schedule; logging them at
          // info level buries real traffic. debug keeps them available when
          // you are actually debugging a probe.
          onResLevel: (c) => {
            if (isProbe(c.req.path)) {
              return "debug";
            }
            if (c.res.status >= 500) {
              return "error";
            }
            return c.res.status >= 400 ? "warn" : "info";
          },
        },
      })
    )
    .use(async (c, next) => {
      for (const header of securityHeaders) {
        c.header(header.key, header.value);
      }
      await next();
    })
    .use(secureHeaders())
    .use(
      cors({
        origin: env.CORS_ORIGINS,
        // Inert until something sends a cookie, but incompatible with a
        // wildcard origin — setting it now removes a landmine from the
        // auth migration.
        credentials: true,
      })
    )
    .use(bodyLimit({ maxSize: BODY_LIMIT_BYTES }))
    .use(timeout(REQUEST_TIMEOUT_MS))
    .use(async (c, next) => (isProbe(c.req.path) ? next() : limiter(c, next)))
    .route("/", createHealthRoutes(deps))
    .onError(onError)
    .notFound(notFound);
};

export type AppType = ReturnType<typeof createApp>;
```

Three things about this file are load-bearing:

- `new Hono<AppBindings>()` is what makes `c.var.requestId` and `c.var.logger`
  typed in every handler. Without it, handlers reach for `c.get("requestId")`
  with a cast.
- `requestId()` runs **first** because `hono-pino` reads `c.var.requestId` by
  default (its `referRequestIdKey` option) to bind the id into every log line.
- The whole thing is one chained expression. Breaking it into
  `const app = new Hono(); app.use(...)` destroys `hc<AppType>` inference.

- [x] **Step 5: Run the app tests to verify they pass**

Run: `pnpm --filter @allonfire/api test src/app.test.ts`
Expected: PASS, 6 tests.

`app.ts` imports `env`, which validates at import. Ensure `apps/api/.env` exists
(copy `.env.example`) or that the three required variables are exported in the
shell, or the test file will fail during collection.

- [x] **Step 6: Write the failing probe-logging test**

Append to `apps/api/src/app.test.ts`:

```ts
import { createLogger } from "./lib/logger";

describe("probe logging", () => {
  it("does not emit an info line for /health", async () => {
    const lines: string[] = [];
    const stream = { write: (chunk: string) => void lines.push(chunk) };

    const app = createApp({
      ...deps(),
      logger: createLogger({ destination: stream }),
    });

    await app.request("/health");

    const infoLines = lines
      .map((line) => JSON.parse(line) as { level: number })
      .filter((entry) => entry.level >= 30);

    expect(infoLines).toHaveLength(0);
  });

  it("emits an info line for a normal request", async () => {
    const lines: string[] = [];
    const stream = { write: (chunk: string) => void lines.push(chunk) };

    const app = createApp({
      ...deps(),
      logger: createLogger({ destination: stream }),
    });

    await app.request("/nothing-here");

    expect(lines.length).toBeGreaterThan(0);
  });
});
```

The second test guards against the first one passing for the wrong reason —
a logger that emits nothing at all would satisfy the first assertion alone.

Note: `createLogger` reads `env.LOG_LEVEL`. Set `LOG_LEVEL=debug` in
`apps/api/.env` so debug-level probe lines are actually produced and the
`level >= 30` filter is doing real work.

- [x] **Step 7: Run it to verify it passes**

Run: `pnpm --filter @allonfire/api test src/app.test.ts`
Expected: PASS, 8 tests.

- [x] **Step 8: Checkpoint**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: all green.

---

### Task 5: Boot and graceful shutdown

**Files:**
- Create: `apps/api/src/shutdown.ts`
- Create: `apps/api/src/index.ts`
- Test: `apps/api/src/shutdown.test.ts`

**Interfaces:**
- Produces: `createShutdown(deps: { closeServer: () => Promise<void>; closeRedis: () => Promise<void>; closeDatabase: () => Promise<void>; drainTimeoutMs?: number }): () => Promise<string[]>` — resolves with the ordered list of completed step names, so ordering is assertable.
- Consumes: `createApp` (Task 4), `createRedis` / `createRedisStore` (Task 3), `env` (Task 1).

- [x] **Step 1: Write the failing shutdown test**

`apps/api/src/shutdown.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createShutdown } from "./shutdown";

describe("createShutdown", () => {
  it("closes the server before Redis and the database", async () => {
    const order: string[] = [];

    const shutdown = createShutdown({
      closeServer: async () => void order.push("server"),
      closeRedis: async () => void order.push("redis"),
      closeDatabase: async () => void order.push("database"),
    });

    await shutdown();
    expect(order).toEqual(["server", "redis", "database"]);
  });

  it("gives up on a hung drain after the timeout", async () => {
    vi.useFakeTimers();
    const order: string[] = [];

    const shutdown = createShutdown({
      closeServer: () => new Promise<void>(() => undefined),
      closeRedis: async () => void order.push("redis"),
      closeDatabase: async () => void order.push("database"),
      drainTimeoutMs: 10_000,
    });

    const done = shutdown();
    await vi.advanceTimersByTimeAsync(10_000);
    await done;

    expect(order).toEqual(["redis", "database"]);
    vi.useRealTimers();
  });

  it("continues shutting down when one step throws", async () => {
    const order: string[] = [];

    const shutdown = createShutdown({
      closeServer: async () => void order.push("server"),
      closeRedis: async () => {
        throw new Error("redis already gone");
      },
      closeDatabase: async () => void order.push("database"),
    });

    await expect(shutdown()).resolves.toBeDefined();
    expect(order).toEqual(["server", "database"]);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api test src/shutdown.test.ts`
Expected: FAIL — cannot resolve `./shutdown`.

- [x] **Step 3: Implement shutdown**

`apps/api/src/shutdown.ts`:

```ts
import { logger } from "./lib/logger";

const DEFAULT_DRAIN_TIMEOUT_MS = 10_000;

export type ShutdownDeps = {
  closeServer: () => Promise<void>;
  closeRedis: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  drainTimeoutMs?: number;
};

function withTimeout(promise: Promise<void>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    promise
      .then(() => {
        clearTimeout(timer);
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

export function createShutdown(deps: ShutdownDeps) {
  const drainTimeoutMs = deps.drainTimeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS;

  return async function shutdown(): Promise<string[]> {
    const completed: string[] = [];

    // Stop accepting and let in-flight requests finish before any dependency
    // is closed — closing Prisma first would fail requests that could complete.
    if (await withTimeout(deps.closeServer(), drainTimeoutMs)) {
      completed.push("server");
    } else {
      logger.warn({ drainTimeoutMs }, "drain timed out, closing dependencies anyway");
    }

    for (const [name, close] of [
      ["redis", deps.closeRedis],
      ["database", deps.closeDatabase],
    ] as const) {
      try {
        await close();
        completed.push(name);
      } catch (err) {
        logger.error({ err, step: name }, "shutdown step failed");
      }
    }

    return completed;
  };
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @allonfire/api test src/shutdown.test.ts`
Expected: PASS, 3 tests.

- [x] **Step 5: Implement the entrypoint**

`apps/api/src/index.ts`:

```ts
import { serve } from "@hono/node-server";
import { prisma } from "@allonfire/database";
import { createApp } from "./app";
import { env } from "./env";
import { logger } from "./lib/logger";
import { createRedisStore } from "./lib/rate-limit";
import { createRedis } from "./lib/redis";
import { createShutdown } from "./shutdown";

const redis = createRedis(env.REDIS_URL);

const app = createApp({
  store: createRedisStore(redis, env.RATE_LIMIT_WINDOW_MS),
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  },
  checkRedis: async () => (await redis.ping()) === "PONG",
});

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) =>
  logger.info({ port: info.port, env: env.NODE_ENV }, "api listening")
);

const shutdown = createShutdown({
  closeServer: () =>
    new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    ),
  closeRedis: async () => void (await redis.quit()),
  closeDatabase: () => prisma.$disconnect(),
});

let shuttingDown = false;

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, async () => {
    if (shuttingDown) {
      logger.warn({ signal }, "second signal, exiting immediately");
      process.exit(1);
    }
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    const completed = await shutdown();
    logger.info({ completed }, "shutdown complete");
    process.exit(0);
  });
}
```

- [x] **Step 6: Run the server by hand**

Run:

```bash
cp apps/api/.env.example apps/api/.env
docker compose -f docker/docker-compose.dev.yml up -d postgres redis
pnpm --filter @allonfire/api dev
```

In another terminal:

```bash
curl -s localhost:3300/health | jq
curl -s localhost:3300/ready | jq
curl -si localhost:3300/nope | head -1
```

Expected: `/health` returns `status`, `version`, `uptime`. `/ready` returns `ok` with both checks `ok`. `/nope` returns `404`.

Then press Ctrl-C once and confirm the log shows `shutting down` followed by `shutdown complete` with `completed: ["server","redis","database"]`.

- [x] **Step 7: Checkpoint**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: all green.

---

### Task 6: OpenAPI spec and Scalar reference

**Files:**
- Modify: `apps/api/src/routes/health.ts` (add `describeRoute`)
- Modify: `apps/api/src/app.ts` (mount spec and reference routes)
- Test: `apps/api/src/app.test.ts` (append)

**Interfaces:**
- Consumes: `createApp` (Task 4).
- Produces: `GET /openapi.json` and `GET /reference` on the app returned by `createApp`.

- [x] **Step 1: Write the failing docs test**

Append to `apps/api/src/app.test.ts`:

```ts
describe("documentation routes", () => {
  it("serves a spec describing the probes", async () => {
    const res = await createApp(deps()).request("/openapi.json");
    expect(res.status).toBe(200);

    const spec = await res.json();
    expect(spec.paths["/health"]).toBeDefined();
    expect(spec.paths["/health"].get.summary).toBe("Liveness probe");
  });

  it("serves the Scalar reference in development", async () => {
    const res = await createApp(deps()).request("/reference");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("rate-limits the docs routes, unlike the probes", async () => {
    let increments = 0;
    const base = deps();
    const counting: AppDeps["store"] = {
      ...base.store,
      increment: async (key) => {
        increments += 1;
        return base.store.increment(key);
      },
    };

    await createApp({ ...base, store: counting }).request("/openapi.json");
    expect(increments).toBe(1);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api test src/app.test.ts`
Expected: FAIL — `/openapi.json` returns 404.

- [x] **Step 3: Describe the health routes**

Rewrite `apps/api/src/routes/health.ts` in full — `describeRoute` becomes the
first handler of each route, and everything else is unchanged:

```ts
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import pkg from "../../package.json" with { type: "json" };

export type HealthDeps = {
  checkDatabase: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
};

export const createHealthRoutes = (deps: HealthDeps) =>
  new Hono()
    .get(
      "/health",
      describeRoute({
        summary: "Liveness probe",
        description: "Touches no dependencies. Reports the running build.",
        tags: ["Infrastructure"],
        responses: { 200: { description: "Process is alive" } },
      }),
      (c) =>
        c.json({
          status: "ok",
          version: pkg.version,
          uptime: process.uptime(),
        } as const)
    )
    .get(
      "/ready",
      describeRoute({
        summary: "Readiness probe",
        description:
          "Pings Postgres and Redis. 503 only when Postgres is unreachable.",
        tags: ["Infrastructure"],
        responses: {
          200: { description: "Ready, possibly degraded" },
          503: { description: "Postgres unreachable" },
        },
      }),
      async (c) => {
        const [database, redis] = await Promise.all([
          deps.checkDatabase().catch(() => false),
          deps.checkRedis().catch(() => false),
        ]);

        const body = {
          status: database ? (redis ? "ok" : "degraded") : "unavailable",
          checks: {
            database: database ? "ok" : "unreachable",
            redis: redis ? "ok" : "unreachable",
          },
        } as const;

        // Postgres is required; Redis failing open must not remove a container
        // that is still serving traffic correctly.
        return c.json(body, database ? 200 : 503);
      }
    );
```

The routes stay ordinary chained `.get()` calls — `describeRoute` is just
another middleware in the handler list, so `hc` inference is unaffected.

- [x] **Step 4: Add the docs gate helper**

`apps/api/src/lib/docs.ts`:

```ts
/**
 * Docs render freely in development. In production they are opt-in, because a
 * public reference page advertises the entire API surface to anything scanning.
 */
export const isDocsEnabled = (nodeEnv: string, enableDocs: boolean): boolean =>
  nodeEnv !== "production" || enableDocs;
```

`apps/api/src/lib/docs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isDocsEnabled } from "./docs";

describe("isDocsEnabled", () => {
  it("is on in development regardless of the flag", () => {
    expect(isDocsEnabled("development", false)).toBe(true);
    expect(isDocsEnabled("test", false)).toBe(true);
  });

  it("is off in production unless explicitly enabled", () => {
    expect(isDocsEnabled("production", false)).toBe(false);
    expect(isDocsEnabled("production", true)).toBe(true);
  });
});
```

- [x] **Step 5: Mount the spec and reference routes**

Replace the body of `createApp` in `apps/api/src/app.ts`. Only the return
statement changes — the middleware chain above it is untouched:

```ts
import { Scalar } from "@scalar/hono-api-reference";
import { openAPIRouteHandler } from "hono-openapi";
import pkg from "../package.json" with { type: "json" };
import { isDocsEnabled } from "./lib/docs";

// ...inside createApp, replacing the single `return new Hono<AppBindings>()...`:

  const docsEnabled = isDocsEnabled(env.NODE_ENV, env.ENABLE_DOCS);

  const base = new Hono<AppBindings>()
    .use(requestId())
    .use(
      pinoLogger({
        pino: deps.logger ?? defaultLogger,
        http: {
          onResLevel: (c) => {
            if (isProbe(c.req.path)) {
              return "debug";
            }
            if (c.res.status >= 500) {
              return "error";
            }
            return c.res.status >= 400 ? "warn" : "info";
          },
        },
      })
    )
    .use(async (c, next) => {
      for (const header of securityHeaders) {
        c.header(header.key, header.value);
      }
      await next();
    })
    .use(secureHeaders())
    .use(cors({ origin: env.CORS_ORIGINS, credentials: true }))
    .use(bodyLimit({ maxSize: BODY_LIMIT_BYTES }))
    .use(timeout(REQUEST_TIMEOUT_MS))
    .use(async (c, next) => (isProbe(c.req.path) ? next() : limiter(c, next)))
    .route("/", createHealthRoutes(deps));

  return base
    .get("/openapi.json", (c, next) =>
      docsEnabled
        ? openAPIRouteHandler(base, {
            documentation: {
              info: {
                title: "AllOnFire API",
                version: pkg.version,
                description: "Backend for the AllOnFire apps.",
              },
            },
          })(c, next)
        : notFound(c)
    )
    .get("/reference", (c, next) =>
      docsEnabled ? Scalar({ url: "/openapi.json" })(c, next) : notFound(c)
    )
    .onError(onError)
    .notFound(notFound);
```

**This still counts as chained.** The forbidden pattern is discarding the return
value (`app.get(...)` as a bare statement). Assigning the chain to `base` and
chaining further off it preserves every route type — and it is necessary here,
because `openAPIRouteHandler` needs a reference to the app whose routes it
describes.

If the installed `openAPIRouteHandler` will not accept `base` while `base` is
still being extended, hoist the spec generation into a separate `const spec =
openAPIRouteHandler(base, {...})` above the return. The contract to satisfy is
the assertion that `spec.paths["/health"]` exists.

- [x] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @allonfire/api test`
Expected: PASS — 8 app tests, 3 docs-route tests, 2 docs-gate tests, plus
everything from Tasks 1-3.

- [x] **Step 7: Verify the reference renders**

Run `pnpm --filter @allonfire/api dev` and open `http://localhost:3300/reference`.
Expected: Scalar UI listing `/health` and `/ready` under an "Infrastructure" tag.

- [x] **Step 8: Checkpoint**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: all green.

---

### Task 7: Client contract and type test

**Files:**
- Modify: `apps/api/package.json` (exports already present; confirm)
- Modify: `apps/api/src/app.ts` (re-export `ErrorCode` and `ErrorBody`)
- Create: `apps/api/src/client.test-d.ts`
- Modify: `apps/api/vitest.config.ts` (enable type testing)

**Interfaces:**
- Produces: `AppType`, `ErrorCode`, `ErrorBody` from `@allonfire/api/client`.
- Consumes: `createApp` (Task 4).

- [x] **Step 1: Enable type testing in vitest**

`apps/api/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    typecheck: {
      enabled: true,
      include: ["src/**/*.test-d.ts"],
      tsconfig: "./tsconfig.json",
    },
  },
});
```

- [x] **Step 2: Write the failing type test**

`apps/api/src/client.test-d.ts`:

```ts
import { hc } from "hono/client";
import { describe, expectTypeOf, it } from "vitest";
import type { ApiType, AppType, ErrorBody, ErrorCode } from "./app";

describe("client contract", () => {
  it("infers the /health response body", async () => {
    const client = hc<AppType>("http://localhost:3300");
    const res = await client.health.$get();
    const body = await res.json();

    expectTypeOf(body).toMatchObjectType<{
      status: "ok";
      version: string;
      uptime: number;
    }>();
  });

  it("exposes the error code union", () => {
    expectTypeOf<"RATE_LIMITED">().toExtend<ErrorCode>();
    expectTypeOf<"NOT_A_REAL_CODE">().not.toExtend<ErrorCode>();
  });

  it("types the error envelope on the merged client type", async () => {
    const client = hc<ApiType>("http://localhost:3300");
    const res = await client.health.$get();

    if (res.status === 500) {
      const body = await res.json();
      expectTypeOf(body).toMatchObjectType<ErrorBody>();
    }
  });
});
```

- [x] **Step 3: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api test --typecheck`
Expected: FAIL — `ErrorCode` is not exported from `./app`.

- [x] **Step 4: Re-export the client-facing types and merge the error shape**

Append to `apps/api/src/app.ts`:

```ts
import type { ApplyGlobalResponse } from "hono/client";
import type { ErrorBody } from "./lib/errors";

export type { ErrorBody, ErrorCode } from "./lib/errors";

/**
 * The client-facing app type. `AppType` alone describes only the success
 * responses; `onError` and `notFound` are invisible to it. Merging the error
 * envelope here means a consumer type-checks both halves of every call.
 */
export type ApiType = ApplyGlobalResponse<
  AppType,
  {
    400: { json: ErrorBody };
    404: { json: ErrorBody };
    429: { json: ErrorBody };
    500: { json: ErrorBody };
  }
>;
```

Consumers use `hc<ApiType>`; `AppType` stays exported for the type test and for
anyone who wants the bare route types.

If the installed Hono version does not export `ApplyGlobalResponse` from
`hono/client`, check `hono/types` before assuming it is unavailable — it moved
between minor versions. If it genuinely is not present, pin the Hono version
that has it rather than dropping the merge, since the error envelope being
typed is the point of the contract.

- [x] **Step 5: Run the type test to verify it passes**

Run: `pnpm --filter @allonfire/api test --typecheck`
Expected: PASS.

If `body` types as `unknown`, a route has been written as a separate `app.get(...)` statement rather than chained — that is exactly the regression this test exists to catch. Fix the chain rather than loosening the assertion.

- [x] **Step 6: Checkpoint**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: all green, including type tests.

---

### Task 8: CI, documentation, and Laura's env example

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `apps/api/README.md`
- Modify: `CLAUDE.md`
- ~~Create: `apps/laura/.env.example`~~ (skipped — `apps/laura` out of scope)

**Interfaces:**
- Consumes: everything above. Produces no code.

- [x] **Step 1: Add the Redis service to CI**

In `.github/workflows/ci.yml`, inside the `test` job's `services:` block, alongside `postgres`:

```yaml
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
```

And in the same job's `env:` block, alongside the existing entries:

```yaml
      REDIS_URL: redis://localhost:6379/0
      CORS_ORIGINS: http://localhost:3200
```

Both are mandatory: `app.ts` imports `env.ts`, which validates at import, so without them every API test fails at collection rather than at an assertion.

- [x] **Step 2: Verify CI passes**

Push the branch and open a PR against `dev`. Confirm the `test` job runs the API tests, including the Redis integration test, and that `lint-types` passes.

If the integration test fails with the "Redis unavailable" message, the service container did not become healthy — check the `options` block above rather than skipping the test.

- [x] **Step 3: Write the API README**

`apps/api/README.md`:

````markdown
# @allonfire/api

The HTTP backend for the AllOnFire apps. Hono on Node, no auth yet, no domain
endpoints yet.

## Running it

```bash
cp .env.example .env
pnpm --filter @allonfire/api dev      # starts Redis via predev, then tsx watch
```

Then: `http://localhost:3300/health`, `/ready`, `/reference`.

## Environment

Every variable is documented in `.env.example`. `DATABASE_URL`, `REDIS_URL` and
`CORS_ORIGINS` are required — the process exits at boot if any is missing.

## Writing routes

**Routes must be chained.** `hc<AppType>` derives client types from the chained
return value; separate statements silently degrade them to nothing.

```ts
// correct
export const createThingRoutes = (deps: Deps) =>
  new Hono()
    .get("/things", (c) => c.json({ things: [] }))
    .post("/things", validator("json", schema, validationHook), (c) => c.json({}, 201));

// wrong — client types become unusable, and no runtime test will notice
const app = new Hono();
app.get("/things", handler);
```

`src/client.test-d.ts` guards this. If it starts failing, a route was un-chained.

**Domain routes mount under `/v1`:**

```ts
.route("/v1", createThingRoutes(deps))
```

`/health` and `/ready` stay unversioned — infrastructure endpoints are not part
of the API contract.

**Handlers stay thin.** Domain logic lives in `@allonfire/database`. Validate,
call a service, shape a response.

## Redis

One project-scoped instance, split by database index:

| index | contents | expiry |
|---|---|---|
| 0 | rate-limit counters | always |
| 1 | cache (reserved, unused) | always |
| 2 | sessions (reserved, unused) | never |

Eviction policy is server-wide, so the instance runs `volatile-lru` and only
keys that are safe to lose carry a TTL. Never set a TTL on a session key.

## Tests

```bash
pnpm --filter @allonfire/api test
```

All tests but one run with stubs and no container. The rate-limit integration
test requires Redis and will tell you the command to start it.
````

- [x] **Step 4: Document the app in CLAUDE.md**

Add to `CLAUDE.md`, after the Laura section and before `## Deployment`:

```markdown
## API App Structure (`apps/api/src/`)

The HTTP backend serving every app. Hono on Node, port 3300. No auth and no
domain endpoints yet — see `apps/api/README.md`.

```
src/
├── index.ts          boot: serve(), signals, shutdown
├── app.ts            createApp(deps) — middleware chain, exports AppType
├── env.ts            zod env schema, validated at import
├── lib/              logger, errors, redis, rate-limit
└── routes/health.ts  /health and /ready
```

- **Routes must be chained** (`new Hono().get(...).get(...)`) or `hc<AppType>`
  client types silently collapse. Guarded by `src/client.test-d.ts`.
- **Domain routes mount under `/v1`**; `/health` and `/ready` stay unversioned.
- **`createApp(deps)` takes its dependencies** (rate-limit store, health
  checkers) so tests never open a socket.
- **Required env:** `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`. Full list in
  `apps/api/.env.example`.
- **Redis db indexes:** 0 rate limits, 1 cache (reserved), 2 sessions
  (reserved). Eviction is `volatile-lru`; never TTL a session key.
```

- [ ] **Step 5: Add Laura's missing env example** — SKIPPED, `apps/laura` is off limits for now (owner's call, 2026-08-27)

`apps/laura/.env.example` — read `apps/laura/.env` for the variable names and write an example with placeholder values and a comment per line. At minimum it must cover `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `LAURA_VIEWER_EMAIL`, `LAURA_VIEWER_PASSWORD`.

Never copy real secret values into the example file.

- [x] **Step 6: Final checkpoint**

Run from the repo root:

```bash
pnpm install
pnpm check-types
pnpm lint
docker compose -f docker/docker-compose.dev.yml up -d postgres redis
pnpm turbo run test
```

Expected: no type errors, no lint errors, all tests pass including the API's.

Then run `pnpm dev` from the root and confirm both Laura (3200) and the API
(3300) start, and that `curl localhost:3300/ready` reports both checks `ok`.

Leave everything uncommitted. The human reviews and commits.

---

## Implementation Log
- Implemented: 2026-08-27T14:02:02Z
- Workspace: fresh-branch — feat/hono-api-scaffold
- Committed: no — awaiting user review
- Not done: Task 8 Step 5 (`apps/laura/.env.example`) — `apps/laura` left untouched by request
