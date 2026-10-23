# Users list: faceted filters and deleting Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Users list's App and Role filters become DiceUI Faceted lists. A Back Office Admin can select Users and delete them, never themselves, after a confirmation.

**Status:** implemented (uncommitted) @ 2026-10-22T13:16:01Z

**Architecture:**
- **Database:** a `deleteUsers(ids)` service; the existing cascades do the rest.
- **Auth package:** the User module gains `DELETE /users`. Its guard reads the caller fresh from the database through the Host's `canDeleteUsers(userId)`, so a cached Session cookie cannot delete. The caller's own id is refused with a module code.
- **`packages/ui`:**
  - wraps DiceUI's Faceted and Action Bar and shadcn's checkbox and alert-dialog;
  - adds row selection to `AOFDataTable`.
- **Back Office:**
  - wires the filters, the selection (cleared on every address change), the bar, the dialog and a `useMutation`;
  - the page hands the signed-in User's id down.

**Tech Stack:** Prisma, Hono + hono-openapi + zod, Better Auth, TanStack Table v9 (`rowSelectionFeature`), TanStack Query 5 (`useMutation`), DiceUI base-nova (`faceted`, `action-bar`), shadcn base-nova (`checkbox`, `alert-dialog`), Sonner, nuqs, next-intl, Vitest (Node and browser with MSW), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-users-filters-and-deletion-design.md` (survey: `docs/superpowers/specs/2026-10-22-users-filters-and-deletion-library-survey.md`)

## Global Constraints

- `packages/shadcn` is written only by `npx shadcn@4.21.0 add <url>` run from `apps/back-office`, then `pnpm --filter @allonfire/shadcn canonicalize`; never edit it by hand.
- Only `packages/ui` imports `@allonfire/shadcn`; every wrapper is `AOF<Name>` in `packages/ui/src/components/aof-<name>.tsx`, with a test.
- No `as` casts except `as const`; no `biome-ignore`; `cva` and `cn` for classes; corners from `--radius`; WCAG AA in both themes.
- Constants are one nested object per owner (`USER`, `USERS`, `QUERY`, `MUTATION`); paths are never string literals, tests included; error codes are never literals outside their owner.
- Every word a visitor sees is in `en.json` and `it.json` (`pnpm i18n:check`); the API's new message is in its `en.json`/`it.json` and `translation-values.ts`.
- Each filter stays single choice (ADR 0026); "All Apps"/"All Roles" items are removed, and Reset clears.
- Deletion removes the whole User (cascades: Memberships, Sessions, Accounts, `GameScore`; Images keep, `uploadedBy` null). No schema change.
- Anyone but yourself: no checkbox on your own row or card, and the API refuses a body holding your id with 403 `CANNOT_DELETE_SELF`, deleting nobody.
- Refusal order on `DELETE /users`: 401 no Session, 403 `canDeleteUsers` (fresh database read), 400 bad body, 403 `CANNOT_DELETE_SELF`.
- Body `{ ids: string[] }`, 1 to `USER.MAX_DELETE` = 100; answer `200 { deleted: number }`; unknown ids skipped.
- The selection clears on any change to page, page size or search, and after a successful delete. It is kept, with an error toast, when the delete fails.
- Tests carry `// @module-tag unit|integration`; nothing is committed (iso-write).

## Review Focus

1. **A Session cookie cached from before the Admin was demoted or deleted.** Expect 403 from `DELETE`, not a deletion. Pinned in Task 3: `refuses an Admin demoted since their cookie was cached`.
2. **Select-all on a page holding your own row.** Expect your id never in the request. Pinned in Task 7: `select-all leaves your own row out`.
3. **A delete that fails (500 or network).** Expect an error toast, the selection kept, and the dialog closed. Pinned in Task 7: `keeps the selection and says so when the delete fails`.
4. **Deleting every row on the last page.** Expect the list to refetch and show the existing past-the-end state with its way back, not a blank table. Pinned in Task 7: `after deleting the last page's rows, offers the way back`.
5. **Reset in a filter while another filter and text are set.** Expect only that filter to clear: the other filter, the text and `page` reset to 1 as before. Pinned in Task 6: `Reset clears only its own filter`.

