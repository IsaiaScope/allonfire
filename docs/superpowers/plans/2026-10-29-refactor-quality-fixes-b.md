# Quality Fixes B Implementation Plan (layer 3: what only a reader saw)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Runs after Plan A. Fix, or accept with a reason, every layer-3 finding in the scan report. Settle the two outdated rules as the owner decided, and write the remaining "Rules to write" into their guides.

**Architecture:**
- **The report is the spec.** After Plan A, the scan report's tables carry `layer` and `status` columns. This plan works every row with `layer 3` and `open (Plan B)`.
- **Each row's `fix` cell, plus its verifier's correction, says what to change.** The plan fixes the order, the grouping, the decisions and the checks.
- **Cross-package work goes first**, because the area rows lean on it: a shared helper must exist before the area rows switch to it. Then come the two layout decisions, then each area, then the last production compose guard.

**Tech Stack:** as in Plan A.

**Spec:** `docs/superpowers/specs/2026-10-29-quality-fixes-design.md` (findings: `docs/superpowers/specs/2026-10-29-quality-scan-report.md`)

## Reconciled 2026-11-02

Checked against HEAD `7c2b565` (v0.6.6) and the uncommitted instant-users-navigation work. What changed in this plan:
- **Order:** instant-users-navigation (`docs/superpowers/plans/2026-11-02-instant-users-navigation.md`) is committed first, then Plan A, then this plan. That work edits files several tasks touch.
- **Task 1:** the Step 4 grep only counts `..` from `import.meta`. cross-3 is narrowed to what is left. cross-4, cross-17 and cross-19 gain the sites added since the scan. cross-6 changes `FIXTURE.PASSWORD` itself (owner).
- **Task 2:** `next/metadata` holds 10 loose files, and `next/query` (2) joins the move.
- **Task 4:** the api-23 exception also names `index.ts` and `client.test-d.ts`.
- **Tasks 5 to 12:** rows already fixed are listed per task (back-office-5/6/7, auth-1, storage-3, storage-14, config-design-root-6/8), and so are line moves and narrowed rows.
- **Task 12b:** reduced scope (owner). The mutation and invalidation already live in `users-mutations.ts`. The TODO.md step is gone.
- **Task 13:** the production launch (ccf03a9) already renamed `MINIO_*` to `STORAGE_ACCESS_KEY`/`STORAGE_SECRET_KEY` with `:?` guards, and Dokploy holds the new pair. Only the `BACK_OFFICE_URL` guard is left (owner). The Watch out step is deleted.
- **Plan A's remainders (2026-11-03):** Plan A fixed seven layer 2 rows only in their tool hit; their status ends `left for Plan B: …` (api-10, back-office-13, back-office-15, auth-9, auth-10, storage-15, storage-17). Tasks 5 to 12 now list each remainder, and Task 14's check counts them. config-design-root-5's remainder is accepted.
- **Plan A, for awareness:** telemetry is `TELEMETRY_*` (not `OTEL_*`). It is required in production only (`:?` on `TELEMETRY_HEADERS` in the prod compose) and optional in Local and tests. Plan A Task 5 reuses core's `RESOURCE_CHANGED`, and Plan A Task 9 keeps a reduced scope. No step here assumes otherwise.

## Global Constraints

- **Prerequisite: the instant-users-navigation plan is committed, and then Plan A is complete.**
  - The report has its `layer` and `status` columns.
  - `pnpm knip`, `pnpm knip:production` and `pnpm dupes` exit 0.
  - The tree is clean.

  Otherwise stop.
- **Every task ends with the Gate:** `pnpm exec biome check --write <files touched> && pnpm lint && pnpm check-types && pnpm --filter <each touched package> test && pnpm knip && pnpm knip:production && pnpm dupes`. Expected: every command exits 0. The CI gate from Plan A must stay green after every task.
- **No `biome-ignore`, `@ts-expect-error` or `@ts-ignore` is ever added.** knip and jscpd accepts need a written reason.
- **AGENTS.md holds throughout:**
  - tests first, and a `// @module-tag` first line in every test;
  - no `as` casts except `as const`;
  - one nested constants object per owner;
  - no literal paths or error codes, tests included;
  - owner-prefixed env vars.
