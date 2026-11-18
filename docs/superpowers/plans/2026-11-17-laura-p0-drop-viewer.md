# Laura Phase 0: Drop Viewer from Laura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Laura has two Roles, Admin and User: its floor is User, every existing Laura Viewer Membership is a User one, and no Laura code, Role picker option or copy branches on Viewer. The Viewer Role itself stays in the system (enum, rank table, glossary, translations, Fixtures); no App admits it today (the Back Office admits Admins only). The API can require a higher Role than an App's floor for one Section.

**Status:** implemented (uncommitted) @ 2026-11-18T09:17:39+01:00

**Architecture:** A data-only Liquibase changeset turns Laura's Viewer Memberships into User ones (the enum is not touched); `ACCESS.APP_SETTINGS[App.LAURA].minRole` becomes User, so `entryRoles(App.LAURA)` is Admin and User and the Back Office Role picker follows without an edit. `canEnterApp` and `requireApp` gain an optional minimum Role (the API half of ADR 0032's "a Section can ask for a higher Role"). The tests that let a Viewer into Laura move to User, and a few pins say a Viewer is refused everywhere.

**Tech Stack:** Liquibase (formatted SQL, run in Docker), Prisma 7 enums, zod 4, Hono guards, Vitest (unit, integration, browser), Playwright, next-intl JSON. No new dependency.

**Spec:** docs/superpowers/specs/2026-11-17-laura-rebuild-design.md (Phase 0)

**Owner decision (2026-11-18, replaces the first draft):** the Viewer Role stays in the application; inside Laura only Admin and User exist, and the Back Office has Admins only. The first draft of this plan dropped the enum value; that is not built.

## Global Constraints

