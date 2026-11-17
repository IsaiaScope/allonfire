# Laura Phase 0: Drop Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roles are Admin and User only: no Viewer Membership, enum value, guard branch, form option, translation, test, Fixture or glossary entry is left, and the API can require a higher Role than an App's floor for one Section.

**Architecture:** A Liquibase changeset turns every Viewer Membership into a User one and rebuilds the `auth."Role"` enum without `VIEWER`; the Prisma enum, `ACCESS.ROLE_RANK` and `ACCESS.APP_SETTINGS` (Laura's floor becomes User) follow, so the compiler finds every other use. `canEnterApp` and `requireApp` gain an optional minimum Role (the API half of ADR 0032's "a Section can ask for a higher Role"), and the Back Office's Users form, columns, seal and translations lose the third Role.

**Tech Stack:** Liquibase (formatted SQL, run in Docker), Prisma 7 enums, zod 4, Hono guards, Vitest (unit, integration, browser), Playwright, next-intl JSON. No new dependency.

**Spec:** docs/superpowers/specs/2026-11-17-laura-rebuild-design.md (Phase 0)

## Global Constraints

- Tests first; a test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`; a constant's type comes from zod (`xSchema = z.enum(X)`, `type X = z.infer<typeof xSchema>`); a lookup table is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`, `localStorage`/`sessionStorage`: use core's helpers (`objectKeys`, `objectValues`, `parseJsonWith`, `stringifyJson`).
- Constants are one nested object per owner; a path or an error code is never a string literal, tests included (statuses and methods through core's `HTTP`).
- Database changes are Liquibase changesets (`pnpm db:changeset`), never `prisma db push` or `prisma migrate`; never edit an applied changeset.
- A package never imports an App. Files go in `src/{environment,shared,features}`.
- Tests read copy from its source (`EN`/`enT`, `translate()`), never retyped text; tests sign in as a Fixture (`FIXTURE.USER.<App>.<Role>`), never a retyped email.
- exFAT drive: macOS writes `._*` sidecars; a new tool that scans folders ignores `**/._*` (the grep gates below do).
- Do not commit (the owner commits by hand); do not edit `apps/laura` or `packages/auth-old` (decision below).
- Docs are plain English prose, no emoji, never the word "may" (use can / is allowed to / might).
- The working tree already holds the owner's uncommitted edits to `CONTEXT.md` (Gallery, Favorite, Memory game, App scaffolding) and ADRs 0032 and 0033: edit only the lines this plan names and keep those.

## Review Focus

1. **A Viewer lost or kept by the migration.** Every `VIEWER` Membership must end as `USER` with the Membership count unchanged, and the enum must hold exactly `ADMIN, USER` afterwards; the rollback must bring the value back (Task 1, `changelog.integration.test.ts`; `pnpm test:drift` checks Prisma and the changelog agree).
2. **A Section's minimum never lowers a door.** `canEnterApp(user, app, min)` with `min` under the App's floor must still refuse (Back Office User with `min = USER` is refused); with `min` above the floor it refuses a User and lets an Admin in (Task 2, `access.test.ts`; Task 5 through the whole chain).
3. **A Viewer value refused by every zod schema, not only the enum.** `roleSchema`, `registrationRoleSchema`, the User create/update/list schemas, the Back Office `roleChoiceSchema`, `accessUserFrom` (throws) and the Users `search` param (drops it) each reject or ignore it (Tasks 2, 4, 7: the `viewer-gone.test.ts` files).
4. **Strings the compiler cannot find.** Tests and JSON that spell the Role as text (`"VIEWER"`, `role:viewer`, the `Navigation.role` keys of both languages, Gooey/faceted/search-query samples) compile after the enum shrinks; the translations test and the final grep gate (Task 9) pin them.
5. **A Laura User is the floor.** `FIXTURE.USER.LAURA.USER` signs in, `requireApp(App.LAURA)` lets it through, the Role picker for Laura offers Admin and User only, and registration into Laura (when an App opens it) hands out `USER` (Tasks 2, 3, 4, 5, 7).

---

## Decisions this plan takes (correctable)

- **The API helper is one optional parameter, not a new guard.** `canEnterApp(user, app, min?: Role)` and `requireApp(app, min?: Role)`; the effective floor is the higher of the App's floor and `min`. Phase 1's Sections tuple field `minRole` is read by the proxy, the frame and the guard test, and calls `canEnterApp(user, app, section.minRole)`; Phase 1 names nothing new on the API side.
- **`hasRole`, `roleIn`, `hasRoleIn`, `entryRoles`, `canManageImage`, `isBackOfficeAdmin` keep their signatures.** With two Roles they still read `ACCESS.ROLE_RANK`; "rework" here means the table shrinks and `canEnterApp` gains `min`. `ROLE_RANK` stays `ADMIN: 300, USER: 200` (the steps of 100 are the room for a later Role).
- **Legacy code is left alone.** `apps/laura` is outside the pnpm workspace (`pnpm-workspace.yaml`), compares the Role as the string `"VIEWER"`, is neither type-checked nor tested, and Phase 3 empties its `src/` and Phase 7 deletes the rest; `packages/auth-old` is gitignored and untracked. Editing either is wasted work. The grep gate in Task 9 excludes them on purpose; `docs/superpowers/` history and ADR 0019's JSON-column example stay as written.
- **An unknown stored Role stays a 500, not a silent drop** (`accessUserFrom` keeps throwing): after the changeset no row holds `VIEWER`, and Production runs `backup` then `deploy` before Apps start (`deployment.md`), so no new build ever meets one.
- **The migration is not reversible for data.** Rolling `0008` back restores the enum value, never which Memberships were Viewers.

## File structure

Created:

- `packages/database/changelog/changesets/0008-drop-viewer-role.sql` (reconcile: `nextChangesetNumber` names the file; 0007 was the last when this was written) - the data move and the enum rebuild.
- `packages/database/src/features/auth/access/tests/viewer-gone.test.ts` - the schemas and `accessUserFrom` refuse a Viewer.
- `packages/auth/src/features/users/hono/tests/viewer-gone.test.ts` - the User routes' schemas and the Users `search` param refuse a Viewer.
- `apps/back-office/src/features/users/utils/tests/viewer-gone.test.ts` - the form's `roleChoiceSchema` refuses a Viewer.

Modified (grouped by task):

- Task 1: `packages/database/prisma/schema/auth.prisma`, `packages/database/liquibase/tests/changelog.integration.test.ts`.
- Task 2: `packages/database/src/features/auth/access/constants/access.ts`, `.../access.ts`, `.../tests/access.test.ts`, `.../tests/app-settings.test.ts`.
- Task 3: `packages/database/src/features/seed/fixtures/tests/users.test.ts`, `packages/database/src/features/auth/tests/{user,user-stats,avatar-owners}.integration.test.ts`.
- Task 4: `packages/auth/src/features/hono/guards/middleware/require-app.ts`, `.../tests/guards.test.ts`, `.../tests/guards.test-d.ts`, `packages/auth/src/features/users/hono/tests/edit.test.ts`, `packages/auth/src/features/server/tests/registration.integration.test.ts`.
- Task 5: `apps/api/src/features/auth/tests/{guards.test.ts,sign-in.integration.test.ts}`, `apps/api/src/features/docs/tests/spec.test.ts`.
- Task 6: `packages/storage/src/features/image/hono/tests/{access,read,recap}.test.ts`, `packages/core/src/features/search/tests/search-query.test.ts`, `packages/ui/src/features/data-table/tests/aof-faceted.test.tsx`, `packages/ui/src/features/form/gooey-nav/tests/aof-gooey-choice.test.tsx`.
- Task 7: `apps/back-office/src/features/navigation/constants/navigation.ts`, `.../users/components/{user-columns.tsx,user-form-parts.tsx}`, `.../i18n/translations/{en,it}.json`, `.../i18n/tests/translations.test.ts`, `.../users/components/tests/{edit-user,users-table}.browser.test.tsx`, `.../images/utils/tests/administered-apps.test.ts`, `apps/back-office/e2e/{users,sign-in}.spec.ts`.
- Task 8: `CONTEXT.md`, `docs/adr/0019-roles-are-per-app-memberships.md`, `docs/guides/{laura,database}.md`, `packages/database/README.md`, `packages/auth/README.md`, `packages/design/src/apps/back-office/PRODUCT.md`, `README.md`.

Deleted: nothing. (`packages/database/generated/` is gitignored and rebuilt by `pnpm db:generate`.)

## Which tests need a database, and how this repo runs them

- **Unit** (`// @module-tag unit`) needs nothing: `pnpm --filter <pkg> exec vitest run <file> --tags-filter=unit`, or the root `pnpm test:unit`. The unit files here: `access.test.ts`, `app-settings.test.ts`, `viewer-gone.test.ts` (three), `users.test.ts` (Fixtures), `guards.test.ts` (auth and API), `edit.test.ts`, `create`-style route tests, `spec.test.ts`, storage `*.test.ts`, `search-query.test.ts`, ui `aof-*.test.tsx`, Back Office unit tests.
- **Integration** (`// @module-tag integration`, named `*.integration.test.ts`) needs the Test services: Docker running, then `pnpm test:services` (database, Redis, storage, image server, cdn). A Vitest `globalSetup` clones a Test database per package per run from the template (`allonfire_test_template_<epoch>_<fingerprint>`: `changelog/`, `liquibase/` and `src/features/seed/` are hashed, so the new changeset and the changed Fixtures build a new template on the next run) and drops the clone at the end; no test touches the Local database. Liquibase itself runs only in Docker (the `db-migrate` image). Integration files here: `changelog.integration.test.ts` (Task 1, builds throwaway databases itself), `user.integration.test.ts`, `user-stats.integration.test.ts`, `avatar-owners.integration.test.ts` (Task 3), `registration.integration.test.ts` (Task 4), `sign-in.integration.test.ts` and `users.integration.test.ts` (Task 5).
- **Browser** (`*.browser.test.tsx`, tagged `integration`, Chromium and WebKit, MSW answering the API): `pnpm --filter @allonfire/back-office run test:browser` (Task 7).
- **e2e** (Playwright, the App's production build plus the API): `pnpm test:services` then `pnpm e2e:run --filter=@allonfire/back-office` (Task 7, and again at the checkpoint).
- One file: `pnpm --filter <pkg> exec vitest run <path>` (packages whose config sets `globalSetup` build the Test database for it unless `--tags-filter=unit` is added). Whole package: `pnpm --filter <pkg> test`. `pnpm test:drift` checks the changelog against `prisma/schema` on the Test template.
- Type checking is not part of `vitest run` except `*.test-d.ts`; from Task 2 on the generated enum has no `VIEWER`, so `check-types` is red until Task 7 and green again at the checkpoint (Task 9). Run each task's own tests, not `check-types`, until then.

---

### Task 1: The changeset and the Prisma enum

**Files:**
- Modify: `packages/database/prisma/schema/auth.prisma` (enum `Role`: delete `VIEWER`)
- Create: `packages/database/changelog/changesets/0008-drop-viewer-role.sql` (via `pnpm db:changeset`, then hand-edited)
- Test: `packages/database/liquibase/tests/changelog.integration.test.ts` (integration; reconcile: re-read it, line numbers move)

**Interfaces:**
- Consumes: `liquibase(url, "update" | "rollback-count", ...args)`, `throwawayName`, `throwawayUrl`, `recreateDatabase`, `clientFor`, `dropDatabase`, `tablesIn` (the file's own helpers); `CHANGESET.DIR`, `PATTERN.CHANGESET.FILE`.
- Produces: `auth."Role"` = `('ADMIN', 'USER')`; changeset id `0008-drop-viewer-role`; Prisma `enum Role { ADMIN USER }`.

- [ ] Step 1: write the failing tests in `changelog.integration.test.ts`. Add the helper and constants, then four changes:

```ts
const ROLES_NOW = ["ADMIN", "USER"];
const LAURA_MEMBER = "laura-member";
const DROP_VIEWER_FILE = "0008-drop-viewer-role.sql";
/** Every changeset from the one that drops Viewer on, so the test survives later ones. */
const CHANGESETS_FROM_DROP_VIEWER = readdirSync(CHANGESET.DIR).filter(
  (file) => PATTERN.CHANGESET.FILE.test(file) && file >= DROP_VIEWER_FILE
).length;

const rolesOf = async (client: PrismaClient) =>
  (
    await client.$queryRaw<{ role: string }[]>`
      SELECT unnest(enum_range(NULL::auth."Role"))::TEXT AS role
    `
  ).map(({ role }) => role);
```

  1. In "changelog on an empty database": `it("holds Admin and User as the only Roles", async () => { expect(await rolesOf(client)).toEqual(ROLES_NOW); })`.
  2. In "a database that already has the tables": the baseline row `LAURA_VIEWER` (Role `VIEWER`, Allowed apps `laura, social`) now ends as a User Membership, none lost: in the existing test "turns each User's Allowed apps and Role into Memberships" change the last expected row to `{ app: "laura", role: "USER", userId: LAURA_VIEWER }` (the whole `toEqual` keeps its three rows, which pins that no Membership was dropped), update its comment to say `0008` turns the Viewer into a User, and add `it("leaves the Role enum with Admin and User", ...)` with `rolesOf`.
  3. In "rolling back the schema move": insert the Membership with `'USER'` (a `VIEWER` is no longer storable), rename its user to `LAURA_MEMBER`, and expect `{ allowedApps: ["laura"], id: LAURA_MEMBER, role: "USER" }`; `NO_MEMBERSHIP` still ends `role: "VIEWER"` (0002's rollback writes it, which only works because 0008's rollback restored the value first).
  4. A new `describe("rolling back the Viewer drop", ...)` on its own throwaway database (`changelog_roles`): `liquibase(url, "update")`; `expect(await rolesOf(client)).toEqual(ROLES_NOW)`; `liquibase(url, "rollback-count", \`--count=${CHANGESETS_FROM_DROP_VIEWER}\`)`; `expect(await rolesOf(client)).toEqual([...ROLES_NOW, "VIEWER"])`; `liquibase(url, "update")`; `expect(await rolesOf(client)).toEqual(ROLES_NOW)`. Give each step `TEST_DATABASE.DOCKER_TIMEOUT_MS` like its neighbours.
- [ ] Step 2: run it, expected FAIL (the enum still holds `VIEWER`, the existing-database row stays `VIEWER`): `pnpm test:services && pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`
- [ ] Step 3: implement. Edit `auth.prisma` (delete the `VIEWER` line of `enum Role`), then `pnpm db:changeset drop-viewer-role` (it brings the Local database to head and drafts the SQL; reconcile: if Local holds a stale schema, `pnpm db:update` first). Prisma drafts the enum swap but not the data move and wraps it in `BEGIN`/`COMMIT` with a warning comment. Hand-edit the file to exactly this shape (Liquibase already wraps a changeset in a transaction; keep the Prisma statement order only if its draft differs in nothing else):

```sql
--liquibase formatted sql logicalFilePath:changesets/0008-drop-viewer-role.sql

--changeset isaia:0008-drop-viewer-role
--comment: ADR 0032: Roles are Admin and User. Every Viewer Membership becomes a User one, then the value leaves the enum (Postgres cannot drop one, so the type is rebuilt). Rolling back restores the value, not which Memberships held it.
UPDATE "auth"."Membership" SET "role" = 'USER' WHERE "role" = 'VIEWER';
CREATE TYPE "auth"."Role_new" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "auth"."Membership" ALTER COLUMN "role" TYPE "auth"."Role_new" USING ("role"::TEXT::"auth"."Role_new");
ALTER TYPE "auth"."Role" RENAME TO "Role_old";
ALTER TYPE "auth"."Role_new" RENAME TO "Role";
DROP TYPE "auth"."Role_old";
--rollback CREATE TYPE "auth"."Role_new" AS ENUM ('ADMIN', 'USER', 'VIEWER');
--rollback ALTER TABLE "auth"."Membership" ALTER COLUMN "role" TYPE "auth"."Role_new" USING ("role"::TEXT::"auth"."Role_new");
--rollback ALTER TYPE "auth"."Role" RENAME TO "Role_old";
--rollback ALTER TYPE "auth"."Role_new" RENAME TO "Role";
--rollback DROP TYPE "auth"."Role_old";
```

  Then `pnpm db:update` (Local gets it; it holds only the real Admin, so no row changes).
- [ ] Step 4: run, expected PASS: `pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`, then `pnpm test:drift` (expected `No difference detected.`) and `pnpm static:migrate-image` is unaffected (no Dockerfile change).

### Task 2: Access rules: the rank table, Laura's floor, `canEnterApp(user, app, min?)`

**Files:**
- Modify: `packages/database/src/features/auth/access/constants/access.ts` (`ROLE_RANK` loses `VIEWER`; `APP_SETTINGS[App.LAURA].minRole` becomes `Role.USER`), `packages/database/src/features/auth/access/access.ts` (`canEnterApp`)
- Test: `packages/database/src/features/auth/access/tests/access.test.ts`, `.../tests/app-settings.test.ts`, create `.../tests/viewer-gone.test.ts` (all unit)

**Interfaces:**
- Consumes: Prisma enums regenerated by `pnpm db:generate` (Step 0 below; `generated/` is gitignored).
- Produces: `ACCESS.ROLE_RANK` = `{ ADMIN: 300, USER: 200 }`; `ACCESS.APP_SETTINGS[App.LAURA]` = `{ indexing: UNINDEXED, minRole: Role.USER, registration: null }`; `canEnterApp(user: AccessUser, app: App, min?: Role): boolean` (effective floor = the higher of the App's `minRole` and `min`); `registrationRoleSchema.options` = `[Role.USER]`; `entryRoles(App.LAURA)` = `[Role.ADMIN, Role.USER]`.

- [ ] Step 0: `pnpm db:generate` so `generated/prisma/enums.ts` has no `VIEWER`.
- [ ] Step 1: write the failing tests.
  - `access.test.ts`: every `Role.VIEWER` becomes `Role.USER` (or `Role.ADMIN` where the test needs a Role above the floor); `hasRole` block becomes `hasRole(Role.ADMIN, Role.USER)` true, `hasRole(Role.USER, Role.USER)` true, `hasRole(Role.USER, Role.ADMIN)` false; the `roleIn` test reads `Role.USER`; `entryRoles(App.LAURA)` equals `[Role.ADMIN, Role.USER]`. Add:

```ts
describe("ACCESS.ROLE_RANK", () => {
  it("ranks exactly the Roles there are, Admin above User", () => {
    expect(objectKeys(ACCESS.ROLE_RANK)).toEqual(objectValues(Role));
    expect(ACCESS.ROLE_RANK[Role.ADMIN]).toBeGreaterThan(ACCESS.ROLE_RANK[Role.USER]);
  });
});

describe("Laura's floor", () => {
  it("is User: a User Membership enters Laura, no Membership does not", () => {
    expect(ACCESS.APP_SETTINGS[App.LAURA].minRole).toBe(Role.USER);
    expect(canEnterApp(member(App.LAURA, Role.USER), App.LAURA)).toBe(true);
    expect(canEnterApp(member(App.LAURA, Role.ADMIN), App.LAURA)).toBe(true);
    expect(canEnterApp({ memberships: [] }, App.LAURA)).toBe(false);
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

  - `app-settings.test.ts`: `expect(registrationRoleSchema.options).toEqual([Role.USER])`.
  - `viewer-gone.test.ts` (new; the file name is excluded from the Task 9 gate, which is why the string lives only here):

```ts
// @module-tag unit
const VIEWER = "VIEWER";

describe("the Viewer Role is gone", () => {
  it("is no enum value and no rank", () => {
    expect(objectValues(Role)).toEqual([Role.ADMIN, Role.USER]);
    expect(objectKeys(ACCESS.ROLE_RANK)).not.toContain(VIEWER);
  });

  it("is refused by roleSchema and registrationRoleSchema", () => {
    expect(roleSchema.safeParse(VIEWER).success).toBe(false);
    expect(registrationRoleSchema.safeParse(VIEWER).success).toBe(false);
  });

  it("is an unknown Role to accessUserFrom, which throws instead of guessing a rank", () => {
    expect(() =>
      accessUserFrom({ memberships: [{ app: App.LAURA, role: VIEWER }] })
    ).toThrow(`Unknown Role "${VIEWER}"`);
  });
});
```

- [ ] Step 2: run, expected FAIL (`canEnterApp` ignores a third argument, Laura's floor is still the removed Role so `ACCESS.APP_SETTINGS` fails to resolve a rank): `pnpm --filter @allonfire/database exec vitest run src/features/auth/access --tags-filter=unit`
- [ ] Step 3: implement. `ROLE_RANK`: delete the `VIEWER: 100` line (the `satisfies Record<Role, number>` then holds). `APP_SETTINGS[App.LAURA].minRole = Role.USER`. `canEnterApp(user, app, min?)`: `const floor = settings[app].minRole;` then `hasRoleIn(user, app, min !== undefined && hasRole(min, floor) ? min : floor)`; update the JSDoc to say a Section's Role can only raise the door (`CONTEXT.md`, Role). `registrationRoleSchema` needs no edit (`exclude([Role.ADMIN])`).
- [ ] Step 4: run, expected PASS: same command.

### Task 3: Fixtures and the database package's integration tests

**Files:**
- Modify: `packages/database/src/features/seed/fixtures/tests/users.test.ts` (unit), `packages/database/src/features/auth/tests/user.integration.test.ts`, `.../user-stats.integration.test.ts`, `.../avatar-owners.integration.test.ts` (integration). `fixtures/users.ts` needs no edit: it builds one User per App per `objectValues(Role)`, so `FIXTURE.USER.LAURA.VIEWER` and `laura-viewer@allonfire.test` disappear with the enum.

**Interfaces:**
- Consumes: `FIXTURE.USER.<APP>.<ROLE>`, regenerated `Role`.
- Produces: Fixtures `FIXTURE.USER.LAURA.USER` (`laura-user@allonfire.test`) and `FIXTURE.USER.BACK_OFFICE.USER` stay; `FIXTURE.USER.LAURA.VIEWER` and `FIXTURE.USER.BACK_OFFICE.VIEWER` no longer exist; the Test template's fingerprint changes (a rebuild on the next run, by design).

- [ ] Step 1: write the failing tests.
  - `users.test.ts`: the email test asserts `FIXTURE.USER.LAURA.USER.email` is `"laura-user@allonfire.test"`; add `it("has a User and an Admin per App and no other Role", () => { expect(objectKeys(FIXTURE.USER.LAURA)).toEqual([Role.ADMIN, Role.USER]); expect(objectKeys(FIXTURE.USER.BACK_OFFICE)).toEqual([Role.ADMIN, Role.USER]); })` (`objectKeys` from core).
  - `user.integration.test.ts`: `MIXED` holds `{ app: App.BACK_OFFICE, role: Role.USER }` instead of Viewer (a Back Office User sits under that App's floor, still storable); `not.toContain(FIXTURE.USER.LAURA.USER.email)` in "matches an App and a Role on one Membership"; "matches any of the Apps and any of the Roles asked for" asks `role: [Role.USER, Role.ADMIN]` with `text: MIXED_DOMAIN` (still `[MIXED.email]`) and `role: [Role.USER]` with `text: FIXTURES` expecting `arrayContaining([FIXTURE.USER.LAURA.USER.email])`; "accessUserById reads a User's access fresh" flips `Role.USER` to `Role.ADMIN` through `prisma.membership.update` and expects the Admin; "replaces the Memberships with the set given" uses `Role.USER` in the Back Office. Also reconcile: any `role` count that assumed three Roles (the list's `role` filter) is re-read.
  - `user-stats.integration.test.ts`: the helper's default `role: Role = Role.USER`; the test user named `"viewer"` becomes `"member"`.
  - `avatar-owners.integration.test.ts`: `role: Role.USER`.
- [ ] Step 2: run, expected FAIL against the old state is not meaningful for these (they cannot compile their `Role.VIEWER` cases once Task 2 ran); confirm instead that each file fails before the edits: `pnpm test:services && pnpm --filter @allonfire/database exec vitest run src/features/seed/fixtures src/features/auth/tests` (EXPECTED: failures on `Role.VIEWER` being `undefined`, a violated `memberships.role` enum in the database).
- [ ] Step 3: implement: the edits above (tests are the change); no production code.
- [ ] Step 4: run, expected PASS: same command, then `pnpm --filter @allonfire/database test` (the whole package, builds the new template on this run).

### Task 4: The Auth package: `requireApp(app, min?)`, the User routes, registration

**Files:**
- Modify: `packages/auth/src/features/hono/guards/middleware/require-app.ts`
- Test: `packages/auth/src/features/hono/guards/tests/guards.test.ts` (unit), `.../guards.test-d.ts` (type), `packages/auth/src/features/users/hono/tests/edit.test.ts` (unit), `packages/auth/src/features/server/tests/registration.integration.test.ts` (integration); create `packages/auth/src/features/users/hono/tests/viewer-gone.test.ts` (unit)

**Interfaces:**
- Consumes: `canEnterApp(user, app, min?)` (Task 2); `sessionFor`, `stubAuth`, `moduleTestHost`/`userHost`, `stubUserDeps`, `BACK_OFFICE_ADMIN`, `json`, `errorOf` (existing test helpers).
- Produces: `requireApp(app: App, min?: Role): MiddlewareHandler<SignedInEnv>` in `@allonfire/auth/features/hono/guards/middleware/require-app` (401 without a Session; 403 unless `canEnterApp(user, app, min)`); `requireApp(App.LAURA, Role.ADMIN)` is the guard of an Admin-only Section's routes (Laura's Upload, Phase 5).

- [ ] Step 1: write the failing tests.
  - `guards.test.ts`, `requireApp`: the floor test lets in `Role.USER` and `Role.ADMIN` for Laura (replace `Role.VIEWER`); add

```ts
it("with a Role above the floor, lets in only that Role: an Admin-only Section", async () => {
  const guard = requireApp(App.LAURA, Role.ADMIN);
  const laura = (role: Role) =>
    sessionFor({ memberships: [{ app: App.LAURA, role }] });
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

  - `guards.test-d.ts`: `// @ts-expect-error a minimum Role comes from the enum, not a free string` on `requireApp(App.LAURA, "ADMIN");` and `expectTypeOf(requireApp(App.LAURA, Role.ADMIN)).toEqualTypeOf(requireApp(App.LAURA));` (the guard's type does not change).
  - `edit.test.ts` ("lets you save yourself with that Membership unchanged"): the second Membership is `{ app: App.LAURA, role: Role.USER }`.
  - `registration.integration.test.ts`: the `open` table gives Laura `minRole: Role.USER, registration: Role.USER`; the three expected Memberships read `{ app: App.LAURA, role: Role.USER }`.
  - `viewer-gone.test.ts` (new, unit, `const VIEWER = "VIEWER"`): the schemas and routes refuse it.

```ts
const refused = { app: App.LAURA, role: VIEWER };
it("is refused in every schema that carries a Membership", () => {
  expect(userCreateRequestSchema.safeParse({ ...VALID, memberships: [refused] }).success).toBe(false);
  expect(userUpdateRequestSchema.safeParse({ memberships: [refused], version: VERSION }).success).toBe(false);
  expect(userBodySchema.safeParse({ ...LISTED_USER, memberships: [refused] }).success).toBe(false);
});
it("is refused by POST and PATCH with a 400, writing nothing", async () => { /* depsWith(): created and updates stay [] */ });
it("is dropped from a Users search: an old bookmarked `role:viewer` reads as no Role", () => {
  expect(USER.SEARCH.parse(`role:${VIEWER.toLowerCase()}`)).toEqual({ text: "" });
});
```

    (`VALID`, `LISTED_USER`, `VERSION`, the deps recorder: reuse what `create.test.ts` and `edit.test.ts` hold; a helper both files need moves to `stub-user-deps.ts`, per `testing.md`, instead of being copied. Reconcile: re-read both files for the exact helper names.)
- [ ] Step 2: run, expected FAIL (`requireApp` ignores `min`; the `// @ts-expect-error` is unused only once typed, so run the type test with `tsc` in Task 9): `pnpm test:services && pnpm --filter @allonfire/auth exec vitest run src/features/hono src/features/users src/features/server`
- [ ] Step 3: implement `requireApp = (app: App, min?: Role) => guard(({ user }) => canEnterApp(user, app, min))`; JSDoc: "`min` raises the door for one Section (ADR 0032): an Admin-only Section passes `Role.ADMIN`; it can never lower the App's floor". Import `Role` as a type.
- [ ] Step 4: run, expected PASS: same command; then `pnpm --filter @allonfire/auth run check-types` (covers `guards.test-d.ts`; this package has no other `VIEWER` left once the tests above changed).

### Task 5: The API: a Laura User, an Admin-only route, the OpenAPI document

**Files:**
- Modify: `apps/api/src/features/auth/tests/guards.test.ts` (unit), `apps/api/src/features/auth/tests/sign-in.integration.test.ts` (integration), `apps/api/src/features/docs/tests/spec.test.ts` (unit)
- No production code: the API has no Laura route yet (Phases 4 to 6 add them behind `requireApp(App.LAURA)` and `requireApp(App.LAURA, Role.ADMIN)`).

**Interfaces:**
- Consumes: `requireApp(app, min?)` (Task 4), `FIXTURE.USER.LAURA.USER`, `FIXTURE.USER.LAURA.ADMIN`, `FIXTURE.USER.BACK_OFFICE.USER`, `fullSpec()`, `specSchema`.
- Produces: nothing new; the OpenAPI `ListedUser.memberships[].role` enum is `["ADMIN", "USER"]`, pinned.

- [ ] Step 1: write the failing tests.
  - `guards.test.ts` ("renders 403 for a User the App does not let in"): the User is `{ app: App.LAURA, role: Role.USER }` (a Laura User, refused at the Back Office route).
  - `sign-in.integration.test.ts`: `const LAURA_USER = FIXTURE.USER.LAURA.USER;` replaces `LAURA_VIEWER` everywhere (session test expects `memberships: [{ app: App.LAURA, role: Role.USER }]`, titles read "a Laura User"); drop the `BACK_OFFICE.VIEWER` row of the sign-in table (the `BACK_OFFICE.USER` row stays: 403 `APP_FORBIDDEN`); mount a second route in `beforeEach`, `LAURA_ROUTE` behind `requireApp(App.LAURA)` and `LAURA_ADMIN_ROUTE` behind `requireApp(App.LAURA, Role.ADMIN)` (paths from `API.PATH.VERSION`, never literals), and add

```ts
it.each([
  { path: LAURA_ROUTE, status: HTTP.STATUS.OK, user: FIXTURE.USER.LAURA.USER },
  { path: LAURA_ADMIN_ROUTE, status: HTTP.STATUS.FORBIDDEN, user: FIXTURE.USER.LAURA.USER },
  { path: LAURA_ADMIN_ROUTE, status: HTTP.STATUS.OK, user: FIXTURE.USER.LAURA.ADMIN },
  { path: LAURA_ROUTE, status: HTTP.STATUS.FORBIDDEN, user: FIXTURE.USER.BACK_OFFICE.ADMIN },
])("$user.email at $path: $status", async ({ path, status, user }) => {
  const cookie = await cookieFor(app, user);
  expect((await app.request(path, { headers: { cookie } })).status).toBe(status);
});
```

  - `spec.test.ts`: a new test in "GET /openapi.json one User" (or beside the Model list test):

```ts
it("lists Admin and User as the only Roles a Membership holds", async () => {
  const { components } = await problemDocument(); // reconcile: or specSchema.parse(await fullSpec()), whichever exposes ListedUser
  const listed = z.object({ properties: z.object({ memberships: z.object({ items: z.looseObject({}) }) }) }).parse(components.schemas.ListedUser);
  // follow a $ref to the Role if the generator names it; assert the enum equals [Role.ADMIN, Role.USER]
});
```

    (Reconcile: run `GET /openapi.json` once to see whether `role` is inline or a `$ref`; assert the resolved `enum` is `objectValues(Role)`.)
- [ ] Step 2: run, expected FAIL (the old `LAURA.VIEWER` is gone; the Admin-only route test fails until Task 4 is in; the spec assertion fails only if the enum is still wrong, which it is not after Task 2, so it passes at once and is a pin, not a red test): `pnpm test:services && pnpm --filter @allonfire/api exec vitest run src/features/auth src/features/docs`
- [ ] Step 3: implement: the edits above (tests only).
- [ ] Step 4: run, expected PASS: same command; then `pnpm --filter @allonfire/api exec vitest run src/features/users` (the Users integration file reads `FIXTURE.USER.LAURA.USER` and `BACK_OFFICE.USER`, both still exist) and `pnpm --filter @allonfire/api test`.

### Task 6: Tests in other packages that spell the Role as text

**Files:**
- Modify: `packages/storage/src/features/image/hono/tests/access.test.ts`, `.../read.test.ts`, `.../recap.test.ts`, `packages/core/src/features/search/tests/search-query.test.ts`, `packages/ui/src/features/data-table/tests/aof-faceted.test.tsx`, `packages/ui/src/features/form/gooey-nav/tests/aof-gooey-choice.test.tsx` (all unit)

**Interfaces:** Consumes `Role.USER`, `Role.ADMIN`. Produces nothing.

- [ ] Step 1: edit (the failing state is the compile-time `Role.VIEWER` of the storage tests and the stale text samples; there is nothing new to assert):
  - storage `access.test.ts`: `lauraViewer` becomes `lauraUser` with `Role.USER` (both uses); `read.test.ts`: `lauraUser` session `Role.USER`; `recap.test.ts`: the doc comment says "Giulia is a Laura User", `giulia` holds `Role.USER`.
  - core `search-query.test.ts`: the table is a sample, not the Roles: `role: ["ADMIN", "USER", "OWNER"]`, and each `viewer`/`VIEWER` below becomes `owner`/`OWNER` (`role:owner,ADMIN,boss,admin` reads `["ADMIN", "OWNER"]`, and so on for the serialize and round-trip cases).
  - ui `aof-faceted.test.tsx`: the three-item list is `Admin`, `User`, `Owner` (`value: "owner"`), the helper type and both assertions follow.
  - ui `aof-gooey-choice.test.tsx` ("posts the option it shows when the value is not offered"): the stored value is `"ADMIN"` (the options offer only `none` and `USER`), the comment says "a Role the options do not offer".
- [ ] Step 2: run, expected FAIL before the edits for the storage files (an `undefined` Role fails the access checks): `pnpm --filter @allonfire/storage exec vitest run src/features/image/hono --tags-filter=unit`
- [ ] Step 3: implement: the edits above.
- [ ] Step 4: run, expected PASS: the command above, then `pnpm --filter @allonfire/core exec vitest run src/features/search`, `pnpm --filter @allonfire/ui exec vitest run src/features/data-table src/features/form/gooey-nav`.

### Task 7: The Back Office: Users form, columns, seal, translations

**Files:**
- Modify: `apps/back-office/src/features/navigation/constants/navigation.ts` (`ROLE_SEAL`: drop `[Role.VIEWER]: "閲覧"` and its comment), `apps/back-office/src/features/users/components/user-columns.tsx` (`ROLE_BADGE`: Admin `default`, User `secondary`; fix its comment), `apps/back-office/src/features/users/components/user-form-parts.tsx` (`ROLE_ICON` loses `[Role.VIEWER]: <IconEye />`, and the `IconEye` import), `apps/back-office/src/features/i18n/translations/en.json` and `it.json` (delete `Navigation.role.VIEWER`), `apps/back-office/src/features/users/components/edit-user-skeleton.tsx` (its `WRAPPING_ROLES = 3` rule says how tall a Role row is by the number of entry Roles: Laura went from 3 entry Roles, which wrap on a phone, to 2; see Step 3)
- Test: `apps/back-office/src/features/i18n/tests/translations.test.ts` (unit), create `apps/back-office/src/features/users/utils/tests/viewer-gone.test.ts` (unit), `.../users/components/tests/edit-user.browser.test.tsx`, `.../users-table.browser.test.tsx`, `.../edit-user-skeleton.browser.test.tsx` (browser, existing: it pins the skeleton to the real form at 900, 520 and 360 px), `.../images/utils/tests/administered-apps.test.ts` (unit), `apps/back-office/e2e/users.spec.ts`, `apps/back-office/e2e/sign-in.spec.ts` (e2e)

**Interfaces:**
- Consumes: `entryRoles(app)` (the picker's options: Laura `[ADMIN, USER]`, Back Office `[ADMIN]`), `roleChoiceSchema`, `USERS.NO_ROLE`, `EN`, `IT`.
- Produces: `Navigation.role` has exactly the Role keys in both languages; `roleChoiceSchema.options` = `[Role.ADMIN, Role.USER, USERS.NO_ROLE]`. Data checklist (`next-apps.md`): no page changes here (copy, a badge map and an icon map), so none of its six points is touched; the Users page's skeleton, hydration, Version and refresh are as they were.

- [ ] Step 1: write the failing tests.
  - `translations.test.ts`: `it("names every Role once, in both languages", () => { expect(objectKeys(EN.Navigation.role)).toEqual(objectValues(Role)); expect(objectKeys(IT.Navigation.role)).toEqual(objectValues(Role)); })` (`objectKeys`/`objectValues` from core; `Role` from `@allonfire/database/enums`).
  - `viewer-gone.test.ts` (new, `const VIEWER = "VIEWER"`): `roleChoiceSchema.safeParse(VIEWER).success` is `false`; `roleChoiceSchema.options` equals `[Role.ADMIN, Role.USER, USERS.NO_ROLE]`.
  - `edit-user.browser.test.tsx`: the User's Laura Membership is `Role.USER`; the opening test asserts the User button of the Laura row has `aria-current="page"`; add `it("offers Laura's Roles as Not a member, Admin and User, and the Back Office's as Not a member and Admin", ...)` counting `roleRow(app).getByRole("button")` (3 and 2) by their names from `EN.Navigation.role`/`FORM.noRole`. Reconcile: re-read the file for the render helper and the name of the "no role" label.
  - `users-table.browser.test.tsx` ("counts the values chosen on the Filter button..."): the search holds `role: [Role.ADMIN, Role.USER]`, so the Filter button counts `3` (one App, two Roles) and the Role facet shows its two values; the "past two" line is pinned by ui's `aof-faceted.test.tsx` (three values), so say so in the test's comment instead of reaching a count of three with Roles. Reconcile: re-read the test, rename it if it no longer says what it checks.
  - `administered-apps.test.ts`: the "Admin of nothing" user holds `{ app: App.LAURA, role: Role.USER }`.
  - `e2e/users.spec.ts` ("renames a User and changes their Laura Role"): click `EN.Navigation.role[Role.USER]` in the Laura row and expect the row to contain it. `e2e/sign-in.spec.ts`: drop `FIXTURE.USER.BACK_OFFICE.VIEWER` from the refused list.
- [ ] Step 2: run, expected FAIL (`Navigation.role.VIEWER` is still a key; the picker test fails on a stale Role): `pnpm --filter @allonfire/back-office exec vitest run src/features/i18n src/features/users/utils src/features/images/utils`
- [ ] Step 3: implement the production edits listed under Files (the compiler names the three lookup tables, since each is `satisfies Record<Role, ...>`). Then `edit-user-skeleton.browser.test.tsx` (reconcile: re-read the file, the skeleton arrived with the loading-screen work): a Role row with Not a member, Admin and User might fit one line at 360 px where the old four buttons wrapped. Run it; when it is red at the phone width, set `WRAPPING_ROLES` to the smallest entry-Role count that still wraps in the measured form, and when no Role row wraps any more, delete the constant, its `cn` branch and the `h-[85.6px]` literal instead of keeping them dead (the test, not a guess, decides); `it.json` and `en.json` keep their key order (Biome sorts them).
- [ ] Step 4: run, expected PASS: the Step 2 command; `pnpm --filter @allonfire/back-office run test:browser` (needs Playwright browsers); `pnpm static:i18n`; `pnpm --filter @allonfire/back-office run check-types`; then `pnpm test:services && pnpm e2e:run --filter=@allonfire/back-office` (the two specs above run in four projects).

### Task 8: Docs, glossary and pointers

**Files:**
- Modify: `CONTEXT.md` (the **Role** entry; delete the **Viewer** entry), `docs/adr/0019-roles-are-per-app-memberships.md` (one pointer line), `docs/guides/laura.md`, `docs/guides/database.md`, `packages/database/README.md`, `packages/auth/README.md`, `packages/design/src/apps/back-office/PRODUCT.md`, `README.md`
- Test: none (docs); the grep gate in Task 9 and `pnpm static:design` check them.

**Interfaces:** Consumes ADR 0032 (already written, read it again before editing). Produces the glossary words later phases use: **Role** (Admin or User), an App's floor, a Section's higher Role.

- [ ] Step 1: no test; list what each edit must make true (the gate in Task 9 is the check):
  - `CONTEXT.md` **Role**: "What a User is allowed to do inside one App: Admin or User. An Admin also changes what the App holds (its Users, its Images, its Favorites); a User reads and plays. Each App names the lowest Role it lets in (its floor, `ACCESS.APP_SETTINGS`), and a Section can ask for a higher one (Laura's Upload Section is Admin only), which the API enforces again. It belongs to a Membership, never to the User as a whole. The Role named User is always written as a Role (\"the User Role\"), never as the person." Keep its `_Avoid_: permission level, rank`. Delete the whole **Viewer** entry (its `_Avoid_` line too). The **Version** entry's "every Role they hold" stays.
  - `docs/adr/0019-roles-are-per-app-memberships.md`: add, under the title and before the first paragraph, `> Partly superseded by [ADR 0032](0032-roles-are-admin-and-user.md): Roles are Admin and User only; the Viewer Role is gone.` (the style of ADR 0014's and 0020's pointers). The JSON-column example `{ "laura": "VIEWER" }` stays: it is the history of an option not taken.
  - `docs/guides/laura.md`: replace the "viewer role system" phrase in the intro and the whole "### Viewer Role System" block (lines on `checkMutationAccess`, `useIsViewer`, "Viewers can browse") by a short "### Roles" block: the API has `requireApp(App.LAURA)` (User or Admin) and `requireApp(App.LAURA, Role.ADMIN)` for an Admin-only Section; this page describes the old app, which still branches on a `"VIEWER"` string until Phase 3 empties its `src/` and Phase 7 deletes it; in the routes list `/upload` reads "(Admin only)". Reconcile: the owner's Phase 3 and 7 plans rewrite this guide again; keep the edit small.
  - `docs/guides/database.md` (the long "Services import per file" bullet): `Role.VIEWER` becomes `Role.ADMIN` in the enum example; `canEnterApp(user, app)` reads `canEnterApp(user, app, min?)` ("a Membership in the App whose Role reaches its floor, and `min` when a Section asks for more; `min` never lowers the floor"); one clause: Roles are Admin and User (ADR 0032). `packages/database/README.md` line on `canEnterApp(user, app)` the same, and fix its stale `./constants/{schemas,roles}` to `./constants/{schemas,access,app-settings}`.
  - `packages/auth/README.md`: `(\`Role.VIEWER\`, \`App.LAURA\`)` becomes `(\`Role.ADMIN\`, \`App.LAURA\`)`; the `requireApp(app)` row becomes `requireApp(app, min?)`, adding "`min` raises the door for one Section (`requireApp(App.LAURA, Role.ADMIN)`)"; the usage example under it adds one Admin-only route line.
  - `packages/design/src/apps/back-office/PRODUCT.md`: "a Role in each (Admin or User)" and the terminology list loses `Viewer`. Then `pnpm design:sync` (the App copy of PRODUCT.md is gitignored) and `pnpm static:design`.
  - `README.md` line 132: `remove \`DATABASE_SEED_MODE\` and the old \`DATABASE_SEED_LAURA_*\` variables from an older \`.env\``.
- [ ] Step 2: run the gate, expected FAIL before the edits (prints the lines above): the command in Task 9 step 2.
- [ ] Step 3: implement the edits.
- [ ] Step 4: run the gate, expected no output for the docs files; `pnpm static:design` exits 0.

### Task 9: Review checkpoint

**Files:** none new. Every file above.

- [ ] Step 1: `pnpm db:generate` (if not run since Task 2), `pnpm static:fix` (Biome fixes, Tailwind canonical classes), then `pnpm static:lint`.
- [ ] Step 2: the Viewer gate, expected to print nothing (the exclusions are the changelog, the migration test, the three `viewer-gone` tests, the legacy Laura and `auth-old`, and history in `docs/superpowers` and ADRs 0019 and 0032):

```
git grep -nP 'VIEWER|\bViewers?\b|[-_@]viewer|viewer[-_@]|"viewer"|:viewer|Visualizzatore|閲覧' -- . ':!docs/superpowers' ':!apps/laura' ':!packages/auth-old' ':!docs/adr/0019*' ':!docs/adr/0032*' ':!packages/database/changelog' ':!packages/database/liquibase/tests' ':!*viewer-gone*'
```

  Lowercase `viewer` meaning the person looking (`the viewer's theme`, `per viewer`, `a viewer filters on`) is not a Role and stays; the pattern does not match it.
- [ ] Step 3: `pnpm static:dupes`, `pnpm static:knip`, `pnpm static:knip-production`, `pnpm static:i18n`, `pnpm static:design`, `pnpm static:types`.
- [ ] Step 4: `pnpm test:services`, then `pnpm turbo run check-types test --filter=@allonfire/database --filter=@allonfire/auth --filter=@allonfire/api --filter=@allonfire/storage --filter=@allonfire/core --filter=@allonfire/ui --filter=@allonfire/design --filter=@allonfire/back-office`, then `pnpm test:drift`.
- [ ] Step 5: `pnpm e2e:browser --filter=@allonfire/back-office` and `pnpm e2e:run --filter=@allonfire/back-office` (the Users and sign-in specs). Docs touched: `CONTEXT.md`, ADR 0019, `docs/guides/{laura,database}.md`, `packages/{database,auth}/README.md`, `packages/design/.../PRODUCT.md`, `README.md`.
- [ ] Step 6: stamp this plan done (`/iso-write` does it) and stop: the owner reviews every change and commits by hand, one branch and PR to `dev` for the phase (spec: branches).
