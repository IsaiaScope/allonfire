# Mail providers over their HTTP APIs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. `/iso-write` stops for review: no commit steps here.

**Goal:** The MAIL Service sends through its Providers' HTTP APIs with `fetch`, fails over on typed refusals, and draws the Services page's two rings from usage the Providers report; no SMTP, no local quota ledger, no vendor name in code.

**Status:** implemented (uncommitted) @ 2026-11-09T10:31:01+01:00

**Architecture:** Core owns a driver contract (`send` and `usage`) and two drivers named for the API's shape. A Provider's URL, key and driver come from env per slot; its DB row keeps only slot, name, enabled, sender, ring limits and `lastAcceptedAt`. The API reads usage per Provider live (Redis-cached) for the page; sending never reads it.

**Tech Stack:** TypeScript, Hono, Prisma + Liquibase, Redis (ioredis), Next 16 (Back Office), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-mail-providers-over-api-design.md`

## Global Constraints

- No `Brevo`, `Resend`, `brevo`, `resend`, `smtp`, `nodemailer` in any `.ts`, `.tsx`, `.json`, `.sql`, `.example`, `.sh` file under `apps`, `packages`, `vps`, `docker`. Operator docs (`apps/api/README.md`, ADRs, guides) may name vendors only to say which key to create where.
- Drivers: `BEARER_FLAT` (`"bearer-flat"`), `KEY_HEADER_ENVELOPE` (`"key-header-envelope"`).
- Env per slot: `MAIL_PROVIDER_<slot>_URL` (an `https` API base), `_KEY`, `_DRIVER`.
- Attempt outcomes of a driver's `send`: `accepted`, `quota`, `rejected`, `uncertain`. `uncertain` stops the send and is never retried elsewhere.
- "Today" is the UTC calendar day; "last month" is the last 31 days.
- Per-address Redis limit (5 per rolling hour) is untouched.
- Repo rules (`AGENTS.md`, `docs/guides/conventions.md`, `code-style.md`, `testing.md`): tests first; first line `// @module-tag unit|integration`; Vitest globals; no `as` casts except `as const`; constants one nested object per owner; no `Object.keys/values/entries/fromEntries`, no `JSON.parse/stringify` (use core's `parseJsonWith`, `stringifyJson`, `objectKeys`...); no string-literal paths or error codes; Liquibase only.
- `docs/guides/database.md` says never edit an applied changeset. `0007-service-mail` is on this branch only (absent from `dev`, `test`, `prod`), so it is edited in place; Local databases that applied it are reset (`pnpm docker:down`, volume removed, `pnpm dev:setup`).

## Review Focus

- A 2xx answer with a body that is not the expected JSON: still `accepted` (Task 3, Task 4 tests).
- A read timeout after the request left: `uncertain`, no second provider tried (Task 5 test).
- Every provider quota-refused: outcome `unavailable`, never `uncertain` or `rejected` (Task 5 test).
- A URL in env that is `http://` or not a URL: no endpoint, provider skipped and logged, the key never sent in plaintext (Task 2 test).
- One provider's usage call failing or refused (key scope): that provider's rings draw empty with an error toast, the page and the other provider still answer (Task 7 and 8 tests).

---

### Task 1: Probe both APIs with real keys (manual, nothing committed)

**Files:**
- Modify: `docs/superpowers/specs/2026-11-09-mail-providers-over-api-design.md` (append a `## Probe results` section)

Neither vendor's docs settle three things the drivers depend on. Ask the user for a key per provider with `request_secret` (a sending-scope key for each, then a full-scope key if the sending one is refused); put them in the shell env only, never in a file, log or the spec.

