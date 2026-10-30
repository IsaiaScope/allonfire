# Quality Fixes B Implementation Plan (layer 3: what only a reader saw)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Runs after Plan A. Fix, or accept with a reason, every layer-3 finding in the scan report. Settle the two outdated rules as the owner decided, and write the remaining "Rules to write" into their guides.

**Architecture:**
- **The report is the spec.** After Plan A, the scan report's tables carry `layer` and `status` columns. This plan works every row with `layer 3` and `open (Plan B)`.
- **Each row's `fix` cell, plus its verifier's correction, says what to change.** The plan fixes the order, the grouping, the decisions and the checks.
- **Cross-package work goes first**, because the area rows lean on it: a shared helper must exist before the area rows switch to it. Then come the two layout decisions, then each area, then the production env rename.

**Tech Stack:** as in Plan A.

**Spec:** `docs/superpowers/specs/2026-10-29-quality-fixes-design.md` (findings: `docs/superpowers/specs/2026-10-29-quality-scan-report.md`)

## Global Constraints

- **Prerequisite: Plan A is complete.**
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
- **Every row is re-read at its `file:line` first.** A row already fixed by Plan A or by later work is marked `fixed (before Plan B)` in the report, not redone.
- **Each rule from "Rules to write"** (numbered 1 to 16 in the report) is written into its guide in the task that fixes its code. Rules 1, 5, 6, 9, 10, 14, 15 and 16 landed in Plan A. This plan writes rules 2, 3, 4, 7, 8, 11, 12 and 13.
- **A row may be accepted instead of fixed** only when the fix would change intended behaviour. The report's `status` cell then says `accepted: <reason>`.
- **Laura, Dokploy and the production database are never touched.**
- **Never commit.** The owner runs `/iso-commit`.

## Review Focus

- **A file moved into a kind folder breaks a package's `exports` map**, so an App's import 404s at build, not at test. Tasks 2 to 4 run `pnpm build` for both Apps.
- **A literal replaced by a constant that holds a different value:** for example a copy string swapped for a translation that reads differently. Each swap in Tasks 1 and 7 is checked by the test still asserting the same visible text.
- **The prod storage rename deployed before Dokploy is renamed**, so storage boots without credentials. Task 13's `:?` guard makes the deploy fail loudly. The Watch out step comes first in the owner's list.
- **The shared strong test password** (cross-6) changes Fixture Users' login. Task 1 reseeds the local DB and runs the e2e sign-in spec.
- **A rule written into a guide that the code still breaks.** Each rule's task ends with a `git grep` for the pattern the rule forbids. Expected: nothing outside an accepted row.

---

### Task 1: Cross-package rows (layer 3)

**Files:** the files named in the report's Cross-package rows tagged layer 3: cross-3, cross-4, cross-5, cross-6, cross-8, cross-16, cross-17, cross-18 and cross-19. Also `docs/agents/testing.md` (rules 2, 3 and 4) and `docs/agents/conventions.md` (rules 7 and 8).

**Interfaces:** each of these lives in the package that owns its value:
- `REPO`, the repo root and package directories (cross-4, rule 7), in `@allonfire/config`'s local addresses module;
- `fillPath(path, params)` (cross-5, rule 8), in core's `shared/utils`;
- one strong test password, `FIXTURE.STRONG_PASSWORD`, in database's seed fixtures (cross-6);
- one SVG data-URL encoder, core's `svgDataUrl` (cross-8);
- one Image Fixture reader, `readFixtureImage(name)`, in storage's fixtures (cross-19).

- [ ] **Step 1: Write the failing tests** for the new helpers:
  - `fillPath("/users/:id", { id: "u1" }) === "/users/u1"`, and it throws on a missing param;
  - `REPO.ROOT` ends in the repository's folder name;
  - `readFixtureImage(FIXTURE_IMAGE.PHOTO)` returns a non-empty Buffer.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers. Switch every call site the rows list:
  - `.replace(":id", …)` becomes `fillPath`;
  - `..` counting becomes `REPO`;
  - literal LOCAL addresses become `LOCAL`;
  - literal HTTP values become core's `HTTP`;
  - literal copy becomes its translations or catalogue;
  - literal cookie names become `AUTH.COOKIE`;
  - a hand-read fixture becomes `readFixtureImage`.

  Write rules 2, 3, 4, 7 and 8.
- [ ] **Step 4: Check.** Run `git grep -nE '\.replace\(":id"|\.\./\.\./\.\./\.\.|"better-auth\.session'` over `apps/api`, `apps/back-office` and `packages`. Expected: no output. Reseed the local DB with `pnpm db:seed`, then run `pnpm test:e2e`. Expected: green.
- [ ] **Step 5: Gate.**

### Task 2: cross-10 in core, loose feature files move into kind folders

