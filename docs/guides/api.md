# API

`apps/api` and the HTTP modules it mounts. Constants: `conventions.md`; tests: `testing.md`.

## API App Structure (`apps/api/src/`)

The HTTP backend serving every app. Hono on Node, port 3300. It mounts the
Auth module (`packages/auth`), the Image module (`packages/storage`), each App's own routes
(`/v1/<app>`) and the admin console (`/v1/back-office`, which mounts the User module of
`packages/auth`) under `/v1`. Running it: `apps/api/README.md`.

```
apps/api/
└── src/
    ├── index.ts          boot: serve(), signals, shutdown
    ├── app.ts            createApp(deps) — middleware order + route mounts only
    ├── client.ts         AppType, ApiType, ErrorCode, ProblemDetails — the
    │                     "./client" export; types only, no runtime code
    ├── shutdown.ts       createShutdown(deps) — ordered close, drain timeout
    ├── environment/      environment — zod env schema, validated at import
    ├── features/         one folder per topic, mounted or applied by app.ts;
    │   │                 each owns its routes/, constants/, middleware/,
    │   │                 utils/ and tests/; the Image module mounts from
    │   │                 @allonfire/storage (ADR 0015)
    │   ├── back-office/  the admin console under /v1/back-office (ADR 0035): constants/back-office,
    │   │                 routes/index (backOfficeRoutes), and the folders users/ (user-deps, the
    │   │                 User module's Host deps) and overview/ (routes/index, constants/overview, and
    │   │                 users/ and storage/, the two overviews, each its own routes, constants and deps)
    │   ├── laura/        Laura's own routes under /v1/laura: gallery/ and favorites/, laura-deps,
    │   │                 utils/{deps,page-handlers,gallery-body}
    │   ├── docs/         routes/{index,handlers}, constants/openapi,
    │   │                 utils/enabled (isDocsEnabled), utils/merge
    │   │                 (mergeOpenApi) — /openapi.json, /reference
    │   ├── health/       routes/{index,routes,handlers}, constants/{statuses,statuses-schema},
    │   │                 utils/{status (HealthDeps, status mapping), health-schema (the bodies)}
    │   │                 — /health, /ready
    │   ├── auth/         auth (instance), middleware/auth-rate-limit (the
    │   │                 API's limiter wrapped in the module's authLimit)
    │   ├── errors/       constants/problem-details,
    │   │                 middleware/error-handler
    │   ├── i18n/         constants/locales, middleware/locale-resolver,
    │   │                 translate, translation-values, translations/*.json
    │   ├── image/        image-deps (the Image module's Host deps),
    │   │                 middleware/export-rate-limit (the Export route's
    │   │                 limiter), tests/image-test-app
    │   ├── mail/         mail-deps (core's mail on the real stack, the auth
    │   │                 emails), database-store, constants/email (EMAIL:
    │   │                 the per-address limit, each App's look),
    │   │                 utils/address-limit (5 per address per rolling hour,
    │   │                 Redis), utils/auth-mail
    │   ├── logger/       logger (core's createLogger with the API's env),
    │   │                 constants/request-log (REQUEST_LOG),
    │   │                 middleware/request-logger
    │   ├── rate-limit/   constants/limits, utils/rate-limit-key, middleware/rate-limiter
    │   ├── redis/        redis, constants/redis (REDIS)
    │   ├── services/     routes/ (`/v1/services`: an Admin's list and edits,
    │   │                 a provider's test send; the workflow service's
    │   │                 token-guarded keep-alive), services-deps,
    │   │                 utils/keep-alive (one per Service type, MAIL's first: its check emails),
    │   │                 utils/usage-reader (what each provider's API reports, cached in Redis)
    │   ├── telemetry/    constants/telemetry, middleware/request-spans (@hono/otel
    │   │                 + corrections), telemetry — OTel SDK
    └── shared/           anything more than one feature reads, or no feature owns
        ├── constants/    api (API), error (API.ERROR, built on core's
        │                 ERROR.CODE and each module's codes) — no logic
        ├── middleware/   cors, security-headers
        ├── tests/        app-deps, sign-in, seed-user, problem-of, capture,
        │                 memory-store — helpers more than one feature's tests read
        ├── types/        bindings (AppBindings)
        └── utils/        outage (outageLatch), probe (isProbe), codes-for (codesFor),
                          shutdown-step (ShutdownStep)
```

