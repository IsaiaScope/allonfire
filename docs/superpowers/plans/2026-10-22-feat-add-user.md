# Add a User from the Back Office Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Back Office Admin adds a User from a primary Add button. The button opens `/users/new`, where an AOF form takes email, name, a password and a Role per App (React Bits Gooey Nav). The form posts through a server action to `POST /v1/users`.

**Status:** implemented (uncommitted) @ 2026-10-22T14:19:36Z

**Architecture:**
- **Database:** a `createUser` service writes the User, the credential Account and the Memberships in one transaction.
- **Auth package:** the User module gains `POST /users`. It hashes with Better Auth's `hashPassword`, and is guarded by the Host's `canManageUsers(userId)`, a fresh read renamed from `canDeleteUsers`.
- **API:** answers 409 `EMAIL_TAKEN`.
- **`packages/ui`:** wraps Gooey Nav (installed by the CLI into `packages/shadcn`) as `AOFGooeyChoice`, and binds it as the AOF form's `ChoiceField`.
- **Back Office:** adds the button, the page, the form and the action.

**Tech Stack:** Prisma, Hono + hono-openapi + zod, Better Auth (`better-auth/crypto`), TanStack Form (AOF form), Next 16 server actions with `useActionState`, next-intl, React Bits Gooey Nav (WebGL), Vitest (Node and browser with MSW), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-add-user-design.md` (survey: `docs/superpowers/specs/2026-10-22-add-user-library-survey.md`)

## Global Constraints

- **Limits:** `USER.LIMIT = { EMAIL_MAX: 254, NAME_MAX: 100, PASSWORD_MAX: 128, PASSWORD_MIN: 8 }` in `@allonfire/auth/features/users/constants/users`. The API, the form and the action all read them.
- **Email:** trimmed and lowercased before it is stored. A taken email answers 409 `USER.ERROR_CODE.EMAIL_TAKEN`.
- **Refusal order on `POST /users`:** 401 no Session, then 403 `canManageUsers` (fresh database read), then 400 bad body, then 409 email taken. A success answers `201 { id }`.
- **The created User:**
  - `emailVerified: true`;
  - one `credential` Account (`accountId` = the user id), holding `hashPassword(password)`;
  - one Membership per App the Admin gave a Role.

  An Admin may give no Role at all.
- **The form's Role rows:**
  - a row offers "Not a member" plus every Role reaching that App's floor (`hasRole(role, ACCESS.APP_SETTINGS[app].minRole)`);
  - every row starts at "Not a member";
  - the API accepts any Role.
- **The password field** is `type="text"` with `autocomplete="new-password"`. The password is never logged; the request logger does not log bodies, and nothing new logs one.
- **Gooey Nav:**
  - installed only by `pnpm dlx shadcn@4.21.0 add https://reactbits.dev/r/GooeyNav-TS-TW.json`, run in `packages/shadcn`, then `pnpm --filter @allonfire/shadcn canonicalize`, and never edited;
  - its colours come from tokens read at runtime (`--primary`, `--primary-foreground`, `--foreground`);
  - `particleCount` is 20 and icons are on.
- Constants are one nested object per owner, and paths are composed. No `as` casts except `as const`, and no `biome-ignore`.
- Every visible word is in the App's `en.json`/`it.json` (`Users.add.*`). The API's new message goes in its `en.json`, `it.json` and `translation-values.ts`.
- Tests carry `// @module-tag unit|integration`. Nothing is committed (iso-write).

## Review Focus

1. **An Admin demoted within the last 5 minutes** (the cookie cache) posts a new User. Expect 403, with no User created. Pinned in Task 2: `refuses an Admin demoted since their cookie was cached`.
2. **An email differing only in case from an existing one.** Expect 409, never a second account. Pinned in Task 1: `refuses an email taken in another case`.
3. **The new User signs in with the password the Admin typed.** That proves the hash is Better Auth's. Pinned in Task 6's e2e test: `the added User signs in with the password the Admin typed`.
4. **A taken email in the form.** Expect the email field marked invalid with the translated message, and every field keeping its value. Pinned in Task 5: `a taken email marks the email field and keeps what was typed`.
5. **A Role row on a phone (390 wide).** Expect the four choices to fit or wrap without a horizontal page scroll. Pinned in Task 5: `the Role rows fit a phone`.