---

### Task 1: Database: delete Users

**Files:**
- Modify: `packages/database/src/features/auth/user.service.ts`
- Test: `packages/database/src/features/auth/tests/user.integration.test.ts`

**Interfaces:**
- Produces:
  - `deleteUsers(ids: readonly string[]): Promise<number>`, which returns the count deleted;
  - `accessUserById(id: string): Promise<AccessUser | null>`, the User's Memberships read now through `accessUserFrom`, or null when the User is gone.

- [x] **Step 1: Write the failing tests** in `user.integration.test.ts`, each creating its own throwaway Users with `prisma.user.create` (emails under `FIXTURE.DOMAIN`, never a Fixture):
  - `deletes the Users named and everything they hold`: a User with a Membership, a Session, an Account and a Laura `GameScore`, plus an Image they uploaded. `deleteUsers([id])` returns `1`. Then `prisma.membership.count({ where: { userId: id } })`, and the same for `session`, `account` and `gameScore`, are all `0`, and the Image still exists with `uploadedBy === null`.
  - `skips ids that do not exist`: `deleteUsers([id, "missing-id"])` returns `1`, and `deleteUsers(["missing-id"])` returns `0`.
  - `leaves every other User alone`: `FIXTURE.USER.BACK_OFFICE.ADMIN` still exists after the deletions above.
  - `reads a User's access fresh`: `accessUserById(id)` returns the created Memberships. After `prisma.membership.update` sets the Role to `Role.VIEWER`, it returns `VIEWER`. After `deleteUsers([id])`, it returns `null`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/database test -- user.integration`. Expected: FAIL, `deleteUsers is not a function`.
- [x] **Step 3: Implement both** in `user.service.ts`.
  - `deleteUsers`: `prisma.user.deleteMany({ where: { id: { in: [...ids] } } })`, returning `.count`.
  - `accessUserById`: `prisma.user.findUnique({ select: { memberships: { select: { app, role } } } })`, mapped through `accessUserFrom`.
- [x] **Step 4: Run** the same command. Expected: PASS.

### Task 2: User module: `DELETE /users`

**Files:**
- Modify: `packages/auth/src/features/hono/guards/utils/guard.ts` (`allows` may return `Promise<boolean>`; the guard awaits it)
- Modify: `packages/auth/src/features/users/constants/users.ts`
- Modify: `packages/auth/src/features/users/hono/constants/schemas.ts`
- Modify: `packages/auth/src/features/users/hono/routes/{index,routes,handlers}.ts`
- Modify: `packages/auth/src/features/users/hono/utils/deps.ts`
- Test: `packages/auth/src/features/users/hono/tests/routes.test.ts`, `packages/auth/src/features/hono/guards/tests/` (async case)

**Interfaces:**
- Consumes: `deleteUsers` (Task 1).
- Produces:
  - `USER.PATH.DELETE = "/"`;
  - `USER.MAX_DELETE = 100`;
  - `USER.ERROR_CODE = { CANNOT_DELETE_SELF: "CANNOT_DELETE_SELF" }`;
  - `USER.DOC.DELETE_SUMMARY | DELETE_DESCRIPTION | DELETE_200`;
  - `userDeleteRequestSchema` (`{ ids }`), `userDeleteBodySchema` (`{ deleted }`), `UserDeleteBody`;
  - `UserDeps` gains `deleteUsers: typeof deleteUsers` and `canDeleteUsers: (userId: string) => Promise<boolean>`;
  - the route chains `.delete(USER.PATH.DELETE, ...deleteHandlers(deps))` after the two `get`s.

- [x] **Step 1: Write the failing tests** in `routes.test.ts` through `testHost`, with stub deps recording the ids they receive:
  - `DELETE answers 401 without a Session`;
  - `DELETE answers 403 when the Host refuses`, where `canDeleteUsers` resolves `false` and `deleteUsers` is never called;
  - `DELETE answers 400 for an empty list, more than USER.MAX_DELETE ids, or a non-string id`;
  - `DELETE refuses a list holding your own id and deletes nobody`, sending `ids: ["user-2", "user-1"]` with the Session's user `user-1`: the status is 403, the thrown error is a `CodedError` with `code === USER.ERROR_CODE.CANNOT_DELETE_SELF`, and `deleteUsers` was not called;
  - `DELETE deletes the ids and answers the count`, with `ids: ["user-2"]` and the stub returning `1`: the answer is `200 { deleted: 1 }`, and `canDeleteUsers` was called with `"user-1"`.

  Also, in the guard tests: `awaits an async allows`, where a `Promise<false>` gives 403.
- [x] **Step 2: Run** `pnpm --filter @allonfire/auth test -- users guards`. Expected: FAIL (no `DELETE` route: 404).
- [x] **Step 3: Implement.**
  - The guard awaits `allows`.
  - `deleteHandlers(deps)` runs, in this order:
    1. `deleteRoute`;
    2. `guard((session) => deps.canDeleteUsers(session.user.id))`;
    3. `validator("json", userDeleteRequestSchema, invalidHook)`;
    4. the handler, which throws `new CodedError({ code: USER.ERROR_CODE.CANNOT_DELETE_SELF, status: HTTP.STATUS.FORBIDDEN })` when `ids.includes(c.get(AUTH.VAR.SESSION).user.id)`, else returns `c.json({ deleted } satisfies UserDeleteBody, HTTP.STATUS.OK)`.
  - `deleteRoute` documents the 200 body with `resolver(userDeleteBodySchema)` and `problemResponses(BAD_REQUEST, UNAUTHORIZED, FORBIDDEN)`.
  - `DELETE_DESCRIPTION` names the cascade, the 403 code and the fresh read.
- [x] **Step 4: Run** the same command. Expected: PASS. Also `pnpm --filter @allonfire/auth check-types` passes, and `src/client.test-d.ts` in the API still sees chained routes (Task 3 runs it).

### Task 3: API: wire deletion, its error code and a fresh read

**Files:**
- Modify: `apps/api/src/features/users/user-deps.ts`
- Modify: `apps/api/src/shared/constants/error.ts` (spread `USER.ERROR_CODE` into `ERROR_CODE`; `[ERROR_CODE.CANNOT_DELETE_SELF]: HTTP.STATUS.FORBIDDEN` in `ERROR_CODE_STATUS`)
- Modify: `apps/api/src/features/i18n/translations/en.json`, `it.json`, `apps/api/src/features/i18n/translation-values.ts` (`CANNOT_DELETE_SELF: never;`)
- Test: `apps/api/src/features/users/tests/user-deps.test.ts`, `apps/api/src/features/users/tests/users.integration.test.ts`, `apps/api/src/features/docs/tests/spec.test.ts`

**Interfaces:**
- Consumes: `accessUserById` and `deleteUsers` (Task 1); `UserDeps` (Task 2).
- Produces: `canDeleteUsers = async (userId) => { const user = await accessUserById(userId); return user !== null && isBackOfficeAdmin(user); }` in `userDeps()`.

- [x] **Step 1: Write the failing tests.**
  - In `users.integration.test.ts`, through `createApp(appDeps({ auth, users: userDeps() }))` with `cookieFor`:
    - `DELETE refuses a visitor (401) and a non-Admin (403)`, the latter as `FIXTURE.USER.LAURA.USER`;
    - `DELETE refuses your own id with CANNOT_DELETE_SELF`: signed in as `FIXTURE.USER.BACK_OFFICE.ADMIN` with your own id in `ids`, the answer is 403, `body.code === API.ERROR.CODE.CANNOT_DELETE_SELF`, `detail` is the English message, and you still exist;
    - `DELETE deletes a throwaway User`: create one with `prisma`, send its id, get `200 { deleted: 1 }`, and the User is gone;
    - `refuses an Admin demoted since their cookie was cached`: create a throwaway Back Office Admin with a password, sign in to get the cookie, then `prisma.membership.update` their Role to `Role.USER` and `DELETE` a second throwaway User with that same cookie. The answer is 403 and the second User still exists.
  - In `user-deps.test.ts`: `canDeleteUsers is false for an unknown id`.
  - In `spec.test.ts`: the OpenAPI document lists `delete` under `API.PATH.USERS`, and `CANNOT_DELETE_SELF` under `Problem403`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/api test -- users spec`. Expected: FAIL (type error on `UserDeps` until wired, then 404s).
