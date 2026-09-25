# AllOnFire — Claude Code Rules

## Server-Side Rendering First

Default to Server Components. Only add `"use client"` when the component actually needs:

- React hooks (`useState`, `useEffect`, `useTransition`, `useForm`, etc.)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `localStorage`, `navigator`)
- Third-party client libraries (`useTheme`, `usePathname`, context providers)

**Do not** add `"use client"` to pure presentational components that just receive props and render JSX — they work as Server Components with zero client JS cost.

**Pragmatic rule**: if making something server-side requires significantly more complexity (extra data-fetching layers, prop-drilling through many levels, splitting one simple component into server/client pairs), just use `"use client"`. Simplicity wins over purity.

### Patterns

- Fetch data in Server Components (pages, layouts), pass as props to client components
- Use Server Actions for mutations — keep form logic in client components but action definitions server-side
- Use `initialData` pattern with TanStack Query: server-fetch in page, hydrate in client component
- Providers (`ThemeProvider`, `QueryClientProvider`) must be client — wrap them in a single `Providers` component

## Context7 Usage

Always use Context7 MCP tools when generating code involving:

- Next.js, React, Prisma, BetterAuth, shadcn/ui, TanStack Query, Zustand
- Resolve library ID first, then query docs

## Object Helpers (`@allonfire/utils/object`)

Never call `Object.keys` / `values` / `entries` / `fromEntries` directly. Use
`objectKeys`, `objectValues`, `objectEntries`, `objectFromEntries` — the
standard versions are typed loosely (a value may carry properties its type does
not declare) and each call site was ending in an `as` to recover the literal
type. `objectFromEntries` is the one that matters: `Object.fromEntries` returns
`{ [k: string]: V }`, so `as Record<Union, V>` at the call site is unchecked and
compiles against entries covering none of the union.

The type-level counterparts live in the same file and mean the same thing one
level up: `KeyOf<T>`, `ValueOf<T>`, `EntryOf<T>`, plus `ElementOf<T>` for a
`readonly [...] as const` tuple (`ValueOf` on a tuple would also pick up
`length`, `map` and the rest of the array prototype).

## Database Schema Quick Reference

Schema folder: `packages/database/prisma/schema/` (`schema.prisma`, `auth.prisma`, `laura.prisma`).
Changelog: `packages/database/changelog/changesets/` — Liquibase owns every change (ADR 0008).

- **`auth` schema (shared):** `User`, `Session`, `Account`, `Verification`, enums `Role`, `AllowedApp`
- **`laura` schema:** `Photo`, `Favorite`, `GameScore`, `QuizQuestion`, `QuizAnswer`, enum `GameType`
- Change a model: edit the `.prisma` file, `pnpm db:changeset <name>`, review the SQL, `pnpm db:update`, `pnpm db:drift`. Never `prisma db push` or `prisma migrate`. Never edit an applied changeset.
- Services import per file: `@allonfire/database/laura/photo`, `@allonfire/database/auth/user`; the root exports only `prisma` and generated types. Enum values (`Role.VIEWER`, `AllowedApp.LAURA`) come from `@allonfire/database/enums`; never copy an enum into a constant.
- Raw SQL names the schema: `laura."Photo"`.
- Liquibase runs only in Docker (the `db-migrate` image, `packages/database/liquibase/`); Production runs `backup` then `deploy` before the Apps start.

## Laura App Structure (`apps/laura/src/`)

Family photo gallery and games app. Uses next-intl for i18n (Italian + English), Framer Motion for animations, and a viewer role system (`UserRoleProvider` + `checkMutationAccess`).

### Route Layer (`app/[locale]/`)

All routes are nested under `[locale]` for i18n. Dashboard pages are async Server Components.

```
app/[locale]/(auth)/login/page.tsx
app/[locale]/(dashboard)/
├── layout.tsx                          → Dashboard shell (top bar, auth, UserRoleProvider)
├── page.tsx                            → Photo gallery (main view)
├── favorites/page.tsx                  → Favorited photos
├── upload/page.tsx                     → Photo upload (USER/ADMIN only)
├── settings/page.tsx                   → Language, appearance, user info
├── games/page.tsx                      → Game hub (memory + quiz cards)
├── games/memory/page.tsx               → Memory card matching game
├── games/memory/leaderboard/page.tsx   → Memory leaderboard
├── games/quiz/page.tsx                 → Quiz game
├── games/quiz/leaderboard/page.tsx     → Quiz leaderboard
├── games/quiz/edit/page.tsx            → Quiz questions management (ADMIN)
├── games/quiz/edit/new/page.tsx        → Create new quiz question (ADMIN)
└── games/quiz/edit/[id]/page.tsx       → Edit existing quiz question (ADMIN)
```

### Feature Layer (`features/`)

No barrel index files — import directly.

Features: `gallery/`, `games/`, `upload/`, `settings/`, `layout/`

Each has: `components/` (UI), `actions/` (server actions), optionally `hooks/`