---

### Task 1: Database: create a User

**Files:**
- Modify: `packages/database/src/features/auth/user.service.ts`
- Test: `packages/database/src/features/auth/tests/user.integration.test.ts`

**Interfaces:**
- Produces:
  - `type NewUser = { email: string; name: string; memberships: readonly AccessMembership[] }`;
  - `createUser(user: NewUser, hashedPassword: string): Promise<{ id: string }>`;
  - `class EmailTakenError extends Error`, thrown on Prisma's `P2002` for the email.

- [x] **Step 1: Write the failing tests**, with emails under `add-users.test`:
  - `creates the User, a credential Account and the Memberships`: `createUser({ email, name, memberships: [{ app: App.LAURA, role: Role.USER }] }, "hash")` returns `{ id }`. The User has `emailVerified: true`, one Account `{ providerId: "credential", accountId: id, password: "hash" }`, and that one Membership.
  - `creates a User in no App`: `memberships: []` leaves `membership.count` at 0.
  - `refuses an email taken in another case`: `createUser` with `mixed@add-users.test`, then with `MiXeD@add-users.test`, rejects with `EmailTakenError`, and only one User has that email. The service lowercases and trims.
  - `writes nothing when the email is taken`: the Account count for the email is unchanged.
- [x] **Step 2: Run** `pnpm --filter @allonfire/database test -- user.integration`. Expected: FAIL, `createUser is not a function`.
- [x] **Step 3: Implement.** One `prisma.$transaction(async (tx) => …)` creates the User with nested `accounts.create` and `memberships.create`. Catch `Prisma.PrismaClientKnownRequestError` with `code === "P2002"`, and throw `new EmailTakenError()` with `{ cause }`.
- [x] **Step 4: Run** the same command. Expected: PASS.

### Task 2: User module and API: `POST /users`

**Files:**
- Modify: `packages/auth/src/features/users/constants/users.ts`:
  - `PATH.CREATE: "/"`;
  - `LIMIT`;
  - `ERROR_CODE.EMAIL_TAKEN`;
  - `DOC.CREATE_SUMMARY | CREATE_DESCRIPTION | CREATE_201`.
- Modify: `packages/auth/src/features/users/hono/constants/schemas.ts` (`userCreateRequestSchema`, `userCreatedBodySchema`, `UserCreatedBody`)
- Modify: `packages/auth/src/features/users/hono/routes/{index,routes,handlers}.ts`, `hono/utils/deps.ts`
- Modify: `apps/api/src/features/users/user-deps.ts` (rename to `canManageUsers`; add `createUser`)
- Modify: `apps/api/src/shared/constants/error.ts`:
  - `HTTP.STATUS.CONFLICT` in `ERROR_STATUS`;
  - `STATUS_TO_ERROR_CODE[409] = ERROR_CODE.EMAIL_TAKEN`;
  - `ERROR_CODE_STATUS[EMAIL_TAKEN] = 409`.
- Modify: `apps/api/src/features/i18n/translations/{en,it}.json`, `translation-values.ts` (`EMAIL_TAKEN: never`)
- Modify: `apps/api/src/shared/tests/app-deps.ts`, `packages/auth/src/features/users/hono/tests/{routes,delete}.test.ts` (the rename)
- Test: `packages/auth/src/features/users/hono/tests/create.test.ts`, `apps/api/src/features/users/tests/users.integration.test.ts`, `apps/api/src/features/docs/tests/spec.test.ts`

**Interfaces:**
- Consumes: `createUser`, `EmailTakenError` (Task 1).
- Produces:
  - `UserDeps` gains `createUser: typeof createUser`;
  - `canDeleteUsers` becomes `canManageUsers: (userId: string) => Promise<boolean>`;
  - `userCreateRequestSchema = z.object({ email, name, password, memberships: z.array(z.object({ app: appSchema, role: roleSchema })) })`, with at most one Membership per App (refined), and its limits from `USER.LIMIT`;
  - the route chains `.post(USER.PATH.CREATE, ...createHandlers(deps))`.

