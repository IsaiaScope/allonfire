# Roles per App, and Registration each App declares

## Goal

A User's Role belongs to an App, not to the User: someone can be a Viewer in
Laura and an Admin in the Back office (ADR 0019). Each App declares, in one
table, the lowest Role it lets in and whether a visitor may register; the API
enforces both. Nothing spans every App any more: `ALL` leaves Users and Images.
Today every App stays sign-in only: the mechanism ships, no App opens
Registration, and no sign-up form is built.

## Decisions

- **Scope.** Registration is a per-App setting plus a server-side refusal.
  Every App is closed today (`registration: null`); no form, no `signUp`
  action until an App opens.
- **One table, `APP_SETTINGS`.** One row of settings per App in
  `@allonfire/database/features/auth/access/constants/app-settings.ts`;
  `minRole` and `registration` are its first two fields, more can follow. The
  API and every App read the same rows; adding an App to the enum fails to
  compile until its row exists.
- **Roles live in Memberships.** A `Membership` table (one row per User and
  App) replaces `User.role` and `User.allowedApps`. A User's Role in an App is
  their row for it, or none.
- **No `ALL`.** The enum loses `ALL` and is renamed `App` (`laura`,
  `back-office`). Each Image belongs to exactly one App.
- **The App is named by a header, `x-aof-app`**, spelled as the enum key and
  as `AUTH_APP` is (`BACK_OFFICE`, not the stored `back-office`); any other
  spelling names no App. Anyone can forge it; that is
  harmless, because the most a forged header earns is a Membership in an App
  open to anyone.
- **Registration grants one App.** A registered User gets one Membership: the
  App they registered through, with its `registration` Role. Further Apps are
  granted by an admin (by hand today, from a future Users section of the Back
  office).
- **Joining needs a Session.** Registering an email that already exists still
  answers `USER_ALREADY_EXISTS`; joining another open App is a separate call
  that needs a Session, so knowing someone's email is never enough. Joining an
  App the User already belongs to changes nothing, so no Role is ever lowered.
- **`minRole` moves into the table.** `AUTH_MIN_ROLE` leaves every App's env;
  a test checks that each open App's `registration` Role reaches its
  `minRole`.
- **The API checks entry.** `/sign-in/email` with `x-aof-app` refuses a User
  the App does not let in, so every client gets the same rule.
- **Content follows entry.** A User sees an App's Images exactly when they
  can enter that App (`canEnterApp`).
- **Images follow their App.** Managing an Image needs the Admin Role in the
  Image's App; moving it needs the Admin Role in both Apps.
- **A new App's Admins.** The changeset that adds an App to the `App` enum
  also inserts an Admin Membership in it for every Back office Admin.
- **Changesets are rewritten, not appended.** No changeset after
  `0000-baseline` has run in Production (`origin/prod` has none), so `0002` to
  `0004` are rewritten into the final shape and Local databases are rebuilt.

## Data

`packages/database/prisma/schema/auth.prisma`:

```prisma
/// An App of the monorepo.
enum App {
  LAURA       @map("laura")
  BACK_OFFICE @map("back-office")

  @@schema("auth")
}

/// A User's place in one App, and their Role there.
model Membership {
  userId    String
  app       App
  role      Role
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, app])
  @@schema("auth")
}
```

`User` loses `role` and `allowedApps` and gains `memberships Membership[]`.
`image.prisma`: `Image.app` becomes `App`.

Changesets (`packages/database/changelog/changesets/`):

- `0002-allowed-app-enum.sql` is replaced by `0002-app-memberships.sql`:
  1. `CREATE TYPE "auth"."App" AS ENUM ('laura', 'back-office')`;
  2. create `auth."Membership"` with its primary key and foreign key;
  3. insert Memberships from the baseline's columns, `role` and
     `allowedApps TEXT[]`: a User whose `allowedApps` holds `all` gets one row
     per App, one holding `laura` gets a Laura row, each with their `role`;
     other values (`social`) grant nothing;
  4. drop `auth."User"."role"` and `auth."User"."allowedApps"`.

  Rollback recreates both columns, fills them back from the rows
  (`array_agg` of apps, the highest Role by rank), and drops the table and the
  type.
- `0003-image-schema.sql`: `"app" "auth"."App" NOT NULL`.
- `0004-allowed-app-back-office.sql` is deleted: `back-office` is in the enum
  from the start.