- Tests first; a test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`; a constant's type comes from zod (`xSchema = z.enum(X)`, `type X = z.infer<typeof xSchema>`); a lookup table is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`, `localStorage`/`sessionStorage`: use core's helpers (`objectKeys`, `objectValues`, `parseJsonWith`, `stringifyJson`).
- Constants are one nested object per owner; a path or an error code is never a string literal, tests included (statuses and methods through core's `HTTP`).
- Database changes are Liquibase changesets, never `prisma db push` or `prisma migrate`; never edit an applied changeset.
- A package never imports an App. Files go in `src/{environment,shared,features}`.
- Tests read copy from its source (`EN`/`enT`, `translate()`), never retyped text; tests sign in as a Fixture (`FIXTURE.USER.<App>.<Role>`), never a retyped email.
- exFAT drive: macOS writes `._*` sidecars; a new tool that scans folders ignores `**/._*`.
- Do not commit (the owner commits by hand); do not edit `apps/laura` or `packages/auth-old` (decision below).
- Docs are plain English prose, no emoji, never the word "may" (use can / is allowed to / might).
- The owner runs the dev server and its containers: do not stop them. Integration tests clone their own Test database; nothing here touches the Local database (the plan never runs `pnpm db:update`).

## Review Focus

1. **Only Laura's Viewers move.** The changeset must turn every `laura` Viewer Membership into `USER`, leave a Back Office Viewer Membership (and every other row) as it is, and leave the enum with `ADMIN, USER, VIEWER` (Task 1, `changelog.integration.test.ts`; `pnpm test:drift` checks Prisma and the changelog agree, since nothing in the schema changes).
2. **A Section's minimum never lowers a door.** `canEnterApp(user, app, min)` with `min` under the App's floor must still refuse (Back Office User with `min = USER` is refused); with `min` above the floor it refuses a User and lets an Admin in (Task 2, `access.test.ts`; Task 5 through the whole chain).
3. **No App admits a Viewer.** Laura's floor is User, the Back Office's is Admin: a Viewer enters nothing, sees no private Image, and its Laura Membership gets a 403 at a Laura route (Tasks 2, 4, 5, 6).
4. **A Laura User is the floor.** `FIXTURE.USER.LAURA.USER` signs in, `requireApp(App.LAURA)` lets it through, and the Role picker for Laura offers Admin and User only (Tasks 2, 5, 7).
5. **The Back Office's Role keys and Viewer styling stay.** `Navigation.role.VIEWER`, `ROLE_SEAL`, `ROLE_BADGE`, `ROLE_ICON` and the Role facet are untouched: a Viewer Membership stored in the database (an App that later admits it) still renders (Task 7).

---

## Decisions this plan takes (correctable)

- **The API helper is one optional parameter, not a new guard.** `canEnterApp(user, app, min?: Role)` and `requireApp(app, min?: Role)`; the effective floor is the higher of the App's floor and `min`. Phase 1's Sections tuple field `minRole` is read by the proxy, the frame and the guard test, and calls `canEnterApp(user, app, section.minRole)`; Phase 1 names nothing new on the API side.
- **`hasRole`, `roleIn`, `hasRoleIn`, `entryRoles`, `canManageImage`, `isBackOfficeAdmin` keep their signatures and `ROLE_RANK` stays `ADMIN: 300, USER: 200, VIEWER: 100`.** "Rework" here means Laura's floor moves and `canEnterApp` gains `min`.
- **`registrationRoleSchema` keeps `[USER, VIEWER]`.** Laura's registration is `null`; the schema belongs to the Role set, not to Laura.
- **The data move is Laura only and does not roll back.** `0008` updates `app = 'laura' AND role = 'VIEWER'`; its rollback is empty (a rollback never knows which Memberships were Viewers). No Prisma schema edit, so `db:generate` and `test:drift` are unaffected.
- **Legacy code is left alone.** `apps/laura` is outside the pnpm workspace (`pnpm-workspace.yaml`), compares the Role as the string `"VIEWER"`, is neither type-checked nor tested, and Phase 3 empties its `src/` and Phase 7 deletes the rest; `packages/auth-old` is gitignored and untracked. Editing either is wasted work. `docs/superpowers/` history and ADR 0019 stay as written.
- **An unknown stored Role stays a 500** (`accessUserFrom` keeps throwing); unchanged by this phase.

## File structure

Created:

- `packages/database/changelog/changesets/0008-laura-viewers-to-users.sql` (reconcile: `nextChangesetNumber` names the file; 0007 was the last when this was written): the data move.

Modified (grouped by task):

- Task 1: `packages/database/liquibase/tests/changelog.integration.test.ts`.
- Task 2: `packages/database/src/features/auth/access/constants/access.ts` (`APP_SETTINGS[App.LAURA].minRole`), `.../access.ts` (`canEnterApp`), `.../tests/access.test.ts`.
- Task 3: only what the run shows failing in `packages/database/src/features/auth/tests/*.integration.test.ts` and `.../seed/fixtures/tests/users.test.ts`.
- Task 4: `packages/auth/src/features/hono/guards/middleware/require-app.ts`, `.../tests/guards.test.ts`, `.../tests/guards.test-d.ts`.
- Task 5: `apps/api/src/features/auth/tests/{guards.test.ts,sign-in.integration.test.ts}`.
- Task 6: `packages/storage/src/features/image/hono/tests/{access,read,recap}.test.ts`.
- Task 7: the Back Office tests that put a Viewer in Laura or click its button: `.../users/components/tests/{edit-user,users-table}.browser.test.tsx`, `apps/back-office/e2e/users.spec.ts`, `.../users/components/edit-user-skeleton.tsx` and its browser test.
- Task 8: `CONTEXT.md` (already edited with ADR 0032), `docs/adr/0019-roles-are-per-app-memberships.md`, `docs/guides/{laura,database}.md`, `packages/database/README.md`, `packages/auth/README.md`.

Deleted: nothing. The `viewer-gone` test files of the first draft are not created.

## Which tests need a database, and how this repo runs them

- **Unit** (`// @module-tag unit`) needs nothing: `pnpm --filter <pkg> exec vitest run <file> --tags-filter=unit`, or the root `pnpm test:unit`.
- **Integration** (`// @module-tag integration`, named `*.integration.test.ts`) needs the Test services: Docker running, then `pnpm test:services` (database, Redis, storage, image server, cdn; the owner's containers, already up). A Vitest `globalSetup` clones a Test database per package per run from the template and drops the clone at the end; no test touches the Local database. Liquibase itself runs only in Docker (the `db-migrate` image).
- **Browser** (`*.browser.test.tsx`, Chromium and WebKit, MSW answering the API): `pnpm --filter @allonfire/back-office run test:browser` (Task 7).
- **e2e** (Playwright, the App's production build plus the API): `pnpm test:services` then `pnpm e2e:run --filter=@allonfire/back-office` (Task 7, and again at the checkpoint). It starts its own servers on the `*_E2E` ports; the owner's dev servers are not used.
- One file: `pnpm --filter <pkg> exec vitest run <path>`. Whole package: `pnpm --filter <pkg> test`. `pnpm test:drift` checks the changelog against `prisma/schema` on the Test template.

---

### Task 1: The data-only changeset

**Files:**
- Create: `packages/database/changelog/changesets/0008-laura-viewers-to-users.sql` (by hand: nothing in `prisma/schema` changes, so `pnpm db:changeset` has no diff to draft)
- Test: `packages/database/liquibase/tests/changelog.integration.test.ts` (integration; reconcile: re-read it, line numbers move)

**Interfaces:**
- Consumes: `liquibase(url, "update" | "rollback-count", ...args)`, `throwawayName`, `throwawayUrl`, `recreateDatabase`, `clientFor`, `dropDatabase` (the file's own helpers); `CHANGESET.DIR`, `PATTERN.CHANGESET.FILE`.
- Produces: changeset id `0008-laura-viewers-to-users`; `auth."Role"` unchanged (`ADMIN, USER, VIEWER`).

- [x] Step 1: write the failing tests in `changelog.integration.test.ts`:
  1. In "a database that already has the tables": the baseline row `LAURA_VIEWER` (Role `VIEWER`, Allowed apps `laura, social`) now ends as a User Membership, none lost: in the existing test "turns each User's Allowed apps and Role into Memberships" change the last expected row to `{ app: "laura", role: "USER", userId: LAURA_VIEWER }` (the whole `toEqual` keeps its three rows, which pins that no Membership was dropped) and add to its comment that `0008` turns Laura's Viewer into a User.
  2. A new `describe("moving Laura's Viewers to Users", ...)` on its own throwaway database (`changelog_viewers`), with a helper `rolesOf` (`SELECT unnest(enum_range(NULL::auth."Role"))::TEXT AS role`) and `CHANGESETS_FROM_LAURA_VIEWERS` (the count of changeset files at or after `0008-laura-viewers-to-users.sql`, so the test survives later ones): `liquibase(url, "update")`; `liquibase(url, "rollback-count", \`--count=${CHANGESETS_FROM_LAURA_VIEWERS}\`)` (the database is now before `0008`); insert three Users and three Memberships (a Laura Viewer, a Laura Admin and a Back Office Viewer; the constants `LAURA_VIEWER_MEMBER`, `LAURA_ADMIN_MEMBER`, `BACK_OFFICE_VIEWER_MEMBER`); `liquibase(url, "update")`; expect `{ app: "laura", role: "USER" }` for the first (the Viewer moved), `{ app: "laura", role: "ADMIN" }` for the second, `{ app: "back-office", role: "VIEWER" }` for the third (read ordered by `userId`), and `expect(await rolesOf(client)).toEqual(["ADMIN", "USER", "VIEWER"])`. Give the step `TEST_DATABASE.DOCKER_TIMEOUT_MS` like its neighbours. (A rollback to before `0008` is a no-op by design: that is what lets the test insert Viewers first.)
- [x] Step 2: run it, expected FAIL (the Laura Viewer stays `VIEWER`): `pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`
- [x] Step 3: implement. Create the file in the style of `0007-service-mail.sql`:

```sql
--liquibase formatted sql logicalFilePath:changesets/0008-laura-viewers-to-users.sql

--changeset isaia:0008-laura-viewers-to-users
--comment: ADR 0032: Laura admits no Viewer (its floor is User). Every Laura Viewer Membership becomes a User one; the Viewer Role and every other App's Memberships stay. A rollback cannot know which Memberships were Viewers, so it does nothing.
UPDATE "auth"."Membership" SET "role" = 'USER' WHERE "app" = 'laura' AND "role" = 'VIEWER';
--rollback empty
```

  Local is not updated here (the owner's dev server runs on it; `pnpm db:update` runs when the owner says).
- [x] Step 4: run, expected PASS: the Step 2 command, then `pnpm test:drift` (expected `No difference detected.`).

### Task 2: Access rules: Laura's floor, `canEnterApp(user, app, min?)`

**Files:**
- Modify: `packages/database/src/features/auth/access/constants/access.ts` (`APP_SETTINGS[App.LAURA].minRole` becomes `Role.USER`), `packages/database/src/features/auth/access/access.ts` (`canEnterApp`)
- Test: `packages/database/src/features/auth/access/tests/access.test.ts` (unit)

**Interfaces:**
- Produces: `ACCESS.APP_SETTINGS[App.LAURA]` = `{ indexing: UNINDEXED, minRole: Role.USER, registration: null }`; `canEnterApp(user: AccessUser, app: App, min?: Role): boolean` (effective floor = the higher of the App's `minRole` and `min`); `entryRoles(App.LAURA)` = `[Role.ADMIN, Role.USER]`; `ROLE_RANK` unchanged.

- [x] Step 1: write the failing tests in `access.test.ts`: every case that lets a Viewer into Laura moves to the User Role (`canEnterApp(member(App.LAURA, Role.VIEWER), App.LAURA)` true becomes `Role.USER`; the four `canSeeImage` cases and `enterableApps(member(App.LAURA, Role.VIEWER))` too); `entryRoles(App.LAURA)` equals `[Role.ADMIN, Role.USER]`; the `hasRole`, `roleIn`, `hasRoleIn`, `accessUserFrom` Viewer data cases stay (the Role exists). Add:

```ts
describe("Laura's floor", () => {
  it("is User: a User Membership enters Laura, no Membership does not", () => {
    expect(ACCESS.APP_SETTINGS[App.LAURA].minRole).toBe(Role.USER);
    expect(canEnterApp(member(App.LAURA, Role.USER), App.LAURA)).toBe(true);
    expect(canEnterApp(member(App.LAURA, Role.ADMIN), App.LAURA)).toBe(true);
    expect(canEnterApp({ memberships: [] }, App.LAURA)).toBe(false);
  });
});

describe("no App admits a Viewer", () => {
  it.each(objectValues(App))("a Viewer of %s does not enter it, see its private Images or count as enterable", (app) => {
    const viewer = member(app, Role.VIEWER);
    expect(canEnterApp(viewer, app)).toBe(false);
    expect(canSeeImage(viewer, { access: ImageAccess.PRIVATE, apps: [app] })).toBe(false);
    expect(enterableApps(viewer)).toEqual([]);
  });
});

describe("canEnterApp with a Section's Role", () => {
  it("asks more than the App's floor: Admin only", () => {
    expect(canEnterApp(member(App.LAURA, Role.USER), App.LAURA, Role.ADMIN)).toBe(false);
    expect(canEnterApp(member(App.LAURA, Role.ADMIN), App.LAURA, Role.ADMIN)).toBe(true);
    expect(canEnterApp(member(App.LAURA, Role.USER), App.LAURA, Role.USER)).toBe(true);
  });

  it("never asks less than the App's floor, and never lets in a stranger to the App", () => {
    expect(canEnterApp(member(App.BACK_OFFICE, Role.USER), App.BACK_OFFICE, Role.USER)).toBe(false);
    expect(canEnterApp(member(App.LAURA, Role.ADMIN), App.BACK_OFFICE, Role.USER)).toBe(false);
    expect(canEnterApp({ memberships: [] }, App.LAURA, Role.USER)).toBe(false);
  });
});
```

  `app-settings.test.ts` needs no edit (`registrationRoleSchema.options` stays `[Role.USER, Role.VIEWER]`).
- [x] Step 2: run, expected FAIL (Laura's floor is still Viewer; `canEnterApp` ignores a third argument): `pnpm --filter @allonfire/database exec vitest run src/features/auth/access --tags-filter=unit`
- [x] Step 3: implement. `APP_SETTINGS[App.LAURA].minRole = Role.USER`. `canEnterApp(user, app, min?)`: `const floor = settings[app].minRole;` then `hasRoleIn(user, app, min !== undefined && hasRole(min, floor) ? min : floor)`; update the JSDoc to say a Section's Role can only raise the door (`CONTEXT.md`, Role).
- [x] Step 4: run, expected PASS: same command.

### Task 3: Fixtures and the database package's integration tests

**Files:**
- Modify: only what fails in `packages/database/src/features/seed/fixtures/tests/users.test.ts`, `packages/database/src/features/auth/tests/{user,user-stats,avatar-owners}.integration.test.ts`. `fixtures/users.ts` needs no edit: it builds one User per App per Role, so `FIXTURE.USER.LAURA.VIEWER` and `FIXTURE.USER.BACK_OFFICE.VIEWER` stay as stored data.

**Interfaces:** Consumes `FIXTURE.USER.<APP>.<ROLE>`. Produces nothing; the Test template's fingerprint changes with the new changeset (a rebuild on the next run, by design).

- [x] Step 1: run the files before any edit: `pnpm --filter @allonfire/database exec vitest run src/features/seed/fixtures src/features/auth/tests`. These tests read and write Memberships, not doors, so most pass untouched.
- [x] Step 2: for each failure, decide with the test's own words: a test that needs a Viewer to enter Laura moves to `Role.USER`; a test that only stores a Viewer Membership stays. (Reconcile, run 2026-11-18: none failed, all 246 pass untouched, so no edit was needed.)
- [x] Step 3: edit those tests.
- [x] Step 4: run, expected PASS: same command, then `pnpm --filter @allonfire/database test` (the whole package, builds the new template on this run).

### Task 4: The Auth package: `requireApp(app, min?)`

**Files:**
- Modify: `packages/auth/src/features/hono/guards/middleware/require-app.ts`
- Test: `packages/auth/src/features/hono/guards/tests/guards.test.ts` (unit), `.../guards.test-d.ts` (type); the registration and Users route tests need an edit only if they fail (they inject their own settings and store Viewers as data)

**Interfaces:**
- Consumes: `canEnterApp(user, app, min?)` (Task 2); `sessionFor`, `stubAuth`, `status` (existing test helpers).
- Produces: `requireApp(app: App, min?: Role): MiddlewareHandler<SignedInEnv>` (401 without a Session; 403 unless `canEnterApp(user, app, min)`); `requireApp(App.LAURA, Role.ADMIN)` is the guard of an Admin-only Section's routes (Laura's Upload, Phase 5).

- [x] Step 1: write the failing tests.
  - `guards.test.ts`, `requireApp`: the floor test for Laura lets in `Role.USER` and `Role.ADMIN` and refuses `Role.VIEWER` with 403 (replace its Viewer pass); add

```ts
it("with a Role above the floor, lets in only that Role: an Admin-only Section", async () => {
  const guard = requireApp(App.LAURA, Role.ADMIN);
  const laura = (role: Role) => sessionFor({ memberships: [{ app: App.LAURA, role }] });
  expect(await status(laura(Role.USER), guard)).toBe(HTTP.STATUS.FORBIDDEN);
  expect(await status(laura(Role.ADMIN), guard)).toBe(HTTP.STATUS.OK);
  expect(await status(null, guard)).toBe(HTTP.STATUS.UNAUTHORIZED);
});

it("with a Role under the floor, still asks the floor", async () => {
  const guard = requireApp(App.BACK_OFFICE, Role.USER);
  expect(
    await status(sessionFor({ memberships: [{ app: App.BACK_OFFICE, role: Role.USER }] }), guard)
  ).toBe(HTTP.STATUS.FORBIDDEN);
});
```

  - `guards.test-d.ts`: `// @ts-expect-error a minimum Role comes from the enum, not a free string` on `requireApp(App.LAURA, "OWNER");` (the Role type is the enum's string union, so `"ADMIN"` itself is valid) and `expectTypeOf(requireApp(App.LAURA, Role.ADMIN)).toEqualTypeOf(requireApp(App.LAURA));` (the guard's type does not change).
- [x] Step 2: run, expected FAIL (`requireApp` ignores `min`; Laura's Viewer is now refused at the floor): `pnpm test:services && pnpm --filter @allonfire/auth exec vitest run src/features/hono src/features/users src/features/server`
- [x] Step 3: implement `requireApp = (app: App, min?: Role) => guard(({ user }) => canEnterApp(user, app, min))`; JSDoc: "`min` raises the door for one Section (ADR 0032): an Admin-only Section passes `Role.ADMIN`; it can never lower the App's floor". Import `Role` as a type.
- [x] Step 4: run, expected PASS: same command; then `pnpm --filter @allonfire/auth run check-types` (covers `guards.test-d.ts`). Fix any other test of the package that failed on a Viewer entering Laura. Reconcile, found 2026-11-18: `registration.integration.test.ts` registers into Laura with its own `open` table and then signs in against the real (`closed`) settings, so its Laura row must hand out `Role.USER` at floor `Role.USER` (a Viewer would be refused at Laura's new floor); its three expected Memberships read `Role.USER`.

### Task 5: The API: a Laura User, an Admin-only route

**Files:**
- Modify: `apps/api/src/features/auth/tests/guards.test.ts` (unit), `apps/api/src/features/auth/tests/sign-in.integration.test.ts` (integration)
- No production code: the API has no Laura route yet (Phases 4 to 6 add them behind `requireApp(App.LAURA)` and `requireApp(App.LAURA, Role.ADMIN)`).

**Interfaces:**
- Consumes: `requireApp(app, min?)` (Task 4), `FIXTURE.USER.LAURA.USER`, `FIXTURE.USER.LAURA.ADMIN`, `FIXTURE.USER.LAURA.VIEWER`, `FIXTURE.USER.BACK_OFFICE.ADMIN`.
- Produces: nothing new.

- [x] Step 1: write the failing tests.
  - `guards.test.ts` ("renders 403 for a User the App does not let in"): the Laura Membership at the Back Office route is a User (a Laura User, refused there).
  - `sign-in.integration.test.ts`: the Laura Viewer cases move to `FIXTURE.USER.LAURA.USER` where they assert entering (the session test's `memberships`, the join test's source, the titles); the table row of the Back Office Viewer stays refused. Mount two routes in `beforeEach`, `LAURA_ROUTE` behind `requireApp(App.LAURA)` and `LAURA_ADMIN_ROUTE` behind `requireApp(App.LAURA, Role.ADMIN)` (paths from `API.PATH.VERSION`, never literals), and add

```ts
it.each([
  { path: LAURA_ROUTE, status: HTTP.STATUS.OK, user: FIXTURE.USER.LAURA.USER },
  { path: LAURA_ROUTE, status: HTTP.STATUS.FORBIDDEN, user: FIXTURE.USER.LAURA.VIEWER },
  { path: LAURA_ADMIN_ROUTE, status: HTTP.STATUS.FORBIDDEN, user: FIXTURE.USER.LAURA.USER },
  { path: LAURA_ADMIN_ROUTE, status: HTTP.STATUS.OK, user: FIXTURE.USER.LAURA.ADMIN },
  { path: LAURA_ROUTE, status: HTTP.STATUS.FORBIDDEN, user: FIXTURE.USER.BACK_OFFICE.ADMIN },
])("$user.email at $path: $status", async ({ path, status, user }) => {
  const cookie = await cookieFor(app, user);
  expect((await app.request(path, { headers: { cookie } })).status).toBe(status);
});
```

- [x] Step 2: run, expected FAIL on the edits not yet made: `pnpm test:services && pnpm --filter @allonfire/api exec vitest run src/features/auth src/features/docs`
- [x] Step 3: implement: the edits above (tests only).
- [x] Step 4: run, expected PASS: same command; then `pnpm --filter @allonfire/api exec vitest run src/features/users` and `pnpm --filter @allonfire/api test`. The OpenAPI document needs no edit (the Role enum is unchanged).

### Task 6: Tests in other packages that put a Viewer in Laura

**Files:**
- Modify: `packages/storage/src/features/image/hono/tests/access.test.ts`, `.../read.test.ts`, `.../recap.test.ts` (all unit). `search-query.test.ts`, `aof-faceted.test.tsx` and `aof-gooey-choice.test.tsx` only spell the Role as sample text and stay as they are.

**Interfaces:** Consumes `Role.USER`. Produces nothing.

- [x] Step 1: edit (the failing state is a Laura Viewer reading a private Laura Image, which the new floor refuses): storage `access.test.ts`: `lauraViewer` becomes `lauraUser` with `Role.USER` (both uses); `read.test.ts`: the Laura session is `Role.USER`; `recap.test.ts`: the doc comment says "Giulia is a Laura User" and `giulia` holds `Role.USER`. In `access.test.ts` add one case: a Laura Viewer does not see a private Image in Laura (the floor).
- [x] Step 2: run, expected FAIL before the edits: `pnpm --filter @allonfire/storage exec vitest run src/features/image/hono --tags-filter=unit`
- [x] Step 3: implement: the edits above.
- [x] Step 4: run, expected PASS: the Step 2 command.

### Task 7: The Back Office: Laura's Role picker and skeleton

**Files:**
- Modify (production): `apps/back-office/src/features/users/components/edit-user-skeleton.tsx` (its `WRAPPING_ROLES = 3` rule says how tall a Role row is by the number of entry Roles: Laura went from 3 entry Roles, which wrap on a phone, to 2; see Step 3). Nothing else: `ROLE_SEAL`, `ROLE_BADGE`, `ROLE_ICON`, `Navigation.role.VIEWER` and `roleChoiceSchema` stay (a Viewer Membership stored in the database still renders).
- Test: `apps/back-office/src/features/users/components/tests/edit-user.browser.test.tsx`, `.../add-user.browser.test.tsx`, `.../users-table.browser.test.tsx`, `.../edit-user-skeleton.browser.test.tsx` (browser), `apps/back-office/e2e/users.spec.ts` (e2e)

**Interfaces:**
- Consumes: `entryRoles(app)` (the picker's options: Laura `[ADMIN, USER]`, Back Office `[ADMIN]`), `roleChoiceSchema`, `USERS.NO_ROLE`, `EN`. Data checklist (`next-apps.md`): no page changes here (a picker's options and one skeleton constant), so none of its six points is touched; the Users page's hydration, Version and refresh are as they were.
- Produces: the Laura row offers Not a member, Admin and User.

- [x] Step 1: write the failing tests.
  - `edit-user.browser.test.tsx`: the User's Laura Membership is `Role.USER`; the opening test asserts the User button of the Laura row has `aria-current="page"`; the Role-picker test already lives in `add-user.browser.test.tsx` ("shows a Role row per App, offering only Roles that reach its floor"): Laura's row now has 3 buttons, not 4, and no button is named `EN.Navigation.role[Role.VIEWER]` (found 2026-11-18: that file, not `edit-user`, holds the count; adding a test to `edit-user` also tripped Biome's 100-line limit on its `describe`).
  - `users-table.browser.test.tsx`: re-read the filter test that serializes a Viewer search; the Role facet lists the Roles that exist, so it stays unless the run shows otherwise.
  - `e2e/users.spec.ts` ("renames a User and changes their Laura Role"): click `EN.Navigation.role[Role.USER]` in the Laura row (a Viewer button no longer exists there) and expect the row to contain it.
- [x] Step 2: run, expected FAIL (the tests that click Viewer in Laura): `pnpm --filter @allonfire/back-office run test:browser` (needs Playwright browsers).
- [x] Step 3: implement. The picker needs no edit (it reads `entryRoles`). Run `edit-user-skeleton.browser.test.tsx` (reconcile: re-read the file, the skeleton arrived with the loading-screen work): a Role row with Not a member, Admin and User might fit one line at 360 px where the old four buttons wrapped. Result, 2026-11-18: no Role row wraps any more (Laura offers Not a member, Admin and User), so `WRAPPING_ROLES`, its `cn` branch and the `h-[85.6px]` literal were deleted and the skeleton test stays green. (The rule was: when it is red at the phone width, set `WRAPPING_ROLES` to the smallest entry-Role count that still wraps in the measured form, and when no Role row wraps any more, delete the constant, its `cn` branch and the `h-[85.6px]` literal instead of keeping them dead (the test, not a guess, decides).)
- [x] Step 4: run, expected PASS: `pnpm --filter @allonfire/back-office run test:browser`; `pnpm static:i18n`; `pnpm --filter @allonfire/back-office run check-types`; then `pnpm test:services && pnpm e2e:run --filter=@allonfire/back-office` (the Users and sign-in specs; sign-in refuses a Back Office Viewer as before). Run once, at the Task 9 checkpoint (Step 5), not twice.

### Task 8: Docs, glossary and pointers

**Files:**
- Modify: `CONTEXT.md` (the **Role** and **Viewer** entries: already reworded with ADR 0032), `docs/adr/0019-roles-are-per-app-memberships.md` (one pointer line), `docs/guides/laura.md`, `docs/guides/database.md`, `packages/database/README.md`, `packages/auth/README.md`
- Test: none (docs).

**Interfaces:** Consumes ADR 0032 (`docs/adr/0032-laura-admits-no-viewer.md`, already written, read it again before editing). Produces the glossary words later phases use: **Role**, an App's floor, a Section's higher Role.

- [x] Step 1: list what each edit must make true:
  - `docs/adr/0019-roles-are-per-app-memberships.md`: add, under the title and before the first paragraph, `> Partly superseded by [ADR 0032](0032-laura-admits-no-viewer.md): Laura's floor is User and its Viewers became Users; the Role set is unchanged.` (the style of ADR 0014's and 0020's pointers).
  - `docs/guides/laura.md`: replace the "viewer role system" phrase in the intro and the whole "### Viewer Role System" block (lines on `checkMutationAccess`, `useIsViewer`, "Viewers can browse") by a short "### Roles" block: Laura's floor is User (`ACCESS.APP_SETTINGS`); the API has `requireApp(App.LAURA)` (User or Admin) and `requireApp(App.LAURA, Role.ADMIN)` for an Admin-only Section; this page describes the old app, which still branches on a `"VIEWER"` string until Phase 3 empties its `src/` and Phase 7 deletes it; in the routes list `/upload` reads "(Admin only)". Reconcile: the Phase 3 and 7 plans rewrite this guide again; keep the edit small.
  - `docs/guides/database.md` (the long "Services import per file" bullet): the enum example reads `Role.ADMIN` (not `Role.VIEWER`, so the gate stays quiet); `canEnterApp(user, app)` reads `canEnterApp(user, app, min?)` ("a Membership in the App whose Role reaches its floor, and `min` when a Section asks for more; `min` never lowers the floor"). `packages/database/README.md`: the line on `canEnterApp(user, app)` the same, and fix its stale `./constants/{schemas,roles}` to `./constants/{schemas,access,app-settings}`.
  - `packages/auth/README.md`: the `requireApp(app)` row becomes `requireApp(app, min?)`, adding "`min` raises the door for one Section (`requireApp(App.LAURA, Role.ADMIN)`)"; the usage example under it adds one Admin-only route line.
- [x] Step 2: no test; read each file after the edit against the list.
- [x] Step 3: implement the edits. `packages/design/.../PRODUCT.md` and `README.md` need none (the Role set is unchanged).
- [x] Step 4: `pnpm static:design` exits 0.

### Task 9: Review checkpoint

**Files:** none new. Every file above.

- [x] Step 1: `pnpm static:fix` (Biome fixes, Tailwind canonical classes), then `pnpm static:lint`.
- [x] Step 2: the Laura-Viewer gate: every hit must be a test that pins a Viewer refused (Tasks 2, 4, 5, 6), a Fixture, the glossary, ADRs 0019 and 0032, the changelog and its test, or the legacy Laura and `auth-old`. A hit in production code, a Role picker or copy is a miss:

```
git grep -niE 'laura.{0,60}viewer|viewer.{0,60}laura' -- . ':!docs/superpowers' ':!apps/laura' ':!packages/auth-old' ':!docs/adr' ':!packages/database/changelog' ':!packages/database/liquibase/tests' ':!*.test.*' ':!*.spec.*' ':!CONTEXT.md'
```

  Expected to print only the `docs/guides/laura.md` lines that describe the legacy app and say so.
- [x] Step 3: `pnpm static:dupes`, `pnpm static:knip`, `pnpm static:knip-production`, `pnpm static:i18n`, `pnpm static:design`, `pnpm static:types`.
- [x] Step 4: `pnpm test:services`, then `pnpm turbo run check-types test --filter=@allonfire/database --filter=@allonfire/auth --filter=@allonfire/api --filter=@allonfire/storage --filter=@allonfire/core --filter=@allonfire/ui --filter=@allonfire/design --filter=@allonfire/back-office`, then `pnpm test:drift`.
- [x] Step 5: the Back Office browser suite (`pnpm --filter @allonfire/back-office run test:browser`, 122 files) and `pnpm e2e:run --filter=@allonfire/back-office` (638 passed) (the Users and sign-in specs). Docs touched: `CONTEXT.md`, ADR 0019, ADR 0032, `docs/guides/{laura,database}.md`, `packages/{database,auth}/README.md`.
- [x] Step 6: stamp this plan done (`/iso-write` does it) and stop: the owner reviews every change and commits by hand, one branch and PR to `dev` for the phase (spec: branches).

## Documentation checked

`AGENTS.md`; `docs/guides/{testing,conventions,database,api,next-apps}.md` (tests first, module tags, constants, Roles and access, the data checklist: no page changed, so none of its points applies); ADRs 0019 and 0032; `docs/guides/laura.md`. Findings that changed the code: Biome's 100-line limit on a `describe` (the Role-picker test moved to its own block); the `// @ts-expect-error` needs a value outside the Role string union (`"OWNER"`); `registration.integration.test.ts` signs in under the real settings after registering, so its Laura row hands out `Role.USER`.

## Implementation Log
- Implemented: 2026-11-18T09:17:39+01:00
- Workspace: fresh-branch: feat/laura-p0-drop (cut from dev)
- Committed: no, awaiting user review
- Owner decision mid-run (2026-11-18): Viewer stays a Role; plan, ADR 0032 (renamed `0032-laura-admits-no-viewer.md`), spec, `CONTEXT.md` and Phase 7 rewritten to match. The first draft's enum rebuild was built, then reverted before any other task ran.
- Not run: `pnpm db:update` on Local (the owner's dev server uses it): `0008` reaches Local when the owner runs it.
- Found, not ours: `pnpm static:types` fails in `packages/config` (`local/tests/root-scripts.test.ts:111`, `string | undefined`), a file another change in this working tree edits; `pnpm static:knip` and `static:knip-production` print one hint each (`tsx` in `knip.jsonc`, `reloadOnResume`'s `@internal` tag), also in files outside this plan.