- **A row with a behaviour change gets a failing test first.**
  - That covers: a swallowed error, wrong copy reaching a User, and a status code.
  - A row that only renames, moves or de-duplicates is proved by the existing suite staying green and by a `git grep` showing the old spelling is gone.
- **Every row is re-read at its `file:line` first.** A row already fixed by Plan A or by later work is marked `fixed (before Plan B)` in the report, not redone. The line numbers below were checked on 2026-11-02, and instant-users can move them again.
- **Each rule from "Rules to write"** (numbered 1 to 16 in the report) is written into its guide in the task that fixes its code. Rules 1, 5, 6, 9, 10, 14, 15 and 16 landed in Plan A. This plan writes rules 2, 3, 4, 7, 8, 11, 12 and 13. None of these eight is in a guide yet (checked 2026-11-02).
- **A row may be accepted instead of fixed** only when the fix would change intended behaviour. The report's `status` cell then says `accepted: <reason>`.
- **Laura, Dokploy and the production database are never touched.**
- **Never commit.** The owner runs `/iso-commit`.

## Review Focus

- **A file moved into a kind folder breaks a package's `exports` map**, so an App's import 404s at build, not at test. Tasks 2 to 4 run `pnpm build` for both Apps.
- **A literal replaced by a constant that holds a different value:** for example a copy string swapped for a translation that reads differently. Each swap in Tasks 1 and 7 is checked by the test still asserting the same visible text.
- **`BACK_OFFICE_URL` made required** (Task 13) while Dokploy's AllOnFire env lacks it would stop the next deploy at the `:?` guard. Task 13 checks `docker/.env.production` names it first, through `pnpm env:prod check`, which never prints a value.
- **The strong Fixture password** (cross-6) changes every Fixture User's login. Task 1 reseeds the Local dev database once and runs the e2e sign-in spec. Production seeds only its Admin from `DATABASE_SEED_ADMIN_PASSWORD`, so it is unaffected.
- **A rule written into a guide that the code still breaks.** Each rule's task ends with a `git grep` for the pattern the rule forbids. Expected: nothing outside an accepted row.

---

### Task 1: Cross-package rows (layer 3)

**Files:** the files named in the report's Cross-package rows tagged layer 3: cross-3, cross-4, cross-5, cross-6, cross-8, cross-16, cross-17, cross-18 and cross-19. Also `docs/agents/testing.md` (rules 2, 3 and 4) and `docs/agents/conventions.md` (rules 7 and 8). Re-checked 2026-11-02:
- **cross-3:** narrowed.
  - The Back Office tests already build the host from `LOCAL.URL.IMAGE_SERVER` (268edb1).
  - What is left:
    - the literal link in `packages/storage/src/features/image-server/tests/sign.test.ts:21`, now `localhost:9010/image/…`, because the cdn serves the image server under `/image`;
    - the `s3://image` bucket literal in `apps/back-office/src/shared/components/tests/user-avatar.test.tsx:6` and `apps/back-office/src/features/users/components/tests/avatar-field.browser.test.tsx:77`.
- **cross-4:** add these, written since the scan:
  - `packages/config/local/tests/env-examples.test.ts:5`
  - `env-production.test.ts:13`
  - `prod-compose.test.ts:5`

  `service-names.test.ts` is now at `:6`. `prod-compose.test.ts` and core's `next/tests/scaffolded-apps.ts:3` declare a local `REPO`: replace them with the import, so they don't shadow it.
- **cross-5:** these sites moved:
  - `apps/back-office/src/features/users/actions/tests/edit-user.test.ts:126-127`
  - `packages/auth/src/features/users/hono/tests/edit.test.ts:74`

  Storage's `imageRoutes` is still inline at `routes/index.ts:17-22`.
- **cross-6:** 10 files now. `apps/back-office/src/features/users/utils/tests/user-form-schema.test.ts:8` was added since the scan.
- **cross-17:** add `apps/back-office/e2e/instant.spec.ts`, which fills `{email}` by hand.
- **cross-19:** these sites moved or are new:
  - `apps/back-office/e2e/users.spec.ts:337` (moved);
  - `apps/api/src/features/image/tests/upload.integration.test.ts:25,29` and `packages/storage/src/features/image/fixtures/scripts/describe-fixtures.ts:15` (new).

