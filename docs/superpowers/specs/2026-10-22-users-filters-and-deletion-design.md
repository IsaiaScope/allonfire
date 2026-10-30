# Users list: faceted filters and deleting Users — design

2026-10-22. It builds on `2026-10-21-back-office-users-list-design.md`. The library survey is in `2026-10-22-users-filters-and-deletion-library-survey.md`.

Owner decisions are marked **(owner)**; calls left to me are marked **(my call)**.

## Intent

An Admin who finds a User in the list should be able to remove them there. Today the list only shows Users. The App and Role filters are also plain selects, and they should match the searchable list the owner picked from DiceUI.

## Goals

### Faceted filters

The App and Role selects become DiceUI's **Faceted** (Base UI build) **(owner)**:

- a trigger naming the filter ("App", "Role") whatever is chosen; the picks show as badges in the Filters panel **(owner, kept as built 2026-10-29; first the chosen option, or "All Apps" / "All Roles" when none is chosen)**;
- a popup with a search box, the options, a check beside the chosen one, and a **Reset** row at the bottom that clears the filter.

Details:

- Each filter takes **several values**, any of them matching (`app:laura,back-office`), as ADR 0026 now has it **(owner, kept as built 2026-10-29; first single choice)**. DiceUI's `Faceted` runs with `multiple`; choosing an option again unpicks it. Both filters sit in one Filters panel (`AOFFilterPanel`), which shows each pick as a badge and clears them all.
- The "All Apps" / "All Roles" options are removed from the list, since Reset does their job **(my call)**.
- Every word is translated: the placeholder, the search box's placeholder, "No results", and Reset.
- Installation: `npx shadcn@4.21.0 add https://diceui.com/r/base-nova/faceted.json` from `apps/back-office`, which lands in `packages/shadcn`. Then canonicalize, and wrap it as `AOFFaceted` in `packages/ui`.

### Deleting Users

- **Selection (owner):**
  - a checkbox column first in the table, with select-all in the header;
  - a checkbox on each card on a phone;
  - built on TanStack Table's `rowSelectionFeature`, added to the AOF table's features;
  - the checkbox is shadcn's `checkbox`, through an AOF wrapper.
- **Delete in the toolbar (owner, kept as built 2026-10-29; first an Action Bar):** a Delete button among the toolbar's actions, enabled while at least one row is selected. No Action Bar.
- **Confirmation (owner):** Delete opens shadcn's `alert-dialog` (already installed), wrapped as `AOFAlertDialog`.
  - It names the count and says what goes in general words, naming no App: "Each User leaves every App and is signed out everywhere. This cannot be undone." **(owner, 2026-10-29)**
  - Confirm deletes; Cancel closes it and keeps the selection.
- **What is deleted (owner):** the whole User (CONTEXT.md: deleting a User, not removing them from an App). The User row goes, and the database's cascades remove:
  - every Membership;
  - every Session, so the User is signed out at once;
  - every Account (their credentials);
  - their Laura `GameScore`s **(owner: yes, deleted)**.

  Images stay, with `uploadedBy` set to null. No schema change.
- **Who can be deleted (owner):** anyone except yourself, other Back Office Admins included.
  - Your own row and card have no checkbox, so select-all skips it.
  - The API also refuses your own id. The UI hint alone is not the guarantee.
- **Who can delete:** the same rule as listing, at least Admin in the Back Office (`hasRoleIn(user, App.BACK_OFFICE, Role.ADMIN)`), passed by the Host.
- **Selection lifetime (owner):** cleared whenever the page, the page size, the search or a filter changes. You only ever delete rows you can see.
- **Selection is keyed by User id** (`getRowId`), shared by the table and the cards, which draw the same rows **(my call)**.
- **While deleting (owner, kept as built 2026-10-29; first a pending Confirm):** Confirm closes the dialog at once, and the Users fade and are out of reach until the list read again has them gone; Delete stays disabled meanwhile. A double submit would be harmless anyway, since unknown ids are skipped.
- **After deleting (my call):**
  - a success toast ("3 Users deleted") through `useAOFToast`;
  - the selection clears;
  - the list query refetches (`invalidateQueries` on `QUERY.USERS` list keys).

  When a page becomes empty, the existing "past the end" state already offers the way back. A failure shows an error toast and keeps the selection.

