# AllOnFire

A personal monorepo holding a family of small products that share one user base,
one database, and one design system.

## Language

**App**:
One user-facing product in the monorepo. Laura is the only App today; a React
Native client is planned.
_Avoid_: site, project, product

**API**:
The standalone HTTP backend that serves every App.
_Avoid_: server, backend, service — "server" also means Next's Server
Components.

**Auth module**:
The shared package that owns signing in, Sessions and the access rules. Any
backend mounts it; the API is the only one that does today.
_Avoid_: auth service, auth server

**Session**:
Proof that a User signed in, held by the API. A browser carries it as a cookie.
_Avoid_: token, login

**Viewer**:
A User whose Role allows browsing and playing but no mutations.
_Avoid_: guest, demo user, read-only user

**Allowed apps**:
The list on a User naming which Apps they may enter. The value `all` grants
every App.
_Avoid_: permissions, entitlements

**App schema**:
The Postgres schema holding one App's tables, named after the App (`laura`).
`auth` is the one schema no App owns: it holds the user base every App shares.
_Avoid_: "schema" alone — it also means the Prisma schema files and zod
schemas; namespace

### Environments

**Local**:
The stack running on a developer machine: `docker-compose.dev.yml` services
plus the Apps and API running on the host.
_Avoid_: dev environment — `dev` is an integration branch, not a place anything
runs.

**Production**:
The VPS. The only deployed environment; the `test` and `prod` branches are
promotion gates, not environments.
_Avoid_: prod server, staging — no staging exists.

### Data about usage

**Telemetry**:
Traces, logs and metrics describing how the API behaves.
_Avoid_: monitoring, APM

**Analytics**:
Events describing what people do in an App.
_Avoid_: tracking, telemetry
