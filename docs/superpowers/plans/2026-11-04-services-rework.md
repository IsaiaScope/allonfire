# Services rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give mail its own `MailProvider` and `MailUsage` tables under a typed `Service`, delete usage past 90 days daily, cache the Services page like Users, and cover every concurrent case between two Admins.

**Status:** implemented (uncommitted) @ 2026-11-04T15:47:53+01:00

**Architecture:** One Liquibase changeset replaces 0007 to 0010 with the final shape (local database rolled back first; nothing has shipped). The database package renames its models and gains a usage cleanup the API's daily keep-alive runs. The Back Office reads Services through a private cache cleared by `updateTag` in every Services action, and reads a 404 as "the provider is gone".

**Tech Stack:** Postgres + Liquibase, Prisma 6, Hono + zod, Next 16 (Cache Components, `"use cache: private"`), TanStack Form (AOF forms), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-04-services-rework-design.md`; decision: `docs/adr/0029-each-service-type-has-its-own-provider-and-usage-tables.md`.

## Global Constraints

- Database changes are Liquibase changesets (`pnpm db:changeset`), never `prisma db push` or `prisma migrate`.
- Tests first. A test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals.
- No `as` casts except `as const`; constants in their owner's nested object; a path or an error code is never a string literal, tests included.
- `MailUsage` retention: 90 days, never under the rolling month (31 days).
- Cache life: `{ stale: 300, revalidate: 1800, expire: 3600 }`, tag `services`.
- Names: table/model `Service` (column `type`, enum `ServiceType`, value `MAIL`), `MailProvider`, `MailUsage`; enums `UsageStatus`, `UsagePurpose` unchanged.
- The API answer keeps its shape (a Service with `providers`); only `name` becomes `type`.
- The Service gets no Version.
- Nothing is committed: the owner commits (`/iso-commit`).
- exFAT: after writing files, `find . -name "._*" -not -path "*/node_modules/*" -delete`.

## Review Focus

- A test send on a disabled provider reserves and counts, but a verification or reset send never picks a disabled provider: Task 1 `reserveQuota` test, Task 2 `sendMail` test.
- The cleanup at the boundary: a row exactly 90 days old stays, one a millisecond older goes; usage inside 31 days is never touched: Task 1.
- The switch on a stale screen: picking the option already shown sends nothing: Task 3 browser test.
- A 409 or 404 clears this browser's copy, so the next visit is fresh: Task 3 action tests assert `updateTag` on refusals too.
- The fold keeps the seed rows (MAIL enabled, Brevo slot 0, Resend slot 1, both disabled, empty login and sender) and every check constraint: Task 1 integration tests run against the new changeset.

---

### Task 1: Database: per-type tables, typed Service, cleanup

**Files:**
- Delete: `packages/database/changelog/changesets/0007-service-mail.sql`, `0008-drop-provider-auth-failure.sql`, `0009-drop-provider-reset-time-zone.sql`, `0010-drop-provider-port.sql`
- Create: `packages/database/changelog/changesets/0007-service-mail.sql` (the fold)
- Modify: `packages/database/prisma/schema/service.prisma`
- Modify: `packages/database/src/features/service/constants/service.ts` (the `SERVICE` object)
- Modify: `packages/database/src/features/service/provider.service.ts`
- Test: `packages/database/src/features/service/tests/provider.integration.test.ts`

**Interfaces:**
- Produces: Prisma models `Service { type: ServiceType }`, `MailProvider`, `MailUsage`; enum `ServiceType` from `@allonfire/database/enums`.
- Produces: `reserveQuota(providerId: string, purpose: UsagePurpose, now?: Date): Promise<string | null>`; a `TEST` reservation ignores the provider's own `enabled` (still needs the Service enabled and room).
- Produces: `sendableProvider(type: ServiceType, id: string): Promise<MailProvider | null>`: the provider when its Service is enabled, whatever its own `enabled`.
- Produces: `deleteOldUsage(now?: Date): Promise<number>`: deletes `MailUsage` with `reservedAt < now - SERVICE.QUOTA.USAGE_RETENTION_MS`, answers the count.
- Produces: `SERVICE.QUOTA.USAGE_RETENTION_MS = 90 * UNIT.MS_PER_DAY`.
- Unchanged names: `listServices`, `enabledProviders(type)`, `updateService(type, change)`, `updateProvider`, `deleteProvider`, `settleUsage`, `ProviderIncompleteError`.

- [x] **Step 1: Roll the local database back past the four changesets**

Run: `cd packages/database && bash scripts/liquibase.sh rollback-count --count=4`
Expected: Liquibase reports success; `pnpm db:status` lists 0007 to 0010 as not applied.

- [x] **Step 2: Write the failing tests** in `provider.integration.test.ts`, the test fixture creating `prisma.mailProvider` rows and reading `prisma.service.findUniqueOrThrow({ where: { type: ServiceType.MAIL } })`:

```ts
it("reserves a test against a disabled provider, never another purpose", async () => {
  const { id } = await provider({ enabled: false });
  expect(await reserveQuota(id, UsagePurpose.TEST)).not.toBeNull();
  expect(await reserveQuota(id, UsagePurpose.VERIFICATION)).toBeNull();
});

