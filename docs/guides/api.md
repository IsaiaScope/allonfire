# API

`apps/api` and the HTTP modules it mounts. Constants: `conventions.md`; tests: `testing.md`.

## API App Structure (`apps/api/src/`)

The HTTP backend serving every app. Hono on Node, port 3300. It mounts the
Auth and User modules (`packages/auth`) and the Image module (`packages/storage`) under `/v1`
— see `apps/api/README.md`.

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
    │   ├── docs/         routes/{index,handlers}, constants/openapi,
    │   │                 utils/enabled (isDocsEnabled), utils/merge
    │   │                 (mergeOpenApi) — /openapi.json, /reference
    │   ├── health/       routes/{index,routes,handlers}, constants/statuses,
    │   │                 utils/status (HealthDeps, status mapping) — /health, /ready
    │   ├── auth/         auth (instance), middleware/auth-rate-limit (the
    │   │                 API's limiter wrapped in the module's authLimit)
    │   ├── errors/       constants/problem-details,
    │   │                 middleware/error-handler
    │   ├── i18n/         constants/locales, middleware/locale-resolver,
    │   │                 translate, translation-values, translations/*.json
    │   ├── logger/       logger (core's createLogger with the API's env),
    │   │                 middleware/request-logger
    │   ├── rate-limit/   constants/limits, middleware/rate-limiter
    │   ├── redis/        redis, constants/redis (REDIS)
    │   └── telemetry/    constants/telemetry, middleware/request-spans (@hono/otel
    │                     + corrections), telemetry — OTel SDK
    └── shared/           anything more than one feature reads, or no feature owns
        ├── constants/    api (API), error (API.ERROR, built on core's
        │                 ERROR.CODE and each module's codes) — no logic
        ├── middleware/   cors, security-headers
        ├── types/        bindings (AppBindings)
        └── utils/        outage (outageLatch), probe (isProbe)
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
Record<K, V>`, never annotated `: Record<K, V>`, which widens every lookup to `V`. `API.PATH` is
shared too: the health routes serve its probes, and telemetry, the request logger and
the rate limiter skip the `PROBE_PATHS` derived from them. `HEALTH`, `OPENAPI`,
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
  (`@allonfire/core/features/errors/constants/openapi`): `features/docs/routes/handlers.ts`
  registers one `Problem<status>` per `API.ERROR.STATUS`, listing only that status's
  codes (`API.ERROR.STATUS_OF_CODE`). Never
  `@hono/zod-openapi`: `hono-openapi` keeps routes plain chained Hono.
- **Routes must be chained** (`new Hono().get(...).get(...)`) or `hc<AppType>`
  client types silently collapse. Guarded by `src/client.test-d.ts`.
- **Domain routes mount under `/v1`** via `API.PATH.VERSION` (`shared/constants/api.ts`),
  never a hard-coded `"/v1"`; `/health` and `/ready` stay unversioned.

## Guards, env, Redis, i18n

- **Auth guards** come from `@allonfire/auth/features/hono/guards/middleware/*` and throw
  `HTTPException`; never build a 401/403 by hand. `guard(allows)` may await `allows`: a
  route that changes Users reads the caller fresh, as the User module's `POST`, `PATCH`,
  `DELETE` and Avatar routes do through the Host's `canManageUsers({ sessionId, userId })`
  (`accessUserById` and `sessionAlive` side by side), since the Session's 5-minute cookie
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
- **Redis db indexes:** 0 rate limits, 1 cache (reserved), 2 sessions
  (reserved), 15 an e2e run's API (`LOCAL.URL.REDIS_E2E`), so its requests never
  count against `pnpm dev`. Eviction is `volatile-lru`; never TTL a session key.
- **`I18N.LOCALE` lives in `@allonfire/core/features/i18n/constants/locales`**, shared with the
  Apps (ADR 0012), which route by its derived `Language`. `I18N.SUPPORTED_LOCALES`
  there is the explicit preference order `match()` sees, main variant of each
  language first; `src/features/i18n/tests/locales.test-d.ts` fails if a locale is
  missing from it or speaks a language outside `I18N.BASE_LANGUAGES`. The API's
  `features/i18n/constants/locales.ts` keeps `TRANSLATION.DEFAULT_LOCALE` and the catalogue.
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
- **`pnpm i18n:check` runs in CI** — `@lingual/i18n-check` compares every locale
  against `en`: missing keys, and ICU arguments a translation dropped, which
  render without throwing so nothing else catches them. Known gap: a leftover
  key present in a target locale but not in `en` is not reported. That is dead
  weight, not wrong output.

- **`/ready` answers 503 only when Postgres is down**; Redis down answers 200 `degraded`, since the rate limiter fails open and a degraded feature is no outage (`features/health/routes/handlers.ts`). (`docs/superpowers/specs/2026-08-27-hono-api-scaffold-design.md`)
- **Managing Users is gated on Admin in the Back Office** (`isBackOfficeAdmin`, `features/users/user-deps.ts`), never on its floor (`canEnterApp`), so lowering `minRole` never opens Users. (`docs/superpowers/specs/2026-10-21-back-office-users-list-design.md`)

## Pointers

- Running the API, its Auth guards and password bucket, the Image endpoints, the Redis client, the telemetry signals, Local's OpenObserve login: `apps/api/README.md`.
- The Auth module's exports, mounting it in a Hono host, Registration: `packages/auth/README.md`.