Local databases are dropped and rebuilt (`pnpm db:update` from zero, then
`pnpm db:seed`); `pnpm db:drift` must be clean afterwards. CLAUDE.md's "never
edit an applied changeset" is untouched: these never reached a database that
matters.

Seed: `SeedUser` takes `memberships: { app, role }[]` instead of `role` and
`allowedApps`; `upsertUser` replaces a seeded User's Memberships with the
listed ones. The admin gets an `ADMIN` row in every App (`objectValues(App)`);
Laura's seed gives its Users Laura rows.

`CLAUDE.md` (Change a model) gains: adding an App to `App` means its changeset
also runs `INSERT INTO auth."Membership" (userId, app, role) SELECT userId,
'<new>', 'ADMIN' FROM auth."Membership" WHERE app = 'back-office' AND role =
'ADMIN'`, and its row in `APP_SETTINGS`.

## Rules: `access`

`@allonfire/database/features/auth/access/constants/app-settings.ts`:

```ts
/** A Role a stranger can be given: never Admin. */
export const registrationRoleSchema = roleSchema.exclude([Role.ADMIN]);
export type RegistrationRole = z.infer<typeof registrationRoleSchema>;

export type AppSettings = {
  /** The lowest Role this App lets in. */
  minRole: Role;
  /** The Role a visitor registering here gets; null: Registration is closed. */
  registration: RegistrationRole | null;
};

export const APP_SETTINGS = {
  [App.LAURA]: { minRole: Role.VIEWER, registration: null },
  [App.BACK_OFFICE]: { minRole: Role.ADMIN, registration: null },
} as const satisfies Record<App, AppSettings>;
```

`constants/schemas.ts`: `appSchema = z.enum(App)` (the generated enum), `App`
its type; `allowedAppSchema` is deleted.

`access.ts` (`AppPolicy` and `canSeeContent` deleted):

| Export | Rule |
|---|---|
| `AccessUser` | `{ memberships: readonly { app: App; role: Role }[] }` |
| `roleIn(user, app)` | the Role of the User's row for `app`, else `undefined` |
| `canEnterApp(user, app)` | `roleIn` reaches `APP_SETTINGS[app].minRole` |
| `canManageImage(user, app)` | `roleIn(user, app)` is `ADMIN` |
| `accessUserFrom(user)` | Memberships read as strings, narrowed: an unknown App is dropped, an unknown Role throws (as today) |

## Auth module (`packages/auth`)

`createAuth` reads `APP_SETTINGS` itself, the same table every guard and every
App reads: a table passed in would reach sign-in and Registration but never
`requireApp`, `canAccess` or the Image module, splitting who gets in. Tests
swap the table by mocking its module.

- **Session.** Better Auth's `customSession` adds `user.memberships` to
  `/get-session` (one query per call). `toAuthLike.getSession` returns them
  narrowed. `role` and `allowedApps` leave `user.additionalFields`.
- **Registration.** `emailAndPassword.disableSignUp` becomes `false`. A
  `hooks.before` on `/sign-up/email` reads `x-aof-app` and throws
  `APIError("FORBIDDEN", { code: "REGISTRATION_CLOSED" })` when it is
  missing, not an App, or names an App whose `registration` is `null`. A
  `databaseHooks.user.create.after` inserts `Membership(app, registration)`
  from the same header, refusing again if anything is off: it is the one place
  a request writes a User row.
- **Joining.** A plugin endpoint `POST /join-app` (`x-aof-app`, Session
  required) answers 403 `REGISTRATION_CLOSED` when the App is closed, and
  otherwise inserts `Membership(app, registration)` unless the User already
  has a row for that App, which stays as it is; 200 either way.
- **Entry.** A `hooks.after` on `/sign-in/email` with `x-aof-app` checks
  `canEnterApp`; on a refusal it deletes the Session it just opened and throws
  403 `APP_FORBIDDEN`. Without the header sign-in is unchanged.
- **Limits.** `/sign-up/email` joins `LIMITED_AUTH_PATHS`: every attempt hashes
  a password. `/join-app` does not.
- **Constants.** `APP_HEADER = "x-aof-app"`, `SIGN_UP_EMAIL_PATH`,
  `JOIN_APP_PATH` in `shared/constants/paths.ts`. Only an App's server and
  native clients send `x-aof-app`, so CORS is unchanged.

