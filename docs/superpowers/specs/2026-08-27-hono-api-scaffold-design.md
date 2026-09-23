# Hono API Scaffold — Design

**Date:** 2026-08-27
**Status:** Approved and grilled, ready for implementation plan

## Goal

Add `apps/api`, a Node backend built on Hono, to the AllOnFire monorepo. This
plan delivers the foundation only: a server that boots, validates its own
configuration, logs and fails predictably, rate-limits with Redis, and exposes a
type-safe client contract for future consumers. It runs locally and in CI. It
does not reach the VPS.

## Why now

AllOnFire has one app (`apps/laura`, Next.js 16) whose backend logic lives in
Next server actions. A React Native app is planned that will share the same
users and the same data. Server actions cannot serve a non-Next client, so a
standalone HTTP backend is required.

Rather than migrate auth and domain endpoints in one step, this plan builds the
foundation those things will land on. The API ships with no authentication and
no domain endpoints. Laura is not modified.

## Naming

The app is `apps/api`, package `@allonfire/api`, not `server`. Two existing
meanings already claim that word in this repo: `packages/auth/src/server.ts` is
the Better Auth instance, and `CLAUDE.md` uses "Server Components" throughout
for Next rendering. `api` has no collision, reads correctly at call sites
(`import type { AppType } from '@allonfire/api/client'`), and matches the
eventual `api.isaiariva.com`.

## Non-goals

- Better Auth migration (next plan)
- Any Laura domain endpoint (gallery, games, upload, quiz)
- Any change to `apps/laura` beyond adding a missing `.env.example`
- Production build, Docker image, compose services, Traefik routing, DNS
- Caching, background jobs, metrics, tracing, error-reporting services

## Current state

- pnpm workspace, Turborepo, Biome/Ultracite, Node 22 (volta), vitest 4
- One app: `apps/laura` (ports 3200 / 3201). 3300 is free
- Seven packages: `auth`, `config`, `database`, `hooks`, `storage`, `ui`, `utils`
- `@allonfire/database` exports a Prisma client plus six domain services
- `@allonfire/auth` is React- and Next-coupled and is not consumed by this plan
- CI runs lint, type check, and tests, with a Postgres service container
- No Redis anywhere in the repo or on the VPS
- Env convention: gitignored `.env` per package; only `packages/database` ships
  a `.env.example`

Two facts found during grilling that shape the design:

**Prisma uses the `prisma-client` generator**, not `prisma-client-js`. It emits
TypeScript into the repo (`packages/database/generated/prisma/client.ts`), which
sets `globalThis['__dirname']` from `import.meta.url` and loads a native engine
binary relative to it. Bundling rewrites that URL and breaks engine resolution.

**Zod 4 implements Standard Schema natively**, so `@hono/standard-validator`
works with no per-library adapter and no version-lag risk.

## Architecture

### Layout

```
apps/api/
  src/
    index.ts          boot: build deps, serve(), signals, shutdown
    app.ts            createApp(deps) -> chained Hono app; exports AppType
    env.ts            zod env schema, validated at import time
    lib/
      logger.ts       pino instance
      errors.ts       error envelope, ErrorCode union, onError handler
      redis.ts        ioredis client factory
      rate-limit.ts   limiter + Lua-backed Redis store
    routes/
      health.ts       createHealthRoutes(deps) -> /health and /ready
  .env.example
  README.md
  package.json
  tsconfig.json
  vitest.config.ts
```

No `controllers/` or `services/` directories. Domain logic already lives in
`@allonfire/database`; route handlers stay thin — validate, call a service,
shape a response.

### createApp(deps)

`app.ts` exports a factory, not a module-scope app:

```ts
export const createApp = (deps: AppDeps) =>
  new Hono<AppBindings>()
    /* middleware */
    .route('/', createHealthRoutes(deps))

export type AppType = ReturnType<typeof createApp>
```

`AppDeps` carries the rate-limit store and the two health checkers. `index.ts`
builds the real ones; tests pass stubs.

This is not ceremony — it fixes a genuine contradiction. With module-scope
construction, `app.ts` builds a Redis-backed limiter at import, so *every* test
importing it opens a socket, and the claim that most tests need no container is
false. A factory is the only shape where that claim holds, and it gives the
future Better Auth instance an injection slot that already exists.

### index.ts owns the process