it("finds a disabled provider to send through while its Service is on", async () => {
  const { id } = await provider({ enabled: false });
  expect((await sendableProvider(ServiceType.MAIL, id))?.id).toBe(id);
  await updateService(ServiceType.MAIL, { enabled: false });
  expect(await sendableProvider(ServiceType.MAIL, id)).toBeNull();
});

it("deletes usage older than the retention, keeping the rest", async () => {
  const { id } = await provider();
  const now = new Date();
  const edge = new Date(now.getTime() - SERVICE.QUOTA.USAGE_RETENTION_MS);
  await reserveQuota(id, UsagePurpose.TEST, new Date(edge.getTime() - 1));
  await reserveQuota(id, UsagePurpose.TEST, edge);
  await reserveQuota(id, UsagePurpose.TEST, now);
  expect(await deleteOldUsage(now)).toBe(1);
  expect(await prisma.mailUsage.count({ where: { providerId: id } })).toBe(2);
});

it("seeds MAIL on, with Brevo and Resend off and empty", async () => {
  const rows = await prisma.mailProvider.findMany({
    orderBy: { slot: "asc" },
    where: { slot: { lt: FIRST_TEST_SLOT } },
  });
  expect(rows.map(({ enabled, fromAddress, slot, username }) => ({ enabled, fromAddress, slot, username })))
    .toEqual([
      { enabled: false, fromAddress: "", slot: 0, username: "" },
      { enabled: false, fromAddress: "", slot: 1, username: "" },
    ]);
});
```

The retention test's 90-day-old rows sit past the monthly limit, so give that provider `monthlyLimit: null` and a daily limit of 10.

- [x] **Step 3: Run them to see them fail**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/service`
Expected: FAIL (`prisma.mailProvider` undefined, `sendableProvider` and `deleteOldUsage` not exported).

- [x] **Step 4: Write the fold**

