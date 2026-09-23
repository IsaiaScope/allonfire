# Backend Platform Tooling (Local) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No commits.** This repo's owner commits by hand (`/iso-commit`). Every task ends with a verification step, never a `git commit`.

**Goal:** Record the backend tooling decisions as ADRs and stand up the Local observability stack: OpenObserve and Umami in the dev compose, and OpenTelemetry traces, metrics and logs from `apps/api` into OpenObserve.

**Status:** implemented (uncommitted) @ 2026-09-23T19:06:37+02:00

**Architecture:** OpenObserve and Umami join `docker/docker-compose.dev.yml` beside the existing Postgres, Redis and MinIO; Umami gets its own `umami` database on the existing Postgres through an idempotent one-shot init container. The API keeps running on the host; `dev` preloads `features/telemetry/register.ts` with `--import`, which registers OTel's ESM loader hook and then starts `NodeSDK` only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. A small Hono middleware names each server span after the matched route pattern, and `createShutdown` gains a final telemetry flush.

**Tech Stack:** Hono 4.13, Node 22 ESM via `tsx`, OpenTelemetry JS (`sdk-node` 0.222, `instrumentation-http` 0.222, `instrumentation-ioredis` 0.70, `instrumentation-pino` 0.68), `@prisma/instrumentation` 6.19.3, OpenObserve `v1.0.3`, Umami `3.4.0`, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-23-backend-platform-tooling-design.md`

## Global Constraints

- Local only. Nothing in `docker/docker-compose.prod.yml`, Dokploy or the VPS changes.
- Laura (`apps/laura`) is not touched.
- Image tags are pinned exactly: `openobserve/openobserve:v1.0.3`, `ghcr.io/umami-software/umami:3.4.0`. Existing services keep their current tags.
- Local OpenObserve stores on a named volume with 7-day retention; no MinIO storage locally.
- Telemetry is on by default in Local: `apps/api/.env.example` ships the `OTEL_*` values filled in, and the API's `predev` starts `redis` and `openobserve`. Umami is not in `predev`.
- `OTEL_*` variables are read by the SDK itself and are **not** added to the zod env schema.
- `app.ts` must never import the SDK (`telemetry.ts`, `register.ts`); tests must run without it.
- Instrumentations are listed explicitly; do not add `@opentelemetry/auto-instrumentations-node`.
- Sampling stays at 100%, marked with a `ponytail:` comment naming `parentbased_traceidratio` as the upgrade path.
- `/health` and `/ready` produce no spans.
- Never call `Object.keys/values/entries/fromEntries`; use `@allonfire/utils/object`.
- Ports: API 3300, OpenObserve 5080, Umami 3100 (host) → 3000 (container).
- Local OpenObserve root: `root@allonfire.local` / `Allonfire#dev12`. Basic auth value: `cm9vdEBhbGxvbmZpcmUubG9jYWw6QWxsb25maXJlI2RldjEy`.
- Run `pnpm dlx ultracite fix` on touched files before a task's final verification.

## Review Focus

1. **OpenObserve stopped while telemetry is on** — the API must boot and serve normally; export failures never reach the request path. Pinned in Task 4, Step 9.
2. **An existing `.env` without the `OTEL_*` lines** — telemetry stays off silently, no crash. Pinned in Task 4, Step 10.
3. **Unmatched paths (404s, scanners)** — span name must be the pattern `GET /*`, never the raw path, or span-name cardinality explodes. Pinned in Task 2, Step 1.
4. **Probe paths with a query string** (`/health?probe=1`) — still produce no span. Pinned in Task 4, Step 1.
5. **Second `pnpm docker:up` on a volume where `umami` already exists** — init container exits 0 and Umami starts. Pinned in Task 1, Step 5.

---

### Task 1: Local OpenObserve and Umami services

**Files:**
- Modify: `docker/docker-compose.dev.yml` (add three services and one volume)

**Interfaces:**
- Consumes: existing `postgres` service (healthcheck `pg_isready`), env defaults `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` = `allonfire`.
- Produces: `openobserve` service on `localhost:5080` (OTLP at `http://localhost:5080/api/default`), `umami` on `localhost:3100`, database `umami` on the Local Postgres. Service name `openobserve` is used by Task 4's `predev`.

- [x] **Step 1: Add the services**

In `docker/docker-compose.dev.yml`, insert after the `minio` service block (before the top-level `volumes:` key):