`index.ts` is the only file that touches the network or `process`. Tests import
`app.ts`, call `createApp(stubs)`, and use `app.request(...)` in-process: no
ports, no teardown, no flake, full middleware-chain coverage at unit-test speed.

### Route modules are chained sub-apps

```ts
export const createHealthRoutes = (deps: Deps) =>
  new Hono()
    .get('/health', (c) => c.json({ status: 'ok', version, uptime } as const))
    .get('/ready', async (c) => { /* per-check status */ })
```

A hard rule, not a style preference: `hc<AppType>` derives client types from the
chained return value. Routes written as separate `app.get(...)` statements
silently degrade those types to nothing, and retrofitting means touching every
route. A type test guards it.

### No build step

There is no bundler and no `build` task for this package. tsup was in an earlier
draft to solve "Node cannot import raw `.ts` from workspace packages" — a
production problem this plan does not have. Locally the API runs under
`tsx watch`; `check-types` (`tsc --noEmit`) covers type safety; vitest covers
behaviour.

Bundling is deferred to the deploy plan, where it can be validated end to end,
and where the cleaner alternative — making workspace packages emit `dist/` —
is on the table. That plan must also handle Prisma: `@prisma/client/runtime/library`
stays external, and the native engine binary has to resolve from wherever the
output lands.

### Dependencies

`@allonfire/database`, `@allonfire/utils`, `@allonfire/config`. Not
`@allonfire/auth`.

npm: `hono`, `@hono/node-server`, `@hono/standard-validator`, `hono-openapi`,
`@scalar/hono-api-reference`, `hono-rate-limiter`, `ioredis`, `pino`,
`pino-pretty` (dev), `@t3-oss/env-core`, `zod`.

### Type export

`apps/api/package.json` exposes `"./client": "./src/app.ts"` for type-only
consumption by Laura and the React Native app. It exports `AppType` and the
`ErrorCode` union, so clients switch on codes exhaustively rather than comparing
string literals. Nothing consumes it in this plan.

## Request pipeline

```
  request
    |
  1. request-id      reuse X-Request-Id if present, else generate
  2. logger          pino child logger bound to that id, on context
  3. secure-headers  fed from @allonfire/utils securityHeaders
  4. cors            explicit origin allowlist, credentials: true
  5. body-limit      1 MB
  6. timeout         30s
  7. rate-limit      before auth, sheds load before touching the DB
    |
  routes -> per-route sValidator -> handler
    |
  notFound / onError -> single error envelope
```

Order is a security property. Rate limiting sits after timeout so a slow
connection is capped rather than occupying a limiter slot, and before auth so
load is shed before database work.

`credentials: true` is set now although nothing sends a cookie yet. It is
incompatible with a wildcard origin, which is why it surfaces as a confusing
CORS failure mid-auth-migration; the explicit allowlist already in place makes
it safe to set early.

### Probe exemption

`/health` and `/ready` are excluded from the rate limiter and the request
logger. They keep secure headers and the error handler.

The healthcheck hits `/health` every 30 seconds forever. Inside the limiter that
traffic shares a bucket with real users and, arriving from one source, a tight
limit could throttle the healthcheck into a restart loop. In the log it buries
real requests.

Documentation routes are **not** exempt. Probe traffic is self-generated on a
fixed schedule; `/openapi.json` and `/reference` are publicly reachable when
enabled and are exactly what a scanner enumerates.

### Typed context

```ts
type AppBindings = { Variables: { requestId: string; logger: Logger } }
```

Handlers log through `c.var.logger`, never a global, so every line carries the
request id automatically.

### Error envelope

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "...", "requestId": "01JQ..." } }
```

RFC 9457 problem+json was considered and rejected: its `type` URI targets
third-party consumers that do not exist, while a stable `code` string types
cleanly as a union for the RN client.

`onError` handles three cases:

| Thrown | Response |
|---|---|
| `HTTPException` | its status, code mapped from status |
| `ZodError` / Standard Schema failure | 400 `VALIDATION_FAILED` with field paths and messages |
| anything else | 500 `INTERNAL_ERROR`, generic message; full stack logged only |

No custom `AppError` class. Nothing in this plan throws a domain error, and
codes derive from status (`404 -> NOT_FOUND`, `429 -> RATE_LIMITED`). The class
arrives with the first route needing a code the status cannot express; the
envelope shape does not change when it does.

The last row is load-bearing. Unhandled Prisma errors carry table and column
names in `message`; echoing them on a 500 is an information leak. The client
receives only a code and the request id.

A shared validator hook reshapes validation failures into this envelope,
exposing only `path` and `message` per field rather than the raw error.

`ApplyGlobalResponse` from `hono/client` merges the envelope into the RPC types,
so clients type-check both success and error shapes.

### Logging

pino. JSON to stdout in production, `pino-pretty` in development, level from
`LOG_LEVEL`. One line per non-probe request: method, path, status, duration,
request id.

Redaction is configured once:

```ts
redact: ['req.headers.authorization', 'req.headers.cookie',
         'res.headers["set-cookie"]', '*.password', '*.token']