Replace the four files with one `0007-service-mail.sql` (`--changeset isaia:0007-service-mail`, `logicalFilePath:changesets/0007-service-mail.sql`): enum `ServiceType ('mail')`, `UsageStatus`, `UsagePurpose`; `auth.User.verificationRequiredAt`; tables `Service` (`type` unique), `MailProvider` (today's columns without `port`, `dailyResetTimeZone`, `lastAuthFailureAt`), `MailUsage`; today's indexes, foreign keys (cascade) and check constraints renamed to the new tables (`MailProvider_slot_check`, limits ≥ 0, enabled needs login and sender) with no port check; the seed rows; a `--rollback` per statement. Mirror it in `service.prisma` (models `Service`, `MailProvider`, `MailUsage`, relation names `providers`, `usages`), replacing the stale "confirmed day boundary" comment with one for `lastAcceptedAt`: "The last acceptance, written by a send in raw SQL so it never moves the Version." Generate the SQL with `pnpm db:changeset service-mail` from the schema if easier, then rename and edit it to 0007.

- [x] **Step 5: Apply it and regenerate**

Run: `pnpm db:update && pnpm db:generate && pnpm db:drift`
Expected: update succeeds; drift exits 0.

- [x] **Step 6: Rename in `provider.service.ts` and add the two functions**

`prisma.serviceProvider` becomes `prisma.mailProvider`, raw SQL names `service."MailProvider"` and `service."MailUsage"`, `ServiceName` becomes `ServiceType`, `where: { name }` becomes `where: { type }`. `reserveQuota`'s lock query reads `WHERE p."id" = ${providerId} AND (p."enabled" OR ${purpose} = 'test') AND s."enabled"` (the purpose bound as its enum value, from `UsagePurpose.TEST`). Add `sendableProvider` and `deleteOldUsage` as in Interfaces. Above `providerVersion`, the comment: settings are written through `prisma.mailProvider.update` only; a raw write would skip `@updatedAt` and the Version.

- [x] **Step 7: Run the tests to see them pass**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/service && pnpm --filter @allonfire/database exec tsc --noEmit`
Expected: PASS; no type errors.

---

### Task 2: Core and API: `type`, test sends on a disabled provider, cleanup in the keep-alive

**Files:**
- Modify: `packages/core/src/features/mail/types/mail.ts` (`MailStore.providers`)
- Modify: `packages/core/src/features/mail/utils/send-mail.ts`
- Test: `packages/core/src/features/mail/tests/send-mail.test.ts`
- Modify: `apps/api/src/features/mail/database-store.ts`
- Modify: `apps/api/src/features/services/constants/schemas.ts`, `constants/services.ts`, `routes/routes.ts`, `routes/handlers.ts`, `routes/index.ts`, `services-deps.ts`, `utils/deps.ts`, `utils/keep-alive.ts`
- Test: `apps/api/src/features/services/tests/routes.test.ts`, `tests/keep-alive.test.ts`, `tests/stub-services-deps.ts`, `apps/api/src/features/docs/tests/spec.test.ts` if it names the param

**Interfaces:**
- Consumes: Task 1's `ServiceType`, `sendableProvider`, `deleteOldUsage`, `enabledProviders(type)`.
- Produces: `MailStore.providers(only?: string): Promise<SmtpProvider[]>`; `sendMail` calls `deps.store.providers(only)`.
- Produces: routes `GET /v1/services`, `PATCH /v1/services/:type` (`SERVICES.PATH` param renamed), answers and the keep-alive report carry `type` instead of `name`.
- Produces: keep-alive report `{ services: [...], prunedUsage: number }`; `ServiceKeepAlive.type`; `ServicesDeps.deleteOldUsage: (now: Date) => Promise<number>`.

- [x] **Step 1: Write the failing tests**

`send-mail.test.ts`: the fake store records the argument `providers` was called with; a send with `only` passes it, one without passes `undefined`.

`keep-alive.test.ts`: `runKeepAlives` with a stub `deleteOldUsage` answering 3 reports `prunedUsage: 3`, and a `deleteOldUsage` that throws still reports every Service's providers with `prunedUsage: 0` (the cleanup never blocks a keep-alive).

`routes.test.ts`: the listing's service has `type: ServiceType.MAIL`; `PATCH` on `SERVICES.PATH` with the `:type` param turns it off; an unknown `type` is 400.

- [x] **Step 2: Run them to see them fail**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/mail && pnpm --filter @allonfire/api exec vitest run src/features/services src/features/mail`
Expected: FAIL on the new assertions.

- [x] **Step 3: Implement**

`databaseMailStore.providers(only)`: with `only`, `sendableProvider(ServiceType.MAIL, only)` as a one-item or empty list; without, `enabledProviders(ServiceType.MAIL)`. Rename `name` to `type` through the schemas (`z.enum(ServiceType)`), the param schema, `toServiceBody`, the handlers and `mailKeepAlive`. `runKeepAlives(keepAlives, deleteOldUsage, now)` runs the keep-alives, then `deleteOldUsage(now)` caught to 0 with a logged warning (a new `SERVICES.LOG_MESSAGE.PRUNE_FAILED`). The OpenAPI docs strings follow.

- [x] **Step 4: Run them to see them pass**

Run: the Step 2 command, then `pnpm --filter @allonfire/api exec tsc --noEmit`
Expected: PASS; no type errors.

---

### Task 3: Back Office: cached Services, refusals that clear it, a switch that never repeats

**Files:**
- Modify: `apps/back-office/src/features/services/constants/services.ts` (`CACHE`, `SAVE_ERROR.REMOVED`, `TEST_ERROR.REMOVED`)
- Create: `apps/back-office/src/features/services/utils/read-services.ts`
- Test: `apps/back-office/src/features/services/utils/tests/read-services.test.ts`
- Modify: `apps/back-office/src/features/services/actions/services.ts`
- Test: `apps/back-office/src/features/services/actions/tests/services.test.ts` (extend)
- Modify: `apps/back-office/src/features/services/components/service-switch.tsx`, `services-list.tsx`, `test-send.tsx`, `delete-provider.tsx`
- Test: `apps/back-office/src/features/services/components/tests/service-switch.browser.test.tsx`
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/services/mail/page.tsx`
- Modify: `apps/back-office/src/features/i18n/translations/en.json`, `it.json`

**Interfaces:**
- Consumes: Task 2's API (`type`, unchanged answer shape), `ServiceType`.
- Produces: `SERVICES.CACHE = { LIFE: { expire: 3600, revalidate: 1800, stale: 300 }, TAG: "services" }` (seconds from `UNIT`, as `USERS.CACHE`).
- Produces: `readServices(): Promise<ServiceList>` under `"use cache: private"`, `cacheTag(SERVICES.CACHE.TAG)`, `cacheLife(SERVICES.CACHE.LIFE)`, `fetchServices(sessionApi(await readSessionCookie()))` inside (as `readUser`).
- Produces: `deleteProvider(id): Promise<boolean>` true on 204 and on 404; `saveProvider` answers `error: SERVICES.SAVE_ERROR.REMOVED` on 404; `sendTestEmail` answers `error: SERVICES.TEST_ERROR.REMOVED` on 404.

- [x] **Step 1: Write the failing tests**

`read-services.test.ts`: `readServices` reads through the Session's client and tags `SERVICES.CACHE.TAG` with `SERVICES.CACHE.LIFE` (mock `next/cache` as `read-user.test.ts` does).

`services.test.ts`, with the API client stubbed:
- `saveProvider`: 200 calls `updateTag(SERVICES.CACHE.TAG)` and answers the new version; 409 answers `CHANGED` and calls `updateTag`; 404 answers `REMOVED` and calls `updateTag`; 400 answers `INVALID` and does not call it.
- `deleteProvider`: 204 and 404 both answer true and call `updateTag`.
- `sendTestEmail`: 200 calls `updateTag`; 404 answers `TEST_ERROR.REMOVED` and calls it; 429 answers `RATE_LIMITED`.
- `setServiceEnabled`: OK calls `updateTag`.
- No action calls `refresh`.

`service-switch.browser.test.tsx`: rendered with `enabled`, picking Attivo (already shown) calls `setServiceEnabled` zero times; picking Spento calls it once with `false`; a refused save puts Attivo back and shows the `failed` toast.

- [x] **Step 2: Run them to see them fail**

Run: `pnpm --filter @allonfire/back-office exec vitest run src/features/services`
Expected: FAIL on the new assertions.

- [x] **Step 3: Implement**

`readServices` as in Interfaces; `ServiceProviders` and the Mail page read it (`ServiceProviders({ type, title })`, `ServiceType.MAIL`). Every `refresh()` in `actions/services.ts` becomes `updateTag(SERVICES.CACHE.TAG)`, also on a 404 or 409 refusal; `saveProvider`'s refusal map gains `[ERROR.CODE.NOT_FOUND, SERVICES.SAVE_ERROR.REMOVED]`. `ServiceSwitch` keeps the stored value it last saw (the prop, then each saved choice) and its listener returns early when the picked value equals it. `TEST_TOAST` gains `REMOVED: "error"`. Translations, en and it, beside the existing ones: `Services.error.removed` ("This provider was removed. Reload the page." / "Questo provider è stato rimosso. Ricarica la pagina.") and `Services.test.removed` (same words). The Mail page's doc comment loses "read from the API on every visit".

- [x] **Step 4: Run the checks**

Run: `pnpm --filter @allonfire/back-office exec vitest run && pnpm --filter @allonfire/back-office exec tsc --noEmit && pnpm run static:i18n`
Expected: PASS.

- [x] **Step 5: Run the Services e2e test against the real stack**

Run: `cd apps/back-office && pnpm exec playwright test e2e/services.spec.ts --project=chromium`
Expected: 2 passed.

---

### Task 4: Docs and the whole-repo gate

**Files:**
- Modify: `docs/guides/database.md` (the `service` schema line: `Service` with `type`, `MailProvider`, `MailUsage`, `sendableProvider`, `deleteOldUsage`, the 90-day retention)
- Modify: `docs/guides/api.md` (Services: `:type`, the keep-alive deletes old usage and reports `prunedUsage`)
- Modify: `docs/guides/back-office.md` (the Services line: kept privately under `SERVICES.CACHE.TAG`, cleared by every Services action, rings up to 5 minutes late for mail sent elsewhere; replaces "never kept")
- Modify: `apps/api/README.md` (keep-alive runbook: the cleanup)
- Modify: `docs/adr/0028-pages-prefetch-their-data-and-a-user-save-is-version-checked.md` (Consequences: the Services page is cached the same way; a provider save is version-checked, the Service switch and a delete are not)

- [x] **Step 1: Update the docs above**

- [x] **Step 2: Run the repo gate**

Run: `pnpm run static:types && pnpm run static:lint && pnpm run static:knip && pnpm run static:dupes && pnpm run static:i18n && pnpm run static:tailwind`
Expected: all pass.

- [x] **Step 3: Run every workspace's tests**

Run: `pnpm run test:run`
Expected: all pass (database, API, core, Back Office, ui).

- [x] **Step 4: Delete exFAT sidecars**

Run: `find . -name "._*" -not -path "*/node_modules/*" -delete`

## Documentation checked

`docs/guides/database.md`, `api.md`, `back-office.md`, `testing.md` conventions, ADR 0028 and 0029, `CONTEXT.md` (Service), `apps/api/README.md`.

## Adjustments made while implementing

- A test send to a deleted provider needed the API to say so: `sendTest` answers `null` for a missing provider (new `findProvider`), the route answers 404.
- The cleanup is per Service type: each `ServiceKeepAlive` has `prune`, and the report carries `prunedUsage` per service, not once (generic for a later type).
- The Service switch needed no client guard: the Gooey choice already sends nothing for the shown option; a browser test pins it.
- `ServiceProviders` draws a provider through `PROVIDER_CARD[type]`, so a new Service type fails to compile until it has its card.
- `readServices` test uses a shared `session-cookie-mock`.

## Implementation Log
- Implemented: 2026-11-04T15:47:53+01:00
- Workspace: current-branch — feat/instant-users-navigation
- Committed: no — awaiting user review