**Interfaces:** each of these lives in the package that owns its value:
- `REPO`, the repo root and package directories (cross-4, rule 7), in `@allonfire/config`'s `local/repo.ts`;
- `fillPath(path, params)` (cross-5, rule 8), in core's `shared/utils`;
- `FIXTURE.PASSWORD`, in database's seed fixtures (cross-6), changed to a password that meets `passwordRules` (for example `"Fixture-password-1"`), plus `FIXTURE.NEW_PASSWORD` for a change of password. No second strong-password constant is added;
- one SVG data-URL encoder, core's `svgDataUrl` (cross-8);
- one Image Fixture reader, `readFixtureImage(name)`, in storage's fixtures (cross-19).

- [ ] **Step 1: Write the failing tests** for the new helpers:
  - `fillPath("/users/:id", { id: "u1" }) === "/users/u1"`, and it throws on a missing param;
  - `REPO.ROOT` ends in the repository's folder name;
  - `readFixtureImage(FIXTURE_IMAGE.PHOTO)` returns a non-empty Buffer;
  - in `password-rules.test.ts`, `meetsPasswordRules(FIXTURE.PASSWORD)` is true.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, and change `FIXTURE.PASSWORD`. Switch every call site the rows list:
  - `.replace(":id", …)` becomes `fillPath`;
  - `..` counting becomes `REPO`;
  - literal LOCAL addresses become `LOCAL`;
  - literal HTTP values become core's `HTTP`;
  - literal copy becomes its translations or catalogue;
  - literal cookie names become `AUTH.COOKIE`;
  - a hand-read fixture becomes `readFixtureImage`;
  - `"A-long-password-1"` becomes `FIXTURE.PASSWORD` in all 10 files.

  Write rules 2, 3, 4, 7 and 8.
- [ ] **Step 4: Check.**
  - Run `git grep -nE '\.replace\(":id"|import\.meta.*\.\./\.\.|"(__Secure-)?better-auth\.session|A-long-password'` over `apps/api`, `apps/back-office` and `packages`. Expected: no output. Plain relative imports such as `../../../../shared/…` are allowed.
  - Reseed the Local dev database once with `pnpm db:seed`, then run `pnpm test:e2e`. Expected: green.
- [ ] **Step 5: Gate.**

### Task 2: cross-10 in core, loose feature files move into kind folders

**Files:**
- Move: in `packages/core/src/features/next/`, the folders:
  - `pwa/` (9 loose files)
  - `metadata/` (10, since 268edb1 added `aof-page-metadata.ts`)
  - `i18n/` (5)
  - `providers/` (4)
  - `config/` (3)
  - `query/` (2: `aof-get-query-client.ts`, `aof-query-errors.ts`; the scan missed it)
- Each moves into `components/`, `utils/`, `constants/` or `types/` by kind, keeping one main file at the root where package-layout.md allows it. `api/` and `instrumentation/` hold one file each and stay.
- Modify: `packages/core/package.json` exports, every importer, and `packages/core/README.md`. instant-users added `features/version` keys and edits `config/aof-create-next-config.ts`; work from the committed state.

- [ ] **Step 1: Baseline.** Run `pnpm --filter @allonfire/core test` and `pnpm check-types`. Expected: PASS.
- [ ] **Step 2: Move the files** with `git mv`, so history follows. Update the exports map and the importers.
- [ ] **Step 3: Run** `pnpm check-types`, the core tests, and `pnpm --filter @allonfire/back-office build`. Expected: PASS.
- [ ] **Step 4: Gate.**

### Task 3: cross-10 in database

**Files:** `packages/database/src/features/test-database/` (6 loose), `seed/` (4) and `image/` (2), into kind folders. Also its `package.json` exports, its importers and its README.

- [ ] **Step 1: Baseline.** Run the database tests. Expected: PASS.
- [ ] **Step 2: `git mv`** the files, then update the exports and importers.
- [ ] **Step 3: Run** the database, storage and api tests, and `pnpm db:seed`. Expected: PASS.
- [ ] **Step 4: Gate.**

### Task 4: cross-10 in storage, and api-23's guide exception

