# Add a User from the Back Office: design

2026-10-22. It builds on `2026-10-21-back-office-users-list-design.md` and `2026-10-22-users-filters-and-deletion-design.md`. The survey is in `2026-10-22-add-user-library-survey.md`.

Owner decisions are marked **(owner)**; calls left to me are marked **(my call)**.

## Intent

Today the only way to get a new person into an App is the seed or the database. An Admin should be able to add someone from the Users list and hand them a password, so that person can sign in at once.

## Goals

### Add button

- A primary **Add** button at the far right of the Users toolbar **(owner)**.
- It is a link (`AOFButton` rendered as `Link`) to `/<lang>/users/new`, so it opens in a new tab too. It carries a plus icon (Tabler) and the label "Add".
- On a phone the toolbar stacks, and the button sits at the right of its own row **(my call)**.

### The page `/users/new` **(owner: its own page)**

- It sits under `signedInPage`, inside the Users Section, which already owns the pages under its path. The sidebar marks Users, and the breadcrumb shows the Section.
- It is a feature component, `features/users/components/add-user.tsx`. The page adds only metadata and renders it.
- A visible heading reads "Add a User" **(my call: it says something the breadcrumb does not)**.
- **The form**, an AOF form (ADR 0017: `useAOFForm`, a server action, `useActionState`, `noValidate`, `submitAOFForm`):
  - **Email**: required, a valid email, at most 254 characters. It is trimmed and lowercased on the server **(my call; Better Auth stores emails lowercased)**.
  - **Name**: required, 1 to 100 characters **(my call)**.
  - **Password**: typed by the Admin, who passes it on **(owner)**. It must be 8 to 128 characters, Better Auth's defaults **(my call)**. The field shows what is typed (`type="text"`, `autocomplete="new-password"`), so the Admin can read it back before passing it on **(my call: there is no password reset yet, so a typo would lock the person out)**.
    - **Amended 2026-10-23 (owner):** 12 to 128 characters with a lowercase letter, an uppercase letter, a digit and a symbol, enforced by the API (`passwordRules` in the User module, one list the form reads too); the field is `type="password"` with a reveal button, typed twice (a confirmation field), and a live to-do list ticks each rule (Shadcn Studio's `checkbox-04`, see the 2026-10-23 password rules survey). The form opens empty on every visit (`AOFFreshOnReturn`).
  - **A Role per App** **(owner)**: one row per App, from the `App` enum (`/users/filters` was dropped), with the choices "Not a member", Viewer, User and Admin. Each row is **React Bits' Gooey Nav** (https://reactbits.dev/components/gooey-nav, with icons and `particleCount` 20) **(owner, 2026-10-22: "I LOVE" it for role selection; it replaces the segmented row picked earlier)**.
    - It is installed by the shadcn CLI from `https://reactbits.dev/r/GooeyNav-TS-TW.json`, run in `packages/shadcn`, so it lands at `packages/shadcn/src/components/GooeyNav/GooeyNav.tsx` and is never edited.
    - It is wrapped as `AOFGooeyChoice` in `packages/ui`:
      - its colours come from the Design's tokens (`--primary`, `--primary-foreground`), read at runtime, since it parses only hex and rgb (Japan's tokens are hex);
      - `theme` follows the colour scheme;
      - each Role has a Tabler icon.
    - **Accessibility (my call):** Gooey Nav renders buttons marked `aria-current`, as a navigation does. The wrapper is a labelled `role="radiogroup"` holding a hidden input with the chosen value, so the form posts it. The buttons stay focusable and named; their "current" reads as the chosen one. A real radio is not possible without editing the installed file.
    - **Taste conflicts accepted (owner's pick wins):** pill corners and a blurred frame, against the "corners from `--radius`" and "no blur" rules. WebGL runs only while a row animates, and reduced motion turns the goo off; the component does both itself.
    - Every App starts at "Not a member" **(my call)**.
    - **A row offers only the Roles that reach that App's floor** (`ACCESS.APP_SETTINGS[app].minRole`) **(my call)**. A Membership below the floor would let nobody in. Today the Back Office row is "Not a member · Admin" and Laura's has all four choices. The API accepts any Role: a Membership is data, and the floor decides entry.
    - Leaving every App at "Not a member" is allowed. CONTEXT.md says a User with no Membership still exists **(my call)**.
  - **Add**, an `AOFSubmitButton` with its pending text, and **Cancel**, a link back to the list.
- **Errors:**
  - field errors show under their field, as on Sign in;
  - a taken email marks the email field invalid, with "This email already has an account";
  - any other refusal or failure shows one form-level message, and every field keeps what was typed.
- **Success:** the action redirects to the Users list. The new User is the first row, since the list is newest first **(my call: no toast; a redirect would lose it)**. The list page prefetches per request, so nothing is cached between requests, and the dehydrated newer data replaces the browser's copy. No extra invalidation is needed, and e2e proves it.

### API: the User module

- **`POST /` (`USER.PATH.CREATE`, mounted at `/v1/users`):**
  - Body: `{ email, name, password, memberships: { app, role }[] }`, at most one Membership per App, validated by zod with the same limits as the form.
  - Answers `201 { id }`.
- **Guard:** the same fresh read as `DELETE`. The Host's check is renamed from `canDeleteUsers` to **`canManageUsers(userId)`** and guards every write **(my call: one rule for writing Users, not one per verb)**.
- **Hashing:**
  - The module hashes the password with Better Auth's `hashPassword` (`better-auth/crypto`), the hash the seed uses.
  - It then calls a database service, `createUser({ email, name, memberships }, hashedPassword)` in `features/auth/user.service`.
  - In one transaction, that service creates the User (`emailVerified: true`, like the seed), a `credential` Account and the Memberships. The database package never imports Better Auth.
- **A taken email:**
  - The service throws `EmailTakenError`, read from Prisma's unique-constraint error.
  - The module answers **409 `USER.ERROR_CODE.EMAIL_TAKEN`**.
  - The API gains `HTTP.STATUS.CONFLICT` among the statuses it answers with a problem document (`ERROR_STATUS`), with en/it translations. Its bare-status code is `EMAIL_TAKEN`, the only code sent with 409, as `UNSUPPORTED_MEDIA_TYPE` maps to the Image module's `UNSUPPORTED_IMAGE` **(my call)**.
  - Emails are lowercased before they are stored. That is the invariant Better Auth and the Fixtures already keep, so the unique constraint is enough. A test adds `MiXeD@...` after `mixed@...` and expects 409 **(my call)**.
- **Refusal order:** 401 no Session, then 403 `canManageUsers`, then 400 bad body, then 409 email taken.
- The route is documented with `describeRoute` plus zod, like the others.

## Back Office wiring

- **The server action** is `features/users/actions/add-user.ts`:
  - It parses the form with the same zod schema (the action's copy counts) and calls the API through `serverApi()` with the visitor's cookies.
  - It maps 409 to the email field's error, and anything else to the form message.
  - On 201 it calls `redirect` to the list.
- The App options come from the `App` enum, so the rows draw on the first paint with no request **(superseded my call: the filters query went with `GET /filters`)**.
- New translations go under `Users.add.*`, in `en.json` and `it.json`.

## Non-goals

- Inviting by email; a password the User sets themselves; resetting or changing a password.
- Editing a User, or their Memberships (the User detail page, later).
- A toast after adding.
- Choosing an avatar or image.

## Anti-goals

- A non-Admin, or an Admin whose Role was taken away in the last 5 minutes (cookie cache), creating a User.
- A second account with an email that is already taken.
- A plaintext password stored or logged anywhere. The request body never reaches a log line.
- Creating an Admin through any route other than this one with the guard.

## Constraints

As in the earlier specs:

- AOF components only, in `packages/ui`; `packages/shadcn` written by the CLI only (`toggle-group` is already installed);
- `cva` and `cn`, corners from `--radius`, WCAG AA in both themes;
- no `as` casts;
- constants as one nested object per owner, and paths composed;
- tests beside their code with the `@module-tag` header;
- browser tests with MSW (server actions are mocked there);
- e2e covers the real flow. Each project adds its own User (`add-<project>-<timestamp>@e2e.test`, a constant in the spec file), and the Users list shows it. The run's database is dropped when the run ends. e2e can create here, unlike deletion, since the API is the one creating;
- nothing committed.

## Left to the builder

- `AOFSegmented`'s exact props, and how it plugs into `useAOFForm` (a `SegmentedField` beside `TextField`).
- The page's layout width (one column, about `max-w-lg`).
- The exact copy.