- [x] **Step 1: Write the failing tests.**
  - `create.test.ts`, through `testHost` with stub deps:
    - `POST answers 401 without a Session, 403 when the Host refuses`;
    - `POST answers 400 for a bad email, a short password, or two Memberships in one App`;
    - `POST hashes the password and creates the User` (the stub receives a hash `!== password`, and the answer is `201 { id }`);
    - `POST answers 409 EMAIL_TAKEN when the email is taken` (the stub rejects with `EmailTakenError`).
  - The integration tests:
    - `POST creates a User who can sign in` (`signIn` with the new email and password answers 200);
    - `POST answers 409 EMAIL_TAKEN with its message for a Fixture's email`;
    - `refuses an Admin demoted since their cookie was cached`, built as the `DELETE` one.
  - `spec.test.ts`: `post` is under `API.PATH.USERS` with 201, 400, 401, 403 and 409, and `Problem409` lists `EMAIL_TAKEN`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/auth test -- users` and `pnpm --filter @allonfire/api test -- users spec`. Expected: FAIL.
- [x] **Step 3: Implement.** `createHandlers`:
  1. `createRoute`;
  2. `guard((session) => deps.canManageUsers(session.user.id))`;
  3. `validator("json", userCreateRequestSchema, invalidHook)`;
  4. the handler, which calls `deps.createUser({ email, name, memberships }, await hashPassword(password))` and returns `c.json({ id } satisfies UserCreatedBody, HTTP.STATUS.CREATED)`. It maps `EmailTakenError` to `new CodedError({ code: USER.ERROR_CODE.EMAIL_TAKEN, status: HTTP.STATUS.CONFLICT })`.

  The translations are en "An account with this email already exists" and it "Esiste già un account con questa email".
- [x] **Step 4: Run** the same commands, then `pnpm check-types` and `pnpm i18n:check`. Expected: PASS.

### Task 3: UI: Gooey Nav as an AOF choice field

**Files:**
- Create (CLI): `packages/shadcn/src/components/GooeyNav/GooeyNav.tsx`. If the CLI lands it elsewhere, fix `packages/shadcn/components.json`'s alias and rerun; never move it by hand.
- Create: `packages/ui/src/components/aof-gooey-choice.tsx`, `packages/ui/src/components/aof-choice-field.tsx`
- Modify: `packages/ui/src/lib/form.ts` (`fieldComponents: { ChoiceField: AOFChoiceField, TextField: AOFTextField }`)
- Test: `packages/ui/src/components/tests/aof-gooey-choice.test.tsx`

**Interfaces:**
- Produces:
  - **`AOFGooeyChoice<V extends string>`**. Props:
    - `label: string` (the group's name);
    - `name: string`;
    - `options: readonly { icon: ReactNode; label: string; value: V }[]`;
    - `value: V`, `onValueChange: (value: V) => void`.

    It renders `<div role="radiogroup" aria-label={label}>`, then `<input type="hidden" name={name} value={value} />`, then Gooey Nav. It passes `activeIndex`, `onChange` mapped back to the option's value, `particleCount={20}`, `theme` from `useAOFColorScheme().scheme`, and the colours read with `getComputedStyle(document.documentElement).getPropertyValue("--primary")` (and the rest) after mount.
  - **`AOFChoiceField`**, used as `field.ChoiceField({ label, options })`, binding the field's `name`, `state.value` and `handleChange`.

- [x] **Step 1: Write the failing render tests:**
  - `names its group and posts the chosen value`: the markup holds `role="radiogroup"`, `aria-label="Laura"` and `<input type="hidden" name="roles.laura" value="USER"`;
  - `draws every option's label`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/ui test -- aof-gooey-choice`. Expected: FAIL (module missing).
- [x] **Step 3: Install and implement.**
- [x] **Step 4: Run** the same command, then `pnpm --filter @allonfire/ui check-types` and `pnpm --filter @allonfire/back-office tailwind:check`. Expected: PASS.

### Task 4: Back Office: the Add button and the action

