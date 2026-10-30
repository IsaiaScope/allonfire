# Edit a User Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Back Office's `users/[id]` placeholder into an edit form (name, Avatar, password, Role per App; never the email; never your own Back Office Role), backed by new `GET` and `PATCH /users/:id` routes in the User module.

**Status:** implemented (uncommitted) @ 2026-10-29T08:51:29Z

**Architecture:** The database service gains `readUser` and `updateUser` (one transaction: name, Memberships replaced, password with its `credential` Account, Sessions ended). The User module (`packages/auth`) mounts `GET`/`PATCH /:id` behind `canManageUsers` and refuses a caller's change to their own Membership in the Host's `manageApp`. The Back Office reads the User under `"use cache"` like `readUsers`, renders `EditUser` (an AOF form sharing Add a User's pieces) over an `editUser` server action that calls `PATCH`, then the Avatar routes, then `updateTag(USERS.CACHE.TAG)`.

**Tech Stack:** Prisma, Hono + hono-openapi + zod, Better Auth (`hashPassword` from `better-auth/crypto`), Next 16 (Cache Components, server actions), next-intl, TanStack Form via `useAOFForm`, Vitest (unit, integration, browser + MSW), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-28-edit-user-design.md`

## Global Constraints

- Never commit (the owner commits with `/iso-commit`); no commit steps below.
- Email never editable by anyone; no current-password field.
- Empty password pair = password kept; once either field holds text, Add a User's rules and the match check apply.
- New password: every Session of the User deleted, except the caller's current one when editing yourself.
- Role change: no Session touched.
- Every write to Users (add, edit, delete, Avatar) checks fresh that the caller's Session still exists, not only their Role: a Session deleted by a new password stops writing at once, despite the 5-minute cookie cache.
- Own Back Office Role: locked in the form, API answers 403 `CANNOT_CHANGE_OWN_ROLE`.
- Unknown id: page 404 (`notFound()`); `GET`/`PATCH` answer 404 `NOT_FOUND`.
- Save: back to the list with a "Saved" toast; Avatar refused: rest saved, warning toast, list opened (as Add a User).
- Last write wins; no conflict check.
- Repo rules: error codes never string literals (tests included), paths composed never literals, `objectFromEntries`/`objectValues` not `Object.*`, no `as` casts, no biome-ignore, classes via `cva` or inline `cn`, every test file starts `// @module-tag unit|integration`, a package never names an App (the Host passes `manageApp`).
- Every new string in both `en.json` and `it.json` (`pnpm i18n:check`); the API's `en.json`/`it.json` and `translation-values.ts` get `CANNOT_CHANGE_OWN_ROLE`.

## Review Focus

1. Saving your own page: the locked Back Office row still posts its value, so a name-only save keeps your Back Office Role instead of hitting 403. The row is locked with `inert` (never `disabled`: a disabled control posts nothing), and `AOFGooeyChoice`'s own hidden input keeps posting. Pinned in Task 6 (action) and Task 7 (browser test).
2. One password field filled, the other empty: a mismatch error, never "kept". Pinned in Task 6.
3. A name of only spaces: "name required", never saved blank. Pinned in Task 6.
4. Avatar removed, then a new one picked before Save: the new one is sent (`PUT`), not `DELETE`. Pinned in Task 4.
5. `PATCH` naming one App twice in `memberships`: 400, nothing changed. Pinned in Task 2.

---

### Task 1: Database: `readUser` and `updateUser`

**Files:**
- Modify: `packages/database/src/features/auth/user.service.ts`
- Test: `packages/database/src/features/auth/tests/user.integration.test.ts`

**Interfaces:**
- Produces:
  - `readUser(id: string): Promise<UserRecord | null>` (the list's `userRecord` select).
  - `type UserChange = { name?: string; memberships?: readonly AccessMembership[]; hashedPassword?: string }`
  - `updateUser(id: string, change: UserChange, options?: { keepSessionId?: string }): Promise<UserRecord | null>`: null for an unknown id, nothing written.

- [x] **Step 1: Write the failing tests** in a new `describe("readUser")` and `describe("updateUser")`:
  - `readUser` "reads one User with their Memberships" and "answers null for an unknown id".
  - `updateUser` "renames, leaving the rest" (name changed, Memberships and password hash unchanged).
  - "replaces the Memberships with the set given" (two in, one out: exactly the given set after).
  - "sets the password on the credential Account and ends every Session" (create 2 Sessions, then `hashedPassword`: Account `password` equals it, 0 Sessions).
  - "keeps the Session named in keepSessionId" (2 Sessions, keep one: exactly that one left).
  - "creates the credential Account for a User who has none" (User created with only a `google` Account: after, one `credential` Account with `accountId === id`).
  - "leaves Sessions alone without a password" (Memberships change, Sessions count unchanged).
  - "answers null and writes nothing for an unknown id".
- [x] **Step 2: Run** `pnpm --filter @allonfire/database test -- user.integration` (Docker up). Expected: FAIL, `readUser`/`updateUser` not exported.
- [x] **Step 3: Implement both in `user.service.ts`.** `updateUser` in one `prisma.$transaction`: `findUnique` (null out), `user.update` for `name`, `membership.deleteMany` + `createMany` when `memberships` given, when `hashedPassword` given `account.upsert` on the `credential` Account (find by `userId` + `providerId: "credential"`; there is no compound unique, so `findFirst` then `update`/`create`) and `session.deleteMany({ where: { userId: id, id: { not: keepSessionId } } })` (omit the `not` when no id), then read back with `userRecord`. Doc comments in the file's voice.
- [x] **Step 4: Run** the same command. Expected: PASS.

### Task 2: User module: `GET` and `PATCH /users/:id`

**Files:**
- Modify: `packages/auth/src/features/users/constants/users.ts` (`PATH.ONE: "/:id"`, `ERROR_CODE.CANNOT_CHANGE_OWN_ROLE`, `DOC.READ_*` and `DOC.UPDATE_*` texts)
- Modify: `packages/auth/src/features/users/hono/constants/schemas.ts`
- Modify: `packages/auth/src/features/users/hono/utils/deps.ts`
- Modify: `packages/auth/src/features/users/hono/routes/{routes,handlers,index}.ts`
- Modify: `packages/auth/src/features/users/hono/tests/stub-user-deps.ts` (`readUser` and `updateUser` as `unexpected(...)`, `manageApp: App.BACK_OFFICE`; every test and the API's `app-deps.ts` build deps through `stubUserDeps`, so nothing else changes)
- Create: `packages/auth/src/features/users/hono/tests/edit.test.ts`

**Interfaces:**
- Consumes: Task 1's `readUser`, `updateUser`, `UserChange`.
- Produces:
  - `UserDeps` gains `readUser: typeof readUser`, `updateUser: typeof updateUser`, `manageApp: App` ("the App whose Role lets a User change Users; nobody changes their own Role there").
  - `userUpdateRequestSchema = z.object({ name?: same as create, memberships?: same refine as create, password?: same as create })`, plus `.refine` that at least one key is present.
  - `GET /:id` 200 `userBodySchema`; `PATCH /:id` 200 `userBodySchema`. Both `canManage(deps)`, `validator("param", userIdParamSchema)`, 404 through the existing `userNotFound()`.
  - Router chain order: `.get(USER.PATH.ONE, …)` and `.patch(USER.PATH.ONE, …)` after `LIST`, before `AVATAR`.

- [x] **Step 1: Write the failing tests** in `edit.test.ts` (`describe("User module: GET one")`, `describe("User module: PATCH")`), using `testHost` and `stubUserDeps({...})`:
  - GET: 401 without a Session; 403 when `canManageUsers` refuses; 404 when `readUser` answers null (`code` `ERROR.CODE.NOT_FOUND`); 200 with the body and the Avatar run through `avatarLink`.
  - PATCH: 401; 403; 400 for `{}`; 400 for `memberships` naming one App twice (Review Focus 5), `updateUser` never called; 400 for a weak password; 404 when `updateUser` answers null.
  - "hashes a new password and keeps the caller's Session only when editing themselves": for another id `updateUser` gets `hashedPassword` (not the plain one) and `keepSessionId` undefined; for the caller's own id `keepSessionId === session.session.id`.
  - "refuses a change to your own Role in manageApp": the caller (Admin in `manageApp`) sends memberships without it: 403 `USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE`, `updateUser` never called.
  - "lets you save yourself with that Membership unchanged": the same Membership sent back, plus a new Role in another App: 200.
  - "lets you change another User's Role in manageApp": 200.
- [x] **Step 2: Run** `pnpm --filter @allonfire/auth test -- users/hono`. Expected: FAIL (routes 404, schema missing).
- [x] **Step 3: Implement.** The own-Role check compares the request's `manageApp` Membership with `readUser(callerId)`'s, and runs only when `id === caller` and `memberships` is given. The `describeRoute` specs in `routes.ts` follow the existing ones (`resolver(userBodySchema)`, `problemResponseRef` per status: GET 401/403/404, PATCH 400/401/403/404). Update the module's doc comment in `index.ts` ("listed, added, edited and deleted").
- [x] **Step 4: Run** the same command. Expected: PASS, and the existing create/delete/avatar/routes tests still pass.

### Task 3: API: wire the new deps, error code and docs

**Files:**
- Modify: `apps/api/src/features/users/user-deps.ts` (`readUser`, `updateUser`, `manageApp: App.BACK_OFFICE`, comment: the same App `isBackOfficeAdmin` checks)
- Modify: `apps/api/src/shared/constants/error.ts` (`[ERROR_CODE.CANNOT_CHANGE_OWN_ROLE]: HTTP.STATUS.FORBIDDEN`)
- Modify: `apps/api/src/features/i18n/translations/en.json`, `it.json`, `apps/api/src/features/i18n/translation-values.ts`
- Test: `apps/api/src/features/users/tests/users.integration.test.ts`, `apps/api/src/features/users/tests/user-deps.test.ts`

**Interfaces:**
- Consumes: Task 2's `UserDeps`, `USER.PATH.ONE`, `USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE`.
- Produces: `client[API.VERSION.CURRENT].users[":id"].$get` and `.$patch` typed through `ApiType`.

- [x] **Step 1: Write the failing tests** in `users.integration.test.ts`, `describe("PATCH /users/:id")`, signed in as `FIXTURE.USER.BACK_OFFICE.ADMIN`:
  - "renames a User and reads them back" (`GET` after `PATCH`: the new name).
  - "a new password signs the User in with it and ends their Sessions" (the User signed in once; after `PATCH` their Sessions are gone, `prisma.session.count({ where: { userId } })` is 0, and Sign in with the new password answers 200).
  - "answers a problem document 403 `CANNOT_CHANGE_OWN_ROLE` for your own Back Office Role" (`code` from `API.ERROR.CODE`, `detail` the English message).
  - `user-deps.test.ts`: `userDeps({ warn: () => undefined }).manageApp === App.BACK_OFFICE`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/api test -- users` and `pnpm --filter @allonfire/api check-types`. Expected: FAIL (`UserDeps` missing fields, untranslated code).
- [x] **Step 3: Implement** the wiring, the catalogue line and both translations ("You cannot change your own Role here" / Italian equivalent).
- [x] **Step 4: Run** the same, plus `pnpm --filter @allonfire/api test -- spec` (the OpenAPI document lists the two routes and `Problem403` holds the new code) and `pnpm i18n:check`. Expected: PASS.

### Task 3b: Writes check the caller's Session is still alive

Why: Better Auth serves a Session from its cookie cache for up to 5 minutes (`AUTH.SESSION.COOKIE_CACHE_MAX_AGE_S`), and `canManageUsers` reads only the caller's Role fresh. A stolen Admin cookie whose Sessions were just ended by a new password (Task 1) could still add, edit and delete Users for those minutes.

**Files:**
- Modify: `packages/database/src/features/auth/user.service.ts` (or a sibling `session.service.ts` if one exists)
- Modify: `packages/auth/src/features/users/hono/utils/deps.ts`, `hono/routes/handlers.ts` (`canManage`)
- Modify: `apps/api/src/features/users/user-deps.ts` (and its `isBackOfficeAdmin` comment: the fresh read now covers the Session too)
- Modify: `packages/auth/src/features/users/hono/tests/stub-user-deps.ts`, and the tests overriding `canManageUsers` with an argument (`delete.test.ts` reads `userId`; `create.test.ts`, `avatar.test.ts`, `edit.test.ts` ignore it)
- Test: `packages/database/src/features/auth/tests/user.integration.test.ts`, `apps/api/src/features/users/tests/users.integration.test.ts`, `packages/auth/src/features/users/hono/tests/routes.test.ts`

**Interfaces:**
- Produces:
  - `sessionAlive(id: string): Promise<boolean>`: a `Session` row with that id whose `expiresAt` is in the future.
  - `UserDeps.canManageUsers: (caller: { sessionId: string; userId: string }) => Promise<boolean>` (was `(userId: string)`); `canManage` passes `{ sessionId: session.session.id, userId: session.user.id }`.
  - The API's `canManageUsers` is `Promise.all([accessUserById(userId), sessionAlive(sessionId)])`: true only when both hold.

- [x] **Step 1: Write the failing tests:**
  - database: `describe("sessionAlive")` "true for a live Session", "false once deleted", "false once expired".
  - module (`routes.test.ts`): "asks the Host with the caller's Session and User ids" (a `canManageUsers` stub records its argument).
  - API integration: "a deleted Session stops writing at once" (sign in as an Admin Fixture, delete that Session row with `prisma.session.delete`, then `DELETE /users` with the same cookie: 403, nobody deleted); and the existing "canManageUsers is false for an unknown id" rewritten to the new argument.
- [x] **Step 2: Run** `pnpm --filter @allonfire/database test -- user.integration`, `pnpm --filter @allonfire/auth test -- users/hono`, `pnpm --filter @allonfire/api test -- users`. Expected: FAIL.
- [x] **Step 3: Implement** `sessionAlive`, the new `canManageUsers` shape, and update every stub.
- [x] **Step 4: Run** the same three commands plus `pnpm check-types`. Expected: PASS.
- [x] **Step 5:** in `docs/agents/api.md`, the Auth guards bullet says `canManageUsers` reads the caller's Role and Session fresh.

### Task 4: ui: `AOFAvatarField` shows the current picture and posts its removal

**Files:**
- Modify: `packages/ui/src/components/aof-avatar-field.tsx`
- Test: `packages/ui/src/components/tests/aof-avatar-field.test.tsx` (SSR, as it is: ui has no browser runner) and `apps/back-office/src/features/users/components/tests/avatar-field.browser.test.tsx` (the field's interactions live there)

**Interfaces:**
- Produces: `AOFAvatarFieldProps` gains `current?: string | null` (the picture the User already holds: drawn while no file is picked) and `removedName?: string` (the form name posted as `"true"` once that picture is removed; nothing posted otherwise). Field value stays `File | null`.

- [x] **Step 1: Write the failing tests:**
  - ui (SSR): "draws the current picture while no file is picked"; "without current, renders no removal input".
  - Back Office browser: "removing the current picture posts removedName and draws the empty drop area"; "a new picture after removing posts the file and no removal" (Review Focus 4).
- [x] **Step 2: Run** `pnpm --filter @allonfire/ui test -- aof-avatar-field` and `pnpm --filter @allonfire/back-office test:browser -- avatar-field`. Expected: FAIL.
- [x] **Step 3: Implement:** a local `removed` state, reset when a file is picked; `onRemove` offered when a file is held or `current` is shown; a hidden `<input name={removedName} value="true">` rendered only while `removed && !field.state.value`.
- [x] **Step 4: Run** the same commands, plus `pnpm --filter @allonfire/back-office test:browser -- add-user`. Expected: PASS (Add a User unchanged).

### Task 5: Back Office: share Add a User's form pieces

**Files:**
- Create: `apps/back-office/src/features/users/components/user-form-parts.tsx` (`RoleRows`, `UserFormActions`, `useAvatarLabels`, `ROLE_ICON`)
- Modify: `apps/back-office/src/features/users/components/add-user.tsx`
- Test: `apps/back-office/src/features/users/components/tests/add-user.browser.test.tsx` (unchanged, must stay green)

**Interfaces:**
- Produces:
  - `RoleRows({ form, locked }: { form: <the AOF form both forms build>; locked?: App | undefined })`: the `fieldset` of one `ChoiceField` per App. The `locked` App's row gets `inert` and `aria-disabled` (`AOFChoiceField` spreads div props onto `AOFGooeyChoice`'s radiogroup; no ui change), a faded look via inline `cn`, and the note `Users.edit.ownRoleLocked`; its hidden input keeps posting `roles.<app>` (Review Focus 1).
  - `UserFormActions({ pending, submit }: { pending: boolean; submit: { icon: ReactNode; kanji: string; label: string; pendingLabel: string } })`: Cancel back to the list plus the submit button, Add a User's markup.
  - `useAvatarLabels(): AOFAvatarFieldLabels`, unchanged.
  - Type the shared `form` prop with a generic over the field values that both forms satisfy (`roles: Record<App, RoleChoice>`), never a cast.

- [x] **Step 1: Move** the pieces; `AddUser` renders them. No behaviour change.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:browser -- add-user` and `pnpm --filter @allonfire/back-office check-types`. Expected: PASS.

### Task 6: Back Office: the edit schema and the `editUser` action

**Files:**
- Create: `apps/back-office/src/features/users/utils/edit-user-schema.ts`
- Create: `apps/back-office/src/features/users/actions/edit-user.ts`
- Modify: `apps/back-office/src/features/users/constants/users.ts` (`EDIT_ERROR: { FAILED: "failed", GONE: "gone", INVALID: "invalid", OWN_ROLE: "ownRole" }`, `EDIT_NOTICE: { AVATAR_FAILED: "avatarFailed", SAVED: "saved" }`, `SAVE_KANJI`)
- Modify: `apps/back-office/src/features/users/utils/add-user-schema.ts` (export what the edit schema reuses: `roleChoiceSchema`, `passwordChecks`, `membershipsOf`, the password rule)
- Test: `apps/back-office/src/features/users/utils/tests/edit-user-schema.test.ts`, `apps/back-office/src/features/users/actions/tests/edit-user.test.ts`

**Interfaces:**
- Produces:
  - `editUserSchema(messages?: EditUserFieldMessages)` over `{ avatar: File | null; avatarRemoved: boolean; name; password; confirmPassword; roles }`; `type EditUserValues = z.input<…>`, `type EditUserFields = Omit<EditUserValues, "avatar">`.
  - `editUser(locale: string, id: string, state: EditUserState, form: FormData): Promise<EditUserState>`, `type EditUserState = { error?: EditUserError; notice?: EditUserNotice; values?: EditUserFields }`; it posts the form's `avatarRemoved` name `"avatarRemoved"`.
  - Status mapping: 403 with `CANNOT_CHANGE_OWN_ROLE` gives `OWN_ROLE`; 404 gives `GONE`; other non-200 gives `FAILED`. On 200 the Avatar is `PUT` when a file is posted, else `DELETE` when `avatarRemoved`; `updateTag(USERS.CACHE.TAG)`; Avatar refused gives `notice: AVATAR_FAILED`; otherwise `notice: SAVED`. The action never redirects: the "Saved" toast needs the form, so `EditUser` toasts on either notice (success or warning) and then `router.replace(BACK_OFFICE.PAGE.USERS)`, the same shape as `useAddedWithoutPicture`. So `EDIT_NOTICE` is `{ AVATAR_FAILED: "avatarFailed", SAVED: "saved" }`.
  - The `PATCH` body: `name`, `memberships: membershipsOf(roles)`, `password` only when non-empty.

- [x] **Step 1: Write the failing schema tests:**
  - "keeps the password when both fields are empty" (success, password `""`).
  - "a password in one field only is a mismatch" (Review Focus 2: an issue on `confirmPassword`).
  - "a typed password follows Add a User's rules" (weak: issue on `password`).
  - "a name of spaces is required" (Review Focus 3).
- [x] **Step 2: Write the failing action tests** in `actions/tests/edit-user.test.ts` (no action has tests yet: `vi.mock` `@/features/api/utils/server-api` with a fake client and `next/cache`'s `updateTag`):
  - "sends no password when both fields are empty".
  - "sends the locked row's posted Role" (Review Focus 1: form data with `roles.back-office=ADMIN` from the hidden input gives a `memberships` entry for it).
  - "maps 403 own Role, 404 and 500 to OWN_ROLE, GONE, FAILED, keeping the values".
  - "on 200 removes the Avatar when posted removed, and answers SAVED after updateTag".
- [x] **Step 3: Run** `pnpm --filter @allonfire/back-office test -- edit-user`. Expected: FAIL.
- [x] **Step 4: Implement** schema and action after `add-user-schema.ts` and `add-user.ts`.
- [x] **Step 5: Run** the same command. Expected: PASS.

### Task 7: Back Office: the page, `readUser` and `EditUser`

**Files:**
- Create: `apps/back-office/src/features/users/utils/read-user.ts`
- Modify: `apps/back-office/src/features/users/utils/users-queries.ts` (`fetchUser(client, id)` with `parseResponse`)
- Create: `apps/back-office/src/features/users/components/edit-user.tsx`
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/users/[id]/page.tsx`
- Modify: `apps/back-office/src/features/i18n/translations/en.json`, `it.json` (`Users.edit.*`: `title` fallback, `email`, `submit`, `submitting`, `saved`, `ownRoleLocked`, `passwordHint` ("Leave empty to keep the current password"), `error.{failed,gone,invalid,ownRole}`; replace `Users.detail.description`/`title`, keep `Users.detail.page`)
- Modify: `apps/back-office/src/shared/tests/msw/handlers.ts` (`GET` and `PATCH /users/:id`)
- Test: `apps/back-office/src/features/users/components/tests/edit-user.browser.test.tsx`, `apps/back-office/src/features/users/utils/tests/read-user.test.ts`

**Interfaces:**
- Consumes: Tasks 4–6.
- Produces:
  - `readUser(sessionCookie: string, id: string): Promise<UserBody | null>`: `"use cache"`, `cacheTag(USERS.CACHE.TAG)`, `cacheLife(USERS.CACHE.LIFE)`; null on 404 (not cached as a throw), other refusals throw.
  - `EditUser({ user, selfId, manageApp }: { user: UserBody; selfId: string; manageApp: App })`: heading `user.name ?? user.email`, the email as read-only text (not an input), the avatar field with `current={user.image}` and `removedName="avatarRemoved"`, the name, the password pair with `passwordHint` and `PasswordRules` shown once typed, `RoleRows` with `locked={user.id === selfId ? manageApp : undefined}`, `FormAlert`, `UserFormActions` with Save. `manageApp` is `App.BACK_OFFICE` from the page (the App's own constant, never a package's).
  - The page: `generateMetadata` unchanged; `UserPage` renders `SectionPage width="form"` > `<Suspense fallback={<SectionLoading />}>` > an async part that awaits `params`, `readSessionCookie()`, `requireAppSession()`, `readUser(...)`, calls `notFound()` on null, and renders `<AOFFreshOnReturn><EditUser …/></AOFFreshOnReturn>`.

- [x] **Step 1: Write the failing browser tests** (MSW, `NextIntlClientProvider` with `en.json`, the action mocked as browser tests mock server actions):
  - "opens on the User: their name, the email read-only, their Roles chosen".
  - "on your own page the Back Office row is locked with its note and still posts its Role" (Review Focus 1).
  - "another User's page has no locked row".
  - "a SAVED answer toasts and opens the list".
  - "a GONE answer shows the alert".
- [x] **Step 2: Write the failing `read-user` test**: "answers null for a 404" with a stubbed fetch.
- [x] **Step 3: Run** `pnpm --filter @allonfire/back-office test:browser -- edit-user` and `pnpm --filter @allonfire/back-office test -- read-user`. Expected: FAIL.
- [x] **Step 4: Implement** the reader, the component, the page and the translations.
- [x] **Step 5: Run** the same commands, plus `pnpm i18n:check`. Expected: PASS.

### Task 8: e2e, docs, and the whole check

**Files:**
- Modify: `apps/back-office/e2e/users.spec.ts`
- Modify: `docs/agents/database.md` (the services line gains `readUser(id)` and `updateUser(id, change, { keepSessionId })`), `docs/agents/api.md` (the Auth guards bullet says the User module's `PATCH` reads the caller fresh and refuses your own Role in the Host's `manageApp`)

- [x] **Step 1: Add e2e tests** (signed in as `FIXTURE.USER.BACK_OFFICE.ADMIN`, a User added by the spec itself):
  - "renames a User and changes their Laura Role; the list shows both".
  - "a new password lets the User sign in with it".
  - "your own page saves your name and keeps your Back Office Role".
  - "an unknown id shows the 404".
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:e2e -- users`. Expected: PASS in all four projects.
- [x] **Step 3: Whole check:** `pnpm exec biome check --write` on the touched files, then `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm test:browser`, `pnpm --filter @allonfire/back-office tailwind:check`. Expected: all pass.
- [x] **Step 4: Look at it** in the owner's tab (`localhost:3400`, `/iso-browser`, no new window): another User's page and your own, phone 390 and desktop, light and dark; reset emulation after.

## Implementation Log
- Implemented: 2026-10-29T08:51:29Z
- Workspace: current-branch — feat/users-filters-avatars
- Committed: no — awaiting user review
- Deviations: `editUser(id, state, form)` takes no locale (it never redirects); no MSW handlers for `GET`/`PATCH /users/:id` (the browser tests mock the action, nothing asks the API); `SAVE_KANJI` is 済, already in the brush subset; the edit grid is `grid-cols-1` so a long email truncates on a phone (found by the mobile-chrome e2e, pinned by a browser test)
