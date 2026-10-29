# Quality Fixes A Implementation Plan (Shortlist + tool hits + CI gate)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Runs after `docs/superpowers/plans/2026-10-29-chore-production-launch.md`. Fix the scan report's 15 Shortlist items. Then fix or accept, with a written reason, every hit knip and jscpd report. Then gate both tools in CI.

**Architecture:**
- **Phase 1:** one task per Shortlist item, test-first. The finding's row in the report is the detailed spec: `file:line`, fix, and the verifier's correction.
- **Phase 2:** first sharpen the two tools (production mode, absolute paths, YAML, false positives). Then work their output to zero: each hit is fixed, or accepted in `knip.jsonc`/`.jscpd.json` with a reason. Tag the report's rows by layer, and add one CI quality job.
- **The logging fix (cross-15)** moves the API's pino factory and OTLP helpers into core. The Back Office reuses them through Next's `instrumentation.ts`.

**Tech Stack:** pnpm 9 + Turbo, TypeScript 6, Biome (Ultracite) + oxlint, Vitest 4, Hono, Next 16.3.6, pino 10 + pino-opentelemetry-transport 4, OpenTelemetry NodeSDK 0.222, knip 6.43, jscpd 5.4, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-29-quality-fixes-design.md` (findings: `docs/superpowers/specs/2026-10-29-quality-scan-report.md`)

## Global Constraints

- **Start on a clean tree**, with the Edit User work committed. If `git status --short` lists anything, stop and ask.
- **Every task ends green** before the next one starts:
  - `pnpm exec biome check --write <files touched>`;
  - `pnpm lint` (Ultracite plus oxlint type-aware), clean;
  - `pnpm check-types`, clean;
  - the touched packages' `pnpm --filter <pkg> test`.

  This is the **Gate** below.
- **No `biome-ignore`, `@ts-expect-error` or `@ts-ignore` is ever added.** The type-test `@ts-expect-error` lines that already exist stay. The one existing `biome-ignore` (`packages/database/src/index.ts`) goes, in Task 16.
- **knip and jscpd ignores are allowed only with a written reason:** a `//` comment in `knip.jsonc`, or a `jscpd:ignore-start` comment.
- **AGENTS.md holds throughout:**
  - tests first, and a `// @module-tag` first line in every test;
  - no `as` casts except `as const`;
  - constants as one nested object per owner;
  - no literal paths or error codes;
  - env vars carry their owner prefix. Exception: OpenTelemetry's standard `OTEL_*` names, as the API already uses them.
