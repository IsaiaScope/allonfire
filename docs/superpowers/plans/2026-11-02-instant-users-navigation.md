# Instant Users Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In production, link navigation between `/users` and `/users/[id]` shows the data ready before the click, under Next 16's Partial Prefetching, with a User save that can never overwrite a change it did not see.

**Status:** implemented (uncommitted) @ 2026-11-02T10:46:32Z

**Refined during implementation (the code differs from the ticked steps below):** `updateUser` throws `UserChangedError` instead of returning `USER_CHANGE.CONFLICT` (Tasks 1–2); there is no `USERS.CACHE.USER_TAG`, one `USERS.CACHE.TAG` covers the list and a User, so every change calls `updateTag(USERS.CACHE.TAG)` only (Tasks 3–4); `readUsers` was folded into `usersHydration` and removed (Task 4); the intent prefetch is ui's `useAOFIntentPrefetch` hook spread onto `OpenUser`'s `<Link>` (Task 6); every Section link prefetches.

**Architecture:** The database answers every User with a `version` (a hash of `updatedAt` and their (App, Role) pairs); the API's PATCH requires it and refuses a stale one with 409. The Back Office reads the list and one User through `"use cache: private"` (Session read inside, browser-only cache, tagged), core's Next config turns on `partialPrefetching`, the links to `/users` prefetch with `prefetch={true}`, and a User row prefetches on intent. Production `instant()` tests lock it.

**Tech Stack:** Next 16.3.6 (Cache Components, Partial Prefetching), Hono API, Prisma, TanStack Query, Vitest, Playwright + `@next/playwright`.

**Spec:** `docs/superpowers/specs/2026-11-02-instant-users-navigation-design.md` (and ADR `docs/adr/0028-pages-prefetch-their-data-and-a-user-save-is-version-checked.md`)

## Global Constraints

