# API routes are grouped by who calls them: an App, the admin console, or every App

The API grew by module: `/v1/users`, `/v1/images`, `/v1/services`, `/v1/storage/overview`
and `/v1/user-usage/overview` sit side by side under one prefix. That was fine
with one App. Laura's rebuild adds routes only Laura calls (the Gallery, the
Favorites, later the Memory game), and the Users routes will one day have a
second audience: a User editing their own name. A route that asks for a Back
Office Admin in one breath and "the User themselves" in the next puts two
audiences in one body, and a mistake there is a privilege bug.

Routes are now grouped by who calls them:

- `/v1/<app>/...`: data an App owns, called only by that App's screens
  (`/v1/laura/gallery`). Its guard is `requireApp(app)`, which also refuses a
  wrong App before any work is done.
- `/v1/back-office/...`: the admin console, called only by Back Office Admins:
  the Users routes and the storage and Users overviews. The shared User module
  in `packages/auth` keeps its own `/users` paths; only the API's mount prefix
  changes, so no package names an App.
- Plain `/v1/...`: a capability several Apps use. `/v1/auth` (every App signs
  in), `/v1/images` (a Laura Admin uploads and removes, Laura Users read,
  visitors read public Images) and `/v1/services` (the mail providers serve every
  App's emails, though only the Back Office screen configures them).

A guard that asks for a Back Office Admin does not decide the prefix on its
own: who calls the route and whose capability it is do. A signed-in User
changing their own data later gets separate routes with their own narrow
bodies (`/v1/me` for the person, `/v1/<app>/profile` for an App's data), never
a "self or Admin" branch inside `/v1/back-office/users`.

## Considered Options

- **One shared `/v1/users` with per-route "self or Admin" guards**: one
  resource, but the admin and the self-service audiences share a route and a
  body, and the OpenAPI document mixes them.
- **Every route under `/v1/<app>/`, shared modules included**: a bigger change
  to the Image module and the Back Office, and an App prefix on something no one
  App owns.
- **Leave the layout as it is and name the rule only for new routes**: cheaper
  now, but the first self-service route would have to be forced into the admin
  Users routes.

## Consequences

- Moving the Users and overview routes is a rename of the API's mount prefix: the
  Back Office's typed client calls, tests, e2e and docs follow, with no
  behaviour change.
- `/v1/me` and `/v1/<app>/profile` are not built yet; nothing needs them.
- Adds nothing to `ACCESS.APP_SETTINGS`.