```yaml
  # Telemetry backend. Stores on the named volume below; Production stores on
  # MinIO instead (see docs/adr/0006-self-hosted-observability.md).
  openobserve:
    container_name: allonfire-openobserve
    image: openobserve/openobserve:v1.0.3
    restart: unless-stopped
    ports:
      - "5080:5080"
    environment:
      ZO_ROOT_USER_EMAIL: root@allonfire.local
      ZO_ROOT_USER_PASSWORD: Allonfire#dev12
      ZO_DATA_DIR: /data
      ZO_COMPACT_DATA_RETENTION_DAYS: "7"
    volumes:
      - openobserve_data:/data

  # One-shot: creates the umami database if it is missing. An initdb.d script
  # would not work — it only runs against an empty data directory, and
  # postgres_data already exists on every machine that has run docker:up.
  umami-db-init:
    container_name: allonfire-umami-db-init
    image: postgres:16-alpine
    restart: "no"
    environment:
      PGHOST: postgres
      PGUSER: ${POSTGRES_USER:-allonfire}
      PGPASSWORD: ${POSTGRES_PASSWORD:-allonfire}
      PGDATABASE: ${POSTGRES_DB:-allonfire}
    command: >
      sh -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname = 'umami'\" | grep -q 1
      || psql -c 'CREATE DATABASE umami'"
    depends_on:
      postgres:
        condition: service_healthy

  # Analytics. Idle until a frontend embeds its script.
  umami:
    container_name: allonfire-umami
    image: ghcr.io/umami-software/umami:3.4.0
    restart: unless-stopped
    init: true
    ports:
      - "3100:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-allonfire}:${POSTGRES_PASSWORD:-allonfire}@postgres:5432/umami
      APP_SECRET: allonfire-local-umami-secret
    depends_on:
      umami-db-init:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD-SHELL", "curl -fs http://localhost:3000/api/heartbeat"]
      interval: 5s
      timeout: 5s
      retries: 10
```

And add to the top-level `volumes:` map, beside `postgres_data` and `minio_data`:

```yaml
  openobserve_data:
```

- [x] **Step 2: Validate the compose file**

Run: `docker compose -f docker/docker-compose.dev.yml config --quiet && echo OK`
Expected: `OK`

- [x] **Step 3: Start the stack**

Run: `pnpm docker:up`
Expected: all containers start; `allonfire-umami-db-init` exits.

Run: `docker inspect -f '{{.State.ExitCode}}' allonfire-umami-db-init`
Expected: `0`

- [x] **Step 4: Check each service answers**

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5080/healthz`
Expected: `200`

Run: `docker exec allonfire-postgres psql -U allonfire -d allonfire -tAc "SELECT datname FROM pg_database WHERE datname = 'umami'"`
Expected: `umami`

Run (wait up to a minute for Umami's first-start migrations): `until curl -fs http://localhost:3100/api/heartbeat; do sleep 3; done; echo`
Expected: `{"ok":true}` (or similar ok body)

- [x] **Step 5: Prove the init container is idempotent (Review Focus 5)**

Run: `docker compose -f docker/docker-compose.dev.yml up -d --force-recreate umami-db-init umami && sleep 5 && docker inspect -f '{{.State.ExitCode}}' allonfire-umami-db-init`
Expected: `0` — the database already exists, so the `grep -q 1` branch short-circuits the `CREATE`.

- [x] **Step 6: Log in to both UIs**