- Read `packages/core/node_modules/next/dist/docs/01-app/02-guides/optimizing-prefetching.md` and `03-api-reference/01-directives/use-cache-private.md` before Tasks 4–6.
- No `as` casts except `as const`; constants live in their owner's nested object (`USER`, `USERS`, `HTTP`); a path, tag or error code is never a string literal, tests included.
- A test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- Env vars start with their owner: the e2e flag is `CONFIG_E2E_TESTING_API` (owned by `packages/config`'s e2e stack).
- `@next/playwright` on the installed `next` release line: `~16.3.6` (495k weekly downloads, above the repo's 200k floor).
- `cacheLife` stale stays `USERS.CACHE.LIFE` (5 minutes) for both reads, the list and one User.
- `experimental.exposeTestingApiInProductionBuild` must never be on in the Docker image that serves traffic.
- No `prefetch={false}` to fake a failing test, no app-wide Link wrapper, no `staleTimes`.
- TanStack Query stays for the list's paging and search.
- No commits during implementation: the owner commits (`/iso-commit`). Each task's "Commit" step names the message to use, nothing more.
- The Section links are few (one per Section), so all of them get `prefetch={true}`, not only Users'.
- End: scoped `biome check --write` on touched files, then repo-wide `pnpm check-types`, `pnpm lint`, `pnpm test`; fix all.

## Review Focus

1. **Revoked access elsewhere:** a Membership deleted after the form was read must refuse the save (409), never restore it. Test in Task 1.
2. **Reopen and save again:** after a successful save, reopening the same User and saving must succeed (a fresh version, not the cached one). Test in Task 7 (freshness e2e).
3. **Signed out mid-visit:** an empty Session cookie inside a private read must throw (the API refuses), never cache an empty list or a null User. Test in Task 4.
4. **Editing oneself:** the version check applies to one's own User too, and the own-Role lock still answers `CANNOT_CHANGE_OWN_ROLE`, not 409, when the version matches. Test in Task 2.
5. **Page 2 and search still work:** the list's later pages come from TanStack and must keep working after the server read changes signature. Covered by the existing `e2e/users.spec.ts`, rerun in Task 7.

---

### Task 0: A generic Version in core

Every future resource (Images, quizzes) reuses this; only *which fields* go into a resource's version stays in its own service.

**Files:**
- Create: `packages/core/src/features/version/utils/version-of.ts`, `packages/core/src/features/version/constants/version.ts`
- Modify: `packages/core/src/features/errors/constants/error-codes.ts` (`ERROR.CODE`), `packages/core/src/features/next/i18n/translations/en.json` + `it.json` (`Common.Request.changed`, beside `Common.Request.failed`)
- Modify: `apps/api/src/features/i18n/translations/en.json` + `it.json` (the API, as Host, owns the code's problem-document message: `RESOURCE_CHANGED`)
- Modify: `packages/core/package.json` `exports` if the new folder needs an entry (follow how `features/errors` is exported)
- Test: `packages/core/src/features/version/tests/version-of.test.ts`, `packages/core/src/features/version/tests/version.test.ts`

**Interfaces:**
- Produces:
  - `versionOf(...parts: readonly string[]): string` — SHA-256 hex (`node:crypto`) of the parts joined with a separator no part contains (`\u0000`). Server-only use.
  - `versionSchema = z.string().min(1)`, exported from `constants/version.ts`: the `version` field every versioned PATCH body adds.
  - `ERROR.CODE.RESOURCE_CHANGED = "RESOURCE_CHANGED"`: the standard code for a stale save.
  - `resourceChanged(): CodedError` in `constants/version.ts` (or a sibling `utils/resource-changed.ts`): `new CodedError({ code: ERROR.CODE.RESOURCE_CHANGED, status: HTTP.STATUS.CONFLICT })`.
  - Shared translation `Common.Request.changed` (every App's forms show it) and the API's `RESOURCE_CHANGED` message, both: en `"Someone changed this meanwhile. Reload to see the latest and edit again."`, it `"Qualcuno l'ha modificato nel frattempo. Ricarica per vedere la versione aggiornata e modificalo di nuovo."`.

- [x] **Step 1: Write failing tests**: `version-of.test.ts`: `"is stable for the same parts"`, `"differs when a part changes"`, `"differs when parts are split differently"` (`versionOf("ab", "c") !== versionOf("a", "bc")`). `version.test.ts`: `"resourceChanged is a 409 with the standard code"`; `"versionSchema refuses an empty version"`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/core test version` — FAIL.
- [x] **Step 3: Implement** the files above.
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commit** `feat(core): a generic Version for stale-save protection`.

### Task 1: A User's version, and a version-checked update

**Files:**
- Create: `packages/database/src/features/auth/user-version.ts`
- Modify: `packages/database/src/features/auth/user.service.ts` (`UserRecord`, `userRecord` select, `updateUser`)
- Test: `packages/database/src/features/auth/tests/user-version.test.ts` (unit), the existing `user.service` integration test file in `packages/database/src/features/auth/tests/`

**Interfaces:**
- Produces:
  - `userVersion(user: { updatedAt: Date; memberships: readonly AccessMembership[] }): string` — Task 0's `versionOf(updatedAt.toISOString(), ...pairs)`, the pairs sorted by app then role, each written `app:role`. This file decides only *what* a User's version covers.
  - `UserRecord` gains `version: string` (no `updatedAt` leaves the service).
  - `USER_CHANGE = { CONFLICT: "conflict" } as const` exported from `user.service.ts`.
  - `updateUser(id, change, { keepSessionId?, expectedVersion: string }): Promise<UserRecord | null | typeof USER_CHANGE.CONFLICT>`.

- [x] **Step 1: Write failing unit tests** `user-version.test.ts`:
  - `"is the same for the same User whatever the Memberships' order"`: two inputs with the pairs swapped → equal.
  - `"changes when a Membership is removed"`: drop one pair → different.
  - `"changes when a Role changes"` and `"changes when updatedAt changes"` → different.
- [x] **Step 2: Run** `pnpm --filter @allonfire/database test user-version` — FAIL (module missing).
- [x] **Step 3: Implement `userVersion`** in `user-version.ts`.
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Write failing integration tests** for `updateUser`:
  - `"refuses a stale version and writes nothing"`: read a User, delete one of their Memberships directly, call `updateUser` with the old `version` and a new name → returns `USER_CHANGE.CONFLICT`; the name and Memberships are unchanged.
  - `"writes with the current version and answers a new one"`: `version` from `readUser` → updated record whose `version` differs.
  - `"answers null for an unknown id"` keeps passing.
- [x] **Step 6: Run** the database integration tests — FAIL.
- [x] **Step 7: Implement.** Select `updatedAt` in `userRecord` and map every record through one `toRecord` that replaces it with `version` (list, read, update). In `updateUser`, lock the row first (`SELECT … FROM auth."User" WHERE "id" = ${id} FOR UPDATE`, as `setUserImage` does), read `updatedAt` and Memberships inside the transaction, return `USER_CHANGE.CONFLICT` before any write when `userVersion(…) !== expectedVersion`.
- [x] **Step 8: Run** unit + integration tests — PASS.
- [x] **Step 9: Commit** `feat(database): version a User and refuse a stale update`.

### Task 2: The API requires the version and answers 409

**Files:**
- Modify: `packages/auth/src/features/users/hono/constants/schemas.ts` (`userBodySchema`, `userUpdateRequestSchema`)
- Modify: `packages/auth/src/features/users/hono/routes/handlers.ts` (`updateHandlers`), `hono/utils/deps.ts` (the `updateUser` dep's type), `apps/api/src/features/users/user-deps.ts` if it re-types it
- Test: `packages/auth/src/features/users/hono/tests/edit.test.ts`, `stub-user-deps.ts`

**Interfaces:**
- Consumes: Task 0's `versionSchema`, `resourceChanged()`, `ERROR.CODE.RESOURCE_CHANGED`; Task 1's `updateUser` options and `USER_CHANGE.CONFLICT`, `UserRecord.version`.
- Produces: `UserBody.version: string`; PATCH body field `version: versionSchema` (required); a stale save answers 409 `ERROR.CODE.RESOURCE_CHANGED`.

- [x] **Step 1: Write failing tests** in `edit.test.ts`:
  - `"answers 409 RESOURCE_CHANGED when the stored User changed since the version"`: stub `updateUser` returns `USER_CHANGE.CONFLICT` → status 409, problem code `ERROR.CODE.RESOURCE_CHANGED`.
  - `"refuses a PATCH without a version"` → 400.
  - `"passes the version through to updateUser"`: assert the stub got `expectedVersion`.
  - `"still answers CANNOT_CHANGE_OWN_ROLE for one's own Role, version matching"` (Review Focus 4).
- [x] **Step 2: Run** `pnpm --filter @allonfire/auth test edit` — FAIL.
- [x] **Step 3: Implement**: the schema fields, and in the handler `throw resourceChanged()` when `updateUser` answers the conflict. Add the route's 409 response to its OpenAPI description where the other codes are listed.
- [x] **Step 4: Run** the auth tests and `pnpm --filter @allonfire/api test` — PASS.
- [x] **Step 5: Commit** `feat(auth): require a User's version to edit them`.

### Task 3: The Back Office sends the version, says when it changed, and updates the right tags

**Files:**
- Modify: `apps/back-office/src/features/users/constants/users.ts` (`USERS.CACHE`, `USERS.EDIT_ERROR`)
- Modify: `apps/back-office/src/features/users/actions/edit-user.ts`, `actions/delete-users.ts`, `actions/add-user.ts`
- Modify: `apps/back-office/src/features/users/components/edit-user.tsx` (the `useActionState` bind)
- Test: `actions/tests/edit-user.test.ts`, create `actions/tests/delete-users.test.ts`

**Interfaces:**
- Consumes: Task 0's `ERROR.CODE.RESOURCE_CHANGED` and its shared translation; Task 2's `UserBody.version`.
- Produces:
  - `USERS.CACHE.USER_TAG(id: string): string` → `` `${USERS.CACHE.TAG}:${id}` ``.
  - `USERS.EDIT_ERROR.CHANGED = "changed"`.
  - `editUser(id: string, version: string, state: EditUserState, form: FormData)`.

- [x] **Step 1: Write failing tests**:
  - `edit-user.test.ts`: `"sends the version it was opened with"` (PATCH json holds `version`); `"answers CHANGED on a 409 RESOURCE_CHANGED, keeping what was typed"` (`{ error: USERS.EDIT_ERROR.CHANGED, values }`); `"on 200 updates the Users tag and this User's tag"` (`updateTag` called with `USERS.CACHE.TAG` and `USERS.CACHE.USER_TAG(id)`).
  - `delete-users.test.ts`: `"on 200 updates the Users tag and each deleted User's tag"`.
- [x] **Step 2: Run** `pnpm --filter back-office test actions` — FAIL.
- [x] **Step 3: Implement**: the constants; `editUser` takes `version` and sends it; `refusalOf`'s map gains `[ERROR.CODE.RESOURCE_CHANGED, USERS.EDIT_ERROR.CHANGED]`; `edit-user.tsx` binds `editUser.bind(null, user.id, user.version)`; delete updates `USERS.CACHE.USER_TAG(id)` for each id; add keeps `USERS.CACHE.TAG` only. The form shows `CHANGED` with Task 0's shared translation (no App-local copy), where it shows the other edit errors (the 409 is a message only; the spec decided no re-read).
- [x] **Step 4: Run** the Back Office unit tests — PASS.
- [x] **Step 5: Commit** `feat(back-office): send a User's version and say when it changed`.

### Task 4: The list and one User read through `"use cache: private"`

**Files:**
- Modify: `apps/back-office/src/features/users/utils/read-users.ts`, `utils/read-user.ts`
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/users/page.tsx`, `users/[id]/page.tsx`
- Delete: `apps/back-office/src/features/users/utils/users-visitor.ts`, `utils/tests/users-visitor.test.ts` (the browser-only cache is per visitor already; check no other importer)
- Modify: `docs/agents/back-office.md` (the "a list read from the API is kept on the server per visitor" rule becomes the private-cache rule, linking ADR 0028)
- Test: `utils/tests/read-users.test.ts`, `utils/tests/read-user.test.ts`

**Interfaces:**
- Consumes: Task 3's `USERS.CACHE.USER_TAG`.
- Produces: `readUsers(params: UsersParams): Promise<UserListBody>`; `readUser(id: string): Promise<UserBody | null>`. Both start with `"use cache: private"`, read `readSessionCookie()` inside, call `cacheLife(USERS.CACHE.LIFE)`; tags `USERS.CACHE.TAG` (list) and `USERS.CACHE.TAG` + `USERS.CACHE.USER_TAG(id)` (one User).

- [x] **Step 1: Write failing tests** (mock `next/headers` `cookies()` and `next/cache`):
  - `read-users.test.ts`: `"reads the page as the Session's cookie, tagged and kept 5 minutes"` (cookie header sent, `cacheTag(USERS.CACHE.TAG)`, `cacheLife(USERS.CACHE.LIFE)`); `"throws when signed out"` (no cookie → API 401 → rejects; Review Focus 3).
  - `read-user.test.ts`: `"tags the User under the list's tag and their own"`; `"answers null for an unknown id"`; `"throws any other refusal"`.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** both reads; rewrite `read-user.ts`'s header comment (the version check now guards the save, ADR 0028). Pages: `UsersList` calls `readUsers(params)` (it still reads the Session for `selfId`), `UserForm` calls `readUser(id)`; the page structure and fallbacks stay.
- [x] **Step 4: Run** the Back Office unit tests and `pnpm --filter back-office check-types` — PASS.
- [x] **Step 5: Commit** `refactor(back-office): read Users through the private cache`.

*Found in Task 7 and fixed here: the list's TanStack hydration (`setQueryData` + `dehydrate`) stamps `Date.now()`, which outside a cache kept `/users` out of every prefetch (the `instant()` lock never committed). `features/users/utils/users-hydration.ts` (`usersHydration(params)`, `"use cache: private"`, tagged and kept like `readUsers`, test `utils/tests/users-hydration.test.ts`) now builds the hydration state inside the private cache; the page calls it, a refusal still left to the table.*

### Task 5: Partial Prefetching on, and a test-only testing API

**Files:**
- Modify: `packages/core/src/features/next/config/aof-create-next-config.ts`
- Modify: `packages/core/src/environment/environment.ts` (`CONFIG_E2E_TESTING_API`, optional boolean-ish string)
- Modify: `packages/config/tests/e2e/playwright.config.ts` (the App webServer's `env` sets `CONFIG_E2E_TESTING_API: "1"`)
- Modify: `turbo.json` only if the e2e task's env passthrough lists vars (mirror how `CONFIG_E2E_STAMP` is declared)
- Test: the core config's existing test file beside `aof-create-next-config.ts` (create `tests/aof-create-next-config.test.ts` if none)

**Interfaces:**
- Produces: every App on `AOFCreateNextConfig` has `partialPrefetching: true`; `experimental.exposeTestingApiInProductionBuild` is `true` only when `CONFIG_E2E_TESTING_API` is set.

- [x] **Step 1: Write failing tests**: `"turns on Partial Prefetching"`; `"exposes the testing API only for the e2e build"` (env unset → falsy; set → true); `"keeps an App's own experimental options"` (`useOffline` still true).
- [x] **Step 2: Run** `pnpm --filter @allonfire/core test aof-create-next-config` — FAIL.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run** the test — PASS; then `pnpm --filter back-office build` succeeds, and `pnpm --filter back-office dev` loaded on `/users` and `/users/<id>` shows no Partial Prefetching insight in the dev log (fix any `instant-shell-url-data` insight by moving the URL read inside the existing boundary).
- [x] **Step 5: Commit** `feat(core): prefetch App Shells across every App`.

### Task 6: Links that prefetch the data behind them

**Files:**
- Modify: `apps/back-office/src/features/navigation/components/section-link.tsx` (`SectionRow`'s `<Link>`), `components/frame-breadcrumb.tsx` (the Section crumb's `<Link>`)
- Modify: `apps/back-office/src/features/users/components/user-form-parts.tsx` (Cancel `<Link>`)
- Modify: `apps/back-office/src/features/users/components/user-columns.tsx` (`OpenUser`)
- Test: `apps/back-office/src/features/users/components/tests/open-user.test.tsx` (create), the navigation components' existing tests

**Interfaces:**
- Produces: the Section links (a handful, one per Section) and the breadcrumb and Cancel links carry `prefetch={true}`; `OpenUser` renders `prefetch={false}` until intent, then `prefetch={true}`.

- [x] **Step 1: Write failing tests** (mock `next/link` to record its props):
  - `open-user.test.tsx`: `"prefetches nothing of its own before intent"`; `"prefetches on pointer enter"`, `"on focus"`, `"on pointer down"` (each: fire the event, the recorded `prefetch` is `true`).
  - navigation tests: `"a Section link prefetches its page's data"` (`prefetch` is `true`). *Reconciled during implementation: the Section, breadcrumb and Cancel links carry a bare `prefetch` prop; Task 7's `instant()` tests prove the real prefetch instead of a mocked prop. The test Link mocks drop `prefetch` so it never reaches the `<a>`.*
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement.** `OpenUser` holds one `useState` flag set by `onPointerEnter`, `onFocus`, `onPointerDown` (chained with any handler in `props`); a `ponytail:` comment names the ceiling: intent, not viewport, because a page holds up to 100 rows (ADR 0028). No shared Link wrapper.
- [x] **Step 4: Run** the tests — PASS.
- [x] **Step 5: Commit** `feat(back-office): prefetch the data behind the Users links`.

*Owner's follow-up: the intent logic moved to a generic hook, `packages/ui/src/lib/use-aof-intent-prefetch.ts` (`useAOFIntentPrefetch()`, props for any `<Link>`), which `OpenUser` spreads; `open-user.browser.test.tsx` checks it through its caller.*

### Task 7: Production `instant()` tests and the freshness check

**Files:**
- Modify: `apps/back-office/package.json` (devDependency `@next/playwright` `~16.3.6`)
- Create: `apps/back-office/e2e/instant.spec.ts`
- Test: that file, plus the existing `e2e/users.spec.ts`

**Interfaces:**
- Consumes: Tasks 4–6; `signIn`, `openSidebar` from `e2e/pages.ts`; `userHref`, `sectionHref`, `SECTION`, `FIXTURE.USER.*` as `users.spec.ts` uses them.

- [x] **Step 1: Install** `pnpm --filter back-office add -D @next/playwright@~16.3.6`.
- [x] **Step 2: Write the tests** (signed in as the Back Office Admin, one test per link contract):
  - `"Cancel on a User opens the list with its rows already there"`: on `userHref(<fixture id>)`, inside `instant(page, …)` click Cancel, wait for the `/users` URL, expect a fixture User's email visible.
  - `"the sidebar's Users link opens the list with its rows already there"`: same from Home.
  - `"a hovered User row opens the form already filled"` (tag `E2E_TAG.CHROMIUM_ONLY`, desktop project): hover the row's link, wait for the prefetch to settle outside the lock, then inside `instant()` click it, wait for the URL, expect the name field to hold the fixture's name.
  - `"a saved User shows the new name in the list and on reopening, and saves again"` (Review Focus 2): change the name, save, the list row shows it, reopen, the field shows it, change again and save → no CHANGED message.
- [x] **Step 3: Run** `pnpm --filter back-office test:e2e instant` — the three `instant()` tests PASS against the production build; confirm `instant()` is active (a test asserting a deliberately request-time region is absent inside the lock passes, i.e. the lock holds; delete that probe after).
- [x] **Step 4: Differential**: temporarily remove `prefetch={true}` from Cancel → the Cancel test FAILS; restore → PASS. Same for `OpenUser`'s intent. Record both runs in the commit body.
  *Run 2026-11-02 (Chromium): with Cancel's `prefetch` and `OpenUser`'s intent removed, "Cancel…" and "a hovered User row…" failed on the content assertion (the page committed, its data not prefetched) and "the sidebar's Users link…" passed; restored, all three passed.*
- [x] **Step 5: Run** the full `pnpm --filter back-office test:e2e` (Review Focus 5) — PASS.
- [x] **Step 6: Commit** `test(back-office): lock instant Users navigation in production`.

### Task 8: Finish

- [x] **Step 1:** `pnpm biome check --write` on every touched file.
- [x] **Step 2:** `pnpm check-types && pnpm lint && pnpm test` repo-wide — all PASS; fix anything red.
- [x] **Step 3:** Mark the spec's status done at its top and commit `docs: instant Users navigation done`.

## Implementation Log
- Implemented: 2026-11-02T10:46:32Z
- Workspace: fresh-branch — feat/instant-users-navigation
- Committed: no — awaiting user review
