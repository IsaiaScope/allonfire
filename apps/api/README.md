# @allonfire/api

The HTTP backend for the AllOnFire apps. Hono on Node, auth via the Auth module
(`packages/auth`) under `/v1/auth`, and the Images every App shows under
`/v1/images`.

## Running it

```bash
cp .env.example .env
pnpm --filter @allonfire/api dev      # starts Redis, OpenObserve and MinIO via predev, then tsx watch
```

Then: `http://localhost:3300/health`, `/ready`, `/reference`.

`.env` is required — `dev` passes `--env-file=.env` to Node, so a missing file
fails at startup rather than deep inside the env schema. Tests do not read it;
they get their values from `vitest.setup.ts`.

## Environment

Every variable is documented in `.env.example`. `DATABASE_URL`, `API_REDIS_URL`,
`API_CORS_ORIGINS`, `AUTH_SECRET`, `AUTH_URL`, `STORAGE_ENDPOINT`,
`STORAGE_ACCESS_KEY` and `STORAGE_SECRET_KEY` are required — the process exits
at boot if any is missing. The `STORAGE_*` names say storage, not MinIO, so the
server behind them can change without renaming them.

## Auth

Better Auth runs inside the API, built from the Auth module (`packages/auth`)
and mounted at `/v1/auth`. `src/features/auth/auth.ts` builds the instance;
`createApp` loads the Session once per request, after the rate limiters.

- **Guards** — `requireSession` and `requireApp(App.LAURA)`
  (mounted once per App) from `@allonfire/auth/features/hono/guards/middleware/*`. They throw
  `HTTPException(401 | 403)` and `onError` renders the localised problem
  document. A failing Session lookup is a 500, never anonymous.
- **Auth bucket** — the routes where Better Auth checks or hashes a password,
  `POST /v1/auth/sign-in/email`, `POST /v1/auth/sign-up/email` and
  `POST /v1/auth/change-password`, share one
  limit on top of the global one: `AUTH_RATE_LIMIT_MAX` attempts per
  `AUTH_RATE_LIMIT_WINDOW_MS` per client IP (default 10 per 15 minutes). Like
  the global limiter it fails open when Redis is down.
- **Sessions live in Postgres**, read through Better Auth's five-minute cookie
  cache, so a revoked Session reaches the guards up to five minutes late. A
  User's Memberships are read on every Session read, so a Role change counts
  at once (ADR 0019). Redis db 2 stays reserved; see ADR 0009.
- **Docs** — Better Auth's endpoints appear in `/openapi.json` and `/reference`
  under the `Auth` tag. The plugin's own schema route and reference page are off.
- **Registration is per App** (`APP_SETTINGS`, ADR 0019): `/sign-up/email` and
  `/join-app` need `x-aof-app` naming an App open to it, otherwise 403
  `REGISTRATION_CLOSED`; every App is closed today. A sign-in with `x-aof-app`
  answers 403 `APP_FORBIDDEN` to a User that App does not let in.

## Images

The Image module from `@allonfire/storage`, mounted at `/v1/images` (ADR 0013,
ADR 0015). Its errors are `CodedError`s the API renders as its own localized
problem documents. Files go to the public
`image` bucket as `<uuid>.avif`, prepared by `@allonfire/storage` (HEIC
decoded, upright, EXIF stripped, capped at 2560px, AVIF, 16px blur); rows live in
`image."Image"`, placements in `image."ImageApp"`. Apps render them with `AOFStorageImage` through their `/storage/images/*`
rewrite.

| Endpoint | Guard | Does |
|---|---|---|
| `GET /v1/images?app=&cursor=&limit=` | none | the Images visible in `app` (any App when left out): placed there, and public or in an App the User enters; newest upload first; `nextCursor` (opaque) pages; never 403 |
| `GET /v1/images/:id` | none; 404 unless visible in some App | one Image |
| `POST /v1/images` | Session; `ADMIN` in every App named | multipart: repeated `file` parts plus one `meta` JSON part, `[{ apps: [{ app, public? }], alt: { en, it } }]` in file order |
| `PATCH /v1/images` | Session; `ADMIN` in each App whose placement is added, removed or switched public; for `alt`, in every App the Image is in | `[{ id, apps?, alt? }]`, each Image once: `apps` is the full new list; a `public` left out keeps the placement's own |
| `DELETE /v1/images` | Session; with `app`, `ADMIN` there; without, in every App the Image is in | `{ ids, app? }`: with `app`, takes the Images out of it and deletes those left in none; without, deletes them everywhere; rows first, then files |

- **All or nothing.** One bad file rejects the whole upload (415), an unknown
  id rejects a whole PATCH or DELETE (404). A failed insert deletes the files
  it already stored.
- **Limits:** 20 MiB per file and 100 MiB per upload (413 naming the limit
  crossed), 20 files per upload, 100 items per PATCH or DELETE. The upload
  skips the API-wide 1 MiB body limit and brings its own.
- **App values are the enum names**, `LAURA` and `BACK_OFFICE`, not the
  lowercase the database stores. An App appears once in a list (400
  otherwise). A batch with one Image the User cannot see answers 404, before
  any 403, and writes nothing.
- **Readable by key, never listable.** In dev, `minio-init` creates the bucket
  with an anonymous policy allowing only `s3:GetObject` on `images/*`; in
  production apply the same JSON with `mc anonymous set-json`. Never
  `mc anonymous set download`: it also grants `ListBucket`, which would list
  every key. Each App's rewrite proxies `/storage/images/:key` only, for the same reason.

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
| 0 | rate-limit counters, incl. `ratelimit:auth:*` | always |
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