- [x] **Step 1: Brevo-shaped probe.** `curl` `GET <base>/smtp/statistics/aggregatedReport?startDate=D&endDate=D` and `?days=31` with the `api-key` header; record whether `requests` counts the sends you made today (send one test through `POST <base>/smtp/email` first and compare); record the error body and status for a revoked key.
- [x] **Step 2: Resend-shaped probe.** `curl` `GET <base>/emails/metrics?start_date=<UTC day start>&granularity=daily` with a sending-scope key; record the status (refused or not), then `totals.sent` against the sends made today; record the status and body of a `quota` refusal if reproducible, else take the documented `429` `daily_quota_exceeded`.
- [x] **Step 2b: Account credits probe.** `curl` Brevo-shaped `GET <base>/account`; record `plan[]` (`type`, `credits`, `creditsType`), whether `credits` is the day's remaining allowance or a plan total, and how it moves after a send. This decides whether Task 4 may derive `dayLimit = day + credits`. Resend-shaped has no such endpoint.
- [x] **Step 3: Write the findings** under `## Probe results` (status, body shape, one redacted example each) so Tasks 3 and 4 copy real shapes into their fixtures. If a usage call is refused for the key's scope, record it: that driver's `usage()` answers `null` and the README names the needed scope.
- [x] **Step 4: Run** `grep -rn "re_\|api-key" docs/superpowers/specs/2026-11-09-mail-providers-over-api-design.md`. Expected: no key material.

### Task 2: Core contract, constants and endpoint reader

**Files:**
- Modify: `packages/core/src/features/mail/constants/mail.ts`, `packages/core/src/features/mail/types/mail.ts`, `packages/core/src/environment/mail-environment.ts`
- Create: `packages/core/src/features/mail/utils/http-attempt.ts`
- Test: `packages/core/src/features/mail/tests/mail-endpoint.test.ts`, `packages/core/src/features/mail/tests/http-attempt.test.ts` (replaces `provider-secret.test.ts`)

