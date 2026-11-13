# @allonfire/api

The HTTP backend for the AllOnFire apps. Hono on Node, auth via the Auth module
(`packages/auth`) under `/v1/auth`, and the Images every App shows under
`/v1/images`.

## Running it

```bash
cp .env.example .env
pnpm --filter @allonfire/api dev      # starts the redis, telemetry and storage services via predev, then tsx watch
```

Then: `http://localhost:3300/health`, `/ready`, `/reference`.

`.env` is required — `dev` passes `--env-file=.env` to Node, so a missing file
fails at startup rather than deep inside the env schema. Tests do not read it;
they get their values from `vitest.setup.ts`.

## Environment

Every variable is documented in `.env.example`. `DATABASE_URL`, `API_REDIS_URL`,
`API_CORS_ORIGINS`, `AUTH_SECRET`, `AUTH_URL`, `STORAGE_ENDPOINT`,
`STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_IMAGE_SERVER_URL`,
`STORAGE_IMAGE_SERVER_KEY` and `STORAGE_IMAGE_SERVER_SALT` are required — the
process exits at boot if any is missing. The last three are the image server's
(imgproxy) address and the hex key and salt the API signs every picture link
with; the server checks them with the same pair. The `STORAGE_*` names say storage, not MinIO, so the
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
- **Registration is per App** (`ACCESS.APP_SETTINGS`, ADR 0019): `/sign-up/email` and
  `/join-app` need `x-aof-app` naming an App open to it, otherwise 403
  `REGISTRATION_CLOSED`; every App is closed today. A sign-in with `x-aof-app`
  answers 403 `APP_FORBIDDEN` to a User that App does not let in, before any
  Session is written.

## Images

The Image module from `@allonfire/storage`, mounted at `/v1/images` (ADR 0013,
ADR 0015). Its errors are `CodedError`s the API renders as its own localized
problem documents. Files go to the closed
`image` bucket as `<uuid>.avif`, prepared by `@allonfire/storage` (HEIC
decoded, upright, EXIF stripped, capped at 2560px, AVIF, 16px blur); rows live in
`image."Image"`, placements in `image."ImageApp"`. Apps show them through the
image server, by the links the API signs (`docs/guides/images.md`, ADR 0027).

| Endpoint | Guard | Does |
|---|---|---|
| `GET /v1/images?app=&page=&perPage=&search=` | none | a numbered page of the Images visible in `app` (any App when left out): placed there, and public or in an App the User enters; newest upload first (`search` is one string of `access:public,private`, `app:laura,back_office` and `input:<text>` pairs, ADR 0026, the text matching the alt in any language or the file name, ignoring case; an unknown field or value is dropped); never 403. Answers `images`, `page`, `pageCount`, `total` and `totalBytes` of every visible Image |
| `GET /v1/images/:id` | none; 404 unless visible in some App | one Image |
| `POST /v1/images` | Session; `ADMIN` in every App named (a User who is `ADMIN` in no App is refused before the body is read) | multipart: repeated `file` parts plus one `meta` JSON part, `[{ apps: [{ app, public? }], alt: { en, it } }]` in file order |
| `PATCH /v1/images` | Session; `ADMIN` in each App whose placement is added, removed or switched public; for `alt`, in every App the Image is in | `[{ id, apps?, alt? }]`, each Image once: `apps` is the full new list; a `public` left out keeps the placement's own |
| `DELETE /v1/images` | Session; with `app`, `ADMIN` there; without, in every App the Image is in | `{ ids, app? }`: with `app`, takes the Images out of it and deletes those left in none; without, deletes them everywhere; rows first, then files |
| `GET /v1/user-usage/overview` | Session; a Back Office `ADMIN`, read now | `total`: every User once, and `byApp`: for each App that has a member, its `count` of members and its `admins` (a User in two Apps counts in both) |
| `GET /v1/storage/overview` | Session; a Back Office `ADMIN`, read now | `buckets`: each bucket the API reads, `{ id, reading }` (`reading`: `objects`, `bytes`, `asOf`; Avatars included in the Images' bucket; listed at most every 5 minutes, kept in Redis per bucket; `null` when it cannot be listed), and `images`: the Images by App (`byApp`: public and private bytes and counts) with `total`, `totalBytes`, and `avatars`: the Avatars by App (`byApp`: bytes and count; a User's file counts in every App they are in), listed fresh |

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
- **Closed to anonymous reads.** The `image` bucket holds private Images and
  Avatars, so it carries no policy: Locally `storage-init` runs
  `mc anonymous set none`, in Production the one-shot `storage-setup` deletes
  any bucket policy (`setupImageBucket`), as does every test run's bucket. A
  browser reaches a picture only through a link the API signs, served by the
  image server (docs/guides/images.md). Never give the bucket an anonymous
  policy again, read-only included.

## Mail and Services

Verification and password reset emails go through the MAIL Service's
providers in slot order, each reached over its own HTTP API. Everything but
where a provider is reached is edited on the Back Office's Services page.