A constant belongs in `features/<topic>/constants/` unless more than one
feature reads it. `API` (its paths, context keys, limits, log messages and shutdown steps) is
shared, so it stays in `shared/constants/api.ts`. Anything not API-specific —
`HTTP.STATUS`, `HTTP.METHOD`, `HTTP.HEADER`, `HTTP.CONTENT_TYPE`, `LOG.LEVEL`, the
redaction list, `ENV.BOOLEAN`, `SEPARATOR`, `PATTERN.TRAILING_SLASHES`, `UNIT` (time and size), `HTTP.SECURITY_HEADERS` — lives in
`@allonfire/core` (`features/http`, `features/logger`, `shared/constants`), and so do the standard error codes, core's `ERROR.CODE` (`features/errors/constants/error-codes`: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, …), which every Host and module throws. A module adds only its own (`IMAGE.ERROR_CODE`: `IMAGE_CHANGED`, `IMAGE_TOO_LARGE`, `UNSUPPORTED_IMAGE`; `AUTH.ERROR_CODE`). `API.ERROR` (every code the API answers with, built from those and never retyped, and the statuses it answers with a problem document) is the API's own,
in `shared/constants/error.ts`. An error code is never a string literal, tests included; only core's own test types them, as the contract clients switch on. A constant's type always comes from zod:
`export const xSchema = z.enum(X)` (or `z.literal(TUPLE)`), then
`export type X = z.infer<typeof xSchema>`. A lookup table is `as const satisfies
Record<K, V>`, never annotated `: Record<K, V>`, which widens every lookup to `V`. `API.PATH` nests as the routes do: an App's group is an object with its own `BASE` and its mounts (`API.PATH.LAURA.GALLERY`, `API.PATH.BACK_OFFICE.OVERVIEW.STORAGE`); an App's constants are one root named after it (`LAURA`, `BACK_OFFICE`, in the API; each App's own descriptor of the same name is aliased where both are imported) whose keys are its folders (`LAURA.FAVORITES`, `BACK_OFFICE.OVERVIEW.STORAGE`), built from each child folder's own object (`LAURA_FAVORITES`, `OVERVIEW_STORAGE`), which only its parent imports; a route module (a sub-feature with its own routes: `laura/gallery`, `laura/favorites`, `back-office/overview/storage`) keeps its constants in its own folder, named after its folder path (`LAURA_GALLERY`, `OVERVIEW_STORAGE`, its files `constants/storage` and `storage-deps`), never after what it holds; every other sub-feature's constants merge into the parent's file (`conventions.md`, Constants). `API.PATH` is
shared too: the health routes serve its probes, and telemetry, the request logger and
the rate limiter skip `API.PROBE.PATHS`, derived from them. `HEALTH`, `OPENAPI`,
`RATE_LIMIT`, `REDIS` and `TELEMETRY` (span attributes, the default service
name, Prisma's startup spans) belong to the feature that owns them. How telemetry
ships (signal paths, the `TELEMETRY_*` env patterns, resource attributes, the
flush budget) is core's `TELEMETRY` (`features/telemetry/constants/telemetry`),
beside `createLogger` (`features/logger/create-logger`), the OTLP helpers
(`features/telemetry/otlp`) and the `TELEMETRY_ENDPOINT`/`TELEMETRY_HEADERS`
schemas (`environment/telemetry-environment`).

## Routes and errors

**Routes live in their feature**, under `features/<name>/routes/`:
`index.ts` builds the chained sub-app, `routes.ts` holds the `describeRoute`
specs, `handlers.ts` the handlers; the feature's `constants/`, `utils/` and
`tests/` sit beside `routes/`. File names carry no `<name>.` prefix; the folder already says it. Named
exports only, no `import * as`. `index.ts` assembles a router; it is not a
barrel. A handler for a path with params (`/:id`) goes through
`createFactory<AppBindings>().createHandlers(...)` so the params stay inferred.

**Folder names are plural when the folder holds several things of one kind**
(`features/`, `constants/`, `tests/`, `translations/`) and singular when it
names one concept (`i18n/`, `health/`, `rate-limit/`). `middleware/` is the
exception: it is a mass noun — Hono, Express and Koa all use it for one or
many, and `middlewares/` reads wrong.

- **Errors are RFC 9457 problem documents** (`application/problem+json`):
  `type` (stable `/errors/<kebab-code>`, derived from `API.ERROR.CODE`), `title`
  (the status's reason phrase, invariant per the RFC), `status`, `detail` (the
  localised message — the only member i18n touches), `instance` (the path),
  plus `requestId`, `code` and `errors` as extension members. Send them with
  `problemResponse(c, { code, status, detail, errors? })` in
  `features/errors/middleware/error-handler.ts`, which also sets the media
  type; never hand-assemble one.
- **A module throws the standard errors (404, 403, 413) through core's
  CodedError factories** (`notFound`, `forbidden`, `payloadTooLarge` in
  `@allonfire/core/features/errors/coded-error`), and a changed resource's 409
  through core's `ResourceChangedError`; it writes `new CodedError` only for
  its own codes.
- **`HTTP.STATUS` stays numeric literals**, not `StatusCodes` from
  `http-status-codes`. An enum member is its own type, not `404`, which breaks
  `API.ERROR.STATUS` as a key of Hono's response map and collapses every error arm
  of `hc<AppType>` to `never`. The library is used for `getReasonPhrase` only.
- **Every documented body comes from its zod schema**: `content: { [HTTP.CONTENT_TYPE.JSON]:
  { schema: resolver(bodySchema) } }` in `describeRoute`, the same schema the
  handler `satisfies`. An error response is `...problemResponses(status)`
  (`@allonfire/core/features/errors/utils/openapi`): `features/docs/routes/handlers.ts`
  registers one `Problem<status>` per `API.ERROR.STATUS`, listing only that status's
  codes (`API.ERROR.STATUS_OF_CODE`). Never
  `@hono/zod-openapi`: `hono-openapi` keeps routes plain chained Hono.
- **Routes must be chained** (`new Hono().get(...).get(...)`) or `hc<AppType>`
  client types silently collapse. Guarded by `src/client.test-d.ts`.
- **Routes are grouped by who calls them** (ADR 0035): `/v1/<app>/...` for data an App owns (`/v1/laura/...`, guarded by `requireApp(app)`), `/v1/back-office/...` for the admin console (the Users routes and the two overviews, `/overview/users` and `/overview/storage` under one prefix, called only by Back Office Admins), and plain `/v1/...` for a capability several Apps use (`/v1/auth`, `/v1/images`, `/v1/services`). A User changing their own data later gets separate routes (`/v1/me`, `/v1/<app>/profile`), never a "self or Admin" branch inside the admin routes. The User module in `packages/auth` keeps its own `/users` paths; only the API's mount prefix is `/v1/back-office`.
- **An App's slug is written once**, in its `ACCESS.APP_SETTINGS` row (`slug: "back-office"`, the enum value in lowercase with hyphens, as the database stores it). The API's App prefix (`BACK_OFFICE.SEGMENT`, `LAURA.PATH.BASE`), the Back Office's typed client key (`API.SEGMENT.BACK_OFFICE`) and each App's Playwright `app` read it; nobody types `"back-office"` or `"laura"` as a name.
- **The docs nest tags in groups** (`OPENAPI.TAG_GROUPS`, `x-tagGroups`): each App's tags under the App's name (Back Office: Users, Overview; Laura: Gallery, Favorites), what every App shares under Platform (Auth, Image, Services, Infrastructure). A route's tag is its own feature's; a new tag goes into a group in the same edit, or the docs would hide it (`spec.test.ts` fails first).
- **Domain routes mount under `/v1`** via `API.PATH.VERSION` (`shared/constants/api.ts`),
  never a hard-coded `"/v1"`; `/health` and `/ready` stay unversioned.
- **Handlers stay thin:** validate, call a service, shape the response. Domain logic lives in `@allonfire/database`.

## Guards, env, Redis, i18n

- **Laura's games** (`features/laura/games`, ADR 0035) sit under `/v1/laura/games/<game>/`: the Memory deck (`GET .../memory/deck`) is a random draw, so it is never cached (`no-cache`, a client draw); a score's write (`POST .../memory/scores`) asks the Session fresh through `canPlay` (`manageGuard(deps.canPlay)`) and refuses a game no player could have produced with the coded error `IMPLAUSIBLE_SCORE`; the leaderboard is read by any Member of Laura.
- **Auth guards** come from `@allonfire/auth/features/hono/guards/middleware/*` and throw
  `HTTPException`; never build a 401/403 by hand. `guard(allows)` may await `allows`: a
  route that changes Users reads the caller fresh, as the User module's `POST`, `PATCH`,
  `DELETE` and Avatar routes do through the Host's `canManageUsers({ sessionId, userId })`
  (`accessUserById` and `sessionAlive` side by side; an App's own Admin-only routes take it
  as `manageGuard(deps.canManage)` from `@allonfire/auth/features/hono/guards/utils/manage-guard`,
  `deps.canManage` typed `CanManage`, never a guard of their own), since the Session's 5-minute cookie
  cache can outlive a Session a new password deleted. Its Roles are never behind: auth's
  `customSession` reads the Memberships on every `getSession`, cache hits included, so
  `accessUserById` repeats that read.
  Nobody deletes themselves: a list holding the caller's id answers 403
  `USER.ERROR_CODE.CANNOT_DELETE_SELF` and deletes nobody. Nobody changes their own Role in
  the Host's `manageApp` (the API: `App.BACK_OFFICE`): 403
  `USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE`, nothing changed. A `PATCH` carries the `version`
  the form was opened on: a User changed since answers 409 `ERROR.CODE.RESOURCE_CHANGED`
  (core's `ResourceChangedError`, thrown by the service's `checkVersion`), nothing changed (ADR 0028).
- **`createApp(deps)` takes its dependencies** (rate-limit store, health
  checkers) so tests never open a socket.
- **Required env:** `DATABASE_URL`, `API_REDIS_URL`, `API_CORS_ORIGINS`,
  `AUTH_SECRET`, `AUTH_URL`, `STORAGE_ENDPOINT`,
  `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_IMAGE_SERVER_URL`,
  `STORAGE_IMAGE_SERVER_KEY`, `STORAGE_IMAGE_SERVER_SALT`. Full list in
  `apps/api/.env.example`. `dev` loads it via Node's `--env-file`; tests use
  `apps/api/vitest.setup.ts`.
- **Redis db indexes:** 0 everything the API keeps today (the rate-limit counters, `ratelimit:auth:*` among them, the per-address email counts, the provider usage and bucket total caches), 1 cache (reserved), 2 sessions
  (reserved), 15 an e2e run's API (`LOCAL.URL.REDIS_E2E`), so its requests never
  count against `pnpm dev`. Eviction is server-wide and `volatile-lru`, so only a key that is safe to lose carries a TTL; never TTL a session key.
- **`I18N.LOCALE` lives in `@allonfire/core/features/i18n/constants/locales`**, shared with the
  Apps (ADR 0012), which route by its derived `Language`. `I18N.SUPPORTED_LOCALES`
  there is the explicit preference order `match()` sees, main variant of each
  language first; `packages/core/src/features/i18n/tests/locales.test-d.ts` fails if a locale is
  missing from it or speaks a language outside `I18N.BASE_LANGUAGES`. The API's
  `features/i18n/constants/locales.ts` keeps `TRANSLATION.DEFAULT.LOCALE` and the catalogue.
  `TRANSLATION.CATALOGUE` uses computed `[I18N.LOCALE.X]` keys
  so no tag is typed twice, and `satisfies Record<Locale, Translations>` fails if a
  locale has no messages. `Translations` is `typeof EN`, derived rather than
  `Record<MessageKey, string>`, so a target locale missing a key fails too.
- **The catalogue is not an error catalogue.** `TranslationKey` is
  `keyof typeof en.json`, so any localised string belongs there — a subject
  line, a notification body, a PDF heading. Errors are simply the keys that
  exist today. The dependency runs errors -> messages: `API.ERROR.CODE` carries
  `satisfies Record<string, TranslationKey>`, so a code without a message fails at
  that declaration.
- **Translations are JSON** (`src/features/i18n/translations/*.json`) so a translation platform
  can read them. One file per *language* — `en.json` serves `en-US` and
  `en-GB`.
- **`src/features/i18n/translation-values.ts` is hand-written**, one line per message key,
  saying what that message interpolates. Keep it in step with the ICU strings by
  hand — nothing checks it. It is not optional: omit a value and
  `IntlMessageFormat` throws into `translate`'s catch, serving the user the raw
  ICU source in the wrong language. Add a generator if the list outgrows eyes.
- **`pnpm static:i18n` runs in CI** — `@lingual/i18n-check` compares every locale
  against `en`: missing keys, and ICU arguments a translation dropped, which
  render without throwing so nothing else catches them. Known gap: a leftover
  key present in a target locale but not in `en` is not reported. That is dead
  weight, not wrong output.

- **`/ready` answers 503 only when Postgres is down**; Redis down answers 200 `degraded`, since the rate limiter fails open and a degraded feature is no outage (`features/health/routes/handlers.ts`). (`docs/superpowers/specs/2026-08-27-hono-api-scaffold-design.md`)
- **Mail** (`features/mail`, core's `features/mail`): Better Auth's verification and reset emails go through `createAuth`'s `mail`, sent after the response (`advanced.backgroundTasks`), each counted first against the reader's address (five in any rolling hour, `EMAIL.ADDRESS_LIMIT`; an Admin's provider test counts apart under its own prefix, so anonymous reset requests for an Admin's address never use up the budget their test needs; failing closed: while Redis cannot count, `/request-password-reset` and `/send-verification-email` answer 503 `MAIL_UNAVAILABLE` for any address). Providers are tried in slot order, each reached over its HTTP API (a driver named for the API's shape); one that answers for want of room (its quota or rate) or refuses is skipped for the next, and an uncertain outcome is never retried elsewhere. Each message carries its own `X-Entity-Ref-ID` (one `crypto.randomUUID()`, the same through a failover), in the `headers` both providers' APIs take: Resend documents it as the way to keep Gmail from threading mail that looks alike, which trims a repeat behind "..." (`MAIL.HEADER.ENTITY_REF_ID`). Where each is reached: `API_MAIL_PROVIDER_<slot>_URL`, `_KEY`, `_DRIVER`, read when sending. A reset link lands on the App's page (`<redirectTo>?token=`), never the API's `GET /reset-password/:token`, whose path the request log records.
- **Services** (`features/services`): every route but the keep-alive needs a Back Office Admin read now (`adminOf(App.BACK_OFFICE)`); `POST /v1/services/keep-alive` needs `Authorization: Bearer <API_KEEP_ALIVE_TOKEN>` (compared in constant time; unset, every call is 401) and sends its check emails to `API_KEEP_ALIVE_RECIPIENT` (no usage rows to prune: a provider reports its own). A Service is addressed by its `type` (`PATCH /v1/services/:type`); a test send to a provider that is gone is a 404, and a disabled provider can be tested while its Service is on.
- **Image upload** (`POST /v1/images`, in `packages/storage`) skips the API-wide body limit and time budget and brings its own (`app.ts`), and a User who is Admin in no App is refused before the body is read.
- **Image Export** (`GET /v1/images/:id/export`, ADR 0036, in `packages/storage`): a Session is needed even for a public Image (a decode costs the server); visibility is a read's (`canSeeImage`, hidden or missing is 404, never 403). It reads the stored file (`deps.readObject`), decodes it with `decodeUpright` and answers a JPEG with no metadata (`IMAGE.EXPORT.QUALITY`), `Content-Disposition: attachment; filename="<created UTC date>-<first 8 id characters>.jpg"` (`exportName`, never the stored key), `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. It has its own bucket on top of the global one (`exportRateLimit`, `STORAGE_EXPORT_RATE_LIMIT_*`, 30 a minute per signed-in User by default, through `userRateLimiter` as Memory scores are): `createApp` hands it to the module as `deps.limitExport`, which the Export route runs first, so the router alone decides what counts (`HEAD`, which Hono answers with the `GET` handler, included). Nothing is stored.
- **Laura** (`features/laura`): `GET /v1/laura/gallery` and `GET /v1/laura/favorites` (`?cursor=&limit=`, keyset pages) and the Admin-only `PUT`/`DELETE /v1/laura/favorites/:imageId`. Both reads first make sure the caller has a Laura Profile (`deps.ensureProfile`: get-or-create, the Favorites copied in) and answer 403 when they have no Laura Membership now; then they read the caller's own copies. The writes take `requireApp(App.LAURA, Role.ADMIN)` then `manageGuard(deps.canManage)` (a Laura Admin read now, `adminOf(App.LAURA)`) and change the master and every copy. Wired as `laura` in `createApp`'s deps.
- **Users overview** (`features/back-office/overview/users`): `GET /v1/back-office/overview/users`, a Back Office Admin read now (`adminOf(App.BACK_OFFICE)`). `userStats` (database) counts every User and the members of each App, read fresh; it has its own base path so it never meets `GET /v1/back-office/users/:id`. Wired as `overviewUsers` in `createApp`'s deps.
- **Storage overview** (`features/back-office/overview/storage`): `GET /v1/back-office/overview/storage`, a Back Office Admin read now (`adminOf(App.BACK_OFFICE)`, as Services). Each bucket's totals (`listBucketTotals`, paged through the listing) are kept `OVERVIEW_STORAGE.CACHE.TTL_MS` (5 minutes) in the shared Redis under `OVERVIEW_STORAGE.CACHE.KEY_PREFIX` and its name by `createBucketReader`; the buckets listed are the `BUCKETS` lines of `storage-deps.ts` (a new bucket is one line there, and its storage login must be allowed to list it); a listing that fails answers that bucket's `reading: null` with the rest, a Redis that is down only means every read lists. The Image stats (`imageStats`) are read fresh, and so are the Avatars per App (`avatars`: the bucket's files under the Avatar prefix, `listObjectSizes`, matched to each User's `User.image` and Apps by `avatarsByApp`; a listing that fails logs and answers none). Wired as `overviewStorage` in `createApp`'s deps.
- **Managing Users is gated on Admin in the Back Office** (`isBackOfficeAdmin`, `features/back-office/users/user-deps.ts`), never on its floor (`canEnterApp`), so lowering `minRole` never opens Users. (`docs/superpowers/specs/2026-10-21-back-office-users-list-design.md`)
- **List sort and date range** (ADR 0031): `GET /v1/back-office/users` and `GET /v1/images` take `sort` (`USER.SORT`, `IMAGE.SORT` from `sortQuery`: `created.desc,size.asc`, at most three, an unknown column or direction dropped, `id` the last tiebreak) beside `search`, whose `created:2026-11-26..2026-11-28` field is a whole-UTC-day range; an empty sort is left out of the query, and one over 200 characters reads as none, never a 400. `hide` is the table's own and never reaches the API.

## Mail providers: setup and operations

Where a provider is reached is the API's environment; everything else is edited on the Back Office's Services page (ADR 0030).

- **Environment, per slot:** `API_MAIL_PROVIDER_<slot>_URL` (the provider's API base, https only), `_KEY` and `_DRIVER` (`apps/api/.env.example`), in Dokploy in Production, never the repo. A driver is the API shape a provider speaks: `key-header-envelope` is Brevo's v3 API (`https://api.brevo.com/v3`), `bearer-flat` is Resend's (`https://api.resend.com`). A slot missing any of the three is skipped and logged. Rotating a key replaces its value and redeploys the API.
- **Keys:** SMTP keys do not work. Brevo needs a v3 API key (`xkeysib-…`): a Full access key works, a Restricted one needs Transactional email: All and Account: Read. Resend needs an API key allowed to read metrics (a sending-only key can be refused: the rings then draw empty and an error toast says so).
- **Provider setup:** Brevo: allow the VPS's IP under Security, Authorized IPs, then turn blocking on. Resend: verify the sending domain (the free plan holds one). Each provider's sender address goes on the Services page, and a provider is enabled only with one. Names are labels an Admin types; the seed names them `Provider 1` and `Provider 2`.
- **DNS:** before sending from the deployment domain, read the existing SPF, DKIM, DMARC and return-path records, then add each provider's own beside them (one SPF record, every sender included); never replace a record another service relies on. A sending address is not an inbox.
- **Uncertain sends:** nothing sends the email again, so nobody gets it twice; the reader asks again (Sign in, or Forgot password), within the per-address limit.
- **Keep-alive:** the workflow service calls it daily (`vps-workflow.md`), and a provider with no acceptance in 30 days sends one check email, so no provider deactivates an idle key (Brevo: after 90 days).
- **What to watch:** the Services page (the rings, the last acceptance) and the log lines `mail provider rejected the message`, `mail provider outcome unknown; not retried elsewhere`, `no mail provider could take the message`, `mail provider has no room left; trying the next`, `mail provider usage could not be read` and `email refused: the per-address limit cannot count`.
- **Rollback:** turn the MAIL Service off on the Services page: nothing sends, and sign-in of an unverified User answers that a link is on its way without one leaving. Liquibase's rollback of `0007-service-mail` drops the `service` schema and `User.verificationRequiredAt`, and takes every later changeset with it (newest first); roll back the code that reads them first.

## Pointers

- Running the API, its route areas, required env and traps: `apps/api/README.md`.
- Each route's rules, guards and limits: the `DOC` texts in its constants (`IMAGE`, `USER`, `SERVICES`, each App's), served at `/reference`.
- Mounting the Auth module in a Hono host and what a Next App uses from it: `packages/auth/README.md`; Verification, password reset and Registration: the doc comments under `packages/auth/src/features/server`.
- The Redis client's startup rule (`awaitReady`) and the telemetry signals: the doc comments in `apps/api/src/features/redis` and `apps/api/src/features/telemetry`; Local's OpenObserve login: `apps/api/.env.example`.