**Files:**
- Modify: `apps/back-office/src/features/users/constants/users.ts` (`USERS.PATH.NEW = "/new"`, `USERS.NO_ROLE = "none"`)
- Modify: `apps/back-office/src/features/users/components/users-toolbar.tsx` (the Add button, last, `sm:ml-auto`)
- Create: `apps/back-office/src/features/users/utils/add-user-schema.ts`, `apps/back-office/src/features/users/actions/add-user.ts`
- Test: `apps/back-office/src/features/users/utils/tests/add-user-schema.test.ts`, `users-table.browser.test.tsx` (the button)

**Interfaces:**
- Consumes: `USER.LIMIT` (Task 2); `serverApi` (existing).
- Produces:
  - `addUserSchema(messages: AddUserFieldMessages)`, a zod object `{ email, name, password, roles: Record<App, Role | typeof USERS.NO_ROLE> }`;
  - `type AddUserState = { error?: "taken" | "failed"; values?: AddUserValues }`;
  - `addUser(locale: Language, state: AddUserState, form: FormData): Promise<AddUserState>`, a server action. It reads `roles.<app>` for each `objectValues(App)`, posts `client[API.VERSION.CURRENT].users.$post({ json })`, maps 409 to `"taken"` and any other failure to `"failed"`, and returns the typed values so the form keeps them. On 201 it calls `redirect({ href: BACK_OFFICE.PAGE.USERS, locale })`.

- [x] **Step 1: Write the failing tests:**
  - `add-user-schema.test.ts`:
    - `lowercases and trims the email`;
    - `refuses a password under USER.LIMIT.PASSWORD_MIN with its message`;
    - `turns the Role rows into Memberships, leaving out Not a member` (a helper `membershipsOf(roles)` returns `[{ app: App.LAURA, role: Role.USER }]`).
  - The browser test `the Add button is a primary link to the Add page, last in the toolbar`: `getByRole("link", { name: t.add.button })` has `href` ending in `${BACK_OFFICE.PAGE.USERS}${USERS.PATH.NEW}`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test -- add-user-schema` and the browser test. Expected: FAIL.
- [x] **Step 3: Implement.** The button is `AOFButton` with `render={<Link href=… />}`, `IconPlus`, and the default (primary) variant.
- [x] **Step 4: Run** the same commands. Expected: PASS.

### Task 5: Back Office: the Add page

**Files:**
- Create: `apps/back-office/src/app/[locale]/(signed-in)/users/new/page.tsx` (`signedInPage`; `generateMetadata` = `sectionMetadata(SECTION.USERS)`; renders `<AddUser />` in a `SectionPage`)
- Create: `apps/back-office/src/features/users/components/add-user.tsx`
- Modify: `en.json` and `it.json`, `Users.add`, in English:
  - `button` "Add";
  - `title` "Add a User";
  - `email`, `name`, `password` (labels);
  - `role` "Role in {app}";
  - `noRole` "Not a member";
  - `submit` "Add User", `submitting` "Adding…", `cancel` "Cancel";
  - `field.emailRequired`, `field.emailInvalid`, `field.nameRequired`, `field.passwordShort` ("At least {min} characters");
  - `error.taken` "This email already has an account", `error.failed` "The User could not be added. Try again."
- Test: `apps/back-office/src/features/users/components/tests/add-user.browser.test.tsx` (the action mocked with `vi.mock("../../actions/add-user")`)

**Interfaces:**
- Consumes: `addUser`, `addUserSchema`, `AddUserState` (Task 4); `field.ChoiceField` (Task 3).
- Produces: `AddUser`, the `"use client"` form leaf. It holds `useActionState(addUser.bind(null, locale), {})`, `useAOFForm` with `defaultValues = { email: "", name: "", password: "", roles: <every App: USERS.NO_ROLE> }`, and `submitAOFForm`.

- [x] **Step 1: Write the failing browser tests:**
  - `shows a Role row per App, offering only Roles that reach its floor` (the Back Office row's radiogroup holds "Not a member" and "Admin" only, while Laura's holds four);
  - `checks the fields before posting` (empty submit: the action is not called, and the email field shows `field.emailRequired`);
  - `posts the typed values and the chosen Roles` (the mock receives `FormData` with `roles.laura = "USER"`);
  - `a taken email marks the email field and keeps what was typed` (the mock resolves `{ error: "taken", values }`: the email input has `aria-invalid="true"`, `error.taken` is visible, and the name keeps its value);
  - `the Role rows fit a phone` (at `SCREEN.VIEWPORT.PHONE`, `document.documentElement.scrollWidth <= innerWidth`).
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:browser -- add-user`. Expected: FAIL.
- [x] **Step 3: Implement** the page and the form, following `sign-in-form.tsx`'s shape.
  - The form is one column, `max-w-lg`, with an `h1` "Add a User".
  - The Role rows draw from `objectValues(App)`, with `APP_ENTRY[app].name`.
  - The Role icons:
    - Not a member: `IconUserOff`;
    - Viewer: `IconEye`;
    - User: `IconUser`;
    - Admin: `IconShieldCheck`.