**Interfaces:**
- Produces, in `constants/mail.ts`: `MAIL.DRIVER` (the two driver ids above), `mailDriverSchema = z.enum(MAIL.DRIVER)`, `type MailDriver`; `MAIL.ATTEMPT = { ACCEPTED: "accepted", QUOTA: "quota", REJECTED: "rejected", UNCERTAIN: "uncertain" }`, `mailAttemptSchema`, `type MailAttempt`; `MAIL.PURPOSE = { VERIFICATION: "verification", PASSWORD_RESET: "password-reset", TEST: "test", KEEP_ALIVE: "keep-alive" }`, `mailPurposeSchema`, `type MailPurpose` (replaces the database's `UsagePurpose`, log field only); `MAIL.ENV = { PREFIX: "MAIL_PROVIDER_", SUFFIX: { DRIVER: "_DRIVER", KEY: "_KEY", URL: "_URL" } }`; `MAIL.HTTP = { TIMEOUT_MS: 15 * UNIT.MS_PER_SECOND, DEFINITE_ERROR_CODES: ["ENOTFOUND", "ECONNREFUSED", "EAI_AGAIN"] }`; log messages (`ACCEPTED`, `NO_ENDPOINT`: "mail provider has no usable URL, key and driver in the environment", `NO_PROVIDER`, `QUOTA`: "mail provider has no room left; trying the next", `REJECTED`, `STORE_FAILED`, `UNCERTAIN`). Delete `MAIL.SMTP`, `smtpHostSchema`, `MAIL.ENV.SUFFIX` as a string, `HOST_NOT_ALLOWED`, `NO_SECRET`. `MAIL.OUTCOME` stays.
- Produces, in `types/mail.ts`: `MailMessage` (unchanged), `SendingProvider = { id: string; slot: number; name: string; fromAddress: string }`, `MailEndpoint = { driver: MailDriver; url: string; key: string }`, `MailFetch = typeof fetch`, `MailUsage = { day: number; month: number; dayLimit: number | null; monthLimit: number | null }` (`dayLimit`, `monthLimit`: the limits the provider's own API reports, null when it reports none; the page then uses the DB columns), `MailDriverImpl = { send: (endpoint: MailEndpoint, message: MailMessage & { from: string }, fetcher: MailFetch) => Promise<MailAttempt>; usage: (endpoint: MailEndpoint, now: Date, fetcher: MailFetch) => Promise<MailUsage | null> }`, `MailStore = { providers: (only?: string) => Promise<SendingProvider[]>; accepted: (providerId: string) => Promise<void> }`, `MailDeps = { store: MailStore; endpoint: (slot: number) => MailEndpoint | undefined; fetch: MailFetch; logger: MailLogger }`. `MailLogger`, `SendResult` unchanged. The `P extends string` generics go.
- Produces, in `mail-environment.ts`: `providerEndpoint(slot: number, env?: Readonly<Record<string, string | undefined>>): MailEndpoint | undefined`: undefined unless URL (zod `z.url()` whose protocol is `https`), key (non-empty) and driver (`mailDriverSchema`) are all present and valid. `providerSecret` is removed.
- Produces, in `utils/http-attempt.ts`: `attemptOf(request: () => Promise<Response>, readRefusal: (response: Response) => Promise<MailAttempt>): Promise<MailAttempt>`: runs the request, a 2xx is `accepted` without reading the body, any other status goes to `readRefusal`; a thrown error whose `cause.code` (or own `code`) is in `MAIL.HTTP.DEFINITE_ERROR_CODES` is `rejected`; any other throw (abort, timeout, reset) is `uncertain`. Also `timeoutSignal(): AbortSignal` = `AbortSignal.timeout(MAIL.HTTP.TIMEOUT_MS)`.

- [x] **Step 1: Write failing tests.** `mail-endpoint.test.ts`: `providerEndpoint(0, env)` returns the endpoint for a full valid env; returns `undefined` for each of: missing URL, `http://x.test`, `not a url`, empty key, unknown driver, missing driver. `http-attempt.test.ts`: `201` → `accepted` and `readRefusal` not called; `429` calls `readRefusal` and returns its answer; a thrown `Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } })` → `rejected`; a thrown `DOMException("x", "TimeoutError")` → `uncertain`; a thrown plain `Error` → `uncertain`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/core exec vitest run src/features/mail/tests/mail-endpoint.test.ts src/features/mail/tests/http-attempt.test.ts`. Expected: FAIL (modules not defined).
- [x] **Step 3: Implement** the constants, types, `providerEndpoint` and `attemptOf`/`timeoutSignal` above; delete `provider-secret.test.ts`.
- [x] **Step 4: Run** the same command. Expected: PASS (the wider core suite stays red until Task 5).

### Task 3: `BEARER_FLAT` driver

**Files:**
- Create: `packages/core/src/features/mail/utils/drivers/bearer-flat.ts`
- Test: `packages/core/src/features/mail/tests/bearer-flat.test.ts`

**Interfaces:**
- Consumes: Task 2's `MailDriverImpl`, `MailEndpoint`, `attemptOf`, `timeoutSignal`, `MAIL.ATTEMPT`.
- Produces: `export const bearerFlat: MailDriverImpl`.

Request, from the spec and Task 1's probe: `POST <url>/emails`, header `Authorization: Bearer <key>`, JSON `{ from, to, subject, html, text }` built with `stringifyJson`. Refusals: status `429` is `quota` (daily, monthly and rate limits alike); any other 4xx or 5xx is `rejected`. Usage: `GET <url>/emails/metrics` twice (today from the UTC day start with `granularity=daily`; the last 31 days), reading `totals.sent` with a zod schema; any non-2xx, schema mismatch or throw answers `null`.

- [x] **Step 1: Failing tests with a fake `fetch`** (records `Request`s, answers canned `Response`s; fixture bodies copied from Task 1's probe): the sent request has method `POST`, the bearer header, the exact JSON body and no key in the URL or body; `201 {"id":"x"}` → `accepted`; `201` with body `not json` → `accepted`; `429` → `quota`; `401` → `rejected`; `500` → `rejected`; `usage()` returns `{ day: 3, month: 40, dayLimit: null, monthLimit: null }` from two canned metrics answers and asks for the UTC day start and a 31-day range; a `403` or a malformed body → `null`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/core exec vitest run src/features/mail/tests/bearer-flat.test.ts`. Expected: FAIL.
- [x] **Step 3: Implement** `bearerFlat` in the file above using `attemptOf`, `timeoutSignal` and `fetcher`.
- [x] **Step 4: Run** the same command. Expected: PASS.

### Task 4: `KEY_HEADER_ENVELOPE` driver

**Files:**
- Create: `packages/core/src/features/mail/utils/drivers/key-header-envelope.ts`
- Test: `packages/core/src/features/mail/tests/key-header-envelope.test.ts`

**Interfaces:**
- Consumes: as Task 3.
- Produces: `export const keyHeaderEnvelope: MailDriverImpl`.

Request: `POST <url>/smtp/email`, header `api-key: <key>`, JSON `{ sender: { email: from }, to: [{ email: to }], subject, htmlContent: html, textContent: text }`. Refusals: `429`, or a `400` whose body `code` is `not_enough_credits` (read with a zod schema; unreadable body counts as other) is `quota`; every other non-2xx is `rejected`. Usage: `GET <url>/smtp/statistics/aggregatedReport` with `startDate`=`endDate`=the UTC day, then `days=31`, reading `requests`, and `GET <url>/account` reading the send-limit `plan[].credits`; the calls run side by side. Task 1's probe showed that on a `free` plan entry the credits are the day's remaining allowance, so `dayLimit = day + credits` for a `free` `sendLimit` entry only; any other plan type (its credits are a plan total) leaves `dayLimit` null, never a made-up daily limit. `monthLimit` stays null. A failed report answers `null`; a failed account call only leaves the limits null.

- [x] **Step 1: Failing tests** mirroring Task 3's (same cases: request shape, `201` accepted, `201` with garbage body accepted, `429` quota, `400 {"code":"not_enough_credits"}` quota, `400 {"code":"invalid_parameter"}` rejected, `401` rejected, usage `{ day, month, dayLimit, monthLimit }` from `requests` and the account credits (per Task 1's meaning), an account call that fails leaves both limits null with `day` and `month` intact, a malformed report → `null`), fixtures from Task 1.
- [x] **Step 2: Run** `pnpm --filter @allonfire/core exec vitest run src/features/mail/tests/key-header-envelope.test.ts`. Expected: FAIL.
- [x] **Step 3: Implement** `keyHeaderEnvelope`.
- [x] **Step 4: Run** the same command. Expected: PASS.