- **Environment, per slot.** `API_MAIL_PROVIDER_<slot>_URL` (the provider's API
  base, https only), `_KEY` (its API key) and `_DRIVER` (the API shape it
  speaks) in the API's environment (Dokploy in Production; never the repo).
  Two drivers exist: `key-header-envelope` (an `api-key` header and a nested
  sender, Brevo's v3 API: URL `https://api.brevo.com/v3`) and `bearer-flat`
  (`Authorization: Bearer` and a flat body, Resend's API: URL
  `https://api.resend.com`). A slot missing any of the three is skipped and
  logged (`mail provider has no usable URL, key and driver in the
  environment`). Rotating a key replaces its value and redeploys the API.
- **Keys.** The SMTP keys of the old setup do not work: Brevo's REST API needs
  a v3 API key (`xkeysib-…`), Resend's an API key. Brevo: a Full access key
  works; a Restricted key needs Transactional email: All and Account: Read.
  Resend: the key must be allowed to read metrics (a sending-only key may be
  refused; the rings then draw empty and an error toast says so).
- **Provider setup.** Brevo: allow the VPS's IP under Security, Authorized
  IPs, then turn blocking on. Resend: verify the sending domain (one on the
  free plan). Each provider's sender address goes on the Services page; it is
  required, and a provider is enabled only with one. Names are labels an
  Admin types; the seed names them `Provider 1` and `Provider 2`.
- **DNS.** Before sending from the deployment domain, read the existing SPF,
  DKIM, DMARC and return-path records, then add each provider's own beside
  them (one SPF record, every sender included); never replace a record
  another service relies on. A sending address is not an inbox.
- **Quota.** Nothing here counts it. A provider that answers for want of room
  (its daily or monthly quota, or a rate limit) or refuses is skipped for the
  next one. The Services page's two rings read what each provider's own API
  says it sent (today, the UTC day, and the last 31 days), kept 30 seconds in
  Redis: a page and its prefetch ask the vendor once. A Resend-shaped
  provider's metrics are built in buckets and trail a send by up to ~10
  minutes; that lag is accepted, the count catches up on its own. `GET /v1/services`
  takes `?type=` so a page asks only its own type's providers. A Brevo-shaped
  provider's report is built with a delay while its credits move at once, so on
  a `free` plan the day's count is the larger of the report and the card's
  daily limit less the credits left (the ring's maximum is the card's);
  the limits are the one the provider reports, else the day and month
  limits an Admin set on the provider's card. They only size the rings and
  never stop a send. Sends made outside AllOnFire count too, since the
  provider counts them.
- **Uncertain sends.** A timeout after the handoff is `uncertain`: never
  retried through another provider, so nobody gets an email twice. The reader
  asks again (sign in, or Forgot password), at most five emails per address in
  any rolling hour.
- **Keep-alive.** `POST /v1/services/keep-alive` with
  `Authorization: Bearer <API_KEEP_ALIVE_TOKEN>`, daily from the workflow
  service (`docs/guides/vps-workflow.md`): a provider with no acceptance in 30
  days sends one check email to `API_KEEP_ALIVE_RECIPIENT`, so no provider
  deactivates an idle key (Brevo: after 90 days).
- **What to watch.** The Services page (the rings, the last acceptance) and
  the log lines `mail provider rejected the message`, `mail provider outcome
  unknown; not retried elsewhere`, `no mail provider could take the message`,
  `mail provider has no room left; trying the next`, `mail provider usage
  could not be read` and `email refused: the per-address limit cannot count`.
- **Rollback.** Turn the MAIL Service off on the Services page: nothing
  sends, and sign-in of an unverified User answers that a link is on its way
  without one leaving. Liquibase's rollback of `0007-service-mail` drops the
  `service` schema and `User.verificationRequiredAt`; roll back the code that
  reads them first.

## Writing routes

**Routes must be chained.** `hc<AppType>` derives client types from the chained
return value; separate statements silently degrade them to nothing.

```ts
// correct
export const createThingRoutes = (deps: Deps) =>
  new Hono()
    .get("/things", (c) => c.json({ things: [] }))
    .post("/things", validator("json", schema, invalidHook), (c) => c.json({}, 201));

// wrong — client types become unusable, and no runtime test will notice
const app = new Hono();
app.get("/things", handler);
```

`src/client.test-d.ts` guards this. If it starts failing, a route was un-chained.

**Domain routes mount under `/v1`**, through `API.PATH.VERSION`
(`src/shared/constants/api.ts`) — never a hard-coded string:

```ts
.route(API.PATH.VERSION, createThingRoutes(deps))
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

Telemetry is on when `TELEMETRY_ENDPOINT` is set, which `.env.example`
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
  Request lines record only the headers in `REQUEST_LOG.HEADERS`
  (`features/logger/constants/request-log.ts`).
- **Redis**: not traced. ioredis can only be traced by patching it at load,
  which needs an ESM loader hook; see ADR 0006.
- **OpenTelemetry's own failures** (collector down, wrong password) appear in
  the API log as errors and warnings, instead of vanishing.

Traces, metrics and logs carry the same resource: `service.name`,
`service.version` and `deployment.environment.name` (core's
`features/telemetry/otlp.ts`).

`index.ts` calls `startTelemetry()` before `createApp`, because `@hono/otel`
binds its meter when the app is built. Nothing is patched, so there is no
preload and no import-order rule. Tests never start the SDK.

## Tests

```bash
pnpm --filter @allonfire/api test
```

All tests but one run with stubs and no container. The rate-limit integration
test requires Redis and will tell you the command to start it.