- [x] **Step 3: Implement** the wiring above. The translations:
  - en: `"CANNOT_DELETE_SELF": "You cannot delete yourself"`;
  - it: `"CANNOT_DELETE_SELF": "Non puoi eliminare te stesso"`.
- [x] **Step 4: Run** the same command, then `pnpm --filter @allonfire/api check-types` and `pnpm i18n:check`. Expected: PASS, including `client.test-d.ts` and `error-codes.test-d.ts`.

### Task 4: UI primitives: Faceted, Action Bar, Checkbox, Alert Dialog, toast

**Files:**
- Create (CLI): `packages/shadcn/src/components/faceted.tsx` and `action-bar.tsx`, from `npx shadcn@4.21.0 add https://diceui.com/r/base-nova/faceted.json https://diceui.com/r/base-nova/action-bar.json` run in `apps/back-office`, then `pnpm --filter @allonfire/shadcn canonicalize`. If the CLI writes elsewhere, move nothing by hand; fix `components.json` aliases and rerun.
- Create: `packages/ui/src/components/aof-faceted.tsx`, `aof-action-bar.tsx`, `aof-checkbox.tsx`, `aof-alert-dialog.tsx`
- Modify: `packages/ui/src/lib/use-aof-toast.ts` (add `aofToast`)
- Test: `packages/ui/src/components/tests/aof-faceted.test.tsx`, `aof-action-bar.test.tsx`, `aof-checkbox.test.tsx`, `aof-alert-dialog.test.tsx`