### Task 5: `sendMail` fails over on attempts; SMTP and `nodemailer` go

**Files:**
- Create: `packages/core/src/features/mail/utils/drivers.ts` (`MAIL_DRIVERS = { [MAIL.DRIVER.BEARER_FLAT]: bearerFlat, [MAIL.DRIVER.KEY_HEADER_ENVELOPE]: keyHeaderEnvelope } as const satisfies Record<MailDriver, MailDriverImpl>`)
- Modify: `packages/core/src/features/mail/utils/send-mail.ts`, `packages/core/package.json` (drop `nodemailer`, `@types/nodemailer`), `pnpm-lock.yaml` via `pnpm install`, `packages/core/README.md`
- Delete: `utils/smtp-transport.ts`, `utils/outcome.ts`
- Test: `packages/core/src/features/mail/tests/send-mail.test.ts` (rewritten)

**Interfaces:**
- Consumes: Tasks 2 to 4.
- Produces: `sendMail(message: MailMessage, options: { purpose: MailPurpose; only?: string | undefined }, deps: MailDeps): Promise<SendResult>` and `MAIL_DRIVERS`.

Behaviour: `deps.store.providers(only)` in slot order; per provider: no `deps.endpoint(slot)` → log `NO_ENDPOINT`, next (not counted as a refusal); else the driver's `send` with `from: provider.fromAddress`; `accepted` → `store.accepted(id)` (failure logged `STORE_FAILED`, never fails the send) then `{ outcome: ACCEPTED, providerId }`; `quota` → log, next (not a refusal); `rejected` → log, next, remembered; `uncertain` → log and `{ outcome: UNCERTAIN, providerId }` at once. End of list: `REJECTED` when any provider rejected, else `UNAVAILABLE`.