- [x] **Step 4: Run** the same command and `pnpm i18n:check`. Expected: PASS.

### Task 6: e2e and docs

**Files:**
- Modify: `apps/back-office/e2e/users.spec.ts`
- Modify: `CLAUDE.md`:
  - the `user.service` line gains `createUser`;
  - the guard line says `canManageUsers` guards every User write.
- Modify: `CONTEXT.md` (already updated during planning: the User module adds Users)

- [x] **Step 1: Write the e2e tests:**
  - `adds a User from the list's Add button`: click Add, fill email (`add-<project>-<Date.now()>@e2e.test`), name and password, and set Back Office to Admin. Submit lands on the list, and the new email is the first row's link.
  - `the added User signs in with the password the Admin typed`: in a new browser context, sign in with that email and password and reach the frame.
  - `a taken email says so on the email field` (`FIXTURE.USER.LAURA.ADMIN.email`).
- [x] **Step 2: Run** `cd apps/back-office && npx playwright test e2e/users.spec.ts`. Expected: PASS on all four projects. A Safari install hint is closed through `addLocatorHandler`, as in the deletion test.
- [x] **Step 3: Final checks:**
  - scoped `pnpm exec biome check --write` on every touched file;
  - `pnpm check-types`, `pnpm lint` and `pnpm test`;
  - the Back Office browser suite;
  - `pnpm i18n:check`, `pnpm design:sync --check` and `pnpm --filter @allonfire/back-office tailwind:check`.

  Expected: all green.

## Implementation Log
- Implemented: 2026-10-22T14:19:36Z
- Workspace: current-branch — feat/back-office-frame
- Committed: no — awaiting user review
- Rulings:
  - Task 2: `EmailTakenError` is a plain `Error` subclass (`new EmailTakenError(message, { cause })`), so Biome's cause check reads it.
  - Task 3: the CLI landed Gooey Nav at `packages/shadcn/src/components/GooeyNav.tsx`, not in a folder. It fails strict TypeScript, and the owner chose "lenient for downloads only": it is excluded from `packages/shadcn`'s check and reached through a generated `GooeyNav.d.ts` (`pnpm --filter @allonfire/shadcn vendor:types`, the components export's `types` condition, generic for any future vendor file, guarded by `shadcn-compat`). Nothing is relaxed elsewhere.
  - Task 4: the Back Office builds its own Role choice schema from `objectValues(Role)`, since its zod (4.6.5) differs from the packages' (4.3.6) and a schema crosses no package.
  - Task 4: the Add button is a `Link` drawn with `aofButtonVariants()`: Base UI's Button turns its element into `role="button"`, which hid the link.
  - Task 4: the action redirects with next-intl's `redirect` (`languageOf(locale)`); `redirectTo` only takes the auth paths.
  - Task 6: the e2e queries go through the visible form (`getByRole("form")`): Next keeps a hidden copy of a page it has left, which label queries also find. The "Add" link and labels match exactly, since an added User's email starts with "add-".
  - Final: the shared MSW setup unregisters the service worker in WebKit only. In Chromium the removal could land after the next file's worker started, failing that file's first request now and then. The browser suite then ran clean 3 times in a row.