**Files:**
- Move: `packages/storage/src/features/s3/` (3 loose), `test-bucket/` (4), `image/setup/` (2) and `image/objects/` (2), into kind folders. `image-server/sign.ts` stays: it follows the rule.
- Modify: storage's exports, importers and README. Also `docs/agents/package-layout.md`: the API's root files are named as allowed at the top of `apps/api/src/`, as `api.md` and `testing.md` say. They are `index.ts`, `app.ts`, `client.ts` and `shutdown.ts`, with their tests (`client.test-d.ts`, `shutdown.test.ts`).

- [ ] **Step 1: Baseline.** Run the storage tests. Expected: PASS.
- [ ] **Step 2: `git mv`,** then update the exports and importers. Write the exception into package-layout.md.
- [ ] **Step 3: Run** the storage and api tests, `pnpm --filter @allonfire/storage image:setup` against local, and `pnpm --filter @allonfire/back-office build`. Expected: PASS.
- [ ] **Step 4: Gate.** Then mark api-23 and cross-10 as `fixed` in the report.

### Tasks 5 to 12: each area's layer-3 rows

Every area task has the same steps. Its files are the ones its rows name.

| Task | Area (report section) | Rules written here |
|---|---|---|
| 5 | API (`apps/api`) | — |
| 6 | Back Office (`apps/back-office`) | 11 (shared class lists as one cva; one kanji constant per meaning), in design-system.md |
| 7 | auth (`packages/auth`) | — |
| 8 | storage (`packages/storage`) | — |
| 9 | database (`packages/database`) | — |
| 10 | core (`packages/core`) | — |
| 11 | ui (`packages/ui`) | 12 (Tabler only) and 13 (markup tests assert roles, text and attributes, never class strings), in design-system.md and testing.md |
| 12 | config, design and root config | — |

**Checked 2026-11-02.** Step 1 still re-reads every row. A row named "layer 2" below cites knip or jscpd, so Plan A's Task 18 is expected to tag it layer 2.
- **Task 5 (API):**
  - api-22: `shared/utils/avatar-link` was deleted (268edb1), so drop it from the fix. The wrong `locales.test-d.ts` path is now at `api.md:130`.
  - api-19 cites no tool, so it stays here.
  - Layer 2: api-10, api-18, api-20. api-18 and api-20 are fixed (Plan A).
  - api-10's remainder: the new User helpers move from `users.integration.test.ts` to `apps/api/src/shared/tests/`, and `change-password.integration.test.ts` uses them instead of its own `upsertUser` call for the Back Office Admin.
- **Task 6 (Back Office):**
  - Already fixed:
    - back-office-5: `avatarRemoval(USERS.AVATAR_FIELD)`;
    - back-office-6: `sessionApi` in `features/api/utils/server-api.ts`;
    - back-office-7: `pageMetadata` on every page (268edb1).
  - back-office-14: a third `signInAsAdmin` copy is in `e2e/instant.spec.ts`; fold it in too.
  - Lines moved:
    - back-office-19: `avatar-field.browser.test.tsx:420`;
    - back-office-21: `USERS.CANCEL_KANJI` at `users.ts:50`;
    - back-office-22: `user-form-parts.tsx:233`.
  - Layer 2: back-office-9, -10, -11, -13, -15. back-office-11's `Link` stub now also strips `prefetch` in four browser tests. back-office-9 and -10 are fixed (Plan A).
  - back-office-13's remainder: the empty list answer, written three times, becomes one constant; `renderAt`'s four positional optionals become one options object.
  - back-office-15's remainder: the three tests that go to Add, call `addUser` and wait for the list by hand call `addedUser`; `deleteInAnotherTab` calls `deleteFromList` instead of repeating its steps.
