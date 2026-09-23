# @allonfire/api

The HTTP backend for the AllOnFire apps. Hono on Node, no auth yet, no domain
endpoints yet.

## Running it

```bash
cp .env.example .env
pnpm --filter @allonfire/api dev      # starts Redis and OpenObserve via predev, then tsx watch
```

Then: `http://localhost:3300/health`, `/ready`, `/reference`.

`.env` is required — `dev` passes `--env-file=.env` to Node, so a missing file
fails at startup rather than deep inside the env schema. Tests do not read it;
they get their values from `vitest.setup.ts`.

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

**Domain routes mount under `/v1`**, through `API_VERSION_PREFIX`
(`src/shared/constants/routes.ts`) — never a hard-coded string:

```ts
.route(API_VERSION_PREFIX, createThingRoutes(deps))
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

The client runs with `enableOfflineQueue: false` so an outage fails fast instead
of queueing. Anything issuing a command at startup must `awaitReady()` first —
ioredis connects asynchronously, and a command sent before the socket is
writable throws rather than waiting.

## Telemetry

Telemetry is on when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, which `.env.example`
does. The `OTEL_*` variables are part of the zod env schema like every other
setting: a malformed endpoint or header list fails the boot, and code reads
them from `env`, never `process.env`.

Traces, logs and metrics land in OpenObserve. Its login is the one exception to
Local's `allonfire` / `allonfire`: OpenObserve refuses to boot unless the user
is an email and the password has upper, lower, digit and symbol.

```
http://localhost:5080    allonfire@allonfire.local / Allonfire#1
```

Where each signal comes from:

- **Request spans and `http.server.request.duration`**: `@hono/otel`, wrapped by
  `features/telemetry/middleware/request-spans.ts`. Spans are named after the
  route pattern (`GET /v1/things/:id`, or `GET /*` for a 404). On top of
  `@hono/otel`, the wrapper:
  - traces nothing for `/health` and `/ready`, not even `/ready`'s database check;
  - drops the query string from `url.full`, where tokens travel, and adds
    `url.path` / `url.scheme`;
  - leaves a 4xx span unset and marks only a 5xx as an error.
- **Prisma query spans**: `@prisma/instrumentation`, as children of the request.
  Its two one-off startup spans are ignored.
- **Logs**: a pino `mixin` stamps `trace_id`/`span_id` on lines logged inside a
  request, and `pino-opentelemetry-transport` ships every line to OpenObserve.
  Request lines record only the headers in `LOGGED_REQUEST_HEADERS`.
- **Redis**: not traced. ioredis can only be traced by patching it at load,
  which needs an ESM loader hook; see ADR 0006.
- **OpenTelemetry's own failures** (collector down, wrong password) appear in
  the API log as errors and warnings, instead of vanishing.

Traces, metrics and logs carry the same resource: `service.name`,
`service.version` and `deployment.environment.name` (`features/telemetry/resource.ts`).

`index.ts` calls `startTelemetry()` before `createApp`, because `@hono/otel`
binds its meter when the app is built. Nothing is patched, so there is no
preload and no import-order rule. Tests never start the SDK.

## Tests

```bash
pnpm --filter @allonfire/api test
```

All tests but one run with stubs and no container. The rate-limit integration
test requires Redis and will tell you the command to start it.
