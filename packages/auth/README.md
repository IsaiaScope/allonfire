<h1 align="center">@allonfire/auth</h1>

<p align="center">
  <img src="https://img.shields.io/badge/BetterAuth-1.5-8B5CF6?logoColor=white" alt="BetterAuth" />
  <img src="https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/Prisma-adapter-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Zod-4-3068B7?logo=zod&logoColor=white" alt="Zod" />
</p>

<p align="center">The Auth module: signing in, Sessions and the access rules, mountable by any Hono backend.</p>

## What it is

Better Auth's configuration, the Roles and Apps a User can hold, pure access
predicates, a Hono adapter (routes, Session loader, guards) and the OpenAPI
fragment a host merges into its own document. The API is the only backend that
mounts it today.

No Next and no React yet: the frontend refactor adds a `./client` export. The
old Next-bound package lives in `packages/auth-old`, untracked, until then.

Everything the adapter touches goes through the `AuthLike` port
(`basePath`, `handler`, `getSession`, `openApi`), so a test passes `stubAuth()` instead of a
real instance.

## Exports

Roles and Allowed apps are the Prisma enums, imported from
`@allonfire/database/enums` (`Role.VIEWER`, `AllowedApp.LAURA`); this package
keeps no copy of them. HTTP statuses and methods come from
`@allonfire/utils/constants/http`.

| Export | Contents |
|--------|----------|
| `./access` | `hasRole(role, min)`, `canEnterApp(allowedApps, app)`, `allowedAppsFrom(values)`, `roleFrom(value)` (throws on a Role this build does not know) |
| `./constants/roles` | `ROLE_RANK` — each Role's rank, in steps of 100 |
| `./constants/limits` | The auth bucket defaults (10 attempts / 15 min, `auth:` key prefix), the secret and cookie-cache limits |
| `./constants/paths` | `AUTH_PATH`, `SIGN_IN_EMAIL_PATH`, `CHANGE_PASSWORD_PATH`, `LIMITED_AUTH_PATHS`, `OPENAPI_SCHEMA_PATH` |
| `./environment` | `authEnvSchema` (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_RATE_LIMIT_KEY_PREFIX`, `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`) to spread into a host's env |
| `./hono/middleware/require-app` | `requireApp(app)` — 403 unless the User's Allowed apps include it or `ALL`; mount it once per App |
| `./hono/middleware/require-role` | `requireRole(min)` — 403 unless the User's Role reaches `min` (`Role.USER` refuses a Viewer) |
| `./hono/middleware/require-session` | `requireSession()` — 401 when anonymous |
| `./hono/middleware/session-loader` | `sessionLoader(auth)` — reads the Session once per request and passes on any cookie Better Auth refreshes while reading it |
| `./hono/middleware/auth-limit` | `authLimit(auth, limiter)` — runs the host's limiter on the routes that check a password (sign-in, change-password) only |
| `./hono/routes` | `authRoutes(auth)` — hands `GET`/`POST` under `auth.basePath` to Better Auth; mount it at the root |
| `./hono/types` | `AuthVariables`, `AuthEnv` for a host's bindings; `SignedInEnv`, what a guard promises the handlers after it |
| `./openapi` | `authOpenApi(auth)` — Better Auth's paths under `auth.basePath`, tagged `Auth` |
| `./server` | `createAuth(options)`, `Auth`, `toAuthLike(auth)` |
| `./testing` | `stubAuth(overrides?)` (mounted at `/auth` unless `basePath` is overridden), `sessionFor(user?)` |
| `./types` | `App`, `AuthSession`, `AuthLike`, `OpenApiDocument`, `OpenApiFragment` |

## Directory structure

```
src/
  constants/     paths, limits, roles (ROLE_RANK), http (AUTH_METHODS), openapi
  types/         auth (AuthSession, AuthLike, OpenApiDocument, OpenApiFragment)
  environment/   environment (authEnvSchema)
  access/        access (hasRole, canEnterApp, allowedAppsFrom, roleFrom), tests/
  server/        auth (createAuth, toAuthLike), tests/
  openapi/       openapi (authOpenApi), tests/
  testing/       stub-auth (stubAuth, sessionFor)
  hono/
    constants/   variables (AUTH_VAR)
    types/       variables (AuthVariables, AuthEnv, SignedInEnv)
    routes/      auth-routes
    utils/       guard
    middleware/  session-loader, auth-limit, require-session,
                 require-role, require-app
    tests/       routes, middleware, guards (type test)
```

## Mounting it in a Hono backend

```ts
const auth = toAuthLike(
  createAuth({ basePath: "/v1/auth", baseURL, secret, trustedOrigins })
);

new Hono()
  // Before the loader: Better Auth reads its own Session on its routes.
  .route("/", authRoutes(auth))
  .use(sessionLoader(auth))
  .post("/v1/things", requireRole(Role.USER), handler)
  .route("/v1/laura", new Hono().use(requireApp(AllowedApp.LAURA)).get(...));
```

The `AuthLike` port carries the `basePath` given to `createAuth`, so the
routes, the sign-in matcher and the OpenAPI paths all read it from there and
nothing else can drift from it. Guards
throw `HTTPException(401 | 403)`; the host's `onError` renders the response.
A Role check names the lowest Role allowed, never a list: Roles are ranked
(`ROLE_RANK`), and a Role added later slots between two ranks. Every guard
types the Session as present for the handlers chained after it, so
`c.get("session")` needs no null check there.
Better Auth's own rate limiter is off. The host brings its own limiter, built
with the `AUTH_RATE_LIMIT_*` env values, and wraps it in `authLimit(auth, limiter)`: the
module decides which requests count (every route that checks a password,
`LIMITED_AUTH_PATHS`), the host owns the store,
the proxy hop count and the 429 body. Sign-up is disabled: Users come from the seed.

## Trade-off

Sessions live in Postgres behind Better Auth's five-minute cookie cache. A
change to a User's Role or Allowed apps, or a revoked Session, reaches the
guards up to five minutes late. See
[ADR 0009](../../docs/adr/0009-auth-runs-in-the-api-sessions-in-postgres.md).

## Tests

```bash
pnpm --filter @allonfire/auth test
pnpm --filter @allonfire/auth check-types
```

Every test is `unit`: the Prisma client never connects unless a query runs.