**Interfaces:**
- Produces:
  - **`AOFFaceted<V extends string>`**. Props:
    - `items: readonly { label: string; value: V }[]`;
    - `value: V | null`, `onValueChange: (value: V | null) => void`;
    - `labels: { trigger: string; placeholder: string; search: string; empty: string; reset: string }`.

    It is single choice: choosing the chosen item again clears it, and Reset (`FacetedClear`) calls `onValueChange(null)`. The trigger shows the chosen label or `placeholder`, with `aria-label={labels.trigger}`. The trigger ends on `IconCaretUpDown` (owner's taste).
  - **`AOFActionBar`**. Props:
    - `open: boolean`;
    - `onOpenChange: (open: boolean) => void`;
    - `selection: string` (already worded: "3 selected");
    - `close: string` (the close button's label);
    - `children` (the actions).
  - **`AOFCheckbox`**: shadcn's `checkbox` props, plus `indeterminate`.
  - **`AOFAlertDialog`**. Props:
    - `open`, `onOpenChange`;
    - `title`, `description`;
    - `confirm`, `cancel` (the button labels);
    - `onConfirm: () => void`, `pending: boolean`.

    The confirm button uses the destructive variant; while `pending`, both buttons are disabled.
  - **`aofToast(message: string, kind: "success" | "error"): void`**, calling Sonner's `toast.success` or `toast.error`.

- [x] **Step 1: Write the failing render tests** (`renderToStaticMarkup`, as `aof-data-table.test.tsx` does):
  - `AOFFaceted draws the chosen label on its trigger and the placeholder when none is chosen`;
  - `AOFActionBar draws the selection text and the close label only while open`;
  - `AOFCheckbox marks an indeterminate state for assistive tech` (`aria-checked="mixed"`);
  - `AOFAlertDialog disables both buttons while pending` (rendered `open`);
  - and one test that greps the installed `faceted.tsx` and `action-bar.tsx` for no visible English: every string a wrapper relies on is passed through props.
- [x] **Step 2: Run** `pnpm --filter @allonfire/ui test -- aof-faceted aof-action-bar aof-checkbox aof-alert-dialog`. Expected: FAIL (modules missing).
- [x] **Step 3: Install and implement** the wrappers. Classes go through `cn`/`cva`, with corners stepping down from `rounded-lg`.
- [x] **Step 4: Run** the same command, then `pnpm --filter @allonfire/ui check-types` and `pnpm --filter @allonfire/back-office tailwind:check`. Expected: PASS.

### Task 5: AOFDataTable: row selection

**Files:**
- Modify: `packages/ui/src/components/aof-data-table.tsx` (`AOF_TABLE_FEATURES = tableFeatures({ rowPaginationFeature, rowSelectionFeature })`; add `aofSelectColumn`)
- Test: `packages/ui/src/components/tests/aof-data-table.test.tsx`

**Interfaces:**
- Consumes: `AOFCheckbox` (Task 4).
- Produces:
  - `aofSelectColumn<TData>(labels: { all: string; row: (row: AOFRow<TData>) => string })`: the first column. The header is a checkbox for the selectable rows on the page, `indeterminate` when some are selected. Each cell is a checkbox, or nothing when `row.getCanSelect()` is false. Its column id is `"select"`.
  - `AOFRowCheckbox<TData>({ row, label })`, the same checkbox, for a card.

- [x] **Step 1: Write the failing tests:**
  - `draws a checkbox per selectable row and none for a row that cannot be selected`, with `enableRowSelection: (row) => row.original.id !== "1"`;
  - `the header checkbox is indeterminate when some rows are selected`, with `state.rowSelection = { "2": true }` and three rows;
  - `the header checkbox selects only selectable rows` (call its handler, then read `table.getSelectedRowModel()` ids: `["2"]`).
- [x] **Step 2: Run** `pnpm --filter @allonfire/ui test -- aof-data-table`. Expected: FAIL.
- [x] **Step 3: Implement.** The header uses `table.getIsSomePageRowsSelected()` / `getIsAllPageRowsSelected()` / `toggleAllPageRowsSelected`. TanStack skips rows whose `getCanSelect()` is false.
- [x] **Step 4: Run** the same command. Expected: PASS (all earlier table tests too).

### Task 6: Back Office: faceted filters

**Files:**
- Modify: `apps/back-office/src/features/users/components/users-toolbar.tsx`
- Modify: `apps/back-office/src/features/i18n/translations/en.json`, `it.json` (`Users.filter`: drop `anyApp`/`anyRole` from the items, keep them as placeholders; add `search`, `empty`, `reset`)
- Test: `apps/back-office/src/features/users/components/tests/users-table.browser.test.tsx`

**Interfaces:**
- Consumes: `AOFFaceted` (Task 4).

- [x] **Step 1: Write the failing browser tests:**
  - `filters by App from the Faceted list`: open the App trigger, type in its search box, pick `APP_ENTRY[App.LAURA].name`, and the address's `search` holds `app:laura`;
  - `Reset clears only its own filter`: start from `USER_SEARCH.serialize({ app: App.LAURA, role: Role.ADMIN, text: "isa" })` with `page=3`, press Reset in the Role list, and `search` becomes `app:laura input:isa` with `page` gone;
  - `the lists speak the page's language`: rendered with `it.json`, the Reset row reads the Italian translation.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:browser -- users-table`. Expected: FAIL.
- [x] **Step 3: Replace** the two `AOFSelect`s with `AOFFaceted`. `pickApp`/`pickRole` keep their shape, taking `V | null`.
- [x] **Step 4: Run** the same command and `pnpm i18n:check`. Expected: PASS.

### Task 7: Back Office: selecting and deleting Users

**Files:**
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/users/page.tsx` (read `getSession()`, pass `selfId={session?.user.id ?? ""}`)
- Modify: `apps/back-office/src/features/users/components/users-table.tsx`, `user-columns.tsx`
- Create: `apps/back-office/src/features/users/components/delete-users.tsx` (the bar, the dialog and the mutation for a given selection)
- Modify: `apps/back-office/src/features/users/utils/users-queries.ts` (add `deleteUsersMutation`)
- Modify: `apps/back-office/src/shared/constants/mutation.ts` (`MUTATION.USERS.DELETE`), `src/shared/constants/query.ts` (`QUERY.USERS.ALL = [USERS]`, the prefix every Users key starts with)
- Modify: `apps/back-office/src/shared/tests/msw/handlers.ts` (`http.delete(USERS_URL, …)` answering `{ deleted: ids.length }`)
- Modify: `en.json`, `it.json`. The `Users.delete` keys, in English:
  - `select` "Select {email}";
  - `selectAll` "Select every User on this page";
  - `selected` "{count, plural, one {# selected} other {# selected}}";
  - `action` "Delete";
  - `clear` "Clear selection";
  - `title` "{count, plural, one {Delete # User?} other {Delete # Users?}}";
  - `description` "Each User leaves every App, with their Sessions and Laura scores. This cannot be undone.";
  - `confirm` "Delete";
  - `cancel` "Cancel";
  - `done` "{count, plural, one {# User deleted} other {# Users deleted}}";
  - `failed` "The Users could not be deleted. Try again."
- Test: `apps/back-office/src/features/users/components/tests/users-table.browser.test.tsx`, `apps/back-office/src/features/users/utils/tests/users-queries.test.ts`

**Interfaces:**
- Consumes:
  - `aofSelectColumn` and `AOFRowCheckbox` (Task 5);
  - `AOFActionBar`, `AOFAlertDialog` and `aofToast` (Task 4);
  - `userDeleteRequestSchema`'s shape, and `client[API.VERSION.CURRENT].users.$delete({ json: { ids } })` (Tasks 2 and 3).
- Produces:
  - `UsersTable({ selfId }: { selfId: string })`;
  - `deleteUsersMutation(client: ApiClient)`, a `mutationOptions` with `mutationKey: MUTATION.USERS.DELETE` and `mutationFn: (ids: string[]) => parseResponse(...)`.

- [x] **Step 1: Write the failing tests:**
  - `users-queries.test.ts`: `deleteUsersMutation sends the ids as JSON to the Users path`, using a local `hc` client against MSW, as the list test does.
  - The browser tests, rendered with `selfId` set to one of `USERS_PAGE`'s ids:
    - `your own row has no checkbox`;
    - `select-all leaves your own row out`: select all, delete, confirm, and the MSW handler received every other id but not `selfId`;
    - `selecting a row shows the bar with the count, and closing it clears the selection`;
    - `Delete asks first; Cancel keeps the selection` (no request reached MSW);
    - `confirming deletes, says how many, clears the selection and refetches the list` (toast text `1 User deleted`, a second `GET` seen);
    - `keeps the selection and says so when the delete fails` (MSW answers 500 once: error toast, bar still shows the count, dialog closed);
    - `a page change clears the selection`;
    - `a card on a phone selects too`, at `SCREEN.VIEWPORT.PHONE`;
    - `after deleting the last page's rows, offers the way back`: page 2 with one row, delete it, then the refetch answers no rows with `pageCount: 1`, and the past-the-end state shows.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:browser -- users-table` and `pnpm --filter @allonfire/back-office test -- users-queries`. Expected: FAIL.
- [x] **Step 3: Implement.**
  - The table holds `rowSelection` in `useState`, keyed by User id (`getRowId` already). It resets with the `useState` "adjust while rendering" pattern the toolbar uses, comparing a key of `page`, `perPage` and `search`.
  - `enableRowSelection: (row) => row.original.id !== selfId`.
  - The columns start with `aofSelectColumn`, and `UserCard` gets an `AOFRowCheckbox`.
  - `DeleteUsers` takes `ids`, `onDone` (clears the selection) and `onClose`, and:
    - holds the dialog's `open`;
    - on success calls `useQueryClient().invalidateQueries({ queryKey: QUERY.USERS.ALL })`, sends `aofToast(t("delete.done", { count: deleted }), "success")` and calls `onDone`;
    - on error sends `aofToast(t("delete.failed"), "error")`.
- [x] **Step 4: Run** the same commands and `pnpm i18n:check`. Expected: PASS.

### Task 8: e2e and docs

**Files:**
- Modify: `apps/back-office/e2e/users.spec.ts`
- Modify: `CLAUDE.md`: in the database section's service list, add `deleteUsers` and `accessUserById` to `features/auth/user.service`. In the API section, add one line: the User module's `DELETE` reads the caller fresh through `canDeleteUsers(userId)`, never the cached Session.
- Modify: `docs/superpowers/specs/2026-10-22-users-filters-and-deletion-design.md` Constraints line on e2e, to match the ruling below.

Ruling: e2e does not delete. The e2e run's database lives in the API server's process, which Playwright's test process cannot reach, and both Apps' Registration is closed, so a spec cannot create a throwaway User. Four projects deleting one shared Fixture would race. The deletion itself is covered for real by Task 3's integration tests and for the UI by Task 7's browser tests. Cost if wrong: one untested path from the button to the real API, which Task 3's tests and the typed `hc` client largely cover.

- [x] **Step 1: Write the e2e tests**, signed in as `FIXTURE.USER.BACK_OFFICE.ADMIN`:
  - `your own row has no checkbox`;
  - `selecting a User shows the bar; Delete asks first and Cancel deletes nobody` (afterwards the row is still listed);
  - `filters by App through the Faceted list` (the address holds `app:`).
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:e2e -- users`. Expected: PASS on all four projects.
- [x] **Step 3: Final checks:**
  - scoped `pnpm exec biome check --write` on every touched file;
  - then `pnpm check-types`, `pnpm lint`, `pnpm test`, and `pnpm --filter @allonfire/back-office test:browser`;
  - then `pnpm i18n:check` and `pnpm design:sync --check`.

  Expected: all green.

## Implementation Log
- Implemented: 2026-10-22T13:16:01Z
- Workspace: current-branch — feat/back-office-frame
- Committed: no — awaiting user review
- Rulings:
  - Task 1: the throwaway Users live in their own domain (`delete-users.test`), not `FIXTURE.DOMAIN`, so the list tests' counts hold.
  - Task 2: the DELETE tests live in their own file (`delete.test.ts`); the test host also answers a `CodedError` with its status and code.
  - Task 3: `canDeleteUsers` for an unknown id is tested in the integration file, since it needs the database.
  - Task 4: Action Bar and Alert Dialog open into a portal, which a static render cannot draw; their open and pending states are tested in Task 7's browser tests.
  - Task 6: the first browser run after installing DiceUI reloads once while Vite caches the new libraries; later runs are clean.
  - Task 7: the browser tests now load the App's `globals.css`, so "visible" means visible: a bare checkbox has no size without its classes.
  - Task 7: selecting an Action Bar item closes the bar (and so clears the selection) unless its `onSelect` prevents that; Delete prevents it.
  - Task 7: there is no separate users-queries unit test; the browser tests read the DELETE request's ids from MSW.
  - Task 8: Safari's install hint covers the bar; owner: no worries. The e2e test closes it through `addLocatorHandler`.

