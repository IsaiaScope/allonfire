# Packages are concepts with adapter folders

Every package names one concept (`core`, `auth`, `database`, `storage`,
`ui`) and works for any Host: two backends, two frontends, or one of
each. When a concept needs a framework, the adapter lives in a sub-folder
(`features/next/`, `features/hono/`) and the framework is an optional peer, so
a Host on another framework installs the package and never loads that code.
A package or folder carries an App, vendor or framework name only when it is
wholly that thing (`shadcn`, `features/next`, `database/apps/laura`). Inside a
package, `src/` holds only `environment/`, `shared/` and `features/`; features
nest directly, and any folder that is not a kind folder (`components`, `hooks`,
`actions`, `middleware`, `routes`, `constants`, `types`, `utils`, `translations`, `tests`) is a
sub-feature. Code lives in the deepest feature that contains every reader.

## Considered Options

- **One package per adapter** (`auth-hono`, `auth-next`): three times the
  packages for what per-file exports already give.
- **Framework code in its own package** (`next`): the Next scaffolding would
  leave `core` for a package that only re-exports Next wiring; kept in
  `core/features/next` instead.
- **An explicit `features/` folder at every level:** unambiguous, but every
  path one folder deeper.

## Consequences

- `utils` is now `core`; ADR 0012's scaffolding lives in `core/features/next`.
- Every export path is longer (`@allonfire/core/features/http/constants/http`),
  and says where the file lives.
- The remaining plans (Images inside storage, API layout, database apps, auth by
  adapter, one source of truth, languages) follow this ADR.
