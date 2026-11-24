# A User's data in an App lives in that App's Profile; Laura's Favorites follow it

Date: 2026-11-20. Size: a project (a decision, a model change in Laura Phase 4, docs). Context: Laura Phase 4 (`docs/superpowers/plans/2026-11-17-laura-p4-gallery-favorites.md`) was paused at Task 4 while this was settled. Tasks 0 to 3 of that plan (core's `invalidateStatic`, `keysetCursor`, the first `laura.Favorite` changeset) stand, with one change to the changeset below.

## Intent and why

The owner does not know which Apps come after Laura (an e-commerce App with favorite products, a blog with favorite articles and comments were the examples) and wants the user model to be as flexible as possible for Apps with different behaviour. Phase 4 had added `laura."Favorite"` plus a `favorites` line on `auth.User`, which made `User` learn about a Laura table and fixed Laura's favorites as one shared list with no User in it.

## Goals

- One stated way to hold per-App, per-User data, so a new App has a shape to follow and `auth.User` stays identity only.
- The database keeps doing the cleanup: removing access, a User, or a target removes its dependent rows with no code.
- Laura's Favorites: an Admin's action reaches every Laura User's own data, so a User holds per-User information while the list stays shared in effect.

## Non-goals

- No generic favorites engine, no polymorphic table, no key/value (EAV) rows.
- No profile table created for an App that does not need one yet: only Laura gets a Profile now, because its Favorites need it.
- No User editing of favorites in Laura v1 (the copies are read-only for Users); no `displayName` or `settings` column until Laura needs one.
- No new `ACCESS.APP_SETTINGS` field.

## Anti-goals

Rows left behind when access, a User or a target is removed; a shared model (`auth.User`) that names an App; a target's type lost to `unknown`.

## Constraints

- ADR 0007: one Postgres schema per App, the user base in `auth`, Prisma needs back-relations (Phase 4's `User.favorites` line is removed by this design, so only `Membership` lists one per App).
- ADR 0033: a package never names an App. The shared auth user service must not create a Laura row.
- ADR 0019 (Role per Membership) and `CONTEXT.md` Membership: a User with no Membership in an App holds nothing there.
- The API carries the App in the path for data an App owns (`/v1/laura/...`); a platform module several Apps share (images, users) has no App in its path and takes `app` as a parameter. The App in the path is also the early gate (`requireApp(app)`).

## Approaches considered

1. **Typed per-App tables with foreign keys straight to `User`** (shape 1). Simple, but `User` lists a back-relation per table.
2. **One polymorphic `UserFavorite(userId, app, kind, targetId)`.** Rejected: no foreign key to the target, so orphans need sweeping code, and the target's type is lost.
3. **JSON on `auth.Membership`** (shape 3). Rejected: no foreign keys; code must edit every Membership when a target changes; no database typing.
4. **A generic `image."Favorite"(imageId, app)`.** Rejected: generalises across Apps but not across targets, where the owner's examples differ.
5. **A profile row per (User, App) in the App's schema, tied to the Membership, with typed columns, an optional JSON column and child tables (picked).** Layered pattern from identity platforms and DDD (identity shared, each context owns its profile) and from Postgres practice (relational core, JSONB tail for read-whole preferences). Prisma cannot filter inside `Json` (raw SQL only), so the JSON column is never searched.

## Decisions

- **Profile**: for an App that holds per-User data, one row per Membership in that App's schema, named `<App>Profile` as the Prisma model (`LauraProfile`) and stored as `"Profile"` in the App's schema. Its key is `(userId, app)` and its foreign key points at `auth."Membership"(userId, app)` with `ON DELETE CASCADE`: removing a User's access to the App removes their Profile and everything under it; the User and their other Apps' Profiles stay. `CONTEXT.md` Profile is added.
- **Columns, JSON, child tables**: what is searched, sorted, joined, unique or constrained is a typed column or a child table; display or preference data read whole with the Profile can be one `settings jsonb` column, checked by a zod schema on every read and write; anything that points at another entity is a child table with real foreign keys. Never EAV rows. Columns are added by a changeset when an App needs one (the Profile starts with its keys).
- **Create on first use**: a Profile is created by get-or-create the first time the User reads Laura data, copying the master Favorites in the same transaction (`INSERT ... SELECT ... ON CONFLICT DO NOTHING`). Nothing in `packages/database`'s shared auth service names Laura. A User who never opens Laura has no Profile.
- **Laura Favorites**: `laura."Favorite"` stays the master, the one list Laura Admins edit (keyed on the Image, `app` constant, cascade from the Image's Laura placement). It loses `markedBy` (nothing reads it), so `auth.User` has no Favorite line. `laura."ProfileFavorite"(userId, imageId, app)` holds each User's copy, with foreign keys to the Profile and to `ImageApp(imageId, app)`, both `ON DELETE CASCADE`. An Admin mark or unmark writes the master and every existing Profile's copies in one transaction (about 20 Users). Users cannot change their copies. The Gallery's `favorite` flag and the Favorites feed read the caller's own copies; the Admin heart reads and writes the same way.
- **Back-relation**: Prisma needs the inverse of the Membership foreign key, so `auth."Membership"` gains one line per App Profile (`lauraProfile LauraProfile?`). `auth.User` gains none, and the existing Phase 4 `User.favorites` line is removed.
- **Routes**: three audiences. Data an App owns goes under `/v1/<app>/...` (`/v1/laura/...`). Routes that only Back Office admins call form the admin console under `/v1/back-office/...`: the Users routes (list, create, delete, read, update, avatar) and the storage and Users overviews move there, a rename of the API's mount prefix with no behaviour change (the shared User module in `packages/auth` keeps its own `/users` paths). Capabilities several Apps use stay plain `/v1`: `/v1/auth`, `/v1/images` (a Laura Admin uploads and removes, Laura Users read, visitors read public ones), and `/v1/services`, because the mail providers serve every App's emails even though only the Back Office screen configures them (`POST /v1/services/keep-alive` is called by a scheduled job). A guard that asks for a Back Office Admin alone does not decide the prefix; who calls the route and whose capability it is do. A signed-in User editing their own data later gets separate routes with their own narrow bodies (`/v1/me` for the person, `/v1/<app>/profile` for an App's data), never a "self or Admin" branch inside `/v1/back-office/users`; none of them is built now.
- **Names (agent's calls)**: `LauraProfile`, `ProfileFavorite`; table `"Profile"`, `"ProfileFavorite"`; Laura's per-User copy is read by the same keyset feed code as before, ordered by the copy's `createdAt`.

## Scenarios the model answers

- Anna joins Laura after 30 favorites: her Profile is created on first use and copies all 30.
- Marco unmarks one: the master row and every copy are deleted in one transaction; the cascade removes copies when the Image or its Laura placement goes.
- Two Admins act at once: both write inside transactions; the master's primary key makes a double mark idempotent and a double unmark a no-op.
- An Admin removes Anna's Laura access: her Laura Profile and copies cascade away; her `auth.User` and other Apps' data stay.
- A User is deleted: the Membership cascade removes the Profile and copies.

## Left to the builder

The ADR wording, the exact changeset, the amended Phase 4 tasks (2, 4, 5, 6, 7, 10, 11, 14, 16 and the docs), the guide sections, and the transaction and locking details of the fan-out and the first-use copy.