### Shared Layer

- `components/` — `animated-page`, `motion-provider` (LazyMotion), `user-role-provider`
- `lib/` — `auth.ts`, `animation-variants.ts`, `file-validation.ts`, `seo.ts`
- `i18n/` — next-intl routing and request config

### Viewer Role System

- Server: `checkMutationAccess(auth)` now lives in `packages/auth-old/src/guard.ts` (local only, untracked) until Laura's refactor; the API uses `requireRole(Role.USER)`
- Client: `UserRoleProvider` + `useIsViewer()` hook for UI restrictions
- Viewers can browse gallery and play games but cannot upload, favorite, delete, or submit scores

### Laura Dashboard Routes

- `/` — Photo gallery grid with infinite scroll
- `/favorites` — Favorited photos
- `/upload` — Photo upload (blocked for viewers)
- `/settings` — Language, theme, user info
- `/games` — Game hub
- `/games/memory` — Memory card game
- `/games/memory/leaderboard` — Memory scores
- `/games/quiz` — Quiz game
- `/games/quiz/leaderboard` — Quiz scores
- `/games/quiz/edit` — Quiz question management (ADMIN)
- `/games/quiz/edit/new` — Create new quiz question
- `/games/quiz/edit/[id]` — Edit existing quiz question

## API App Structure (`apps/api/src/`)

The HTTP backend serving every app. Hono on Node, port 3300. No domain
endpoints yet; auth is the Auth module (`packages/auth`) mounted at `/v1/auth`
— see `apps/api/README.md`.

```
apps/api/
└── src/
    ├── index.ts          boot: serve(), signals, shutdown
    ├── app.ts            createApp(deps) — middleware order + route mounts only
    ├── client.ts         AppType, ApiType, ErrorCode, ProblemDetails — the
    │                     "./client" export; types only, no runtime code
    ├── shutdown.ts       createShutdown(deps) — ordered close, drain timeout
    ├── routes/           one folder per resource, mounted by app.ts; owns its
    │   │                 constants/, utils/ and tests/
    │   ├── docs/         index, handlers, constants/{openapi,routes},
    │   │                 utils/enabled (isDocsEnabled), utils/merge
    │   │                 (mergeOpenApi) — /openapi.json, /reference
    │   └── health/       index, routes, handlers, constants/statuses,
    │                     utils/status (HealthDeps, status mapping) — /health, /ready
    ├── features/         one folder per cross-cutting topic (no endpoints),
    │   │                 each owning constants/, middleware/ and tests/
    │   ├── auth/         auth (instance), middleware/auth-rate-limit (the
    │   │                 API's limiter wrapped in the module's authLimit)
    │   ├── environment/  environment — zod env schema, validated at import
    │   ├── errors/       constants/{error-codes,problem-details},
    │   │                 middleware/error-handler
    │   ├── i18n/         constants/locales, middleware/locale-resolver,
    │   │                 translate, translation-values, translations/*.json
    │   ├── logger/       logger, middleware/request-logger
    │   ├── rate-limit/   constants/limits, middleware/rate-limiter
    │   ├── redis/        redis
    │   └── telemetry/    constants/telemetry, middleware/request-spans (@hono/otel
    │                     + corrections), resource, telemetry — OTel SDK
    └── shared/           anything more than one feature reads, or no feature owns
        ├── constants/    http, limits, routes, runtime — no logic
        ├── middleware/   cors, security-headers
        ├── types/        bindings (AppBindings)
        └── utils/        outage (outageLatch), probe (isProbe)
```

A constant belongs in `features/<topic>/constants/` unless more than one
feature reads it. `CONTEXT_VAR` and the mount prefixes are
shared, so they stay in `shared/constants/`. Anything not API-specific —
`HTTP_STATUS`, `HTTP_METHOD`, `HTTP_HEADER`, `CONTENT_TYPE`, `LOG_LEVEL`, the
redaction list, `BOOLEAN_ENV`, `SEPARATOR`, `TRAILING_SLASHES`, time and size units, `SECURITY_HEADERS` — lives in
`@allonfire/utils/constants/*`; only `ERROR_STATUS` stays in the API's
`shared/constants/http.ts`. A constant's type always comes from zod:
`export const xSchema = z.enum(X)` (or `z.literal(TUPLE)`), then
`export type X = z.infer<typeof xSchema>`. A lookup table is `as const satisfies
Record<K, V>`, never annotated `: Record<K, V>`, which widens every lookup to `V`. `INFRA_ROUTE` is
shared too: the health routes serve it, and telemetry, the request logger and
the rate limiter skip the `PROBE_PATHS` derived from it. `ERROR_CODE`,
`LOCALE` and the rate-limit tunables belong to the feature that owns them.
Tests live beside what they test: the feature's or route's `tests/`, or
`shared/<kind>/tests/` for shared helpers. A feature checked through the whole
middleware chain still lives in its own `tests/` and builds the app with
`createApp(appDeps())` (`shared/tests/app-deps.ts`). Only `client` and
`shutdown` keep root-level tests.
Vitest runs with globals (no `from "vitest"` import). Every test file's first
line is `// @module-tag unit` or `// @module-tag integration`; a file with
neither fails. Integration tests need a running service (database, cache,
queue, external API) and are named
`*.integration.test.ts`. Type tests (`*.test-d.ts`) take no tag: `tsc`
checks them and nothing executes. Browser tests are Playwright's, under the app's `e2e/`.

