# Package layout

Where a file goes, in every Node package and `apps/api`.

## Package Layout (every Node package and `apps/api`)

One layout everywhere, so a file's place answers "who reads it?":

```
src/
  index.ts            root entry only (an App's boot file, a package's root export)
  environment/        the zod env schema, validated at import
  shared/             what more than one top-level feature reads, by kind
  features/
    <feature>/
      <kind>/         components, hooks, actions, middleware, routes,
                      constants, types, utils, translations, tests
      <sub-feature>/  any folder that is not a kind; same shape, recursively
```

Only `environment/`, `shared/` and `features/` sit at the top of `src/`; routes
live in their feature (`features/<name>/routes/`). Kind folders are the closed
list above; any other folder inside a feature is a sub-feature. Nest only when
a feature really has sub-features. Code lives in the deepest feature that
contains every reader: one sub-feature reads it, it lives there; two
sub-features, their parent's kind folder; two top-level features, `shared/`.
A feature's main file can sit directly in its folder when a kind folder would
hold only that file. Every folder is optional (ADR 0016).

**Packages are concepts.** One package per concept, usable by any Host (an App
or the API, see `CONTEXT.md`). A framework adapter lives in a sub-folder
(`features/next/`, `features/hono/`) with the framework as an optional peer. A
package or folder is named after an App, vendor or framework only when it is
wholly that thing (`shadcn`, `features/next`, `database/apps/laura`). A
package's logic never names an App; packages that catalogue per App
(`database`, `design`) keep App folders.

A package never imports an App (`@allonfire/api`, `@allonfire/back-office`,
`@allonfire/laura`, or a path into `apps/`); Biome's `noRestrictedImports`
enforces it. A package is a module any host can mount: the Auth module knows
`/auth`, never the `/v1` the API mounts it under, and a Next App is told the
full address (`API_AUTH_URL`).

Env var names start with their owner: a package's with the package name
(`STORAGE_ENDPOINT`, `DATABASE_URL`, `DATABASE_SEED_ADMIN_EMAIL`, `AUTH_SECRET`), the
API's with `API_` (`API_REDIS_URL`, `API_CORS_ORIGINS`). A var that points at
another service carries that service's name (`API_AUTH_URL` in the Back Office). A
name a tool reads by itself stays as the tool spells it: `NODE_ENV`, `PORT`,
the OpenTelemetry SDK's tuning `OTEL_*` (none set). Telemetry's own keys start
with `TELEMETRY_` (`TELEMETRY_ENDPOINT`), the same in every App that reports.
Laura keeps its old names until it is rebuilt.
Export keys mirror the file path without `src/` and `.ts`, one line per file:
`"./features/hono/guards/middleware/require-app": "./src/features/hono/guards/middleware/require-app.ts"`.
A folder's `index.ts` exports as the folder (`./features/image/hono/routes`). Generated code keeps its
own key (`@allonfire/database/enums`). A package that serves HTTP for any host
(the Auth and Image modules) exports its router from `features/<name>/routes/index.ts`,
takes its dependencies as arguments, and throws `CodedError` from
`@allonfire/core/features/errors/coded-error` instead of building responses (ADR 0015;
routes Better Auth serves throw its `APIError`, which its handler answers).
`packages/shadcn`, `packages/ui` and `packages/design` are exempt: the
first two follow shadcn's `components/` and `lib/` so `shadcn add` works;
`packages/design` holds Designs and Apps (ADR 0011).