- **Any new npm dependency** passes the 200k weekly-download rule.
- **Laura-only exports are kept,** each accepted in knip with the reason "held only by Laura".
- **The 36 unused shadcn components stay.** Nothing in `packages/shadcn` is edited.
- **The production database and Dokploy are never touched.**
- **Telemetry is mandatory** (owner's rule). The API and the Back Office require `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS`. Production's `telemetry` service comes from the Production Launch plan (`docs/superpowers/plans/2026-10-29-chore-production-launch.md`), which runs before this plan. Task 3 checks that it is live before making the variables required.
- **Never commit.** The owner runs `/iso-commit`.
- **Each "Rules to write" rule** (report, last section, numbered 1 to 16) is written into its guide in the task that fixes its code.
- **Tasks that touch the Edit User files** (back-office users, auth users routes, `database/user.service.ts`) start by re-reading them. Anything already resolved is ticked off, not redone.

**Gate:** `pnpm exec biome check --write <files> && pnpm lint && pnpm check-types && pnpm --filter <each touched package> test`. Expected: every command exits 0.

## Review Focus

- **A truncated or corrupt picture,** at the Avatar route and at Image upload alike, answers 415 and never 500. Task 1's test feeds a truncated JPEG.
- **An API outage seen by the Back Office** still shows sign-in and writes an error line. Task 3's test makes `getSession`'s API call reject and asserts both the null and the logged error.
- **OTLP variables unset**: telemetry is mandatory, so both Apps refuse to boot with a clear env error naming `OTEL_EXPORTER_OTLP_ENDPOINT`. Tests and CI fill it from `LOCAL` and never ship lines. Tasks 2 and 3 each test the missing-endpoint error.
- **Accepted hits hiding real dead code:** an accept glob broad enough to swallow future dead files. Task 16's check fails when an ignore entry has no comment, or covers a whole folder.
- **A CI job green because it ran nothing:** Task 19 runs the job against a planted unused export and a planted clone, and watches both fail, before removing them.

---

## Phase 1: the Shortlist

### Task 1: storage-1, a corrupt Avatar answers 415

**Files:**
- Modify: `packages/storage/src/features/image/prepare/prepare-image.ts`
- Modify: `packages/storage/src/features/avatar/prepare-avatar.ts`
- Test: `packages/storage/src/features/avatar/tests/prepare-avatar.test.ts`

**Interfaces:**
- Produces: `encodeAvif(image: Sharp, options: { width: number; quality: number }): Promise<Buffer>` in `prepare-image.ts`. It rejects with `UnsupportedImageError` on any sharp decode or encode failure. Both `prepareImage` and `prepareAvatar` call it.

- [ ] **Step 1: Write the failing test** `it("refuses a truncated JPEG as unsupported, never a server error")`. Cut a real fixture JPEG to half its bytes, then `await expect(prepareAvatar(half)).rejects.toBeInstanceOf(UnsupportedImageError)`.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/storage exec vitest run src/features/avatar/tests/prepare-avatar.test.ts`. Expected: FAIL. The rejection is `Error: VipsJpeg: premature end of JPEG image`.
- [ ] **Step 3: Implement `encodeAvif`.** Move `prepareImage`'s encode-and-wrap block (currently `prepare-image.ts:127-150`) into it, and call it from both functions.
- [ ] **Step 4: Run** the same file, then `prepare-image.test.ts`. Expected: PASS.
- [ ] **Step 5: Gate** on `@allonfire/storage` and `@allonfire/api`. The api's avatar integration test exercises the route.

### Task 2: cross-15 (API part), one pino factory in core and the API's fallbacks log

**Files:**
- Create:
  - `packages/core/src/features/logger/create-logger.ts`;
  - `packages/core/src/features/telemetry/otlp.ts`, which moves `otlpExporterOptions` and `telemetryResourceAttributes` out of `apps/api/src/features/telemetry/resource.ts` and the API's `OTLP` constants.
- Modify:
  - `packages/core/package.json`: deps `pino`, `pino-opentelemetry-transport`, `@opentelemetry/api`, `@opentelemetry/resources`, and the new exports;
  - `apps/api/src/features/logger/logger.ts`, now a thin call into the factory;
  - `apps/api/src/features/telemetry/*` imports;
  - `apps/api/src/features/health/routes/handlers.ts:27`;
  - `apps/api/src/features/i18n/translate.ts:88`;
  - `apps/api/src/shutdown.ts:21`.
- Test:
  - `packages/core/src/features/logger/tests/create-logger.test.ts`;
  - `apps/api/src/features/health/tests/*`, `apps/api/src/features/i18n/tests/translate.test.ts`, `apps/api/src/shutdown.test.ts`.

**Interfaces:**
- Produces:
  - `createLogger(options: { level: LogLevel; development: boolean; serviceVersion?: string; otlp?: OtlpTarget; destination?: DestinationStream }): Logger`. It keeps the API's behaviour exactly: redaction from `LOG.REDACT`, the trace-context mixin, pretty in dev, and a stdout target plus `pino-opentelemetry-transport` when `otlp` is set.
  - `type OtlpTarget = { endpoint: string; headers: Record<string, string>; serviceName: string }`.
  - `otlpExporterOptions(target: OtlpTarget, path: string)`.
  - `telemetryResourceAttributes(target: OtlpTarget, serviceVersion: string)`.
  - These live in `@allonfire/core/features/telemetry/otlp` and `@allonfire/core/features/logger/create-logger`.

- [ ] **Step 1: Write the failing tests.**
  - `create-logger.test.ts`:
    - "writes JSON with the redacted paths censored to the stream it is handed";
    - "adds the OTLP transport only when a target is given": inspect the built transport options through a `destination` spy, or by exporting a pure `loggerTargets(options)` that the test reads.
  - API tests:
    - "a failed database check still answers 503 and logs the cause";
    - "a missing translation serves English and warns with the key and locale";
    - "a close that fails is logged with its error, not as a drain timeout";
    - "parseEnv fails without OTEL_EXPORTER_OTLP_ENDPOINT", since telemetry is now mandatory. The API's `vitest.setup.ts` and CI fill it from `LOCAL.URL.TELEMETRY` (add it to `LOCAL` if missing), and tests keep passing a `destination`, so no line is shipped.

    Each test captures lines with the API's existing `features/logger/tests/capture.ts`.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/core exec vitest run src/features/logger` and the three API test files. Expected: FAIL. The module is not found, and no log line is captured.
- [ ] **Step 3: Implement.**
  - Move the factory and OTLP helpers to core, and make the API's `logger.ts` call `createLogger` with its env.
  - Make the three fallbacks log:
    - `outageLatch` warns once per outage for `/ready`;
    - `translateCode` logs `logger.warn({ code, locale, err })`;
    - `withTimeout` carries the rejection's `err` beside `DRAIN_TIMEOUT`.
  - Keep every fallback's return value.
- [ ] **Step 4: Run** the same tests. Expected: PASS.
- [ ] **Step 5: Gate** on core and api.

### Task 3a: moved

Production's telemetry service now lives in `docs/superpowers/plans/2026-10-29-chore-production-launch.md` (Task 4), which runs before this plan.

### Task 3: cross-15 (Back Office, auth and browser parts), Next server logs and OpenTelemetry

**Files:**
- Create:
  - `packages/core/src/features/next/logger/environment.ts`: **required** `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_SERVICE_NAME` (default `allonfire-back-office`), and `NODE_ENV`, through `@t3-oss/env-core` as core already does. It reuses the API's endpoint and header schemas, moved into core with Task 2's OTLP helpers;
  - `packages/core/src/features/next/logger/server-logger.ts`;
  - `apps/back-office/src/instrumentation.ts` and `apps/back-office/src/instrumentation.node.ts`.
- Modify:
  - `packages/auth/src/features/next/utils/session.ts:28`, `with-sign-in-gate.ts:24`, `refresh-session.ts:36`, `sign-out.ts:29`;
  - `packages/core/src/features/next/pwa/aof-service-worker.tsx:18`;
  - `packages/ui/src/components/aof-avatar-field.tsx:218`;
  - `apps/back-office/.env.example` (the local OpenObserve values), `.github/workflows/ci.yml` (the CI values, from `LOCAL`), `docker/docker-compose.prod.yml` (the Back Office's and the API's `OTEL_*`, each `${X:?X is required}`, pointing at `http://telemetry:5080/api/default`);
  - `docs/agents/conventions.md` (rule 1), `docs/agents/next-apps.md` (instrumentation), `docs/agents/deployment.md` (the Back Office OTLP vars);
  - `apps/back-office/package.json` (`@opentelemetry/sdk-node` and the OTLP trace exporter, the versions the API uses).
- Test:
  - `packages/core/src/features/next/logger/tests/server-logger.test.ts`;
  - `packages/auth/src/features/next/tests/session.test.ts` and its siblings;
  - `apps/back-office/src/tests/instrumentation.test.ts`.

**Interfaces:**
- Consumes: `createLogger` and `OtlpTarget` from Task 2.
- Produces:
  - `serverLogger(): Logger`, a lazy singleton, in `@allonfire/core/features/next/logger/server-logger`. It is built from `environment.ts`, always with `otlp` set; `serviceName` is `OTEL_SERVICE_NAME`, and there is no `serviceVersion`. A `destination` override lets tests capture lines.
  - `register(): Promise<void>`, which always starts the NodeSDK from `instrumentation.node.ts` when `process.env.NEXT_RUNTIME === "nodejs"`. A missing endpoint fails `environment.ts`'s parse, so the server does not start.
  - `onRequestError: Instrumentation.onRequestError`, which calls `serverLogger().error({ err, path: request.path, routeType: context.routeType }, …)`.

- [ ] **Step 0: Check production telemetry.** The Production Launch plan must be complete: `https://observe.isaiariva.com` answers, and Dokploy holds `OTEL_EXPORTER_OTLP_HEADERS` for both Apps (check the key names only). Otherwise stop and ask.
- [ ] **Step 1: Write the failing tests.**
  - "getSession returns null and logs the error when the API call rejects". Mock the API client to reject, and spy on `serverLogger().error`. Write the same test for the sign-in gate, `refreshSession` and `signOutOfApi`.
  - "the Back Office's telemetry env fails without OTEL_EXPORTER_OTLP_ENDPOINT", and "serverLogger always carries the OTLP target".
  - "onRequestError logs the error with its route type".
  - "register starts the SDK on the Node runtime only".
  - Browser side: "a failed HEIC conversion still shows 'unreadable' and calls reportError". Spy `globalThis.reportError`. Do the same for the service worker registration.
- [ ] **Step 2: Run** the touched test files with `pnpm --filter <pkg> exec vitest run <file>`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Build `serverLogger`, the instrumentation files, the four auth logs and the two `reportError` calls.
  - Write rule 1 in `conventions.md`, word for word from the report's "Rules to write".
  - Write the Back Office's instrumentation in `next-apps.md`, and its required OTLP vars in `deployment.md`.
- [ ] **Step 4: Run** the same tests. Expected: PASS. Then run `pnpm --filter @allonfire/back-office build`. Expected: the build succeeds, and `pino` stays external, as it is in Next's default list.
- [ ] **Step 5: Gate** on core, auth, ui and back-office.

### Task 4: storage-19, private copies are cleaned on failure

**Files:**
- Modify: `packages/storage/src/features/image/hono/routes/write-handlers.ts:134-150`, `docs/agents/images.md` (rule 10)
- Test: `packages/storage/src/features/image/hono/tests/write.test.ts`

- [ ] **Step 1: Write the failing test** "when one copy fails, the copies already made are deleted and logged". The stub's `copyObject` rejects on the second key. Assert that `deleteObjects` was called with the first copy's key, and that `log.warn` got `LOG_MESSAGE.DELETE_FAILED` only when that delete fails.
- [ ] **Step 2: Run** `write.test.ts`. Expected: FAIL. `deleteObjects` is not called.
- [ ] **Step 3: Implement** `copiesForPrivate` with `Promise.allSettled`. On any rejection, run `deleteLeftovers` on the fulfilled copies' `to` keys, then rethrow the first rejection. Write rule 10 in `images.md`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Gate** on storage and api.

### Task 5: database-12, an Image a batch would empty answers 409

**Files:**
- Modify:
  - `packages/database/src/features/image/image.service.ts:256`, and its errors file beside `ImageNotFoundError`;
  - `packages/storage/src/features/image/hono/utils/errors.ts`;
  - `packages/core/src/features/errors/constants/*`, for the new code in `ERROR.CODE`;
  - `apps/api/src/features/i18n/translations/{en,it}.json`.
- Test:
  - `packages/database/src/features/image/tests/image.integration.test.ts`;
  - `packages/storage/src/features/image/hono/tests/write.test.ts`.

**Interfaces:**
- Produces:
  - `class ImageEmptiedError extends Error { readonly ids: string[] }`;
  - `ERROR.CODE.IMAGE_EMPTIED`;
  - the HTTP status `409`.

- [ ] **Step 1: Write the failing tests.**
  - Database: "a batch that leaves an Image in no App throws ImageEmptiedError with its id".
  - Storage: "an emptied Image answers 409 IMAGE_EMPTIED, not 404".
- [ ] **Step 2: Run** both. Expected: FAIL. `ImageNotFoundError` is thrown, and the route answers 404.
- [ ] **Step 3: Implement** the error, the code, the mapping to a 409 problem document, and both translations. Run `pnpm i18n:check`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Gate** on database, storage, core and api.

### Task 6: config-design-root-1, the guard test sees every file it reads

**Files:**
- Modify: `packages/config/turbo.json:6`, `docs/agents/testing.md` (rule 14)
- Test: `packages/config/local/tests/local-files.test.ts`

- [ ] **Step 1: Write the failing test** "config's turbo test inputs list every repo file its tests read". Parse `packages/config/turbo.json` with core's `parseJson`, collect the `$TURBO_ROOT$/…` inputs, and assert that they include `docker/docker-compose.prod.yml` and `.husky/pre-commit`.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/config test`. Expected: FAIL.
- [ ] **Step 3: Implement.** Add both inputs, name `service-names.test.ts` in the comment, and write rule 14.
- [ ] **Step 4: Run.** Expected: PASS. Then run `pnpm turbo run test --filter @allonfire/config --dry=json`. Expected: both files appear in the task's inputs.
- [ ] **Step 5: Gate** on config.

### Task 7: cross-7, the standard CodedErrors live in core

**Files:**
- Modify:
  - `packages/core/src/features/errors/coded-error.ts`;
  - `packages/storage/src/features/image/hono/utils/errors.ts:11-29`;
  - `packages/auth/src/features/users/hono/routes/handlers.ts:45,161`;
  - `docs/agents/api.md` (rule 9).
- Test: `packages/core/src/features/errors/tests/coded-error.test.ts`

**Interfaces:**
- Produces, beside `validationError`:
  - `notFound(options?: { cause?: unknown }): CodedError`;
  - `forbidden(): CodedError`;
  - `payloadTooLarge(limit: number): CodedError`.

  Each one carries `ERROR.CODE.NOT_FOUND`, `FORBIDDEN` or `PAYLOAD_TOO_LARGE` and its HTTP status, and `payloadTooLarge` carries `values: { limit }`.

- [ ] **Step 1: Write the failing test.** For each factory, assert its code, status and values.
- [ ] **Step 2: Run.** Expected: FAIL, with no export.
- [ ] **Step 3: Implement.** Replace storage's and auth's local builders with these. Storage keeps only `notFoundOnUnknownIds` and `asImageError`. Write rule 9.
- [ ] **Step 4: Run** core, then the storage and auth tests. Expected: PASS, with unchanged response bodies.
- [ ] **Step 5: Gate** on core, storage, auth and api.

### Task 8: cross-1, one test host for the HTTP modules

**Files:**
- Create: `packages/auth/src/shared/tests/test-host.ts`, exported as `./shared/tests/test-host`
- Delete: `packages/storage/src/features/image/hono/tests/test-host.ts`, `packages/auth/src/features/users/hono/tests/test-host.ts`
- Modify: every test importing those hosts, and auth's `post`/`remove`/`patch` helpers in `create.test.ts`, `delete.test.ts` and `edit.test.ts`

**Interfaces:**
- Consumes: `stubAuth` and `AuthEnv`, already in auth.
- Produces:
  - `moduleTestHost(options: { session: Session | null; path: string; routes: Hono<AuthEnv> }): Hono<AuthEnv>`. Its `onError` answers a CodedError's `code`, `errors` and `values`, an `HTTPException`'s status, and `ERROR.CODE.INTERNAL_ERROR` for anything else, which also fixes storage-14.
  - `json(method: HttpMethod, body: unknown): RequestInit`.
  - `errorOf(res: Response): Promise<{ code: string; errors?: unknown; values?: unknown }>`.

- [ ] **Step 1: Write the failing test.** `test-host.test.ts`: "answers a CodedError with its code, errors and values" and "answers an uncoded error as INTERNAL_ERROR".
- [ ] **Step 2: Run.** Expected: FAIL, with no module.
- [ ] **Step 3: Implement.** Point every module test at the new host. Turn the per-file request helpers into `host.request(path, json(HTTP.METHOD.X, body))`.
- [ ] **Step 4: Run** `pnpm --filter @allonfire/auth test` and `pnpm --filter @allonfire/storage test`. Expected: PASS, with the same test count as before.
- [ ] **Step 5: Gate** on auth and storage.

### Task 9: back-office-1 to 4, Add and Edit a User share their pieces

**Files:**
- Modify or create, after re-checking what Edit User already shipped:
  - `apps/back-office/src/features/users/utils/user-form-data.ts`;
  - `utils/user-form-schema.ts`;
  - `components/user-form-parts.tsx`;
  - `actions/add-user.ts`, `actions/edit-user.ts`;
  - `utils/add-user-schema.ts`, `utils/edit-user-schema.ts`;
  - `components/add-user.tsx`, `components/edit-user.tsx`, `components/password-rules.tsx`;
  - `src/features/i18n/translations/{en,it}.json`.
- Test: the existing `add-user`/`edit-user` action, schema and browser tests.

**Interfaces:**
- Produces:
  - in `user-form-data.ts`: `textOf(form, name)`, `rolesOf(form)`, `avatarChangeOf(form)`;
  - in `user-form-schema.ts`: `roleChoiceSchema`, `rolesSchema`, `passwordChecks`, `membershipsOf`, `nameField(messages)`, `passwordsMatch(messages)`;
  - in `user-form-parts.tsx`: `NameField`, `AvatarField` and `PasswordFields` (`required` and `labels` as props, built with the AOF form's `withForm`), plus `useToastThenList(options: { notices: readonly Notice[] })`;
  - shared copy under `Users.form.*`. `Users.add`/`Users.edit` keep only what differs.

- [ ] **Step 1: Re-check.** For each of back-office-1 to 4, list what already exists. Tick the parts done.
- [ ] **Step 2: Write the failing tests** for what remains. For example, "editUser and addUser read Role rows through rolesOf", which a spy on the shared module shows. Also: "both schemas refuse mismatched passwords with the same message".
- [ ] **Step 3: Run** `pnpm --filter @allonfire/back-office test` and `test:browser` on the users files. Expected: FAIL on the new tests only.
- [ ] **Step 4: Implement.** Move the pieces and the copy, then run `pnpm i18n:check`.
- [ ] **Step 5: Run.** Expected: PASS. Then run `pnpm dupes`. Expected: no clone between `add-user*` and `edit-user*`.
- [ ] **Step 6: Gate** on back-office.

### Task 10: cross-2, each env owner writes its local defaults once

**Files:**
- Create:
  - `packages/storage/src/features/test-bucket/local-env.ts`;
  - `packages/database/src/features/test-database/local-env.ts`.

  Export both.
- Modify:
  - `apps/api/vitest.setup.ts`, `packages/storage/vitest.setup.ts`, `packages/storage/src/features/test-bucket/global-setup.ts`;
  - `packages/auth/vitest.setup.ts`, `packages/database/vitest.setup.ts`.
- Test: `packages/storage/src/features/test-bucket/tests/local-env.test.ts`, `packages/database/src/features/test-database/tests/local-env.test.ts`

**Interfaces:**
- Produces:
  - `useLocalStorageEnv(): void`, which sets the six `STORAGE_*` from `LOCAL` with `??=`;
  - `useLocalDatabaseEnv(): void`, which does the same for `DATABASE_URL`.

- [ ] **Step 1: Write the failing tests.** "fills each unset STORAGE_ variable from LOCAL and keeps a set one". Do the same for the database.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Replace the copied lines in the five setups.
- [ ] **Step 4: Run.** Expected: PASS. Then run `pnpm dupes`. Expected: no cross-area `vitest.setup` clone.
- [ ] **Step 5: Gate** on storage, database, auth and api.

### Task 11: cross-12, export keys only for what is read from outside

**Files:**
- Modify:
  - `packages/auth/package.json:18-43`, `packages/storage/package.json:10-38`, `packages/database/package.json:19-25`, `packages/config/package.json:14`, and each one's README table;
  - `docs/agents/package-layout.md` (rule 5).
- Test: `packages/config/local/tests/package-exports.test.ts` (new)

- [ ] **Step 1: Write the failing test** "every export key of auth, storage, database and config is imported from outside its package". For each key, grep through `git ls-files` for the import specifier outside the package. Allow a Laura import, and allow a key a script, config or CLI reads.
- [ ] **Step 2: Run.** Expected: FAIL, naming the 25 keys.
- [ ] **Step 3: Implement.** Remove the 25 keys and their README rows, and switch any in-package user of a removed key to a relative import. Keep the live ones each area finding lists. Write rule 5.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Gate** on all four packages and both Apps.

### Task 12: moved

config-design-root-2 (the Back Office build's storage leftovers, and deleting the `STORAGE_ENDPOINT` secret) now lives in the Production Launch plan (Task 2), which runs before this plan. Mark config-design-root-2 `fixed (Production Launch)` in the report.

### Task 13: ui-2, ui's own code type-checks strictly

**Files:**
- Modify:
  - `packages/ui/tsconfig.json:8`;
  - the lenient tsconfig + `vendor:types` setup GooeyNav uses, extended to shadcn's `calendar`, `scroll-area`, `faceted` and `sonner`;
  - `packages/ui/src/components/aof-file-upload.tsx:163`, `aof-sidebar.tsx:148`, `tests/aof-text-field.test.tsx:23` (re-check the lines first).
- Test: `packages/ui/src/components/tests/shadcn-compat.test.tsx`

- [ ] **Step 1: Write the failing check.** Restore `exactOptionalPropertyTypes` and `noUnusedLocals` in `packages/ui/tsconfig.json`, then run `pnpm --filter @allonfire/ui check-types`. Expected: FAIL, with the three ui errors plus errors in the four shadcn files.
- [ ] **Step 2: Implement.** Route the four shadcn files through the lenient vendor setup, so no shadcn file is edited. Fix the three ui errors. Extend `shadcn-compat.test.tsx` to cover the four.
- [ ] **Step 3: Run** `check-types` and `pnpm --filter @allonfire/ui test`. Expected: PASS.
- [ ] **Step 4: Gate** on ui and back-office.

### Task 14: cross-9, durations from UNIT

**Files:**
- Modify:
  - `packages/core/src/shared/constants/units.ts:7`, adding `MS_PER_HOUR` and `MS_PER_DAY`;
  - every call site listed in cross-9: core `install-hint-state.ts` and its test, storage `image-server/sign.ts:6`, `sign.integration.test.ts:25-26`, database `template.test.ts:60`, `user.integration.test.ts:201`, ui `gooey-nav/drops.ts:4`, `engine.ts:138`, `step.ts:28`, api `rate-limiter.test.ts:22`.
- Test: `packages/core/src/shared/constants/tests/units.test.ts`

- [ ] **Step 1: Write the failing test.** `UNIT.MS_PER_HOUR === 60 * UNIT.MS_PER_MINUTE` and `UNIT.MS_PER_DAY === 24 * UNIT.MS_PER_HOUR`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Replace every listed literal. Storage's year is `UNIT.DAYS_PER_YEAR * UNIT.SECONDS_PER_DAY`, **not** `IMAGE.CACHE.TTL_SECONDS`. `config/test-run.ts` stays local.
- [ ] **Step 4: Run** the touched packages' tests. Expected: PASS, with unchanged values.
- [ ] **Step 5: Gate** on core, storage, database, ui and api.

### Task 15: cross-14, flat constants fold into their owners

**Files:**
- Modify:
  - auth `users/constants/users.ts:78`: `USER_SEARCH` becomes `USER.SEARCH`, with 8 importers;
  - config `tests/e2e/run.ts:4`: the `E2E_*` siblings become one `E2E`; `local/addresses.ts:69`: `TEST_API_URL` becomes `LOCAL.URL.TEST_API`; `tests/vitest/vitest.config.ts:5`: `BROWSER_TESTS`;
  - database `scripts/changeset-file.ts:1-5` (`CHANGESET`) and `test-database/*` (`TEST_DATABASE`);
  - ui `lib/use-aof-toast.ts:71`: `AOF_TOAST_KINDS` becomes `AOF_TOAST.KIND`; `lib/gooey-nav/looks.ts:5`: the `GOOEY_*` siblings become `GOOEY`;
  - `docs/agents/testing.md`, which names `TEST_API_URL`.

- [ ] **Step 1:** This is a rename with no new behaviour, so the test is the existing suite. Run `pnpm check-types`. Expected: PASS, the baseline.
- [ ] **Step 2: Implement** each fold, and update every importer, with `git grep` on each old name until it returns nothing.
- [ ] **Step 3: Run** `git grep -nE "\b(USER_SEARCH|E2E_LABEL|TEST_API_URL|BROWSER_TESTS|AOF_TOAST_KINDS|GOOEY_THEMES|CHANGESET_AUTHOR|PACKAGE_DIR|DOCKER_TIMEOUT)\b" -- apps packages docs`. Expected: no output.
- [ ] **Step 4: Gate** on auth, config, database, ui, back-office and api.

## Phase 2: the tool hits and the CI gate

### Task 16: knip, sharpened and worked to zero

**Files:**
- Rename: `knip.json` becomes `knip.jsonc`.
- Modify:
  - `package.json` scripts: `knip:production` is `knip --production`;
  - `packages/database/src/index.ts` and its importers: the barrel goes;
  - every file a hit fixes;
  - `docs/agents/conventions.md` (rule 6, for unexported schemas);
  - `docs/agents/tooling.md` (how to read and accept knip).
- Test: `packages/config/local/tests/knip-config.test.ts` (new)

**Interfaces:**
- Produces:
  - `pnpm knip` and `pnpm knip:production`, each exiting 0;
  - in `knip.jsonc`, every `ignore*` entry preceded by a `//` reason.

- [ ] **Step 1: Write the failing test.** "every knip ignore carries a reason, and none covers a whole folder". Read `knip.jsonc` as text, and assert that each entry in `ignore`, `ignoreDependencies`, `ignoreBinaries` and `ignoreIssues` sits under a `//` line and is not a bare `<dir>/**`. Also assert that no `biome-ignore` remains under `packages/*/src` or `apps/*/src`.
- [ ] **Step 2: Run.** Expected: FAIL. Today's `.claude/**` has no reason, and `database/src/index.ts` has a `biome-ignore`.
- [ ] **Step 3: Implement the config.**
  - Rename the file.
  - Mark production entries with `!`: `apps/api/src/index.ts!`, the CLIs, and `print-affected.ts!`.
  - Add `project` patterns that leave `**/tests/**` and `**/*.test*.ts*` out of production mode.
  - Silence `next` in `packages/config/typescript/nextjs.json` through `ignoreUnresolved`, with a reason.
  - Add reasons to every existing ignore.
- [ ] **Step 4: Remove database's barrel.** Replace `index.ts` with direct export subpaths, `./prisma` and the generated types. Update every `@allonfire/database` root importer, and remove the `biome-ignore`.
- [ ] **Step 5: Work the output.** Run `pnpm knip` and `pnpm knip:production`. For each hit, **fix it** (delete the export or file, or move a runtime dep from dev to prod as in api-20), or **accept it** with a reason:
  - the 36 shadcn components: "generated by the shadcn CLI, kept so any can be wrapped without re-adding";
  - `AOFStorageImage` and `srcSetLoader`: "kept for the Images page";
  - `playwrightConfig`, `formatErrorMessage` and the `game-score.service` key: "held only by Laura";
  - the `@better-auth/prisma-adapter` peer.

  A zod schema used only for its type loses its `export`, per rule 6, which is written now.
- [ ] **Step 6: Run** both scripts. Expected: exit 0. Then run the Step 1 test. Expected: PASS.
- [ ] **Step 7: Gate**, repo-wide: `pnpm test`.

### Task 17: jscpd, sharpened and worked to zero, and the CI setup written once

**Files:**
- Modify:
  - `.jscpd.json`: add `"absolute": true`, `"exitCode": 1`, the `yaml` format, and the paths `.github` and `docker`;
  - the files whose clones are fixed;
  - `.github/workflows/ci.yml` and `deploy.yml`;
  - `docs/agents/deployment.md` (rule 16).
- Create: `.github/actions/setup/action.yml`, a composite action doing checkout depth 0, pnpm, Node from `node-version-file` with the pnpm cache, and `pnpm install --frozen-lockfile`.

**Interfaces:**
- Produces: `pnpm dupes`, exiting 0 on an empty clone list and 1 on any clone.

- [ ] **Step 1: Run** `pnpm dupes` with the new settings. Expected: exit 1, listing the clones with absolute paths, including the six copied CI setup blocks.
- [ ] **Step 2: Implement.** Replace the six setup blocks with `uses: ./.github/actions/setup`, and write rule 16. Then fix each remaining clone (they're mostly in tests, merged into the test file's helper), or accept it with `// jscpd:ignore-start` and a reason. Never use a whole-file ignore.
- [ ] **Step 3: Run** `pnpm dupes`. Expected: exit 0. The workflow files themselves are proved by Task 19's CI run.
- [ ] **Step 4: Gate**, repo-wide.

### Task 18: the report says which layer each finding is in

**Files:**
- Modify: `docs/superpowers/specs/2026-10-29-quality-scan-report.md`, `.superpowers/quality-scan/build-report.js`

- [ ] **Step 1: Implement.**
  - Give `build-report.js` a `layer` column:
    - `1` for the Shortlist ids;
    - `2` for any finding whose file and line, or whose named export, appears in Task 16's or 17's final pre-fix tool output, kept in `.superpowers/quality-scan/` as `knip-final.json` and `jscpd-final.json`. A partly flagged finding is `2` as a whole;
    - `3` otherwise.
  - Add a `status` column: `fixed (Plan A)`, `accepted: <reason>`, or `open (Plan B)`.
  - Regenerate the report, keeping the hand-written head and rules sections.
- [ ] **Step 2: Check.** Every layer 1 and 2 row is `fixed` or `accepted`. `grep -c "open (Plan B)"` equals the layer-3 count printed by the script.

### Task 19: the CI quality job

**Files:**
- Modify: `.github/workflows/ci.yml`, `docs/agents/testing.md` (the quality job), `docs/agents/tooling.md`

- [ ] **Step 1: Add a `quality` job** that runs on every pull request, using `./.github/actions/setup`, then `pnpm knip`, `pnpm knip:production` and `pnpm dupes`. It has no affected-filter.
- [ ] **Step 2: Prove that it fails.** Plant `export const plantedUnused = 1;` in `packages/core/src/shared/utils/planted.ts`, and a copy of a 20-line block in a test file. Run the three commands locally. Expected: knip exits 1 naming `plantedUnused`, and jscpd exits 1 naming the clone.
- [ ] **Step 3: Remove both plants,** then run the three commands. Expected: all exit 0.
- [ ] **Step 4: Gate**, repo-wide: `pnpm lint && pnpm check-types && pnpm test && pnpm test:browser`. Expected: all green.

## Watch out (owner's steps)

- **Run the Production Launch plan first.** It deploys production telemetry, sets the OTLP values and deletes `STORAGE_ENDPOINT`. Task 3 makes telemetry required, so an App without those values refuses to start.