```

Request bodies are never logged. This exists before auth does, so the login
endpoint cannot write plaintext passwords on its first day.

### Proxy-aware rate-limit keying

Traefik will eventually front the API, making the socket remote address
identical for every request. A limiter keyed on it treats all users as one
client. Reading the client-supplied leftmost `X-Forwarded-For` entry instead is
a spoofable bypass.

`TRUSTED_PROXY_HOPS` (default 0) says how many hops in front are trustworthy.
At 0 the key is the socket address. At 1 it is the entry the trusted proxy
appended, counted from the **right** of the chain — each hop appends the address
it received from, so the rightmost entry is the only one a trusted party wrote
and everything left of it is client-supplied. Development runs at 0, the deploy
plan sets 1. Two tests: distinct forwarded IPs land in separate buckets (the bug
is invisible locally, where no proxy exists), and a client-supplied entry to the
left of the trusted hop is ignored rather than granting a fresh bucket.

### Rate-limited response

429 with the standard envelope (`code: "RATE_LIMITED"`), `Retry-After` in
seconds, and the draft `RateLimit-*` headers (limit, remaining, reset). A bare
429 leaves the RN client guessing; these let it back off correctly.

## Configuration and Redis

### Env schema

`@t3-oss/env-core` plus zod, validated at import time so a bad value kills the
boot rather than the third request.

| Variable | Notes |
|---|---|
| `NODE_ENV` | development / production / test |
| `PORT` | default 3300 |
| `LOG_LEVEL` | default info |
| `DATABASE_URL` | required; no explicit `connection_limit`, Prisma default stands |
| `REDIS_URL` | **required** |
| `CORS_ORIGINS` | comma-separated, parsed to array |
| `RATE_LIMIT_WINDOW_MS` | default 60000 |
| `RATE_LIMIT_MAX` | default 100 |
| `TRUSTED_PROXY_HOPS` | default 0 |
| `ENABLE_DOCS` | production only; default false |

`apps/api/.env` is gitignored; `apps/api/.env.example` is committed with every
variable and a comment per line. `apps/laura/.env.example` is added for the same
reason — it is currently missing.

### Redis is a required dependency

Redis is mandatory at boot. There is no in-memory production fallback. Local
friction is handled by a `predev` hook that starts the dev container.

Redis is **project-scoped**, not shared across the VPS. `maxmemory-policy`,
persistence settings, `FLUSHALL` and `BGSAVE` are all server-wide, not
per-database. A shared instance forces every project to agree on how Redis
behaves under memory pressure, and a cache-oriented policy (`allkeys-lru`) will
silently evict another project's session keys with no error and nothing in the
logs. Postgres is shared because it genuinely isolates — per-database roles,
per-database backups, no cross-database eviction. Share the engines that
isolate.

Target configuration: `maxmemory-policy volatile-lru`, 256 MB ceiling,
`--requirepass`, persistence off (`--save ""`), no Traefik labels. This plan
ships only the development container, which is password-free for `redis-cli`
access; `--requirepass` and the memory ceiling land with the deploy plan, while
`volatile-lru` and `--save ""` are set in development too so both environments
behave identically under memory pressure.

`volatile-lru` means only keys with an expiry can be evicted. The discipline
that follows: cache and rate-limit keys always set a TTL, session keys (later)
never do, making sessions structurally un-evictable.

Database index layout:

```
  db 0   rate-limit counters    keys expire
  db 1   cache                  keys expire      (reserved, unused)
  db 2   sessions               no expiry        (reserved, unused)