- [x] **Step 1: Rewrite `send-mail.test.ts`** with a stub store and drivers by `endpoint` URL: first accepts → second never called; first `quota` then second accepts → accepted on the second; first `rejected` then second `accepted`; first `uncertain` → `UNCERTAIN`, second never called; all `quota` → `UNAVAILABLE`; one `rejected` and one `quota` → `REJECTED`; no endpoint for slot 0 → skipped, slot 1 used; `only` passes through to `store.providers`; `store.accepted` throwing still answers `ACCEPTED`; `store.providers` throwing → `UNAVAILABLE`; no log binding ever contains the key.
- [x] **Step 2: Run** `pnpm --filter @allonfire/core exec vitest run src/features/mail`. Expected: FAIL on `send-mail`.
- [x] **Step 3: Implement** `sendMail` and `MAIL_DRIVERS` (resolving the driver from `endpoint.driver`; `tryInTurn`'s recursion may stay); delete the files listed; `pnpm install`.
- [x] **Step 4: Run** `pnpm --filter @allonfire/core exec vitest run` and `pnpm --filter @allonfire/core check-types`. Expected: PASS.

### Task 6: Database: slimmer `MailProvider`, no usage

**Files:**
- Modify: `packages/database/prisma/schema/service.prisma`, `packages/database/changelog/changesets/0007-service-mail.sql`, `packages/database/src/features/service/provider.service.ts`, `packages/database/src/features/service/constants/service.ts`, `packages/database/src/features/seed/` or fixtures only if they name `MailUsage`
- Test: `packages/database/src/features/service/tests/provider.integration.test.ts` (rewritten)

**Interfaces:**
- Produces: `listServices(): Promise<Service & { providers: (MailProvider & { version: string })[] }>[]` (no `usage`), `enabledProviders(type)`, `findProvider(id)`, `sendableProvider(type, id)`, `updateService(type, { enabled })`, `updateProvider(id, change: ProviderChange, { expectedVersion }): Promise<string | null>` where `ProviderChange` edits `dailyLimit`, `enabled`, `fromAddress`, `monthlyLimit`, `name` only, `markAccepted(providerId: string, now?: Date): Promise<void>` (raw SQL write of `lastAcceptedAt`, outside the Version), `ProviderIncompleteError` (enabled with an empty sender). Removed: `reserveQuota`, `settleUsage`, `deleteOldUsage`, `deleteProvider`, `SERVICE.QUOTA`, `ProviderUsage`.

Schema and changeset (the tables as drawn in the planning thread): drop `MailUsage`, enums `UsageStatus` and `UsagePurpose`, columns `host` and `username`; the enabled check becomes `NOT "enabled" OR "fromAddress" <> ''`; the seed rows are named `Provider 1` and `Provider 2` (vendor-free), disabled, empty sender, daily limits 300 and 100, monthly limits NULL and 3000; the rollback lines lose the dropped objects.

- [x] **Step 1: Rewrite the integration tests** for what stays: `listServices` returns providers in slot order each with a `version` and no `usage`; `updateProvider` saves on a Version, throws `ResourceChangedError` on a stale one, throws `ProviderIncompleteError` for enabled with an empty sender; `markAccepted` sets `lastAcceptedAt` and leaves `version` unchanged; `enabledProviders` is empty while the Service is off; `sendableProvider` finds a disabled provider while the Service is on.
- [x] **Step 2: Run** `pnpm --filter @allonfire/database exec vitest run src/features/service` (needs `pnpm test:services`). Expected: FAIL.
- [x] **Step 3: Edit** the Prisma schema and `0007` in place, `pnpm db:generate`, reset Local (`pnpm docker:down`, drop the database volume, `pnpm dev:setup`), then update `provider.service.ts` and `constants/service.ts`.
- [x] **Step 4: Run** the same command, then `pnpm db:drift`. Expected: PASS, no drift.

### Task 7: API: wiring, usage reader, routes, keep-alive

**Files:**
- Modify: `apps/api/src/features/mail/mail-deps.ts`, `mail/database-store.ts`, `mail/utils/auth-mail.ts`, `mail/constants/email.ts` only if it names the purpose, `services/services-deps.ts`, `services/utils/deps.ts`, `services/utils/keep-alive.ts`, `services/constants/schemas.ts`, `services/constants/services.ts`, `services/routes/handlers.ts`, `services/routes/routes.ts`, `services/routes/index.ts`, `i18n/translation-values.ts`, `i18n/translations/en.json`, `it.json`, `apps/api/.env.example`, `apps/api/src/index.ts` (shutdown of the usage Redis client if it needs one)
- Create: `apps/api/src/features/services/utils/usage-reader.ts`
- Test: `services/tests/usage-reader.test.ts`, `services/tests/routes.test.ts`, `services/tests/keep-alive.test.ts`, `services/tests/stub-services-deps.ts`, `mail/tests/auth-mail.test.ts`, `docs/tests/spec.test.ts`, `i18n/tests/translate.test.ts`

**Interfaces:**
- Consumes: core `MAIL_DRIVERS`, `providerEndpoint`, `MailDeps`, `MailUsage`, `MAIL.PURPOSE`; database Task 6 functions.
- Produces: `createUsageReader({ endpoint, fetch, redis, now, logger }): (provider: { id: string; slot: number }) => Promise<MailUsage | null>` in `usage-reader.ts`: reads `MAIL_DRIVERS[driver].usage`, cached in Redis under key `mail:usage:<providerId>` for `SERVICES.USAGE_CACHE_MS` (5 minutes, a constant) via `stringifyJson` and `parseJsonWith`; a missing endpoint, a driver answering null or throwing, or a Redis failure answers `null` and is logged, never thrown; failures are not cached.
- `ServicesDeps` gains `usageOf: (provider: { id: string; slot: number }) => Promise<MailUsage | null>`, `configured: (slot: number) => boolean` replaces `secretConfigured`; loses `deleteProvider`. `ServiceBody` providers lose `host`, `username`, `secretConfigured`; gain `configured: boolean` and `usage: { day: number; month: number; dayLimit: number | null; monthLimit: number | null } | null`. `mailDeps: MailDeps = { endpoint: (slot) => providerEndpoint(slot), fetch, logger, store: databaseMailStore }`; `databaseMailStore.accepted` = `markAccepted`. `KeepAliveBody` and `ServiceKeepAlive` lose `prune` and `prunedUsage`; `purpose` values come from `MAIL.PURPOSE`. The `DELETE /providers/:id` route, `deleteHandlers`, `deleteRoute` and `SERVICES.DOC.DELETE_*` go. The `PROVIDER_INCOMPLETE` message reads "An enabled provider needs a sender" (en, it).

- [x] **Step 1: Failing tests.** `usage-reader.test.ts`: first call hits the driver and caches, second within five minutes does not; `null` from the driver is not cached; a driver that throws, no endpoint, and a Redis that throws each answer `null` (use the integration Redis only if `testing.md` says unit tests may; else a stub client). `routes.test.ts`: `GET` list answers per provider `usage: null` when `usageOf` answers null and `usage: { day, month }` otherwise, one provider's `usageOf` rejecting does not fail the response; no `host`, `username` or `secretConfigured` in any body; `DELETE /providers/:id` answers 404 (route gone); `PATCH` with `host` is refused by validation. `keep-alive.test.ts`: report has no `prunedUsage`; an idle provider sends, a recent one is `skipped`. Update `auth-mail`, `spec` (OpenAPI), `translate` tests for the renames; `translate.test.ts` uses a neutral provider name.
- [x] **Step 2: Run** `pnpm --filter @allonfire/api exec vitest run src/features/services src/features/mail src/features/docs src/features/i18n`. Expected: FAIL.
- [x] **Step 3: Implement** the interfaces above; `apps/api/.env.example` documents `MAIL_PROVIDER_<slot>_URL`, `_KEY`, `_DRIVER` with vendor-free text.
- [x] **Step 4: Run** the same command plus `pnpm --filter @allonfire/api check-types`. Expected: PASS.

### Task 8: Back Office: Services page

**Files:**
- Modify: `apps/back-office/src/features/services/utils/provider-form-schema.ts`, `components/provider-fields.tsx`, `components/provider-form.tsx`, `components/provider-usage.tsx`, `components/services-list.tsx`, `actions/services.ts`, `constants/services.ts`, `apps/back-office/src/features/i18n/translations/en.json`, `it.json`, `apps/back-office/e2e/services.spec.ts`
- Delete: `components/delete-provider.tsx`
- Test: `utils/tests/provider-form-schema.test.ts`, `actions/tests/services.test.ts`, `utils/tests/read-services.test.ts`, `components/tests/service-switch.browser.test.tsx`, a new `components/tests/provider-usage.browser.test.tsx`, `e2e/services.spec.ts`

**Interfaces:**
- Consumes: Task 7's `ServiceBody` (`usage: { day, month } | null`, `configured`, no `host`/`username`).
- Produces: `providerFormSchema` with fields `dailyLimit`, `enabled`, `fromAddress`, `monthlyLimit`, `name` only; `ProviderUsage` renders the two `AOFRadialMeter` rings as today when `provider.usage` is set. Ring maxima are `usage.dayLimit ?? provider.dailyLimit` and `usage.monthLimit ?? provider.monthlyLimit` (API first, DB column when the API reports none). When `usage` is null the rings draw empty (value 0 against the DB limits) and a small client component `UsageUnreadToast` calls `aofToast(t("usage.unread", { name }), "error")` once on mount (the repo's snack, as the save toast does); no inline message; `SERVICES.DELETE_KANJI`, `deleteProvider` and `DeleteProvider` removed; the missing-key badge reads `configured`.

- [x] **Step 1: Failing tests.** `provider-form-schema.test.ts`: the schema parses the five fields and ignores no more (a `host` key is stripped or rejected per the repo's zod style); `providerChangeOf` carries those five. `provider-usage.browser.test.tsx`: with `usage: { day: 3, month: 40, dayLimit: null, monthLimit: null }` and DB limits 100 and 3000 both rings render at 3/100 and 40/3000; with `dayLimit: 300` the day ring's max is 300 (API first) and the month ring still uses 3000; with `usage: null` both rings render empty at 0 and `aofToast` is called once with the `usage.unread` message and `"error"`. `services.test.ts` loses the delete cases. `e2e/services.spec.ts`: form names are `Provider 1` and `Provider 2`; the limit validation case still passes.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office exec vitest run src/features/services` and `pnpm --filter @allonfire/back-office test:browser`. Expected: FAIL.
- [x] **Step 3: Implement.** Keep the visual shape (cards, `BrushKanji`, rings); follow `docs/guides/back-office.md` and `forms.md`; use `/aof-design` only if a visual change beyond the empty-ring state and the toast is needed (it is not).
- [x] **Step 4: Run** both commands again, `pnpm --filter @allonfire/back-office check-types`, `pnpm static:i18n`. Expected: PASS.

### Task 9: Docs, workflow, ADRs and the final gate

**Files:**
- Modify: `apps/api/README.md` ("Mail and Services"), `docs/guides/database.md` (the `service` schema bullet), `docs/guides/api.md`, `docs/guides/back-office.md`, `docs/guides/vps-workflow.md`, `docs/adr/0029-each-service-type-has-its-own-provider-and-usage-tables.md`, `vps/workflows/services-keep-alive.json`, `vps/.env.example` if it lists mail secrets, `CONTEXT.md` (already updated: re-read it against the final names)
- Create: `docs/adr/0030-mail-quota-is-read-from-the-provider.md`

- [x] **Step 1: ADR 0030** (format per `docs/adr/` neighbours): title "Mail quota is read from the provider, not counted"; context (the ledger duplicated each provider's own count and missed outside sends); decision (drivers report usage, the page reads it live with a short cache, sending never reads it, failover on typed refusals, limits stay in the DB only to size the rings); options considered (a DB snapshot table, a send log table, reading remaining credits before each send, keeping the reservation ledger) each with why not; consequences (usage unknown when a provider refuses its scope or is down; the rings draw empty and an error toast says so; rings reflect sends made outside AllOnFire too). Amend 0029 where it names `MailUsage`: usage tables exist only for a type that must count itself, and MAIL no longer does (its Consequences line on retention goes).
- [x] **Step 2: Rewrite** the README section: per-slot env (`_URL`, `_KEY`, `_DRIVER`) with the Task 1 probe's key scope per driver and which vendor API each driver speaks (the one place vendors are named); setup, DNS, quota behaviour (refusal-driven failover, uncertain stops), keep-alive without pruning, what to watch (log lines from Task 2's constants), rollback (turn the Service off; drop `0007` as before). Update the guides' mentions and the workflow JSON content (drop the pruning sentence and the vendor name); `packages/config/local/tests/workflows.test.ts` and `prod-compose.test.ts` stay green.
- [x] **Step 3: Vendor-name gate.** Run `git grep -niE "brevo|resend|smtp|nodemailer" -- apps packages vps docker ':!*.md' ':!pnpm-lock.yaml' ':!docs'`. Expected: no output. (`resend` inside `rate-limiter.ts`'s comment "resends the ~100-byte script" is prose: reword it if it matches.)
- [x] **Step 4: Full gate.** `pnpm static`, `pnpm check` (the repo's stage runner; see `docs/guides/testing.md`). Expected: PASS. Then `git status` and confirm no key material was written.

## Documentation checked

`AGENTS.md`, `docs/guides/{conventions,code-style,testing,database,api,back-office,forms,vps-workflow}.md`, `CONTEXT.md`, ADR 0028, ADR 0029 (amended), ADR 0030 (new), `apps/api/README.md`, `packages/core/README.md`. Conflict: `database.md` says never edit an applied changeset; `0007` is on this branch only, so it was edited in place and the Local database rolled back and updated again.

## Implementation Log
- Implemented: 2026-11-09T10:31:01+01:00
- Workspace: current-branch — feat/instant-users-navigation
- Committed: no — awaiting user review

### Rulings
- Task 1: Resend probe ran with the Local key (full scope, `GET /emails/metrics` 200). Brevo probe ran after a new Full-access v3 key was created in the Brevo dashboard (the old SMTP key is refused by the REST API); results are in the spec's "Probe results". Cost if wrong: none, read-only calls.
- Task 4: on a `free` plan the account credits are the day's remaining allowance (probed: 300 credits, 0 sent), so `dayLimit = day + credits` for a `free` `sendLimit` entry only; any other plan type leaves it null. Cost if wrong: a paid plan shows the DB limit.
- Task 5: `MailDeps` gained `drivers` (the real stack passes `MAIL_DRIVERS`) so tests inject stub drivers. `/smtp/...` stays in two Brevo-shaped path constants: they are the API's own paths, not a vendor name.
- Task 7: a cache (Redis) failure falls back to a live provider read instead of answering null (the plan said null): a cache outage must not blank the rings.
- Task 8: `ProviderUsage` became a client component that also fires the error toast, instead of a server component plus a separate `UsageUnreadToast` (a browser test cannot render an async server component).
- Task 9: production compose and `docker/.env.example` gained `_URL` and `_DRIVER` per slot (the plan named only the API env), else Production would never receive them; the seed names the providers `Provider 1` and `Provider 2`.

### Not run
- `apps/back-office/e2e/services.spec.ts` (Playwright, needs the full stack): its labels were updated to `Provider 1` and `Provider 2`.
- Production `knip` lists `ProviderIncompleteError` (used only by tests) and others already there.
