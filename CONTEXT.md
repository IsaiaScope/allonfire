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
_Avoid_: server, backend, service — "server" already means the Better Auth
instance (`packages/auth/src/server.ts`) and Next's Server Components.

**Viewer**:
A User whose Role allows browsing and playing but no mutations.
_Avoid_: guest, demo user, read-only user

**Allowed apps**:
The list on a User naming which Apps they may enter. The value `all` grants
every App.
_Avoid_: permissions, entitlements
