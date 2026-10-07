# HTTP modules ship as packages and throw CodedError

A feature with its own endpoints (Auth, Images) ships as a package any
backend mounts, not as routes inside the API: the Image module is
`imageRoutes(deps)` from `@allonfire/storage/features/image/hono/routes`, mounted with one
`.route()`. A module never builds an error response or translates a message.
It throws `CodedError` (`@allonfire/core/features/errors/coded-error`: status, code,
ICU values, field errors), and each host's `onError` renders it in that
host's format and language. The module exports the codes it can throw; the
host's type test checks them against its own codes.

## Considered Options

- **Routes inside the API** (before): a second backend would copy them, and
  their errors were the API's problem documents.
- **The module renders problems itself:** every host would answer in the
  module's format and language, not its own.
- **Hooks injected by the host** (a `problem(c, ...)` callback): one more
  dependency per module for what a thrown value already carries.

## Consequences

- `@allonfire/storage` depends on `@allonfire/auth` and `@allonfire/database`;
  the Next image wiring moved from `utils` into it (`withStorageImages`) so
  `utils` depends on no workspace package and no cycle forms.
- A module adding an error code breaks every host's type check until the host
  gives the code a message.