## API: the User module

- **`DELETE /` (`USER.PATH.DELETE`, mounted at `/v1/users`)** **(my call)**:
  - Body: `{ ids: string[] }`, from 1 to `USER.MAX_DELETE` (100, the largest page) ids.
  - Answers `200 { deleted: number }`.
  - Unknown ids are skipped, not an error: deleting twice is harmless.
  - The ids are deleted in one transaction through a database service, `deleteUsers(ids)` in `features/auth/user.service`, with Prisma `deleteMany`.
- **Guard:**
  - no Session: 401;
  - the Host's `canDeleteUsers(user)` refuses: 403;
  - the body holds the caller's own id: **403 `USER.ERROR_CODE.CANNOT_DELETE_SELF`**, a new module code with an API translation (403, not 409: the API already answers 403 problems, so no new status).

  The whole request is refused when the caller's own id is in it, so a forged request deletes nobody **(my call)**.
- Documented with `describeRoute` plus zod, like the list. A bad body (empty, too many ids, not strings) answers the usual 400 validation problem. Unlike the list's address, a body is never typed by hand.
- **The caller's own id is checked in the module's handler**, before any database call: `session.user.id` against the body. The service stays `deleteUsers(ids)` and knows nothing about the caller **(my call)**.
- **Fresh Session read for deletion (my call).** Better Auth caches the Session in a cookie for 5 minutes (`AUTH.SESSION.COOKIE_CACHE_MAX_AGE_S`). A deleted User therefore keeps a signed-in look on reads for up to 5 minutes, until the cache expires and their next refresh finds no Session. The delete route's guard reads the caller from the database (the Host's `canDeleteUsers(userId)`, through `accessUserById`), never the cached Session, so an Admin who was just deleted, or demoted, cannot delete anyone. The list keeps the cached read. "Signed out at once" in Goals means their Session rows are gone at once; the cookie window applies to reads only.
- **The last Admin (my call).** Nothing stops one Admin deleting every other Admin. Two Admins deleting each other in the same instant could leave none. Since you can never delete yourself, the caller always remains, so no extra guard is built. The concurrent case is accepted as negligible; restoring an Admin is `pnpm db:seed` on Production.
- **Order of refusals:** 401 with no Session, 403 when `canDeleteUsers` refuses, then 400 for a bad body, then 403 `CANNOT_DELETE_SELF` for your own id.

## Back Office

- The page reads the signed-in User with `getSession()` (cached per request, already read by the page's check) and hands `selfId` to `UsersTable` **(my call)**.
- The mutation is TanStack Query's `useMutation` calling the `deleteUsers` server action, which sends `DELETE /v1/users` through the server's typed `hc` client and then drops the kept Users list (`updateTag`) in the same request **(owner, kept as built 2026-10-29; first the browser's `hc` client)**. Its key goes in the shared `MUTATION` (`MUTATION.USERS.DELETE`), as the owner asked for keys.
- New translations go in `Users.select`, `Users.delete.*` and `Users.filter.*` (search, reset, no results), in `en.json` and `it.json`.

## Non-goals

- Removing a User from one App (it belongs to the User detail page, later) **(owner)**.
- Undo, soft delete, an audit log.
- A row menu (⋯) with Delete **(owner chose checkboxes + the toolbar's Delete only)**.
- Selecting across pages.

## Anti-goals

- Deleting yourself through any path.
- A delete without the confirmation dialog.
- Any English left inside the installed DiceUI pieces that a visitor can see.
- A non-Admin reaching the delete endpoint.

## Constraints

As in the earlier spec:

- `packages/shadcn` is written only by the CLI;
- AOF wrappers live in `packages/ui`;
- `cva` and `cn`, with corners from `--radius`;
- WCAG AA in both themes;
- no `as` casts;
- constants: one nested object per owner;
- paths composed, never literals;
- tests beside their code with the `@module-tag` header;
- browser tests with MSW for the client pieces, plus e2e for the flow up to the confirmation. The e2e run deletes only a User it added itself (Add a User, 2026-10-23), so the Fixtures stay intact; the integration tests delete for real;
- nothing committed.

## Left to the builder

- The split between DiceUI's parts and the AOF wrappers' props.
- The checkbox column's width.
- The exact copy.
