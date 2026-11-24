# Laura Profile and per-User Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Laura User's favorites live in their own data: Laura gets a Profile per Membership, an Admin marking or clearing a Favorite writes the master list and every Profile's copy in one transaction, and `auth.User` names no Laura model.

**Status:** implemented (uncommitted) @ 2026-11-20T11:08:56Z. Task 7 (end-to-end, Laura UI) was written with P4 Task 16 and passes on the four projects (@ 2026-11-24T10:40:26Z).

**Architecture:** `laura."Profile"` (model `LauraProfile`) is keyed on `(userId, app)` and cascades from `auth."Membership"`; `laura."ProfileFavorite"` holds each Profile's copy of the master `laura."Favorite"` (Image-keyed, cascade from the Image's Laura placement, no `markedBy`). The API's two reads first run an idempotent get-or-create of the caller's Profile (copying the master) and then read the caller's own copies; the two writes stay Admin-only and fan out inside one transaction under an advisory lock. URLs and bodies of Phase 4 do not change. The routes only Back Office admins call (Users, the two overviews) move under `/v1/back-office/`.

**Tech Stack:** Prisma 7 + Liquibase (formatted SQL), PostgreSQL advisory locks, Hono + zod 4, Vitest (unit, integration), Playwright. No new dependency.

**Spec:** docs/superpowers/specs/2026-11-20-per-app-user-relations-design.md (also ADR 0034 and `CONTEXT.md` Profile, Favorite)

## Global Constraints

- Tests first; a test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`; a constant's type comes from zod; a lookup table is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`, `localStorage`/`sessionStorage`: use core's helpers.
- Constants are one nested object per owner; a path or an error code is never a string literal, tests included (statuses and methods through core's `HTTP`).
- A package never imports an App and never names one in shared logic (ADR 0033): `packages/database/src/features/auth/**` never mentions Laura. Laura's services live in `src/features/apps/laura/`.
- Database changes are Liquibase changesets (`pnpm db:changeset`), never `prisma db push` or `prisma migrate`; an applied changeset is never edited, except `0009` here, which ran only on the owner's Local database and was never committed (the owner chose to rewrite it in place).
- Do not commit (the owner commits by hand). Docs are plain English prose, no emoji, never the word "may" (use can / is allowed to / might).
- Names fixed by earlier work are cited, never renamed: `requireApp(app, min?)`, `manageGuard`, `removeImagesFromApp`, `FIXTURE.USER.LAURA.{ADMIN,USER}`, `FIXTURE.IMAGE.IN_BOTH_APPS`, `keysetCursor`.

## Review Focus

1. **A User who opens Laura while an Admin marks.** Either order must end with every Profile's copies equal to the master: no copy missing, none extra (Task 3: advisory lock, concurrency test).
2. **A revoked Member with a live cookie.** Reading the feed must answer 403 and create nothing, never a 500 from the Membership foreign key (Tasks 3, 5).
3. **A copy that outlives its photo, its Profile or its Membership.** Removing the Laura placement, deleting the Image, revoking the Laura Membership and deleting the User must each remove the copies in the database, with no cleanup code (Tasks 2, 3).
4. **Feeds that disagree between Users.** The same favorite must sit at the same place in every User's Favorites feed (the copy keeps the master's `createdAt`), and a User with no Profile yet sees nothing marked, never another User's marks (Tasks 3, 4).
5. **A User who writes.** `PUT`/`DELETE` by a Laura User, or by a Back Office Admin who is no Laura Member, must answer 403 before any database write, and neither the master nor any copy changes (Task 6).

---

## How this plan relates to Phase 4

Phase 4 (`2026-11-17-laura-p4-gallery-favorites.md`) was paused at its Task 4 and stays the plan for everything else. Order of work:

| Step | Do | Replaces or amends |
|---|---|---|
| 1 | This plan, Tasks 1 to 3 | P4 Tasks 2 and 4 (P4 Tasks 0, 1 and 3 are done and stand) |
| 2 | This plan, Tasks 4, 5, 6 | P4 Tasks 5, 6, 7: where they differ, this plan wins |
| 3 | P4 Tasks 8 to 15 as written | unchanged: the browser sees the same URLs and bodies, and a User's static mark still reads `favorite` from the feed |
| 4 | This plan, Task 7 | P4 Task 16's favorite specs (its other specs stand) |
| 5 | P4 Task 17, then this plan's Task 8 | docs |
| 6 | P4 Task 18, then this plan's Task 9 | review checkpoint |
| any time | This plan's Task 10 | independent of the rest: the route move for the Back Office admin console |