```

Only db 0 is used. No cache client is created — a connection with no consumer is
dead code.

### Rate limit store

`@hono-rate-limiter/redis` targets Upstash's HTTP client and does not match
`ioredis`. Rather than shim `rate-limit-redis`, the store is written directly
(~15 lines) against a Lua script:

```lua
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return count
```

Atomicity matters: `INCR` followed by a separate `EXPIRE` races, and a process
dying between them leaves a key with no expiry, rate-limiting that client
forever.

This is a fixed window. A client can burst up to twice the limit across a window
boundary. That ceiling is acceptable here and is recorded in a code comment
alongside the upgrade path (sorted-set sliding window).

### ioredis connection options

```ts
{ maxRetriesPerRequest: 1, enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 200, 5000) }
```

By default ioredis retries indefinitely and queues commands while disconnected,
so an outage produces hanging requests rather than errors. These settings make a
down Redis fail in milliseconds.

### Availability posture

Required at boot and required at runtime are separate decisions. The limiter
**fails open** on a transient outage: a Redis blip must not turn a working
gallery into a 503. Readiness reflects this asymmetry:

| Dependency down | `/ready` |
|---|---|
| Postgres | fail (503) |
| Redis | pass, warning logged |

Failing readiness on Redis would remove a container that is serving correctly.
This flips when sessions move into Redis — at that point Redis down means auth
is broken and readiness must fail. That is the recorded trigger for revisiting.

## Shutdown

On SIGTERM or SIGINT:

1. stop accepting new connections
2. wait for in-flight requests, hard cap 10s
3. `redis.quit()`
4. `prisma.$disconnect()`
5. exit 0

Order matters: disconnecting Prisma before in-flight requests finish makes them
fail rather than complete. A second signal during the drain exits immediately,
so a hung shutdown is always escapable.

## API surface

| Route | Purpose |
|---|---|
| `GET /health` | liveness; `{ status, version, uptime }`; touches nothing |
| `GET /ready` | readiness; per-check status for Postgres and Redis; 503 if Postgres is down |
| `GET /openapi.json` | generated spec |
| `GET /reference` | Scalar UI |

`version` comes from `package.json` and `uptime` from `process.uptime()`. Both
answer "which build is running" on a confusing deploy and leak nothing an
attacker gains from.

`/health` and `/ready` are unversioned — infrastructure endpoints are not part
of the API contract. Domain routes will mount under `/v1` via
`app.route('/v1', ...)`. No empty `/v1` module is created; the rule lives in
`apps/api/README.md`.

`/ready` returns per-check status rather than a boolean, so a failure names its
own cause.

### Documentation

`hono-openapi` with `describeRoute`, chosen over `@hono/zod-openapi` because it
is additive: routes stay ordinary chained Hono routes, `hc` inference is
unaffected, and undocumented routes still work and still appear in the spec. It
reads Standard Schema, so it composes with `sValidator`.

Docs render always in development. In production they require
`ENABLE_DOCS=true`, default off.

### CORS scope

CORS is a browser mechanism. React Native's `fetch` sends no `Origin` and is not
subject to same-origin policy, so `CORS_ORIGINS` lists Laura's domains only. RN
request failures will be TLS, URL, or auth — never CORS.

## Testing

vitest, colocated `*.test.ts`, every test calling `createApp(stubs)` and using
`app.request(...)`.

| Test | Catches | Needs Redis |
|---|---|---|
| env schema rejects missing/malformed vars | a deploy booting with `PORT="banana"` | no |
| unknown error → 500 generic body | Prisma internals leaking to clients | no |
| `HTTPException` → status + mapped code | envelope drift across routes | no |
| validation failure → 400 with field paths only | raw validation error escaping | no |
| rate limit keys on `X-Forwarded-For` | all users sharing one bucket behind a proxy | no |
| 429 carries `Retry-After` and `RateLimit-*` | clients unable to back off correctly | no |
| `/ready` matrix (Postgres down → 503, Redis down → 200) | a Redis blip pulling a healthy container from rotation | no |
| log output contains no `authorization` / `cookie` | passwords in logs once auth lands | no |
| `expectTypeOf` on `hc<AppType>` | a route rewritten un-chained, killing client types | no |
| Lua store: `TTL > 0` after first INCR, counter resets after window | the expiry-on-first-INCR contract | **yes** |

Nine stubbed tests, one integration test. The type test is included
deliberately: an un-chained route breaks no runtime test while silently turning
client types into `any`.

The Redis test hard-requires a container rather than skipping when unavailable —
a skipped test CI believes passed is worse than a red one. It catches the
connection failure and throws an actionable message naming the compose command.

## Local development and CI

```json
"predev": "docker compose -f ../../docker/docker-compose.dev.yml up -d redis",
"dev": "tsx watch src/index.ts",
"check-types": "tsc --noEmit",
"test": "vitest run"
```

`docker-compose.dev.yml` gains a Redis service, password-free, with
`volatile-lru` and `--save ""`.

The API stays in the root `pnpm dev`. Running it alongside Laura costs a few MB;
the alternative fails by having you debug a connection error against a server
you forgot to start.

CI gains a Redis service container mirroring the existing Postgres one, plus
`REDIS_URL` and `CORS_ORIGINS` in the test job's env. Both are mandatory:
`app.ts` imports `env.ts`, which validates at import, so without them every API
test fails at collection rather than at an assertion.

No build job changes — there is no build.

`turbo.json` gains `REDIS_URL`, `PORT`, `LOG_LEVEL`, `CORS_ORIGINS`,
`TRUSTED_PROXY_HOPS`, `ENABLE_DOCS` in `globalPassThroughEnv`.

## Documentation deliverables

**`apps/api/README.md`** — how to run it, the env vars, the chained-route rule
with its one-line example, the `/v1` mounting rule, the Redis db-index table.
Short. It is the file that stops the next route from silently breaking `hc`
types.

**`CLAUDE.md`** gains an `## API App Structure (apps/api/src/)` section mirroring
the depth of the existing Laura section: layout, chained-route rule, env vars,
Redis db indexes.

