# Constants Pattern Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every constants file in `apps/*` and `packages/*` follows one shape (one nested owner object, keyed records, units in groups, sorted A–Z), starting with `IMAGE_UPLOAD` → `IMAGE.UPLOAD`.

**Status:** implemented (uncommitted) @ 2026-11-25T13:03:11Z. Task 12 Steps 1 and 3 are open (see their notes).

**Architecture:** One phase per package in dependency order (core → storage → auth → database → ui → api → back-office → laura), so an app's call sites move once. Each task is a rename-and-reshape: the existing tests are rewritten to the new key paths first (they fail to type-check), then the constants and every call site change until `check-types` and `test` pass. No value that reaches the wire, the database or a translation file changes.

**Tech Stack:** TypeScript, zod (`z.enum`, `z.infer`), Vitest, `as const satisfies Record<K, V>`, pnpm + Turbo.

**Spec:** `docs/superpowers/specs/2026-11-24-constants-pattern-sweep-design.md` (decisions 1–8; audit at its end).

## Global Constraints

- Read first: `docs/guides/conventions.md` (Constants), `code-style.md`, `package-layout.md`, `testing.md`; ADR 0035 and `api.md` (constants paragraph) for the API.
- Constants are one nested object per owner; keys sorted A–Z; unit-suffixed keys (`_MS`, `_PX`, `_BYTES`) live in a group (`LIMIT` ceilings and counts, `DEFAULT` fall-backs, `DELAY`/`TIMEOUT` waits, `SIZE` pixel sizes), never at an owner's top.
- A lookup is `as const satisfies Record<K, V>`, never a tuple array and never `: Record<K, V>`.
- Verb- or noun-prefixed sibling keys nest (`ADD_KANJI` → `KANJI.ADD`, `EDIT_ERROR` → `EDIT.ERROR`, `GET_SUMMARY` → `GET.SUMMARY`).
- In doubt, nest; expand the owner that already exists. A constant used by one package expands that package's owner; one used across packages expands the parent owner.
- Sub-feature constants files merge into the parent owner's file unless past 300 lines or the sub-feature is its own route/package module (the API's `laura/gallery`, `laura/favorites`, `laura/games` and `back-office/overview/*` are route modules: they stay split, as `api.md` says).
- Nothing that is not a constant stays in a `constants/` folder: JSX, `cva`, helpers and schemas move next to their user (`utils/`, `components/`). A schema stays only where `z.infer` of a constant's type needs it, beside its owner's file as `*-schema.ts`, not inside the object's file.
- Form error values stay camelCase (`TOO_LARGE: "tooLarge"`): they are the translation JSON keys.
- Tests first, `// @module-tag` first line, Vitest globals, no `as` except `as const`, no string-literal paths or error codes, even in tests.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`: use core's helpers.
- **Reconciled with the API constants rename (2026-11-25, uncommitted, done before this plan runs):** the API's roots are `LAURA` and `BACK_OFFICE` (no `_API`), their keys are their folders (`LAURA.FAVORITES`, `LAURA.GALLERY`, `BACK_OFFICE.OVERVIEW.{STORAGE,USERS}`), each built in its parent's file from the child folder's own object (`LAURA_FAVORITES`, `LAURA_GALLERY`, `BACK_OFFICE_OVERVIEW`, `OVERVIEW_STORAGE`, `OVERVIEW_USERS`; only the parent imports a child), and `API.PATH` nests (`API.PATH.LAURA.GALLERY`, `API.PATH.BACK_OFFICE.OVERVIEW.STORAGE`). Where an App also has its own `LAURA` / `BACK_OFFICE` descriptor, the file that needs both imports the API's `as API_BACK_OFFICE` / `API_LAURA`. This is the model the sweep copies; do not undo it.
- Never revert the uncommitted `feat/laura-p0-drop` work; sweep on top of it. No commits in this plan: `/iso-write` stops for review and the owner commits with `/iso-commit`.
- A new `.tsx`/`.ts` file never adds a `biome-ignore`; macOS `._*` sidecars are ignored by any scan.

## Review Focus

- A renamed key still read by a test as a string literal or by a `.json` translation: grep each old key across `apps packages --include=*.ts --include=*.tsx --include=*.json` before calling a task done.
- Zod enums built from a constant (`z.enum(IMAGE.UPLOAD.ERROR)`) must keep the same member set; a test asserts the exact values.
- OpenAPI docs: moving `DOC.GET_200` to `DOC.GET.RESPONSE[…]` must leave the generated `openapi.json` byte-identical; a test compares a snapshot of the document before and after.
- Import cycles when a sub-owner merges into a parent file (`api.ts` ↔ feature constants): `pnpm check` runs the cycle check.
- A merged file over 300 lines trips `noExcessiveLinesPerFile`: split it by responsibility, not by sub-feature.

---

### Task 1: Rules in the guides

**Files:**
- Modify: `docs/guides/conventions.md` (Constants section), `docs/guides/api.md` (constants paragraph, line ~80), `docs/guides/code-style.md` (one pointer line)

**Interfaces:**
- Produces: the written rules every later task cites.

- [x] **Step 1:** In `conventions.md` add, with one API example each: keyed record instead of tuple array (`STATUS_OF_CODE`); sibling keys nest (`API.LIMIT`, `LAURA.GALLERY`); units inside a group; one owner per package, expand the existing one; sub-feature files merge into the parent unless a route/package module; nothing but constants in `constants/`; error values follow their data format (camelCase for translation keys).
- [x] **Step 2:** In `api.md` the constants paragraph (line ~80) already states the root-per-App composition rule written with the API constants rename; rewrite only its "a feature's constants are named after its folder path" part so it reads as the route-module exception, not the default, and keep the `LAURA`, `BACK_OFFICE` and `API.PATH` sentences.
- [x] **Step 3:** Verify with `grep -n "tuple" docs/guides/conventions.md` (expected: one hit) and that every relative link in the three guides still resolves.

### Task 2: core

**Files:**
- Modify: `packages/core/src/features/next/constants/next.ts` (`BUILD_DIR`, `BUILD_ID`, `STATIC_DIR`, `STATIC_URL` → `BUILD`, `STATIC` groups), `features/mail/constants/mail.ts` (`USAGE_MONTH_DAYS` into `MAIL`), `features/i18n/constants/dates.ts` (`FORMAT`/`FORMATS` pair → one `FORMAT` nested), `features/logger/constants/logger.ts` (`STDOUT_FD` into a group), `features/next/pwa/constants/pwa.ts` (schemas/types out)
- Move: `features/errors/constants/openapi.ts` helpers (`problemResponseName` and the other function) → `features/errors/utils/openapi.ts`
- Test: each owner's existing tests under `…/tests/`

**Interfaces:**
- Produces: `NEXT.BUILD.{DIR,ID}`, `NEXT.STATIC.{DIR,URL}`, `MAIL.USAGE.MONTH_DAYS`, `LOG.FD.STDOUT`, `DATE.FORMAT.{…}` (audit lines for exact current names); import path `@allonfire/core/features/errors/utils/openapi` exporting `problemResponseName`.

- [x] **Step 1:** Rewrite the tests of these owners to the new paths (grep each old name: `rg "BUILD_DIR|BUILD_ID|STATIC_DIR|STATIC_URL|USAGE_MONTH_DAYS|STDOUT_FD|DATE\.FORMATS" apps packages -g '*.ts*'`).
- [x] **Step 2:** `pnpm --filter @allonfire/core check-types && pnpm --filter @allonfire/core test` — expected: FAIL (old names).
- [x] **Step 3:** Reshape the constants and fix every call site found in step 1; move the openapi helpers and update imports (`apps/api/src/features/errors/constants/problem-details.ts` imports it).
- [x] **Step 4:** Same command — expected: PASS. Then `pnpm check-types` at the repo root (core feeds every package) — expected: PASS.

### Task 3: storage

**Files:**
- Modify: `packages/storage/src/features/image/constants/image.ts` (`LIMIT.UPLOAD_*` → `LIMIT.UPLOAD.{BODY_BYTES,BYTES,TIMEOUT_MS}`, `LIMIT.INPUT.{MEGAPIXELS,PIXELS}`; `DOC.*_200/_DESCRIPTION/_SUMMARY` → `DOC.<VERB>.{DESCRIPTION,SUMMARY,RESPONSE}` with `RESPONSE: { [HTTP.STATUS.OK]: "…" }`), `features/image-server/constants/image-server.ts` (`CACHE_CHECK_SECONDS`, `GONE_WITHIN_MS`, `LINK_CACHE_LIFE`, `LINK_REFRESH_MS`, `PRIVATE_LINK_HOURS` → `CACHE`, `LINK` groups), `features/avatar/constants/avatar.ts` (`INPUT_BYTES`, `CROP_SIZE`, `SIZE` → `INPUT.BYTES`, `SIZE`)
- Modify callers: `apps/api/src/features/image/**` (route docs), `packages/storage/src/features/next/utils/with-image-uploads.ts`, `apps/back-office/next.config.ts`, `apps/*/src/**` readers of `IMAGE_SERVER.LINK_*`
- Test: storage `tests/` for the three owners; add `image-doc.test.ts` asserting each route's `DOC.<VERB>` has `SUMMARY`, `DESCRIPTION` and its `RESPONSE` status keys

**Interfaces:**
- Produces: `IMAGE.DOC.GET.RESPONSE[HTTP.STATUS.OK]`, `IMAGE.LIMIT.UPLOAD.BYTES`, `IMAGE_SERVER.LINK.{CACHE_LIFE,REFRESH_MS}`, `IMAGE_SERVER.CACHE.CHECK_SECONDS` (builder fixes the final group names once, here, and later tasks reuse them).

- [x] **Step 1:** Before changing anything, write `apps/api` test `docs/tests/openapi-snapshot.test.ts` that stores `JSON` text of `/openapi.json` through core's `stringifyJson` in a `toMatchFileSnapshot`; run it to record the baseline.
- [x] **Step 2:** Rewrite the tests to the new paths; run `pnpm --filter @allonfire/storage check-types && pnpm --filter @allonfire/storage test` — expected: FAIL.
- [x] **Step 3:** Reshape the three files and fix callers (`rg "LIMIT\.UPLOAD_|INPUT_PIXELS|INPUT_MEGAPIXELS|IMAGE\.DOC\.|LINK_REFRESH_MS|LINK_CACHE_LIFE|PRIVATE_LINK_HOURS|GONE_WITHIN_MS|CACHE_CHECK_SECONDS"`).
- [x] **Step 4:** storage `check-types` + `test` PASS; `pnpm --filter @allonfire/api test` PASS (the snapshot is unchanged).

### Task 4: auth

**Files:**
- Modify: `packages/auth/src/shared/constants/auth.ts` (`FORGOT_ERROR`, `RESET_ERROR`, `SIGN_IN_ERROR` → `ERROR.{FORGOT,RESET,SIGN_IN}`; `MAIL.ERROR_PARAM/TOKEN_PARAM/VERIFIED_PARAM` → `MAIL.PARAM.{ERROR,TOKEN,VERIFIED}`; `API_TIMEOUT_MS`, `SECRET_MIN_LENGTH` → `LIMIT`), `features/users/constants/users.ts` (`DEFAULT_PAGE`, `DEFAULT_PAGE_SIZE` → `DEFAULT.{PAGE,PAGE_SIZE}`; `MAX_DELETE`, `MAX_PAGE` into the existing `LIMIT`; `DOC` verb groups as in Task 3)
- Move out of `constants/`: `shared/constants/errors.ts`, `features/next/constants/{api,paths}.ts` (schemas/types/helpers → `utils/` or the owner's `*-schema.ts`; builder decides per file by what it holds)
- Test: auth `tests/` for each; callers in `apps/api`, `apps/back-office`, `apps/laura`

**Interfaces:**
- Consumes: Task 3's `DOC.<VERB>` shape.
- Produces: `AUTH.ERROR.SIGN_IN`, `AUTH.LIMIT.API_TIMEOUT_MS`, `USER.DEFAULT.PAGE_SIZE`.

- [x] **Steps 1–4:** same cycle as Task 3 (tests first, `pnpm --filter @allonfire/auth check-types && … test`, expected FAIL then PASS; then root `pnpm check-types`). Old names: `rg "SIGN_IN_ERROR|FORGOT_ERROR|RESET_ERROR|ERROR_PARAM|TOKEN_PARAM|VERIFIED_PARAM|API_TIMEOUT_MS|SECRET_MIN_LENGTH|DEFAULT_PAGE|MAX_DELETE|MAX_PAGE"`.

### Task 5: database

**Files:**
- Modify: `packages/database/src/features/apps/laura/constants/memory-rule.ts` (`MAX_MOVES`, `MAX_TIME_MS`, `MIN_MS_PER_MOVE`, `MIN_MOVES` → `MEMORY_RULE.MOVES.{MAX,MIN}`, `TIME.{MAX_MS,MIN_MS_PER_MOVE}`; sorted; `isPlausibleScore` → `utils/is-plausible-score.ts`), `features/prisma/constants/prisma.ts` (`CONNECT_TIMEOUT_MS` → `TIMEOUT.CONNECT_MS`), `features/test-database/constants/test-database.ts` (`DOCKER_TIMEOUT_MS` → `TIMEOUT`), `features/auth/access/constants/app-settings.ts` (non-constant parts out)
- Test: `memory-rule.test.ts`, `memory-score.integration.test.ts` (uncommitted: keep, retarget), the others' tests

**Interfaces:**
- Produces: `MEMORY_RULE.MOVES`, `isPlausibleScore(score: …)` (same signature as today) at its new path; `apps/api/src/features/laura/games/**` and `apps/laura` import both.

- [x] **Steps 1–4:** same cycle; commands `pnpm --filter @allonfire/database check-types` and `test` (the integration test needs the Test database: `docs/guides/testing.md`).

### Task 6: ui — `IMAGE.UPLOAD`

**Files:**
- Create: `packages/ui/src/features/image/constants/image.ts` exporting `IMAGE` with `UPLOAD`
- Delete: `packages/ui/src/features/image/upload/constants/image-upload.ts` (uncommitted work: move, do not lose its content)
- Modify: `features/image/upload/utils/{add-image-schema,add-images}.ts`, tests `features/image/upload/tests/{image-upload,add-images}.test.ts`; callers `apps/back-office/src/features/images/{actions/add-image.ts,components/add-image.tsx,actions/tests/add-image.test.ts,components/tests/add-image.browser.test.tsx}`; `features/navigation/constants/navigation.ts` (`OPEN` Map → record `as const satisfies Record<string, boolean>`, `sidebarParam` out to `utils/`), `shared/constants/safe-area.ts` (`POPUP_EDGE_PX` → `POPUP.EDGE_PX`)
- Test: `image-upload.test.ts` becomes `image.test.ts` beside the constant

**Interfaces:**
- Produces:
  ```ts
  IMAGE.UPLOAD = {
    ERROR: { FAILED: "failed", INVALID: "invalid", REFUSED: "refused", TOO_LARGE: "tooLarge", UNSUPPORTED: "unsupported" },
    NOTICE: { ADDED: "added" },
    REFUSAL: { [STORED_IMAGE.ERROR_CODE.IMAGE_TOO_LARGE]: "tooLarge", [STORED_IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE]: "unsupported", [ERROR.CODE.BAD_REQUEST]: "invalid" },
  } as const
  ```
  where `REFUSAL` values are the file-local shared `ERROR` const's members (an object literal cannot read its own keys); `type UploadError = z.infer<typeof uploadErrorSchema>`, `uploadErrorSchema = z.enum(IMAGE.UPLOAD.ERROR)` in `image-schema.ts` beside the file. `STORED_IMAGE` is storage's `IMAGE` imported under that alias.
- Consumes: `refusalOf(…, known)` in `utils/add-images.ts` now takes the record; its signature change is `known: Readonly<Record<string, UploadError>>`. (Built in two steps: first with a `ReadonlyMap` bridge, because core's `aofRefusal` required one; then, after the run, `aofRefusal` took a record read with the new core helper `objectHas`, so `addImages` hands it `IMAGE.UPLOAD.REFUSAL` as it is, and the five actions' inline `new Map([[code, error]])` became records.)

- [x] **Step 1:** In `image.test.ts` assert: `objectValues(IMAGE.UPLOAD.ERROR)` equals the five values above; `IMAGE.UPLOAD.REFUSAL[STORED_IMAGE.ERROR_CODE.IMAGE_TOO_LARGE]` is `IMAGE.UPLOAD.ERROR.TOO_LARGE`; every `REFUSAL` value is a member of `IMAGE.UPLOAD.ERROR`. In `add-images.test.ts` keep the existing refusal cases (413, 415, 400 → `tooLarge`, `unsupported`, `invalid`).
- [x] **Step 2:** `pnpm --filter @allonfire/ui check-types && pnpm --filter @allonfire/ui test` — expected: FAIL (module not found).
- [x] **Step 3:** Create the file, delete the old one, update `refusalOf` to look the code up by key, fix callers (`rg "IMAGE_UPLOAD"`).
- [x] **Step 4:** ui `check-types` + `test` + `test:browser` PASS; `pnpm --filter @allonfire/back-office check-types && … test` PASS.

### Task 7: api — shared, health, errors, i18n, rate-limit

**Files:**
- Modify: `apps/api/src/shared/constants/api.ts` (`HEALTH`, `READY` loose consts and `PROBE_PATHS` fold into `API.PATH`/`API.PROBE`; `shutdownStepSchema` + type → `shared/utils/shutdown-step.ts`), `features/health/constants/statuses.ts` (the four loose objects become the `HEALTH` object's own nested groups, `PROBE_DESCRIPTION.{HEALTH,READY}_*` → `PROBE_DESCRIPTION.{HEALTH,READY}.{200,DESCRIPTION,SUMMARY}`), `features/i18n/constants/locales.ts` (`DEFAULT_LOCALE` into `TRANSLATION`), `features/rate-limit/constants/limits.ts` (`HEADER_SPEC`, `INFO`, `KEY_PREFIX`, `UNKNOWN_CLIENT` into groups; `rateLimitKey` → `utils/`), `shared/constants/error.ts` (`codesFor` → `shared/utils/codes-for.ts`)
- Test: `shared/constants/tests/api.test.ts`, `api.test-d.ts`, `features/health/tests`, `features/rate-limit/tests`, `features/i18n/tests`

**Interfaces:**
- Produces: `API.PATH` is already nested (`LAURA`, `BACK_OFFICE.OVERVIEW`); `API.PATH.HEALTH`/`READY` unchanged, `API.PROBE.PATHS: ReadonlySet<string>`; `codesFor(status: ErrorStatus): ErrorCode[]` at the new path (same signature).

- [x] **Steps 1–4:** same cycle with `pnpm --filter @allonfire/api check-types && … test`; the Task 3 OpenAPI snapshot test stays green throughout.

### Task 8: api — services, laura, back-office overview docs

**Files:**
- Modify: `apps/api/src/features/services/constants/services.ts` (`DOC.KEEP_ALIVE_*`, `LIST_*`, `PROVIDER_*`, `SERVICE_*`, `TEST_*` → verb groups; `IDLE_DAYS`/`IDLE_MS` into `DEFAULT`/`LIMIT`; `keepAliveResultSchema` → `schemas.ts`), `features/laura/games/constants/games.ts` (`DOC`, `LEADERBOARD_TOP` → `LIMIT.LEADERBOARD_TOP`), `features/laura/favorites/constants/favorites.ts` and `gallery/constants/gallery.ts` (`DOC` verb groups), `features/back-office/overview/{storage,users}/constants/{storage,users}.ts` (`OVERVIEW_STORAGE`, `OVERVIEW_USERS`: their `DOC` and `OVERVIEW_*` keys), `features/laura/constants/laura.ts` and `features/back-office/constants/back-office.ts` (the roots `LAURA`, `BACK_OFFICE`, `BACK_OFFICE_OVERVIEW` in `overview/constants/overview.ts`: already composed, only their own keys are swept)
- Test: each feature's `tests/`; the OpenAPI snapshot test

**Interfaces:**
- Consumes: Task 3's `DOC.<VERB>` shape (same spelling in every API owner).

- [x] **Steps 1–4:** same cycle; also `pnpm --filter @allonfire/api test` and confirm the snapshot file shows no diff (`git diff --stat` on it).

### Task 9: back-office — images and users

> The Back Office imports the API's `BACK_OFFICE` (`@allonfire/api/features/back-office/constants/back-office`) in four files; where the App's own `BACK_OFFICE` is also imported, the API's is aliased `API_BACK_OFFICE` (see Global Constraints).

**Files:**
- Modify: `apps/back-office/src/features/images/constants/images.ts` (`ADD_KANJI`… → `KANJI.{ADD,APPLY,DELETE,RESET,SAVE}`; `EDIT_ERROR`/`EDIT_NOTICE` → `EDIT.{ERROR,NOTICE}`; `DEFAULT_PAGE`/`DEFAULT_PAGE_SIZE` → `DEFAULT.{PAGE,PAGE_SIZE}`; `RETRIES`, `TYPING_REST_MS` → `LIMIT`; `THUMB_PX` → `SIZE.THUMB_PX`), `features/users/constants/users.ts` (ten `*_KANJI` → one `KANJI` group; `ADD_ERROR`/`ADD_NOTICE`/`EDIT_*` → `ADD.{ERROR,NOTICE}`, `EDIT.{ERROR,NOTICE}`; `RETRIES`, `TYPING_REST_MS` → `LIMIT`), `images-params.ts`/`users-params.ts` (loaders, types, `queryOf` → `utils/`)
- Modify callers/tests: `features/images/{actions,components,hooks,utils}/**`, `features/users/**`
- Test: every test file naming an old key; the browser tests

**Interfaces:**
- Produces: `IMAGES.KANJI.ADD`, `IMAGES.EDIT.ERROR.CHANGED`, `IMAGES.LIMIT.TYPING_REST_MS`, `IMAGES.SIZE.THUMB_PX`; same shape on `USERS`.

- [x] **Steps 1–4:** same cycle with `pnpm --filter @allonfire/back-office check-types && … test && … test:browser`. Old names: `rg "ADD_KANJI|APPLY_KANJI|DELETE_KANJI|RESET_KANJI|SAVE_KANJI|EDIT_ERROR|EDIT_NOTICE|ADD_ERROR|ADD_NOTICE|TYPING_REST_MS|THUMB_PX|RETRIES|DEFAULT_PAGE"`.

### Task 10: back-office — the rest

**Files:**
- Modify: `features/services/constants/services.ts` (`CARD_KANJI`, `SAVE_KANJI`, `TEST_KANJI`, `SAVE_ERROR`, `TEST_ERROR` → groups; `serviceTag` → `utils/`), `features/auth/constants/{reset,sign-in}.ts` (`SAVE_KANJI`/`SEND_KANJI` → `KANJI`, `BOARD_KANA`/`NOTICE_KANA` → `KANA`), `features/storage/constants/{storage,buckets}.ts` (`RETRIES`; type + `BUCKET_VIEW` out), `features/navigation/constants/{sections,section-row}.ts` (`SECTION` + `SECTIONS` → one object; `cva` → `utils/`), `shared/constants/{copy,apps}.ts` (`COPIED_MS` → `COPY.DELAY.MS`-style group; `APP_ENTRY` + `APP_OPTIONS` one object), `shared/constants/action-dressing.tsx`, `features/auth/constants/dressing.tsx` (JSX → `components/`)
- Test: affected tests and browser tests

- [x] **Steps 1–4:** same cycle and commands as Task 9.

### Task 11: laura

**Files:**
- Modify: `apps/laura/src/shared/constants/laura.ts` (`SECTION` + `SECTIONS` → one `SECTION` with `LIST` in `features/navigation/constants/sections.ts`, as the Back Office; `PAGE` → `LAURA_BASE.PAGE`; `LAURA` stays the descriptor; `entries` reads the single `APP_ENTRY` definition — one source with back-office's, from core or ui, builder picks per `package-layout.md`), `features/gallery/constants/gallery.ts` (loose `SOURCE`; `LINK_REFRESH_MS`, `PAGE_SIZE`, `PREFETCH_AHEAD`, `RETRIES` → `LIMIT`/`DEFAULT`), `features/games/constants/games.ts` (`SUBMIT_ERROR` schema/type out; `MEMORY.HOLD_MS` → `MEMORY.DELAY.HOLD_MS`), `shared/constants/{query,mutation}.ts` (sort A–Z), `shared/constants/action-dressing.tsx`, `features/auth/constants/dressing.tsx`, `features/navigation/constants/section-row.ts` (JSX/cva out)
- Test: affected tests

- [x] **Steps 1–4:** same cycle with `pnpm --filter @allonfire/laura check-types && … test && … test:browser`.

### Task 12: Whole-repo verification

- [ ] **Step 1:** `pnpm check` — expected: PASS (types, lint, tests per the stage script). Not green, and not because of the sweep: its parts were run one by one. Types: every package passes except `apps/api` `games-scores.test.ts(25,25)` TS2345 (an owner's staged test: `stringifyJson(body: unknown)`). Tests: every package passes except `config` `laura-parity-audit.test.ts` (the owner's Laura P5/P6 files exist where the audit says they were replaced) and `apps/api`'s exit code (the TS2345 above is printed as an unhandled error). Lint (`static:lint`) passes. `static:knip-production` still reports `retryUsers` and `AOF_USER_IDENTITY` (used only by tests, not touched by this sweep); `static:dupes` still reports 2 clones (`add-image.ts` of both Apps, `upload-gate.test.ts` against `laura.test.ts`); Laura's `tailwind:check` still fails on three class lists. The sweep's own findings (an unused `uploadErrorSchema` export, a clone between two doc tests) were fixed.
- [x] **Step 2:** Sweep greps, each expected to print nothing: `rg "IMAGE_UPLOAD" apps packages -g '*.ts*'` (except docs), `rg "\[\[.*\],\s*\[" -g 'constants/*.ts' apps packages`, `rg "_KANJI|_KANA" -g 'constants/*.ts' apps packages`, `rg "^export const [A-Z_]+ =" -g 'constants/*.ts' apps packages` reviewed by eye for a second owner per file, and no `.tsx` or `cva(` under any `constants/`.
- [ ] **Step 3:** (left to the owner: `/iso-review` runs after the diff is read) Run `/iso-review` over the diff; fix findings test-first.

## Reconciliation Log (before the run, 2026-11-25)

- Global Constraints: added the API constants rename (roots `LAURA`, `BACK_OFFICE`; children composed by their parent; nested `API.PATH`; alias `API_*` in the Apps).
- Task 1 Step 2: `api.md` already carried the composition rule; only the folder-path naming sentence is rewritten as the route-module exception.
- Task 7: `API.PATH` was already nested. Task 8: file names and keys of the overview and Laura owners follow the rename. Task 9: the alias note.

## Decisions Made During The Run

- `APP.ENTRY` / `APP.OPTIONS` live in `packages/design/src/apps/app.ts` (`@allonfire/design/apps/app`): ui and core cannot import `**/apps/**`, and design cannot import the `App` enum, so `ENTRY` is keyed by the enum's string values; both Apps' `entries` read it.
- Laura's Sections match the Back Office's (owner's call after the run): `SECTION` with `SECTION.LIST` in `apps/laura/src/features/navigation/constants/sections.ts`, built from `LAURA_BASE.PAGE` (`shared/constants/laura-base.ts`); `LAURA` is only the descriptor (`LAURA.PAGE`, `LAURA.sections` = `SECTION.LIST`). This replaces Task 11's "fold `SECTION`, `SECTIONS`, `PAGE` and `LAURA` into one `LAURA`".
- `*-schema.ts` files stay beside their owner in `constants/`, as in core and auth (`image-schema.ts`, `auth-schema.ts`, `gallery-schema.ts`, `games-schema.ts`, `access-schema.ts`).
- Left as they were (not on any task list): `shared/constants/page-information.ts` in both Apps (function calls), the single keys `WALL_KANJI` and `INSTALL_KANJI` beside `CODE`/`KANA` (nesting a lone key adds a level for nothing), `OPENAPI.DOC.PROBLEM_DESCRIPTION`, `access/constants/schemas.ts` and `users/hono/constants/schemas.ts` (real schemas, many importers), `errorStatusSchema` and `errorCodeSchema`, `mail.ts` and `logger.ts` schemas.

- 2026-11-25, after the sweep: the OpenAPI snapshot guard (`apps/api/src/features/docs/tests/openapi-snapshot.test.ts` and `openapi.snapshot.txt`) is removed. It existed only to prove the renames left `/openapi.json` byte-identical; with the sweep done it only broke on every route change.

## Implementation Log
- Implemented: 2026-11-25T13:03:11Z
- Workspace: no-branch — feat/laura-p0-drop
- Committed: no — awaiting user review