## Decisions this plan takes (correctable)

- **Names**: Prisma models `LauraProfile` and `ProfileFavorite`, stored as `laura."Profile"` and `laura."ProfileFavorite"` (`@@map`). Prisma needs unique model names across schemas, which is why the model carries the App.
- **The copy keeps the master's `createdAt`**, so every User's Favorites feed is in the same order and a new User's copy is not reordered by when they first opened Laura.
- **One advisory lock for the three writers** (`markFavorite`, `unmarkFavorite`, `ensureLauraProfile`): `pg_advisory_xact_lock(LAURA_FAVORITE.LOCK_KEY)` first in each transaction. It serialises the fan-out against a first-use copy (Review Focus 1). With about 20 Users the wait is negligible; a per-App lock is the upgrade if an App grows.
- **Reads never write; the API does.** The database read functions only read. The API's two `GET`s call `ensureLauraProfile` first (a get-or-create that is idempotent), so a read creates a row once per User.
- **`markedBy` is dropped** (nothing read it), so `auth.User` loses its `favorites` line; `auth."Membership"` gains `lauraProfile LauraProfile?` (Prisma needs the inverse).
- **The Fixture seeds the master only**, never a Profile: Profiles are created on first use, which the integration and e2e tests exercise.

## File structure

Created: `packages/database/src/features/apps/laura/profile.service.ts` (+ `tests/profile.integration.test.ts`), `packages/database/src/features/apps/laura/constants/laura-favorite.ts` (`LAURA_FAVORITE`).

Modified (already created by the paused P4 run, uncommitted): `packages/database/prisma/schema/{apps/laura,image,auth}.prisma`, `changelog/changesets/0009-laura-favorite.sql`, `liquibase/tests/changelog.integration.test.ts`, `src/features/apps/laura/favorite.service.ts` and `tests/favorite.integration.test.ts`, `src/features/seed/fixtures/{favorites,seed-fixtures}.ts` and `fixtures/tests/seed-fixtures.integration.test.ts`, `packages/database/package.json` (export keys). Created by P4 and changed by Tasks 4 to 6 here: `gallery.service.ts`, `apps/api/src/features/laura/**`. Docs: `docs/guides/{database,api,laura}.md`, `packages/database/README.md`, ADR 0007, the 2026-11-17 spec, the P4 plan.

### Task 1: Pointers and superseded notes

**Files:** Modify `docs/adr/0007-*.md`, `docs/superpowers/specs/2026-11-17-laura-rebuild-design.md`, `docs/superpowers/plans/2026-11-17-laura-p4-gallery-favorites.md`. (`CONTEXT.md` Profile and Favorite, ADR 0034 and the spec are already written.)

- [x] **Step 1:** Add one pointer line under ADR 0007's Consequences ("Superseded in part by ADR 0034: an App's data about a User lives in its Profile, tied to the Membership, so `User` lists no App model"), as ADR 0014's pointer is written. Add one line under the rebuild spec's "Favorite (decided)" bullet pointing at the new spec and saying the old "never per User" text is history.
- [x] **Step 2:** In the P4 plan, add a blockquote under Tasks 2, 4, 5, 6, 7 and 16 ("Superseded or amended by the Profile plan, Task N: read it first") and one under Tasks 10, 11 and 14 ("Unchanged by the Profile plan: the client sees the same URLs and bodies"). Replace P4 Review Focus 1's "written for a stranger" wording with a pointer. Do not delete the old text.
- [x] **Step 3:** ADR 0035 (`docs/adr/0035-api-routes-are-grouped-by-who-calls-them.md`, already written) is cited from `docs/guides/api.md` in Task 10 step 4, and ADR 0034's Consequences gets one line pointing at it for the route side of the same work.
- [x] **Step 4:** Verify: `git grep -n "0034\|0035\|laura-profile-favorites" docs | head` lists both ADRs, the pointers and the notes; `pnpm static:design` exits 0.

### Task 2: Models and changeset `0009` rewritten in place

**Files:** Modify `packages/database/prisma/schema/apps/laura.prisma`, `image.prisma`, `auth.prisma`, `changelog/changesets/0009-laura-favorite.sql`, `liquibase/tests/changelog.integration.test.ts`.