## Deferred

| Deferred | Trigger to add |
|---|---|
| Bundler, production Dockerfile, compose services, Traefik, DNS | when the API is ready to serve real traffic |
| Packages emitting `dist/` instead of raw `.ts` | the deploy plan, as the alternative to bundling |
| Better Auth migration | next plan |
| Laura domain endpoints | after auth |
| Cache client (db 1) | first endpoint slow enough to need it |
| Session store (db 2) | Better Auth migration; flips Redis readiness posture |
| `AppError` class | first domain error needing a code the status cannot express |
| Sliding-window rate limiting | boundary bursts observed in logs |
| Explicit Postgres `connection_limit` | connection timeouts observed under load |
| Sentry / OpenTelemetry / Prometheus | resolved: OpenTelemetry to OpenObserve, see `2026-09-23-backend-platform-tooling-design.md` |
| Queues (BullMQ) | first background job |
| CSRF middleware | arrives with cookie auth |

## Rollback

Laura never learns the API exists: no imports, no shared env vars, no route
changes. Reverting means deleting `apps/api`, one dev compose service, the CI
additions, and two documentation edits.

## Key decisions

| Decision | Rationale |
|---|---|
| Named `api`, not `server` | `server` already means Better Auth's instance and Next's Server Components |
| Hono on Node, not Bun | matches the volta pin and existing tooling |
| `createApp(deps)` factory | the only shape where tests genuinely need no Redis container |
| `index.ts` owns the process | port-free in-process tests, no flake |
| Chained route modules | the only form `hc<AppType>` can read |
| No bundler in this plan | there is no production artifact to bundle for |
| `sValidator` over `zValidator` | zod 4 speaks Standard Schema natively; no adapter lag |
| `hono-openapi` over `@hono/zod-openapi` | additive; preserves plain routes and RPC inference |
| Custom error envelope over RFC 9457 | stable `code` strings type better for own clients |
| No `AppError` yet | nothing throws a domain error; codes map from status |
| Probes exempt from limiter and logger | self-generated traffic must not throttle itself or bury real requests |
| Docs routes not exempt | publicly reachable when enabled |
| `TRUSTED_PROXY_HOPS` env var | the trusted-hop count differs between dev and prod; the leftmost entry is spoofable |
| CORS `credentials: true` now | inert today, removes a landmine from the auth plan |
| Redis project-scoped | eviction policy and persistence are server-wide settings |
| `volatile-lru` + TTL discipline | makes future session keys structurally un-evictable |
| Hand-written Lua store | the official Redis store targets Upstash, not ioredis |
| Rate limiter fails open | a cache dependency must not cause an outage |
| Redis down does not fail readiness | a degraded feature is not an outage |
| Redis test hard-required | a skipped test CI believes passed is the worse failure |
