# An App's data about a User lives in that App's Profile, tied to the Membership

`auth.User` is one row per person, shared by every App, and ADR 0007 already
accepts that Prisma makes it list a back-relation for each App model. Phase 4
of the Laura rebuild added a Laura Favorite table and a `favorites` line on
`User`, which showed the pattern does not scale: an e-commerce App with favorite
products and a blog with favorite articles and comments would each add lines to
`User`, and `User` would learn about every App.

An App that keeps data about a User now keeps it in one **Profile** row per
Membership, in the App's own schema (`laura."Profile"`, model `LauraProfile`),
keyed on `(userId, app)` with a foreign key to `auth."Membership"(userId, app)`
that cascades on delete. Removing a User's access to an App removes their
Profile and everything under it; the User and their other Apps stay. Under the
Profile, what is searched, sorted, joined, unique or constrained is a typed
column; what points at another entity is a child table with real foreign keys;
and preference data read whole with the Profile can be one `settings jsonb`
column, checked by a zod schema on every read and write and never searched,
because Prisma filters a `Json` field only by whole value. A Profile is created
by an App on first use, never by the shared user service (ADR 0033), and starts
with only its keys: a column arrives by changeset when the App needs it.

## Considered Options

- **Typed tables straight to `User`**: simple, but `User` lists one line per
  table.
- **A polymorphic favorites table (`userId, app, kind, targetId`)**: one
  service for every target, but `targetId` cannot be a foreign key, so deleting
  a target leaves rows that code must sweep.
- **JSON on `auth.Membership`**: keeps `User` untouched, but has no foreign
  keys and no database typing; every change of a target is code editing every
  Membership.
- **A key/value table per User and App**: loses types and constraints and needs
  a join per setting.

## Consequences

- `auth.User` has no App lines; `auth."Membership"` has one back-relation per
  App that has a Profile.
- A Profile row costs a first-use write (a get-or-create in that App's route
  group) and a changeset per new column.
- An App's data about a User is removed in the database when access, the User or
  a target goes; no cleanup code.
- Laura is the first App with a Profile, because its Favorites are written into
  every Laura User's own data (`laura."ProfileFavorite"`), copied from the master
  list the Admins edit (`laura."Favorite"`). Users cannot change their copies yet.
- Adds `CONTEXT.md` Profile. Amends ADR 0007 (the User back-relation) and the
  Laura rebuild spec's Favorite decision (shared, never per User), which becomes
  shared by the Admins' actions and held per User.
- The route side of the same work, grouping API routes by who calls them, is
  ADR 0035.
