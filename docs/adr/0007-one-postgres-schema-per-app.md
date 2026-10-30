# One Postgres schema per App, with the user base in `auth`

Every App shares one `allonfire` database. Its tables used to sit together in
`public`, so nothing in the database said which App owned what. Each App now
gets its own Postgres schema named after it (`laura`), and the Better Auth
tables plus the `Role` enum live in `auth`, the one schema no App owns. Removing
an App becomes `DROP SCHEMA`, a backup of one App is `pg_dump -n`, and grants can
later be scoped per App.

Foreign keys cross schemas (`laura."Photo"."uploadedBy"` references
`auth."User"."id"`) and one Prisma client spans every schema, because Prisma
resolves relations only inside a single client. Splitting clients per App would
break those relations and double the connection pools.

## Consequences

- Prisma requires back-relations, so `User` in `auth.prisma` lists fields for
  Laura models. Accepted.
- `Role` stays global on `User`. A second App needing a different role for the
  same person moves it to a per-App table in that App's schema.
- Table names were kept (`"Photo"`, PascalCase); only the schema moved.
