# Images module as a package — design

Follow-up to `2026-10-02-aof-image-hardening-design.md` (implemented, uncommitted,
on `feat/design-package`). The Images HTTP routes leave `apps/api` and ship from
`@allonfire/storage`, so any backend mounts them with one line, the way the API
mounts the Auth module (`authRoutes`).

## Approved decisions

1. The module lives in `packages/storage/src/routes/images`.
2. The module names what went wrong with codes it exports; each host renders
   and translates them. The module never formats a problem document or a message.
3. `image.service` stays in `@allonfire/database` (ADR 0008); the module receives
   it as a dependency.

## 1. The package graph

Today `utils` depends on `storage` (the Next config reads the storage paths).
The module makes `storage` depend on `auth` and `database`, which both depend on
`utils`: a cycle turbo refuses. So the Next image wiring moves into `storage`:

```
before:  utils -> storage            storage -> (nothing)
after:   storage -> auth, database, utils     utils -> (nothing in the monorepo)
         ui -> storage, utils   (constants only)
```

`AOFCreateNextConfig` loses its `images` option. `@allonfire/storage/next/with-storage-images`
exports `withStorageImages(config, { origin })`, which returns `config` with the
`/storage/images/:key` rewrite merged in front of its own rewrites and the
`images` settings (`formats`, `localPatterns`, `minimumCacheTTL`) under the
App's own. An App wraps its config with it before passing it to
`AOFCreateNextConfig`. `utils` drops its `@allonfire/storage` dependency.

## 2. The error contract: `CodedError`

`@allonfire/utils/helpers/coded-error` exports one class, shared by every
module and every host:

```ts
export class CodedError extends Error {
  readonly status: number;        // an HTTP error status
  readonly code: string;          // the host's ERROR_CODE value
  readonly values: Readonly<Record<string, number | string>>;  // ICU values
  readonly errors: readonly { message: string; path: string }[]; // per-field
}
```

It extends `Error`, not Hono's `HTTPException`, so `utils` needs no Hono. A host's
`onError` renders it: a code its `ERROR_CODE` knows and a status its
`ERROR_STATUS` knows become a problem document whose `detail` is the code's
message translated with `values`; anything else is a bug (logged, 500).

The module exports the codes it can throw:

```ts
export const IMAGE_ERROR_CODE = {
  IMAGE_TOO_LARGE, NOT_FOUND, PAYLOAD_TOO_LARGE, UNSUPPORTED_IMAGE, VALIDATION_FAILED,
} as const;
```

A host proves it covers them with a type test (`satisfies Record<string, ErrorCode>`
on the module's values), so a module adding a code fails the host's type check
until the host adds the code and its message.

What the module throws:

| Case | status | code | values / errors |
|---|---|---|---|
| zod validation (query, param, json, form) | 400 | `VALIDATION_FAILED` | `{ count }`, `errors` = issues as `{ message, path }` |
| unknown or hidden Image | 404 | `NOT_FOUND` | |
| body over 100 MiB / a file over 20 MiB | 413 | `PAYLOAD_TOO_LARGE` | `{ limit }` (bytes) |
| over 100 megapixels | 413 | `IMAGE_TOO_LARGE` | `{ limit }` (megapixels) |
| not JPEG/PNG/WebP/AVIF | 415 | `UNSUPPORTED_IMAGE` | |
| a User of another App (list or read) | 403 | `FORBIDDEN` | |
| upload over its 5-minute budget | 503 | `TIMEOUT` | `{ seconds }` (the upload's budget, not the host's) |

Guards (`requireSession`, `requireRole`) keep throwing Hono's `HTTPException`
(401/403), which hosts already render. The module's own refusals are coded:
the per-request App check throws `FORBIDDEN`, and the upload's timeout
rethrows Hono's 503 as `TIMEOUT` with its own `seconds`, so the host's message
never names the host's shorter budget.

## 3. The module

```
packages/storage/src/routes/images/
  index.ts               imageRoutes(deps): the chained router
  routes.ts              describeRoute specs
  handlers.ts            list, get, upload, patch, delete
  constants/limits.ts    unchanged
  constants/schemas.ts   unchanged
  constants/errors.ts    IMAGE_ERROR_CODE
  constants/openapi.ts   tag "Images", problem $ref "#/components/responses/Problem"
  utils/access.ts        canSee, assertCanSee
  utils/cursor.ts        encodeCursor, cursorSchema
  utils/deps.ts          ImageDeps (+ log)
  utils/upload.ts        isImageUpload(method, path, basePath)
  utils/validation.ts    the sValidator hook that throws CodedError(400)
  tests/                 the route tests, against a minimal host
```

- `ImageDeps` gains `log: { warn(details: object, message: string): void }`
  (pino's shape); the module never imports a logger.
- The router's env is `AuthEnv` from `@allonfire/auth`: it reads only the
  Session the host's `sessionLoader` set.
- The OpenAPI specs reference `#/components/responses/Problem`; a host that
  publishes docs registers that component (the API already does).
- `isImageUpload(method, path, basePath)` is true for `POST <basePath>`, so a
  host can exempt the upload from its own global body limit and timeout; the
  route brings its own (100 MiB, 5 minutes).
- `hono` is a peer dependency, as in `@allonfire/auth`.

The tests move with the module and run against a minimal host: a Hono app with
a stub session loader and an `onError` that answers `{ status, code, values }`
for a `CodedError`, so they assert the contract, not the API's problem format.

## 4. The API after the move

- `app.ts`: `.route(IMAGES_BASE_PATH, imageRoutes(deps.images))`, with
  `isImageUpload` imported from the module.
- `apps/api/src/routes/images/` is deleted.
- `onError` renders `CodedError` as above; `translate` gains an untyped sibling
  (`translateCode`) for codes whose values arrive at runtime.
- `ERROR_CODE` keeps `IMAGE_TOO_LARGE` and `UNSUPPORTED_IMAGE` and their
  messages; a type test checks `IMAGE_ERROR_CODE` against `ErrorCode`.
- The `fallbackMessage` case for `IMAGE_TOO_LARGE` (which imported sharp's
  module for `MAX_INPUT_MEGAPIXELS`) goes: the value arrives on the error.
- One API test keeps the end-to-end proof: a module error reaches the client as
  the API's localized problem document.

## Out of scope

Laura. New endpoints. Moving `image.service` out of `database`.

## ADR

ADR 0015, "HTTP modules ship as packages and throw CodedError": hard to reverse
once a second backend mounts modules, surprising without context (why the module
never builds its own error body), and a real trade-off against per-module
problem rendering or injected hooks.