Open `http://localhost:5080`, sign in as `root@allonfire.local` / `Allonfire#dev12`.
Open `http://localhost:3100`, sign in as `admin` / `umami` (Umami's first-run default).
Expected: both dashboards load.

---

### Task 2: Span-name middleware

**Files:**
- Create: `apps/api/src/features/telemetry/constants/telemetry.ts`
- Create: `apps/api/src/features/telemetry/middleware/span-name.ts`
- Create: `apps/api/src/features/telemetry/tests/span-name.test.ts`
- Modify: `apps/api/src/app.ts` (one import, one `.use`)
- Modify: `apps/api/package.json` (dependencies)

**Interfaces:**
- Consumes: `routePath(c, index)` from `hono/route` (index `-1` = last matched route); `trace.getActiveSpan()` from `@opentelemetry/api`.
- Produces: `spanName(): MiddlewareHandler` — renames the active span to `` `${method} ${pattern}` `` and sets attribute `http.route`. Constants `OTLP_ENDPOINT_ENV = "OTEL_EXPORTER_OTLP_ENDPOINT"`, `HTTP_ROUTE_ATTRIBUTE = "http.route"`, `REQUEST_URL_BASE = "http://localhost"` (Task 4 imports the first and third).

- [x] **Step 1: Install dependencies**

Run:
```bash
pnpm --filter @allonfire/api add @opentelemetry/api@^1.9.1
pnpm --filter @allonfire/api add -D @opentelemetry/sdk-trace@^2.11.0 @opentelemetry/context-async-hooks@^2.11.0
```
Expected: `apps/api/package.json` lists `@opentelemetry/api` under `dependencies`, the other two under `devDependencies`.

- [x] **Step 2: Write the failing test**

Create `apps/api/src/features/telemetry/tests/span-name.test.ts`:

```ts
import { context } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from "@opentelemetry/sdk-trace";
import { Hono } from "hono";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { HTTP_ROUTE_ATTRIBUTE } from "../constants/telemetry";
import { spanName } from "../middleware/span-name";

const exporter = new InMemorySpanExporter();
const tracer = new TracerProvider({
  spanProcessors: [new SimpleSpanProcessor({ exporter })],
}).getTracer("span-name-test");

// Stands in for the server span instrumentation-http opens around a request.
const requestInSpan = (app: Hono, path: string) =>
  tracer.startActiveSpan("GET", async (span) => {
    await app.request(path);
    span.end();
  });

const app = new Hono()
  .use(spanName())
  .get("/things/:id", (c) => c.text("ok"));

describe("spanName", () => {
  beforeAll(() => {
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable()
    );
  });

  afterEach(() => exporter.reset());

  afterAll(() => context.disable());

  it("names the span after the matched route pattern, not the raw path", async () => {
    await requestInSpan(app, "/things/42");

    const [span] = exporter.getFinishedSpans();
    expect(span?.name).toBe("GET /things/:id");
    expect(span?.attributes[HTTP_ROUTE_ATTRIBUTE]).toBe("/things/:id");
  });

  it("collapses unmatched paths to the catch-all pattern", async () => {
    await requestInSpan(app, "/wp-admin/setup.php");

    const [span] = exporter.getFinishedSpans();
    expect(span?.name).toBe("GET /*");
  });

  it("does nothing when no span is active", async () => {
    const response = await app.request("/things/42");

    expect(response.status).toBe(200);
    expect(exporter.getFinishedSpans()).toHaveLength(0);
  });
});
```

- [x] **Step 3: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api exec vitest run src/features/telemetry/tests/span-name.test.ts`
Expected: FAIL — cannot resolve `../constants/telemetry` / `../middleware/span-name`.

- [x] **Step 4: Write the constants**

Create `apps/api/src/features/telemetry/constants/telemetry.ts`:

```ts
/**
 * The variable whose presence switches the SDK on. The SDK reads it itself;
 * this name exists only so the on/off check and the docs cannot disagree.
 */
export const OTLP_ENDPOINT_ENV = "OTEL_EXPORTER_OTLP_ENDPOINT";

/** Semantic-convention attribute for the matched route pattern. */
export const HTTP_ROUTE_ATTRIBUTE = "http.route";

/**
 * `IncomingMessage.url` is a path plus query, not a URL. `new URL` needs a
 * base to parse it; the host is never read.
 */
export const REQUEST_URL_BASE = "http://localhost";
```

- [x] **Step 5: Write the middleware**

Create `apps/api/src/features/telemetry/middleware/span-name.ts`:

```ts
import { trace } from "@opentelemetry/api";
import type { MiddlewareHandler } from "hono";
import { routePath } from "hono/route";
import { HTTP_ROUTE_ATTRIBUTE } from "../constants/telemetry";

/**
 * instrumentation-http names the server span after the method alone — it runs
 * before Hono routes, so it cannot know the pattern. This renames the span once
 * routing has happened. `routePath(c, -1)` is the last matched route: the
 * handler's pattern, or `/*` for a 404, so a scanner hitting random paths
 * cannot mint one span name per path.
 *
 * Without the SDK there is no active span and this is a no-op, which is why
 * `app.ts` can use it while tests never load OpenTelemetry.
 */
export const spanName = (): MiddlewareHandler => async (context, next) => {
  await next();

  const span = trace.getActiveSpan();
  if (!span) {
    return;
  }

  const route = routePath(context, -1);
  span.setAttribute(HTTP_ROUTE_ATTRIBUTE, route);
  span.updateName(`${context.req.method} ${route}`);
};
```

- [x] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @allonfire/api exec vitest run src/features/telemetry/tests/span-name.test.ts`
Expected: PASS, 3 tests.

- [x] **Step 7: Wire it into the app**

In `apps/api/src/app.ts`, add the import beside the other feature imports (keep the import list sorted the way Biome expects):

```ts
import { spanName } from "./features/telemetry/middleware/span-name";
```

and add `.use(spanName())` directly after `.use(requestId())` in the `base` chain:

```ts
  const base = new Hono<AppBindings>()
    .use(requestId())
    .use(spanName())
    // Before anything that can fail, so `onError` always has a locale.
    .use(localeResolver())
```

- [x] **Step 8: Verify the whole suite, types and lint**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types && pnpm dlx ultracite check apps/api`
Expected: all pass, including `src/client.test-d.ts` (proves the `.use` kept the route chain intact).

---

### Task 3: Telemetry flush as the last shutdown step

**Files:**
- Modify: `apps/api/src/shared/constants/runtime.ts` (`SHUTDOWN_STEP`)
- Modify: `apps/api/src/shutdown.ts`
- Test: `apps/api/src/shutdown.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ShutdownDeps.flushTelemetry: () => Promise<void>` (required); `SHUTDOWN_STEP.TELEMETRY = "telemetry"`. Task 4 passes `shutdownTelemetry` here.

- [x] **Step 1: Update the existing tests and add the new ones**

Replace `apps/api/src/shutdown.test.ts` with:

```ts
import { describe, expect, it, vi } from "vitest";
import { createShutdown } from "./shutdown";

const recorder = (order: string[], name: string) => () => {
  order.push(name);
  return Promise.resolve();
};

describe("createShutdown", () => {
  it("closes the server, then Redis, the database, and flushes telemetry last", async () => {
    const order: string[] = [];

    const shutdown = createShutdown({
      closeServer: recorder(order, "server"),
      closeRedis: recorder(order, "redis"),
      closeDatabase: recorder(order, "database"),
      flushTelemetry: recorder(order, "telemetry"),
    });

    await shutdown();
    expect(order).toEqual(["server", "redis", "database", "telemetry"]);
  });

  it("gives up on a hung drain after the timeout", async () => {
    vi.useFakeTimers();
    const order: string[] = [];

    const shutdown = createShutdown({
      closeServer: () => new Promise<void>(() => undefined),
      closeRedis: recorder(order, "redis"),
      closeDatabase: recorder(order, "database"),
      flushTelemetry: recorder(order, "telemetry"),
      drainTimeoutMs: 10_000,
    });

    const done = shutdown();
    await vi.advanceTimersByTimeAsync(10_000);
    await done;

    expect(order).toEqual(["redis", "database", "telemetry"]);
    vi.useRealTimers();
  });

  it("continues shutting down when one step throws", async () => {
    const order: string[] = [];

    const shutdown = createShutdown({
      closeServer: recorder(order, "server"),
      closeRedis: () => Promise.reject(new Error("redis already gone")),
      closeDatabase: recorder(order, "database"),
      flushTelemetry: recorder(order, "telemetry"),
    });

    await expect(shutdown()).resolves.toBeDefined();
    expect(order).toEqual(["server", "database", "telemetry"]);
  });

  it("reports every other step when the telemetry flush fails", async () => {
    const shutdown = createShutdown({
      closeServer: () => Promise.resolve(),
      closeRedis: () => Promise.resolve(),
      closeDatabase: () => Promise.resolve(),
      flushTelemetry: () =>
        Promise.reject(new Error("collector unreachable")),
    });

    await expect(shutdown()).resolves.toEqual(["server", "redis", "database"]);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/api exec vitest run src/shutdown.test.ts`
Expected: FAIL — the order assertions miss `"telemetry"` (and `check-types` would reject the unknown `flushTelemetry` key).

- [x] **Step 3: Add the step name**

In `apps/api/src/shared/constants/runtime.ts`, extend `SHUTDOWN_STEP`:

```ts
export const SHUTDOWN_STEP = {
  SERVER: "server",
  REDIS: "redis",
  DATABASE: "database",
  TELEMETRY: "telemetry",
} as const;
```

- [x] **Step 4: Add the dependency and the step**

In `apps/api/src/shutdown.ts`, extend `ShutdownDeps`:

```ts
export type ShutdownDeps = {
  closeServer: () => Promise<void>;
  closeRedis: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  flushTelemetry: () => Promise<void>;
  drainTimeoutMs?: number;
};
```

and extend the `steps` list, with a comment on why it is last:

```ts
    // Telemetry flushes last so the spans of the closes above are exported too.
    const steps: readonly [ShutdownStep, () => Promise<void>][] = [
      [SHUTDOWN_STEP.REDIS, deps.closeRedis],
      [SHUTDOWN_STEP.DATABASE, deps.closeDatabase],
      [SHUTDOWN_STEP.TELEMETRY, deps.flushTelemetry],
    ];
```

- [x] **Step 5: Run to verify it passes**

Run: `pnpm --filter @allonfire/api exec vitest run src/shutdown.test.ts`
Expected: PASS, 4 tests.

- [x] **Step 6: Keep `index.ts` compiling**

`flushTelemetry` is now required, so `src/index.ts` no longer type-checks. Add a stopgap to its `createShutdown({...})` call, after `closeDatabase`; Task 4 Step 7 replaces it with the real flush:

```ts
  closeDatabase: () => prisma.$disconnect(),
  flushTelemetry: () => Promise.resolve(),
```

Run: `pnpm --filter @allonfire/api check-types && pnpm --filter @allonfire/api test`
Expected: both pass.

---

### Task 4: SDK bootstrap, preload and Local configuration

**Files:**
- Create: `apps/api/src/features/telemetry/telemetry.ts`
- Create: `apps/api/src/features/telemetry/register.ts`
- Create: `apps/api/src/features/telemetry/tests/telemetry.test.ts`
- Modify: `apps/api/src/index.ts` (pass `flushTelemetry`)
- Modify: `apps/api/package.json` (dependencies, `dev`, `predev`)
- Modify: `apps/api/.env.example`

**Interfaces:**
- Consumes: `OTLP_ENDPOINT_ENV`, `REQUEST_URL_BASE` (Task 2); `PROBE_PATHS: ReadonlySet<string>` from `features/health/constants/routes.ts`; `ShutdownDeps.flushTelemetry` (Task 3).
- Produces: `isIgnoredRequest(request: Pick<IncomingMessage, "url">): boolean`, `startTelemetry(): void`, `shutdownTelemetry(): Promise<void>`.

- [x] **Step 1: Write the failing test (Review Focus 4)**

Create `apps/api/src/features/telemetry/tests/telemetry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isIgnoredRequest } from "../telemetry";

describe("isIgnoredRequest", () => {
  it.each(["/health", "/ready", "/health?probe=1"])(
    "ignores the probe %s",
    (url) => {
      expect(isIgnoredRequest({ url })).toBe(true);
    }
  );

  it.each(["/openapi.json", "/v1/health", "/healthz", "/"])(
    "traces %s",
    (url) => {
      expect(isIgnoredRequest({ url })).toBe(false);
    }
  );

  it("traces a request with no url rather than throwing", () => {
    expect(isIgnoredRequest({ url: undefined })).toBe(false);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/api exec vitest run src/features/telemetry/tests/telemetry.test.ts`
Expected: FAIL — cannot resolve `../telemetry`.

- [x] **Step 3: Install the SDK packages**

Run:
```bash
pnpm --filter @allonfire/api add \
  @opentelemetry/sdk-node@^0.222.0 \
  @opentelemetry/instrumentation@^0.222.0 \
  @opentelemetry/instrumentation-http@^0.222.0 \
  @opentelemetry/instrumentation-ioredis@^0.70.0 \
  @opentelemetry/instrumentation-pino@^0.68.0 \
  @opentelemetry/exporter-trace-otlp-proto@^0.222.0 \
  @opentelemetry/exporter-metrics-otlp-proto@^0.222.0 \
  @opentelemetry/exporter-logs-otlp-proto@^0.222.0 \
  @opentelemetry/sdk-metrics@^2.11.0 \
  @opentelemetry/sdk-logs@^0.222.0 \
  @prisma/instrumentation@~6.19.3
```
Expected: all listed under `dependencies`. `@opentelemetry/instrumentation` must be a direct dependency: pnpm is strict, and `register.ts` resolves `@opentelemetry/instrumentation/hook.mjs` from `apps/api`. `@prisma/instrumentation` stays on the 6.19 line to match `@prisma/client` 6.19 in `packages/database`.

- [x] **Step 4: Write the SDK module**

Create `apps/api/src/features/telemetry/telemetry.ts`:

```ts
/**
 * The OpenTelemetry SDK. Started by `register.ts`, which `dev` preloads with
 * `--import`; `app.ts` never imports this file, so tests run without it.
 *
 * Configuration is the standard `OTEL_*` variables, read by the SDK itself and
 * deliberately absent from the zod schema: this runs before `environment.ts`,
 * and bad telemetry settings should cost telemetry, not the boot.
 *
 * Export failures (OpenObserve down, wrong credentials) are logged through
 * OTel's diag channel and dropped once the batch queue fills. They never throw
 * into a request.
 */
import type { IncomingMessage } from "node:http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { PROBE_PATHS } from "../health/constants/routes";
import { OTLP_ENDPOINT_ENV, REQUEST_URL_BASE } from "./constants/telemetry";

let sdk: NodeSDK | undefined;

/** Probes run on a fixed schedule; a span per probe buries real traffic. */
export const isIgnoredRequest = (
  request: Pick<IncomingMessage, "url">
): boolean =>
  PROBE_PATHS.has(new URL(request.url ?? "/", REQUEST_URL_BASE).pathname);

export function startTelemetry(): void {
  if (sdk || !process.env[OTLP_ENDPOINT_ENV]) {
    return;
  }

  // ponytail: every trace is sampled (the SDK default). Set
  // OTEL_TRACES_SAMPLER=parentbased_traceidratio if span volume ever matters.
  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [
      new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() }),
    ],
    logRecordProcessors: [
      new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() }),
    ],
    instrumentations: [
      new HttpInstrumentation({ ignoreIncomingRequestHook: isIgnoredRequest }),
      new IORedisInstrumentation(),
      new PinoInstrumentation(),
      new PrismaInstrumentation(),
    ],
  });
  sdk.start();
}

/** Exports whatever is still buffered. A no-op when the SDK never started. */
export async function shutdownTelemetry(): Promise<void> {
  await sdk?.shutdown();
}
```

- [x] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @allonfire/api exec vitest run src/features/telemetry/tests/telemetry.test.ts`
Expected: PASS, 8 tests. (Importing the module does not start the SDK; only `startTelemetry()` does.)

- [x] **Step 6: Write the preload entry**

Create `apps/api/src/features/telemetry/register.ts`:

```ts
/**
 * Preloaded by `dev` with `--import`, before `src/index.ts` loads anything.
 *
 * In ESM, instrumentation cannot patch a module after it has loaded — import
 * bindings are live and read-only. The loader hook intercepts modules as they
 * load, so it is registered first, and the SDK is imported dynamically after
 * it, so that `http`, `ioredis` and `pino` all load through the hook.
 */
import { register } from "node:module";

register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

const { startTelemetry } = await import("./telemetry");
startTelemetry();
```

- [x] **Step 7: Pass the flush to shutdown**

In `apps/api/src/index.ts`, add the import beside the other feature imports:

```ts
import { shutdownTelemetry } from "./features/telemetry/telemetry";
```

and add the dependency to the `createShutdown({...})` call, after `closeDatabase` (replacing the Task 3 stopgap):

```ts
  closeDatabase: () => prisma.$disconnect(),
  flushTelemetry: shutdownTelemetry,
```

`index.ts` gets the same module instance `register.ts` started, because the ESM loader caches it by URL. When `dev` runs without the preload, `sdk` is undefined and the flush is a no-op.

- [x] **Step 8: Wire the scripts and the env example**

In `apps/api/package.json`, change two scripts:

```json
    "dev": "tsx watch --env-file=.env --import ./src/features/telemetry/register.ts src/index.ts",
    "predev": "docker compose -f ../../docker/docker-compose.dev.yml up -d redis openobserve",
```

Append to `apps/api/.env.example`:

```bash

# OpenTelemetry. Read by the SDK itself, not by the zod schema — a bad value
# costs telemetry, never the boot. Delete OTEL_EXPORTER_OTLP_ENDPOINT to switch
# telemetry off. The header is Basic auth for Local OpenObserve's root user
# (root@allonfire.local / Allonfire#dev12), with the space encoded as %20.
# UI: http://localhost:5080
OTEL_SERVICE_NAME="allonfire-api"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:5080/api/default"
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic%20cm9vdEBhbGxvbmZpcmUubG9jYWw6QWxsb25maXJlI2RldjEy"
```

Then copy the three `OTEL_*` lines into your own `apps/api/.env`.

- [x] **Step 9: End-to-end check, then the failure case (Review Focus 1)**

Run: `pnpm --filter @allonfire/api dev` (leave it running in another terminal).

Run: `curl -s -o /dev/null http://localhost:3300/openapi.json; curl -s -o /dev/null http://localhost:3300/nope; curl -s -o /dev/null http://localhost:3300/health`

Wait ~10 seconds (batch export delay), then in OpenObserve (`http://localhost:5080`, org `default`):
- **Traces**, service `allonfire-api`: spans named `GET /openapi.json` and `GET /*`, each with a Redis child span from the rate limiter. **No** span for `/health`.
- **Logs**: the request log lines from `hono-pino`, each carrying a `trace_id` that matches one of those traces.
- **Metrics**: `http.server.request.duration` present (first export can take up to 60 seconds).

If Redis child spans are missing, the ESM hook did not take effect: confirm `@opentelemetry/instrumentation` is a direct dependency and that `register.ts` is the file passed to `--import`.

Now stop OpenObserve while the API keeps running:

Run: `docker stop allonfire-openobserve && curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3300/openapi.json`
Expected: `200`. The API terminal may print an OTel export warning; requests are unaffected.

Run: `docker start allonfire-openobserve`

Stop the API with Ctrl+C.
Expected: the `shutdown complete` log line lists `completed: ["server","redis","database","telemetry"]`.

- [x] **Step 10: Telemetry off with an old `.env` (Review Focus 2)**

Comment out the `OTEL_EXPORTER_OTLP_ENDPOINT` line in `apps/api/.env`, run `pnpm --filter @allonfire/api dev`, then `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3300/openapi.json`.
Expected: `200`, no OTel warnings, and no new traces in OpenObserve. Restore the line afterwards.

- [x] **Step 11: Suite, types, lint**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types && pnpm dlx ultracite check apps/api`
Expected: all pass. No existing test changed except `shutdown.test.ts` (Task 3), which proves the SDK stays out of the test path.

---

### Task 5: ADRs for the tooling decisions

**Files:**
- Create: `docs/adr/0004-rest-openapi-hc-client.md`
- Create: `docs/adr/0005-dokploy-delivery-no-iac.md`
- Create: `docs/adr/0006-self-hosted-observability.md`

**Interfaces:**
- Consumes: the decisions table and Environments section of the spec.
- Produces: the ADR paths Task 6 links to, and the Task 1 compose comment's reference to `0006`.

- [x] **Step 1: Write ADR 0004**

Create `docs/adr/0004-rest-openapi-hc-client.md`:

```markdown
# The API contract is REST with OpenAPI, consumed through `hc`

The API speaks REST, documented as OpenAPI 3.1 by `hono-openapi` and rendered
by Scalar at `/reference`. TypeScript clients call it through Hono's
`hc<ApiType>` from `@allonfire/api/client`, which derives request and response
types from the chained routes with no code generation.

## Considered Options

- **tRPC.** Gives end-to-end types, but `hc` already does, from the same route
  definitions the OpenAPI document comes from. tRPC would be a second contract
  beside the first, and it does not produce OpenAPI, which non-TypeScript
  callers and the docs page need.
- **gRPC.** Browsers and React Native cannot speak it natively; every client
  would need a grpc-web proxy. There is no service-to-service traffic for it to
  make faster.

## Consequences

Routes must stay chained or `hc` loses its types (`src/client.test-d.ts` guards
this). Revisit if a non-TypeScript service ever needs a streaming RPC contract.
```

- [x] **Step 2: Write ADR 0005**

Create `docs/adr/0005-dokploy-delivery-no-iac.md`:

```markdown
# Delivery stays on GitHub Actions and Dokploy; no Kubernetes tooling, no IaC

CI runs on GitHub Actions and Dokploy deploys by git push to one Hetzner VPS
running docker compose behind Traefik. We are not adopting ArgoCD, Helm,
Terraform or OpenTofu.

ArgoCD and Helm both presuppose Kubernetes, which this project does not run;
ArgoCD alone idles near 1 GB on a box with ~4 GB free and no swap. Terraform or
OpenTofu would describe a single server that `hetzner-create`'s cloud-init
already provisions reproducibly, while the compose files in `docker/` already
describe the application layer declaratively.

## Consequences

Revisit IaC (OpenTofu, the open-source Terraform fork) when a second server
appears, and Kubernetes tooling only when a workload outgrows one VPS.
```

- [x] **Step 3: Write ADR 0006**

Create `docs/adr/0006-self-hosted-observability.md`:

```markdown
# Telemetry and Analytics are self-hosted: OpenObserve and Umami

The API emits Telemetry through the OpenTelemetry SDK over OTLP to a
self-hosted OpenObserve. Errors need no separate tool: a 5xx marks its request
span as failed, and the `unhandled error` pino line carrying the stack shares
that span's `trace_id`. Analytics goes to a self-hosted Umami. No data leaves the VPS
and nothing costs money.

## Considered Options

- **PostHog.** Self-hosting needs ClickHouse and Kafka, around 16 GB of RAM.
- **SaaS free tiers** (PostHog Cloud, Grafana Cloud). Free and zero-RAM, but
  data about family members' usage leaves the VPS, and free-tier limits change.
- **Grafana LGTM, SigNoz, HyperDX, Uptrace.** Four services, or ClickHouse.
  OpenObserve is one binary that stores on local disk or S3.
- **GlitchTip for errors.** One more service; revisit if OpenObserve's
  grouping or alerting proves insufficient.

## Production topology (defined, not yet built)

| | Production |
|---|---|
| OpenObserve UI | `observe.isaiariva.com`, behind the `admin-gate@file` Traefik middleware |
| OTLP ingest | internal docker network only, never published |
| OpenObserve storage | MinIO bucket, 14-day retention |
| Umami | `analytics.isaiariva.com`, `umami` database on the Dokploy Postgres |
| Memory caps | OpenObserve 768 MB, Umami 384 MB |
| Images | pinned, same tags as Local |

## Consequences

Because the SDK speaks OTLP, the backend can be swapped without touching API
code. The memory caps are not optional: the VPS has no swap, so an uncapped
telemetry service can push the OOM killer onto Postgres.
```

- [x] **Step 4: Check numbering and links**

Run: `ls docs/adr/`
Expected: `0001`–`0006`, no gaps or duplicates.

---

### Task 6: Documentation updates

**Files:**
- Modify: `apps/api/README.md` (new "Telemetry" section before "## Tests"; update the "Running it" comment)
- Modify: `CLAUDE.md` (API tree; VPS line)
- Modify: `docs/superpowers/specs/2026-08-27-hono-api-scaffold-design.md:518`

**Interfaces:**
- Consumes: ADR paths from Task 5; ports and credentials from Global Constraints.
- Produces: nothing downstream.

- [x] **Step 1: README — Running it**

In `apps/api/README.md`, change the `dev` comment line:

```bash
pnpm --filter @allonfire/api dev      # starts Redis and OpenObserve via predev, then tsx watch
```

- [x] **Step 2: README — Telemetry section**

Insert before `## Tests`:

````markdown
## Telemetry

`dev` preloads `src/features/telemetry/register.ts`, which starts the
OpenTelemetry SDK when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. `.env.example`
sets it, so telemetry is on by default; delete the line to switch it off. The
`OTEL_*` variables are read by the SDK, not by the zod schema — a bad value
costs telemetry, never the boot.

Traces, logs and metrics land in OpenObserve:

```
http://localhost:5080    root@allonfire.local / Allonfire#dev12
```

Each request is one trace, named after its route pattern (`GET /v1/things/:id`),
with Prisma and Redis child spans. Every pino line carries a `trace_id` linking
it to its trace. `/health` and `/ready` are not traced.

Tests never load the SDK: `app.ts` only uses the span-naming middleware, which
does nothing without an active span. Why OpenObserve, and what Production will
look like: `docs/adr/0006-self-hosted-observability.md`.
````

- [x] **Step 3: CLAUDE.md — API tree**

In `CLAUDE.md`, replace:

```
    │   ├── rate-limit/   constants/limits, middleware/rate-limiter
    │   └── redis/        redis
```

with:

```
    │   ├── rate-limit/   constants/limits, middleware/rate-limiter
    │   ├── redis/        redis
    │   └── telemetry/    constants/telemetry, middleware/span-name,
    │                     register (--import preload), telemetry — OTel SDK
```

The leading `│` on the continuation line belongs to `features/`, which still has a sibling (`shared/`) below it.

- [x] **Step 4: CLAUDE.md — VPS line**

Replace:

```
- VPS: Hetzner CAX11 at 188.245.174.30 (ssh main-vps)
```

with:

```
- VPS: Hetzner, 4 vCPU / 8 GB RAM, no swap, at 188.245.174.30 (ssh main-vps)
- Observability: self-hosted OpenObserve + Umami (Local only so far) — see `docs/adr/0006-self-hosted-observability.md`
```

- [x] **Step 5: Scaffold spec — resolve the deferred row**

In `docs/superpowers/specs/2026-08-27-hono-api-scaffold-design.md`, replace:

```
| Sentry / OpenTelemetry / Prometheus | a failure pino cannot explain |
```

with:

```
| Sentry / OpenTelemetry / Prometheus | resolved: OpenTelemetry to OpenObserve, see `2026-09-23-backend-platform-tooling-design.md` |
```

- [x] **Step 6: Verify**

Run: `grep -n "telemetry/" CLAUDE.md && grep -n "## Telemetry" apps/api/README.md && grep -n "resolved: OpenTelemetry" docs/superpowers/specs/2026-08-27-hono-api-scaffold-design.md`
Expected: one hit each.

## Implementation Log
- Implemented: 2026-09-23T19:06:37+02:00
- Workspace: fresh-branch — feat/backend-platform-tooling-local
- Committed: no — awaiting user review
- Post-review change: Local credentials are `allonfire` / `allonfire` for Umami (renamed by a new one-shot `umami-user-init`); OpenObserve cannot accept that and uses `allonfire@allonfire.local` / `Allonfire#1`. The credentials in Global Constraints above are superseded.
- Post-review redesign (user choice): the loader hook, `hook.mjs`, `start.ts`, the span-name middleware and instrumentation-http/-ioredis/-pino were replaced by `@hono/otel` (request spans + metric), a pino `mixin` + `pino-opentelemetry-transport` (logs), with Prisma unchanged. Redis calls are no longer traced. `pino` moved 9 -> 10 for the transport.
- Post-review change (user rule): `OTEL_*` moved into the zod env schema; code reads `env`, never `process.env`, and passes url/headers/service name to every exporter explicitly. A malformed value now fails the boot. Supersedes the spec's "not in the zod schema" decision.
- Post-review rule: every added npm package has >= 200k weekly downloads (lowest: pino-opentelemetry-transport 241k, @hono/otel 327k).
- Post-review audit (official docs, 13 items applied): OpenTelemetry failures now reach the API log (diag → pino); probes trace nothing, including /ready's database check; `url.full` drops the query string; 4xx spans stay unset; @hono/otel metric points carry service name and version; the SDK no longer builds an idle env-configured log pipeline; traces, metrics and logs share one resource; request logs keep only allowlisted headers; Prisma instrumentation pinned to the client's version (6.19.3) and its startup spans ignored; OpenObserve `ZO_TELEMETRY=false`, a binary healthcheck, and localhost-only ports; Umami `DISABLE_TELEMETRY`, `DISABLE_UPDATES`, `PRIVATE_MODE`, localhost-only port. Production settings from the same audit are recorded in ADR 0006.
- Post-review change: Prisma client, CLI and @prisma/instrumentation all moved to 6.19.3 (latest 6.x), same ^6.19.3 range so they move together. Prisma 7 stays a separate plan.
