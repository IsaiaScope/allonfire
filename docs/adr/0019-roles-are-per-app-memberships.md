# Roles are per App, held in Memberships; App settings live in one table

A User carried one Role and a list of Allowed apps, so being an Admin anywhere
meant being an Admin everywhere they were let in, and the value `ALL` let one
row reach every App, future ones included. Apps are about to differ: some let
visitors register, the Back office never does, and someone who registers in
one App must not become anything in another. The Role moves into a
`Membership` table, one row per User and App (`auth."Membership"`, key
`(userId, app)`), and nothing spans every App any more: `ALL` is gone from
Users and from Images, and the enum is renamed `App`. What each App lets in
(`minRole`) and whether it allows Registration (`registration`, the Role a
newcomer gets, or `null`) live in one table, `APP_SETTINGS`, beside the access
rules in `@allonfire/database`, which the API enforces and every App reads.

## Considered Options

- **A JSON column on User** (`{ "laura": "VIEWER" }`): rides the Session
  cookie cache with no extra query, but Postgres cannot check the App or the
  Role.
- **Keep `ALL` as a Membership for every App**: no rows to add per new App, but
  every Role read needs a precedence rule between the App's row and the `ALL`
  row, and joining an App could quietly demote an `ALL` Admin.
- **Registration and the floor in each App's env**: the API cannot read an
  App's env, so the refusal would rest on the App telling the truth, and
  nothing could check that a newcomer's Role reaches the App's floor.

## Consequences

- Memberships are read on every Session read (Better Auth's `customSession`),
  so a changed Role or a removed Membership counts at once, unlike the
  five-minute cookie cache ADR 0009 accepted for the rest of the Session.
- A new App starts with no Members: the changeset that adds it to the `App`
  enum also gives every Back office Admin an Admin Membership in it.
- An Image belonged to exactly one App (amends ADR 0013); ADR 0020 replaced
  this with an Image in one or more Apps.
- The changesets after `0000-baseline` were rewritten into this shape before
  any of them reached Production; Local databases were rebuilt from zero.