**Interfaces:** Produces tables `laura."Favorite"(imageId PK, app, createdAt)`, `laura."Profile"(userId, app, createdAt; PK (userId, app))`, `laura."ProfileFavorite"(userId, imageId, app, createdAt; PK (userId, imageId))`; constraints `Favorite_app_check`, `Profile_app_check`, `ProfileFavorite_app_check` (`app = 'laura'`), `Profile_userId_app_fkey` (to `auth."Membership"(userId, app)`, cascade), `ProfileFavorite_userId_app_fkey` (to `Profile`, cascade), `ProfileFavorite_imageId_app_fkey` and `Favorite_imageId_app_fkey` (to `image."ImageApp"(imageId, app)`, cascade), index `ProfileFavorite_userId_createdAt_imageId_idx`, index `Favorite_createdAt_imageId_idx`. Prisma: `LauraProfile` (`membership`, `favorites ProfileFavorite[]`), `ProfileFavorite` (`profile`, `imageApp`), `Favorite` without `markedBy`/`user`, `ImageApp.profileFavorites ProfileFavorite[]` beside `favorites`, `Membership.lauraProfile LauraProfile?`, and no `favorites` on `User`.

- [x] **Step 1:** Update the changelog test (red): `LAURA_TABLES` becomes `["Favorite", "GameScore", "Profile", "ProfileFavorite"]` (the `BASELINE_TABLES` keeps naming `GameScore` and the old public `Favorite`); the "creates laura.Favorite" test expects columns `["app", "createdAt", "imageId"]` and key `["imageId"]`; add one test each for `Profile` (columns `["app", "createdAt", "userId"]`, key `["app", "userId"]`) and `ProfileFavorite` (columns `["app", "createdAt", "imageId", "userId"]`, key `["imageId", "userId"]`); the rollback test expects `laura` to be `["GameScore"]` after `--count=1`. Run `pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`: expected FAIL.
- [x] **Step 2:** Roll Local back one changeset so `0009`'s checksum can change (`pnpm db:rollback` with Liquibase's count form; confirm with `pnpm db:status` that `0009` is pending), then edit the three Prisma files as in Interfaces and rewrite `0009` (`pnpm db:changeset laura-favorite` to see Prisma's DDL, then keep one file: the three `CREATE TABLE`s, indexes and foreign keys, the three CHECKs, and `--rollback` dropping `ProfileFavorite`, `Profile`, `Favorite` in that order; keep the existing `--comment`, extended to name the Profile).
- [x] **Step 3:** `pnpm db:update`, `pnpm db:generate`; run the Step 1 command (expected PASS) and `pnpm test:drift` (expected `No difference detected.`).

### Task 3: Profile and Favorite services, Fixture

**Files:** Create `profile.service.ts`, `constants/laura-favorite.ts`, `tests/profile.integration.test.ts`. Modify `favorite.service.ts`, `tests/favorite.integration.test.ts`, `seed/fixtures/{favorites,seed-fixtures}.ts`, `seed/fixtures/tests/seed-fixtures.integration.test.ts`, `packages/database/package.json` (key `./features/apps/laura/profile.service`).

**Interfaces:**
- `LAURA_FAVORITE = { LOCK_KEY: <a fixed integer> }`.
- `ensureLauraProfile(userId: string): Promise<boolean>`: in one transaction under the lock, `INSERT` the Profile `ON CONFLICT DO NOTHING`, then `INSERT ... SELECT` the master into the User's copies `ON CONFLICT DO NOTHING`; true when the User has a Profile afterwards, false when they hold no Laura Membership (catch Prisma `P2003`, write nothing).
- `markFavorite(imageId: string): Promise<boolean>` (the `userId` parameter is removed): under the lock, false when the Image is not placed in Laura; else upsert the master (first `createdAt` stays) and `INSERT ... SELECT` a copy into every existing Profile with the master's `createdAt`, `ON CONFLICT DO NOTHING`; true.
- `unmarkFavorite(imageId: string): Promise<void>`: under the lock, delete the master row and every copy of that Image; idempotent.
- `FIXTURE.FAVORITE = { IMAGE: FIXTURE.IMAGE.IN_BOTH_APPS }` (no `MARKED_BY`); the seed writes the master only.

- [x] **Step 1: tests (red).** `favorite.integration.test.ts` (rewrite the paused file): marking writes the master and a copy in each existing Profile (two Users with Profiles made through `ensureLauraProfile`), copies carry the master's `createdAt`; marking twice keeps one row each and the first `createdAt`; an Image not placed in Laura answers false and writes nothing; unmarking removes the master and every copy and a second unmark is no error; removing the Laura placement (`removeImagesFromApp`) and deleting the Image (`deleteImages`) remove the master and every copy; taking it out of the Back Office only keeps them. `profile.integration.test.ts`: creates a Profile and copies the whole master; a second call changes nothing; a User with no Laura Membership answers false and no row exists; revoking the Laura Membership (`prisma.membership.delete`) removes the Profile and its copies and leaves the User and their Back Office Membership; deleting the User removes them; the database refuses an `app` that is not Laura on `Profile` and `ProfileFavorite` (`Profile_app_check`, `ProfileFavorite_app_check`) and a Profile for a pair with no Membership (`Profile_userId_app_fkey`); **concurrency (Review Focus 1):** twelve interleaved `markFavorite` and `ensureLauraProfile` calls on fresh Users run with `Promise.all`, then every Profile's copies equal the master's Image ids exactly. `seed-fixtures.integration.test.ts`: seeding twice leaves the master row for `FIXTURE.FAVORITE.IMAGE` and no `Profile` row. Run `pnpm test:services && pnpm --filter @allonfire/database exec vitest run src/features/apps/laura src/features/seed`: expected FAIL.
- [x] **Step 2: implement** per Interfaces. Raw SQL through `prisma.$executeRaw` inside `prisma.$transaction`, the lock as `SELECT pg_advisory_xact_lock(${LAURA_FAVORITE.LOCK_KEY})` first; no cast: tagged-template values only.
- [x] **Step 3:** run Step 1's command: expected PASS; `pnpm --filter @allonfire/database test`.

### Task 4: Gallery and Favorites reads from the caller's copies (amends P4 Task 5)

**Files:** Create `packages/database/src/features/apps/laura/gallery.service.ts` and `tests/gallery.integration.test.ts` as P4 Task 5 says, with the changes below.

**Interfaces:** `listGalleryPage(args: { after?: KeysetPosition | undefined; limit: number; userId: string })` and `listFavoritesPage(args: { after?: KeysetPosition | undefined; limit: number; userId: string })` (a `userId` is added to both; everything else, `GalleryRecord`, `GalleryPage`, the keyset rules, is P4 Task 5's). `favorite` is true only when the caller's own `ProfileFavorite` holds the Image; the Favorites list pages the caller's copies by `createdAt desc, imageId desc`. Neither function writes.

- [x] **Step 1: tests (red)**, P4 Task 5's list plus: the flag is true for the caller's copy and false for an Image only another User holds; a User with no Profile sees every `favorite` false and an empty Favorites list; two Users with Profiles see the Favorites in the same order; paging stays exact when an Admin marks between two pages (the new copy tops a fresh read, never repeats on page 2).
- [x] **Step 2:** run, expected FAIL; **Step 3:** implement with plain Prisma as P4 Task 5 step 3, the flag through the Image's Laura placement: `apps: { where: { app: App.LAURA }, select: { profileFavorites: { where: { userId }, select: { imageId: true } } } }`; **Step 4:** run, expected PASS.

### Task 5: API reads and the first-use step (amends P4 Task 6)

**Interfaces:** `LauraDeps` (P4 Task 6) gains `ensureProfile: typeof ensureLauraProfile`; `markFavorite` and `listGalleryPage`/`listFavoritesPage` are the amended signatures. Both `GET` handlers run, after `requireApp(App.LAURA)`: `await deps.ensureProfile(user.id)`, 403 (core's forbidden error, code `ERROR.CODE.FORBIDDEN`) when it answers false and the list is never called, then the list with `userId: user.id`. `stubLauraDeps` gets `ensureProfile` defaulting to `() => Promise.resolve(true)`.

- [x] **Step 1: tests (red)**, P4 Task 6's table plus: `ensureProfile` is called once with the Session's user id before the list dep; `false` answers 403 with the list dep not called; the list deps receive `userId`. Integration: the first `GET /v1/laura/gallery` by `FIXTURE.USER.LAURA.USER` creates their Profile (`prisma.lauraProfile` row) and answers `favorite: true` for `FIXTURE.FAVORITE.IMAGE` only; a second call creates nothing; a Laura User whose Membership is deleted but who holds a live Session answers 403 and no Profile row appears.
- [x] **Step 2:** run `pnpm test:services && pnpm --filter @allonfire/api exec vitest run src/features/laura src/features/docs`: expected FAIL; **Step 3:** implement; **Step 4:** run, expected PASS, then `pnpm --filter @allonfire/api run check-types`.

### Task 6: API writes (amends P4 Task 7)

**Interfaces:** `PUT`/`DELETE /v1/laura/favorites/:imageId` unchanged in URL, guards (`requireApp(App.LAURA, Role.ADMIN)`, then `manageGuard(deps.canManage)`), status and body; `deps.markFavorite(imageId)` is called with the Image id only.

- [x] **Step 1: tests (red)**, P4 Task 7's list with `markFavorite` called with just the id; integration: as `FIXTURE.USER.LAURA.ADMIN`, `PUT` an Image then `GET /v1/laura/favorites` as `FIXTURE.USER.LAURA.USER` (Profile created by that read) lists it; a Laura User who first reads after the `PUT` also lists it; `DELETE` removes it from both Users' feeds; a Laura User and a Back Office Admin who is no Laura Member get 403 on both writes with the master and the copies unchanged (Review Focus 5).
- [x] **Step 2:** run, expected FAIL; **Step 3:** implement; **Step 4:** run, expected PASS, then `pnpm --filter @allonfire/api test`.

### Task 7: End-to-end (amends P4 Task 16's favorite specs)

**Files:** `apps/laura/e2e/favorites.spec.ts`, `gallery.spec.ts`.

- [x] **Step 1:** add to P4 Task 16's specs: an Admin marks a photo and a Laura User, signed in in a second browser context, sees its static mark after a reload; the User's Favorites page lists it in the same order as the Admin's; the Admin clears it and the User no longer sees it; Remove from Laura removes the photo and its favorite for the User; the User cannot call the writes (API 403 through the `request` fixture). Copy from `enT`, paths from `LAURA`.
- [x] **Step 2:** run `pnpm test:services && pnpm e2e:run --filter=@allonfire/laura`: expected FAIL until Tasks 3 to 6 are in; **Step 3:** fix what the specs find; **Step 4:** PASS on the four projects.

### Task 8: Docs (adds to P4 Task 17)

**Files:** `docs/guides/database.md` (the Profile pattern in two lines pointing at ADR 0034: tables, `<App>Profile` naming, cascade from the Membership, first-use creation, columns vs JSON tail vs child tables; the `laura` schema now lists `Profile`, `ProfileFavorite`, `Favorite`; services `profile.service`, `favorite.service`, `gallery.service`), `docs/guides/api.md` (only the Laura reads' first-use step; the route rule is Task 10 step 4), `docs/guides/laura.md` (Favorites: where the pieces live, who writes), `packages/database/README.md` (exports, the Favorite Fixture), `apps/api/README.md` (the two reads create a Profile once).

- [x] **Step 1:** list what each file must make true; `git grep -n "markedBy\|never per User\|User.favorites" docs packages apps` for stale statements. **Step 2:** write plain English, one pointer per fact. **Step 3:** `pnpm static:design`, `pnpm static:i18n`: exit 0.

### Task 9: Review checkpoint (adds to P4 Task 18)

- [x] **Step 1:** `pnpm db:generate`, `pnpm static:fix`, `pnpm static:lint`, `pnpm static:dupes`, `pnpm static:knip`, `pnpm static:knip-production` (`ensureLauraProfile`, `markFavorite`, `unmarkFavorite`, `LAURA_FAVORITE` each have a reader).
- [x] **Step 2:** `pnpm test:services`, `pnpm turbo run check-types test --filter=@allonfire/database --filter=@allonfire/api --filter=@allonfire/laura`, `pnpm test:drift`.
- [x] **Step 3: boundary proofs.** `git grep -n "markedBy" -- packages apps` prints nothing; `git grep -n "Favorite" packages/database/prisma/schema/auth.prisma` prints nothing; `git grep -in "laura" packages/database/src/features/auth` prints nothing; `git grep -n "Object\.\(keys\|values\|entries\)\|JSON\.\(parse\|stringify\)" packages/database/src/features/apps/laura apps/api/src/features/laura` prints nothing.
- [x] **Step 4:** `git status` lists only intended files (the owner's other uncommitted work stays); stamp this plan done (`/iso-write` does) and stop for the owner's review.

### Task 10: Back Office admin routes move under `/v1/back-office/`

**Files:** Modify `apps/api/src/shared/constants/api.ts`, `apps/api/src/app.ts`, `apps/api/src/index.ts` (if it names the paths), `apps/api/src/shared/tests/app-deps.ts`, `apps/api/src/features/{users,storage-usage,user-usage,docs}/tests/*`, `apps/api/src/client.test-d.ts`, `apps/api/README.md`; the Back Office callers `apps/back-office/src/features/users/{actions,utils}/*`, `apps/back-office/src/features/storage/utils/storage-overview-queries.ts`, its MSW handlers `apps/back-office/src/shared/tests/msw/handlers.ts`, its e2e; docs `docs/guides/{api,back-office,images}.md`, `packages/auth/README.md`. (`git grep -n "API.PATH.USERS\|API.PATH.STORAGE_USAGE\|API.PATH.USER_USAGE\|/v1/users\|/v1/storage\|/v1/user-usage" -- apps packages docs` finds every one.)

**Interfaces:** Produces `API.PATH.BACK_OFFICE = "/v1/back-office"` and the three mounts `API.PATH.USERS`, `API.PATH.STORAGE_USAGE`, `API.PATH.USER_USAGE` each under it (`${BACK_OFFICE}${USER.PATH.BASE}` and so on); no path inside a package changes. The typed client reads `client.v1["back-office"].users`, `.storage.overview`, `["user-usage"].overview`. `/v1/services`, `/v1/images`, `/v1/auth` and the probes do not move.

- [x] **Step 1: tests (red).** Change the API tests to the new paths built from `API.PATH.*` (users unit and integration tests, the two overview route tests): each answers as before at the new path, and the old path answers 404. `spec.test.ts`: `/openapi.json` lists the nine paths under `/v1/back-office/...` and none of the old `/v1/users`, `/v1/storage/overview`, `/v1/user-usage/overview`; `client.test-d.ts`: the new client path compiles and the old one carries `// @ts-expect-error`. Run `pnpm test:services && pnpm --filter @allonfire/api exec vitest run src/features/users src/features/storage-usage src/features/user-usage src/features/docs`: expected FAIL.
- [x] **Step 2: implement.** Add `API.PATH.BACK_OFFICE`, re-base the three mounts, then follow the type errors in `pnpm --filter @allonfire/back-office run check-types` to every caller; Back Office MSW handlers and tests build their URLs from the same constants.
- [x] **Step 3:** run Step 1's command (PASS), `pnpm --filter @allonfire/api test`, `pnpm --filter @allonfire/back-office test`, `pnpm --filter @allonfire/back-office test:browser`, then `pnpm test:services && pnpm e2e:run --filter=@allonfire/back-office` (Users, Home overviews and Images specs).
- [x] **Step 4:** docs (Task 8 does not repeat this; it writes only the Laura reads' first-use step in `api.md`): `api.md` cites ADR 0035 and states the three audiences (`/v1/<app>/` an App's own data, `/v1/back-office/` the admin console, plain `/v1` the capabilities several Apps use) and that a User's own account routes will be separate (`/v1/me`), never a "self or Admin" branch in the admin routes; `git grep -n "/v1/users\|/v1/storage/overview\|/v1/user-usage" -- docs apps packages` prints only the redirect-free new forms.

## Left to later work

- A Laura User editing their own copies, and any `displayName` or `settings` column: a changeset when Laura needs one.
- Moving Laura's `GameScore` under the Profile: decided, and done by Phase 6's changeset (its Task 1 carries the amendment), which also removes `User.gameScores`.
- A Profile route (`/v1/laura/profile`) when an App has Profile data to show or edit.
- A signed-in User's own account routes (`/v1/me`: name, avatar) when Users edit their own data; they reuse the User service functions with their own narrow bodies.

## Implementation Log
- Implemented: 2026-11-20T11:08:56Z
- Workspace: current-branch, feat/laura-p0-drop
- Committed: no, awaiting user review
- Deferred: Task 7 (Laura e2e specs need the Gallery and Favorites screens of P4 Tasks 8 to 15); the Laura half of Task 9's checkpoint follows with them.
- Ruling: Task 9 step 3's third grep (`laura` in `packages/database/src/features/auth`) has two older hits that name no Laura model (`ACCESS.APP_SETTINGS[App.LAURA]`, a comment about Laura scores); the rule it guards, no Laura table or Profile in the auth service, holds.
- Verified: database 32 files / 276 tests, api 58 / 389, core 82 / 487, laura 18 / 99, Back Office unit 59 / 317, Back Office e2e 638 passed, `static:lint`, `static:dupes` (0 clones), `static:knip`, `static:knip-production`, `static:i18n`, `test:drift` clean. Back Office browser run: 2 AddImageSkeleton height failures from another session's `add-image.tsx` edit, and one WebKit Users-table test that passes alone twice (load flake).