- **Task 7 (auth):**
  - Already fixed: auth-1 (`handlers.ts:8` imports database's `roleIn`).
  - auth-9: Plan A shared the `next/headers` + forwarded-for mocks (`features/next/tests/session-request-mocks.ts`). Left: `apiSends` is written in both `session.test.ts:22` and `with-sign-in-gate.test.ts:28`; it moves into `session-request-mocks.ts`, once.
  - auth-10: Plan A fixed the clones and shared `BACK_OFFICE_ADMIN`. What is left is narrowed to `ADMIN` and `userRow(overrides)`, put in `stub-user-deps.ts`:
    - `userRow` carries `UserRecord`'s new `version`;
    - Plan A Task 8's `json()` replaces the request helpers, and Task 1's `fillPath` replaces `userPath`;
    - `hono/tests/test-host.ts` no longer exists after Plan A Task 8.
- **Task 8 (storage):**
  - Already fixed:
    - storage-3: `deps.ts:32` reads `log: LeftoverLog`;
    - storage-14: fixed by Plan A Task 8's shared host.
  - storage-16: `upload()` goes beside Plan A Task 8's shared `json()`, or into `stub-image-deps.ts`, since storage's `test-host.ts` is deleted.
  - Layer 2: storage-6 (fixed, Plan A), storage-15, storage-17.
  - storage-15's remainder (`hono/tests/write.test.ts`): `placedIn` (`:61`) and `publicIn` (`:73`) become one function taking whether the Image is public; the duplicate-Image PATCH test moves out of `describe("DELETE /images")` into the PATCH block.
  - storage-17's remainder (`hono/tests/read.test.ts`): `KEY` (`:27`) and the expected bodies are read from the stub record, not retyped.
- **Task 9 (database):**
  - database-6: `updateUser` now locks the row and checks the Version (instant-users).
    - `CREDENTIAL` is at `user.service.ts:191`, the Memberships at `:230-231`, the password at `:239-250`, and `createUser` at `:314`.
    - Fold `CREDENTIAL` and the flat `USER_CHANGE` (`:185`) into one owner object.
  - database-7: `"credential"` is at 186, 292, 463 and 551; `60_000` at 202, 450, 631 and 636.
  - database-13: also rename `ImageLink` (`image.service.ts:92`, added in 268edb1; `ImageLinksById` maps to it), for example to `ImagePlacement`.
  - Probably layer 2: database-2 (`knip:production`), database-4, database-5.
- **Task 10 (core):**
  - core-5: lines moved to `aof-create-next-config.ts:92` and its test `:96,114,125`.
  - core-11's importers: 5 auth utils, 3 auth tests, and the Back Office's `server-api.ts`.
- **Task 11 (ui):**
  - ui-10: now at `aof-avatar-field.tsx:67,205,236`.
  - ui-12: the skeleton's classes are at `:181,:207`.
  - Layer 2: ui-14. ui-15 is accepted in Plan A.
- **Task 12 (config, design, root):**
  - Already fixed:
    - config-design-root-6: the Dockerfile prunes with `package.json`'s turbo (141d34d);
    - config-design-root-8: Task 13.
  - config-design-root-9 is left only for `BACK_OFFICE_URL`, which Task 13 fixes.
  - config-design-root-4: the e2e services are `storage image-server cdn` (`ci.yml:138`), so the fix starts `database redis storage image-server cdn`.
  - config-design-root-5: Plan A Task 17 fixed the setup blocks; `pnpm db:generate` staying a step in each job is accepted (`plan-a.json`).

- [ ] **Step 1: List** the section's rows marked `open (Plan B)`, plus its layer 2 rows whose status says `left for Plan B` (the remainders above). Re-read each one at its `file:line`, and mark any that are already fixed.
- [ ] **Step 2: Write failing tests** for the rows that change behaviour. Each test is named for the row's visible effect: for example api-24, "translates every code in every locale without throwing", or core-12, a doc comment that names a constant that exists, checked by a grep in the area's tests.
- [ ] **Step 3: Run** them. Expected: FAIL.
- [ ] **Step 4: Fix every row** as its `fix` cell and correction say. Where a row turns out to need a decision the report doesn't settle, stop and ask the owner. Don't guess.
- [ ] **Step 5: Run** the area's tests. Expected: PASS. Then set each row's `status` to `fixed (Plan B)` or `accepted: <reason>`.
- [ ] **Step 6: Gate.**

### Task 12b: The Users table and its delete flow, split by concern

Reduced scope (owner, 2026-11-02):
- The deletion's mutation and its TanStack invalidation already live in `utils/users-mutations.ts` (`deleteUsersMutation`, `useUsersBeingDeleted`).
- The `deleteUsers` action now calls `updateTag` for the list and each deleted User (instant-users, ADR 0028).

Both stay as they are.

**Files:** `apps/back-office/src/features/users/components/users-table.tsx`, `delete-users.tsx`, `users-toolbar.tsx`, `utils/users-mutations.ts`, `utils/users-queries.ts`, and their tests.

**Interfaces:**
- Produces:
  - `useUsersTableState()`, which holds the selection (cleared when the address changes) and the pagination;
  - `useDeleteUsersFlow(selected, onClear)`, which holds only the confirm dialog, the toast and clearing the selection. It runs `deleteUsersMutation`, which keeps the mutation and the invalidation;
  - `UsersTable`, which renders the query, the columns and the card through those two hooks.

  The delete stays the `deleteUsers` action, with its `updateTag` calls.

- [ ] **Step 1: Baseline.** Run this only after instant-users is committed: it edits `users-table.browser.test.tsx` and `users-table-scroll.browser.test.tsx`. Run `pnpm --filter @allonfire/back-office test:browser` on the users files. Expected: PASS. Record the count then.
- [ ] **Step 2: Write the failing tests** for the hooks, through `renderHook`:
  - "the selection clears when the search param changes";
  - "a confirmed delete calls deleteUsers with the selected ids, toasts, and clears the selection".
- [ ] **Step 3: Run.** Expected: FAIL, with no hook.
- [ ] **Step 4: Implement the split.** Move the selection and pagination out of `UsersTable`, and the dialog, toast and clear-selection out of `DeleteUsers`, into the two hooks. Keep every visible behaviour.
- [ ] **Step 5: Run** the browser and unit tests. Expected: PASS, with the browser test count equal to Step 1's.
- [ ] **Step 6: Gate.**

### Task 13: config-design-root-9, the Back Office's public URL is required in production

config-design-root-8 is already fixed. The production launch (ccf03a9) renamed `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` to `STORAGE_ACCESS_KEY`/`STORAGE_SECRET_KEY`, each `${X:?X is required}` (`docker-compose.prod.yml:61-62, 92-93, 158-159, 205-206, 292-293`), and Dokploy holds the new pair. The names stay (owner). Mark config-design-root-8 `fixed (before Plan B)`.

**Files:** `docker/docker-compose.prod.yml:131` and `packages/config/local/tests/prod-compose.test.ts`.

**Interfaces:**
- `BACK_OFFICE_URL=${BACK_OFFICE_URL}` becomes `BACK_OFFICE_URL=${BACK_OFFICE_URL:?BACK_OFFICE_URL is required}`.

- [ ] **Step 1: Write the failing test** in `prod-compose.test.ts`: "the prod compose reads no vendor variable and requires the Back Office's public URL".
  - The compose text contains no `${MINIO_`. The storage image's own `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` keys stay.
  - The back-office service holds `` `BACK_OFFICE_URL=${required("BACK_OFFICE_URL")}` ``.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/config test`. Expected: FAIL on `BACK_OFFICE_URL` only.
- [ ] **Step 3: Check that Dokploy has it.** Run `pnpm env:prod check docker/.env.production`. Expected: `BACK_OFFICE_URL` is not reported empty. Otherwise stop and ask.
- [ ] **Step 4: Implement** the guard.
- [ ] **Step 5: Run.** Expected: PASS. The existing "has a .env.example line" test passes too: `docker/.env.example:15` holds `# BACK_OFFICE_URL=`.
- [ ] **Step 6: Gate.**

### Task 14: Close the report

**Files:** `docs/superpowers/specs/2026-10-29-quality-scan-report.md`

- [ ] **Step 1: Check.** Run `grep -cE "open \(Plan B\)|left for Plan B"` on the report. Expected: `0`. Every row is now `fixed` or `accepted: <reason>`, the remainders included (their status in `.superpowers/quality-scan/plan-a.json` becomes `fixed (Plan A, Plan B)`, then `node .superpowers/quality-scan/build-report.js` rewrites the report).
- [ ] **Step 2: Check the rules.** For each rule 2, 3, 4, 7, 8, 11, 12 and 13, grep its guide. Expected: the rule's text is there, and the pattern it forbids no longer appears in the code.
- [ ] **Step 3: Gate**, repo-wide: `pnpm lint && pnpm check-types && pnpm test && pnpm test:browser && pnpm test:e2e && pnpm knip && pnpm knip:production && pnpm dupes`. Expected: all green.