**Route modules** are self-contained folders under `routes/<name>/`:
`index.ts` builds the chained sub-app, `routes.ts` holds the `describeRoute`
specs, `handlers.ts` the handlers, plus `constants/`, `utils/` and `tests/` as
needed. File names carry no `<name>.` prefix; the folder already says it. Named
exports only, no `import * as`. `index.ts` assembles a router; it is not a
barrel. A handler for a path with params (`/:id`) goes through
`createFactory<AppBindings>().createHandlers(...)` so the params stay inferred.

**Folder names are plural when the folder holds several things of one kind**
(`features/`, `constants/`, `tests/`, `translations/`) and singular when it
names one concept (`i18n/`, `health/`, `rate-limit/`). `middleware/` is the
exception: it is a mass noun — Hono, Express and Koa all use it for one or
many, and `middlewares/` reads wrong.

- **Errors are RFC 9457 problem documents** (`application/problem+json`):
  `type` (stable `/errors/<kebab-code>`, derived from `ERROR_CODE`), `title`
  (the status's reason phrase, invariant per the RFC), `status`, `detail` (the
  localised message — the only member i18n touches), `instance` (the path),
  plus `requestId`, `code` and `errors` as extension members. Send them with
  `problemResponse(c, { code, status, detail, errors? })` in
  `features/errors/middleware/error-handler.ts`, which also sets the media
  type; never hand-assemble one.
- **`HTTP_STATUS` stays numeric literals**, not `StatusCodes` from
  `http-status-codes`. An enum member is its own type, not `404`, which breaks
  `ERROR_STATUS` as a key of Hono's response map and collapses every error arm
  of `hc<AppType>` to `never`. The library is used for `getReasonPhrase` only.
- **Every documented body comes from its zod schema**: `content: { [CONTENT_TYPE.JSON]:
  { schema: resolver(bodySchema) } }` in `describeRoute`, the same schema the
  handler `satisfies`. Errors reference `#/components/responses/Problem`
  (`ProblemDetails`, registered once in `routes/docs/handlers.ts`). Never
  `@hono/zod-openapi`: `hono-openapi` keeps routes plain chained Hono.
- **Routes must be chained** (`new Hono().get(...).get(...)`) or `hc<AppType>`
  client types silently collapse. Guarded by `src/client.test-d.ts`.
- **Domain routes mount under `/v1`** via `API_VERSION_PREFIX` (`shared/constants/routes.ts`),
  never a hard-coded `"/v1"`; `/health` and `/ready` stay unversioned.
- **Auth guards** come from `@allonfire/auth/hono/middleware/*` and throw
  `HTTPException`; never build a 401/403 by hand.
- **`createApp(deps)` takes its dependencies** (rate-limit store, health
  checkers) so tests never open a socket.
- **Required env:** `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`,
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. Full list in
  `apps/api/.env.example`. `dev` loads it via Node's `--env-file`; tests use
  `apps/api/vitest.setup.ts`.
- **Redis db indexes:** 0 rate limits, 1 cache (reserved), 2 sessions
  (reserved). Eviction is `volatile-lru`; never TTL a session key.
- **Locales and the catalogue live in `features/i18n/constants/locales.ts`** — one file to
  maintain. `LOCALE` is the source; `Locale`, `SUPPORTED_LOCALES` and
  `DEFAULT_LOCALE` derive from it, `CATALOGUE` uses computed `[LOCALE.X]` keys
  so no tag is typed twice, and `satisfies Record<Locale, Translations>` fails if a
  locale has no messages. `Translations` is `typeof EN`, derived rather than
  `Record<MessageKey, string>`, so a target locale missing a key fails too.
- **The catalogue is not an error catalogue.** `TranslationKey` is
  `keyof typeof en.json`, so any localised string belongs there — a subject
  line, a notification body, a PDF heading. Errors are simply the keys that
  exist today. The dependency runs errors -> messages: `ERROR_CODE` carries
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

## Deployment

- VPS: Hetzner, 4 vCPU / 8 GB RAM, no swap, at 188.245.174.30 (ssh main-vps)
- Observability: self-hosted OpenObserve + Umami (Local only so far) — see `docs/adr/0006-self-hosted-observability.md`
- Orchestrator: Dokploy
- DB: Shared PostgreSQL 16 (database: allonfire)
- Proxy: Traefik with Let's Encrypt SSL

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `IsaiaScope/allonfire`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, label strings unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