**Files:**
- Move: in `packages/core/src/features/next/`, the folders `pwa/` (9 loose files), `metadata/` (9), `i18n/` (5), `providers/` (4) and `config/` (3).
- Each moves into `components/`, `utils/`, `constants/` or `types/` by kind, keeping one main file at the root where package-layout.md allows it.
- Modify: `packages/core/package.json` exports, every importer, and `packages/core/README.md`.

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
- Modify: storage's exports, importers and README. Also `docs/agents/package-layout.md`: the API's `app.ts`, `client.ts` and `shutdown.ts`, with their tests, are named as allowed at the top of `apps/api/src/`, as `api.md` and `testing.md` say.

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

- [ ] **Step 1: List** the section's rows marked `open (Plan B)`. Re-read each one at its `file:line`, and mark any that are already fixed.
- [ ] **Step 2: Write failing tests** for the rows that change behaviour. Each test is named for the row's visible effect: for example api-24, "translates every code in every locale without throwing", or core-12, a doc comment that names a constant that exists, checked by a grep in the area's tests.
- [ ] **Step 3: Run** them. Expected: FAIL.
- [ ] **Step 4: Fix every row** as its `fix` cell and correction say. Where a row turns out to need a decision the report doesn't settle, stop and ask the owner. Don't guess.
- [ ] **Step 5: Run** the area's tests. Expected: PASS. Then set each row's `status` to `fixed (Plan B)` or `accepted: <reason>`.
- [ ] **Step 6: Gate.**

### Task 12b: The Users table and its delete flow, split by concern (from TODO.md)

**Files:** `apps/back-office/src/features/users/components/users-table.tsx`, `delete-users.tsx`, `users-toolbar.tsx`, `utils/users-queries.ts`, and their tests.

**Interfaces:**
- Produces:
  - `useUsersTableState()`, which holds the selection (cleared when the address changes) and the pagination;
  - `useDeleteUsersFlow(selected)`, which holds the confirm dialog, the mutation, the toasts and the invalidation;
  - `UsersTable`, which renders the query, the columns and the card through those two hooks.

  The delete stays the `deleteUsers` action.

- [ ] **Step 1: Baseline.** Run `pnpm --filter @allonfire/back-office test:browser` on the users files. Expected: PASS. Record the count.
- [ ] **Step 2: Write the failing tests** for the hooks, through `renderHook`:
  - "the selection clears when the search param changes";
  - "a confirmed delete calls deleteUsers with the selected ids, toasts, and clears the selection".
- [ ] **Step 3: Run.** Expected: FAIL, with no hook.
- [ ] **Step 4: Implement the split.** Move the logic out of `UsersTable` and `DeleteUsers` into the two hooks. Keep every visible behaviour.
- [ ] **Step 5: Run** the browser and unit tests. Expected: PASS, with the browser test count unchanged. Remove the item from `TODO.md`'s Back Office section.
- [ ] **Step 6: Gate.**

### Task 13: config-design-root-8, the production storage login gets its owner's name

**Files:** `docker/docker-compose.prod.yml` (lines 60-61, 86-87, 162-163 and 199), `docs/agents/deployment.md`, and `packages/config/local/tests/service-names.test.ts` or `local-files.test.ts`.

**Interfaces:**
- `MINIO_ACCESS_KEY` becomes `STORAGE_ROOT_USER`, and `MINIO_SECRET_KEY` becomes `STORAGE_ROOT_PASSWORD`.
- Each one, and `BACK_OFFICE_URL`, is written `${X:?X is required}`.

- [ ] **Step 1: Write the failing test** "the prod compose names no vendor variable and guards every required one". The compose text contains no `MINIO_`, and `STORAGE_ROOT_USER`, `STORAGE_ROOT_PASSWORD` and `BACK_OFFICE_URL` appear only in `:?` form.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/config test`. Expected: FAIL.
- [ ] **Step 3: Implement** the rename and the guards. Record it in deployment.md.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Gate.**

### Task 14: Close the report

**Files:** `docs/superpowers/specs/2026-10-29-quality-scan-report.md`

- [ ] **Step 1: Check.** Run `grep -c "open (Plan B)"` on the report. Expected: `0`. Every row is now `fixed` or `accepted: <reason>`.
- [ ] **Step 2: Check the rules.** For each rule 2, 3, 4, 7, 8, 11, 12 and 13, grep its guide. Expected: the rule's text is there, and the pattern it forbids no longer appears in the code.
- [ ] **Step 3: Gate**, repo-wide: `pnpm lint && pnpm check-types && pnpm test && pnpm test:browser && pnpm test:e2e && pnpm knip && pnpm knip:production && pnpm dupes`. Expected: all green.

## Watch out (owner's steps)

- **Before deploying Task 13:** in Dokploy's production environment, rename `MINIO_ACCESS_KEY` to `STORAGE_ROOT_USER` and `MINIO_SECRET_KEY` to `STORAGE_ROOT_PASSWORD`, keeping their values. Without that, the deploy stops at the `:?` guard. That stop is intended: it is the guard doing its job.