Hono guards:

- `requireApp(app)` — 403 unless `canEnterApp(user, app)`.
- `requireRole` is deleted: a Role means nothing without an App.

Next adapter:

- `nextAuthEnv` loses `AUTH_MIN_ROLE`.
- `canAccess(user)` is `canEnterApp(accessUserFrom(user), AUTH_APP)`.
- `signInWithEmail` sends `x-aof-app: AUTH_APP`; a 403 coded `APP_FORBIDDEN`
  maps to `SIGN_IN_ERROR.FORBIDDEN` (any other 403, such as an untrusted
  origin, to `UNAVAILABLE`), and its own `canAccess` check and `revoke` step
  are deleted. `requireAppSession` and `withSessionRefresh` keep calling
  `canAccess` on every page load.

## Image module (`packages/storage`)

- **List and get:** `canEnterApp(user, app)` replaces `canSeeContent`; a get
  refused this way still answers 404.
- **Upload:** every item's `app` must pass `canManageImage`, checked right
  after the form parses and before any file is prepared; one refused item
  refuses the batch with 403 `FORBIDDEN`, nothing stored.
- **Patch and delete:** a new dependency `appsOf(ids)` returns each id's App.
  An unknown id, or an Image in an App the User cannot enter, answers 404 as a
  get does; then every Image's current App, and for a patch every new `app`,
  must pass `canManageImage`, or the batch answers 403 with nothing written.
- `requireSession()` replaces `requireRole(Role.ADMIN)` on the three write
  routes.

The check and the write are two statements: an Image moved by another admin
between them is checked against its old App. Accepted: admins are few and the
window is milliseconds.

## Error codes

`REGISTRATION_CLOSED` and `APP_FORBIDDEN` come from Better Auth's handler as
its own JSON error bodies, like every other auth error today; the API's
problem documents do not wrap them. The Image module's `FORBIDDEN` already
exists.

## Testing

- **Unit, `packages/database`:** `roleIn`, `canEnterApp`, `canManageImage`,
  `accessUserFrom`; every `APP_SETTINGS` row with a `registration` Role
  reaches its `minRole`; the seed writes an Admin row per App for the admin.
- **Unit, `packages/auth`:** `createAuth` with the settings module mocked to
  an open App: registration creates the User with one Membership; a closed App, an
  unknown App or no header is refused with nothing written; `/join-app` adds a
  row, leaves an existing row's Role unchanged, refuses a closed App and a
  missing Session; sign-in with `x-aof-app` refuses a User below the App's
  floor and leaves no Session. Guard and `signInWithEmail` tests move to the
  new signatures.
- **Unit, `packages/storage`:** upload, patch and delete refused for an Admin
  of another App, allowed for an Admin of the Image's App, refused for a move
  without Admin in the target App; list and get hide another App's Images.
- **Integration, `apps/api`:** `/v1/auth/sign-up/email` with
  `x-aof-app: BACK_OFFICE` and with no header both answer 403 and write no
  row; a Laura Viewer signing in with `x-aof-app: BACK_OFFICE` gets 403 and no
  Session row; the Session carries `memberships`.
- **Integration, `packages/database`:** changesets from `0000-baseline` on a
  database holding a User with `allowedApps = {all}`, `role = ADMIN` and one
  with `{laura}`, `VIEWER` leave two Admin rows and one Laura Viewer row; the
  rollback restores the columns.

## Documentation

- `CONTEXT.md`: Membership, Registration and Role added; Allowed apps
  removed; App, Image and Viewer reworded (done during grilling).
- ADR 0019 (written during grilling); it amends ADR 0013's "shown by one App
  or by all of them".
- `CLAUDE.md` (Database Schema Quick Reference, Viewer Role System, Change a
  model), the READMEs of `packages/auth`, `packages/database`,
  `packages/storage` and `apps/api`, the `aof-design` skill,
  `apps/back-office/.env.example` and every test setup that sets
  `AUTH_MIN_ROLE`.

## Before any App opens Registration

Not built here, required first:

- email verification (without it anyone registers under someone else's
  address);
- a sign-up and join form, and a shared `signUp` action in
  `@allonfire/auth/features/next`;
- a Users section in the Back office to grant further Apps and Roles.

Laura is outside the workspace build until it is rebuilt; its code reading
`user.role` changes then.
