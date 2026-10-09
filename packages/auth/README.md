<h1 align="center">@allonfire/auth</h1>

<p align="center">
  <img src="https://img.shields.io/badge/BetterAuth-1.5-8B5CF6?logoColor=white" alt="BetterAuth" />
  <img src="https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/Prisma-adapter-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Zod-4-3068B7?logo=zod&logoColor=white" alt="Zod" />
</p>

<p align="center">The Auth module: signing in, Sessions and the access rules, mountable by any Hono backend and read by every Next App through it.</p>

## What it is

Better Auth's configuration, the Roles and Apps a User can hold, pure access
predicates, a Hono adapter (routes, Session loader, guards) and the OpenAPI
fragment a host merges into its own document. The API is the only backend that
mounts it today.

A Next App never runs Better Auth itself, and holds no auth logic either:
`features/next` signs in and out (server actions), guards pages, reads and
renews the Session, all by calling the
API from the App's server and setting the cookies it answers with on the
App's own response. An App sets `AUTH_APP`, `API_URL` and `API_AUTH_URL`
(`environment/next-environment`, extended into its env; none has a default)
and draws its own components; who it lets in is `canEnterApp` with the App's
row in `APP_SETTINGS` (its floor and Registration, ADR 0019), the same rule
the API's `requireApp` applies.
Laura still uses the old Next-bound package in `packages/auth-old`,
untracked, until its refactor.

Everything the adapter touches goes through the `AuthLike` port
(`basePath`, `handler`, `getSession`, `openApi`), so a test passes `stubAuth()` instead of a
real instance.

## Exports

Roles and Apps are the Prisma enums, imported from
`@allonfire/database/enums` (`Role.VIEWER`, `App.LAURA`); this package keeps
no copy of them. A User's Role is per App: the Session's `user.memberships`
lists each App they belong to and their Role there. HTTP statuses and methods come from
`@allonfire/core/features/http/constants/http`.

| Export | Contents |
|--------|----------|
| `./environment/environment` | `authEnvSchema` (`AUTH_SECRET`, `AUTH_URL`, `AUTH_COOKIE_DOMAIN` (optional: the parent domain the Session cookies are set for), `AUTH_RATE_LIMIT_KEY_PREFIX`, `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`) to spread into a host's env |
| `./features/hono/guards/middleware/require-app` | `requireApp(app)` — 403 unless the User is allowed into it (`canEnterApp` from `@allonfire/database/features/auth/access/access`: a Membership there whose Role reaches the App's floor in `APP_SETTINGS`); mount it once per App |
| `./features/hono/guards/middleware/require-session` | `requireSession()` — 401 when anonymous |
| `./environment/next-environment` | `nextAuthEnv` (`API_AUTH_URL`, `API_URL`, `AUTH_APP`, all required) for a Next App to extend its env with |
| `./features/next/actions/sign-in` | `signIn(locale, previous, formData)` — server action for `useActionState`, locale bound: home once signed in, else `{ error }` |
| `./features/next/actions/sign-out` | `signOut(locale)` — server action, locale bound: ends the Session, redirects to Sign in |
| `./features/next/constants/access` | `APP_PATH` |
| `./features/next/utils/require-app-session` | `requireAppSession()` — a page's guard: the Session or a redirect to Sign in |
| `./features/next/utils/redirect-to` | `redirectTo(locale, path)` (an unknown locale falls back to the first language, `languageOf`) — an action's form binds the locale (`action.bind(null, locale)`): `next/root-params` does not work in Server Actions yet |
| `./features/next/utils/with-session-refresh` | `withSessionRefresh(proxy)` — wraps an App's proxy to renew the Session cookies |
| `./features/next/constants/api` | `AUTH_COOKIE`, `AUTH_COOKIE_MARKER`, `SIGN_IN_ERROR` (an App translates each), `signInErrorSchema`, `SignInState` |
| `./features/next/utils/access` | `canAccess(user)` — `canEnterApp` for `AUTH_APP` (its row in `APP_SETTINGS`), on the User as the API sends it |
| `./features/next/utils/auth-client` | `createApiAuthClient()` — Better Auth's own client (`better-auth/client`) for the API's auth routes, typed from `Auth`; `ApiAuthClient`, `Session` |
| `./features/next/utils/refresh-session` | `refreshSession(request)` — for an App's proxy: the renewed cookies once the cookie cache has expired |
| `./features/next/utils/session` | `getSession()`, `getAppSession()` (`null` for anyone the App refuses) |
| `./features/next/utils/set-cookie` | `parseSetCookies(headers)` — the API's `Set-Cookie` headers, read by Better Auth's parser, as `cookies().set` takes them |
| `./features/next/utils/sign-in` | `signInWithEmail(formData)` — names the App in `x-aof-app`; the error (`forbidden` when the API refuses the App), or none once it set the Session cookies |
| `./features/next/utils/sign-out` | `signOutOfApi()` — ends the Session and clears the cookies |
| `./features/openapi/openapi` | `authOpenApi(auth)` — Better Auth's paths under `auth.basePath`, tagged `Auth` |
| `./features/hono/rate-limit/middleware/auth-limit` | `authLimit(auth, limiter)` — runs the host's limiter on the routes that check a password (sign-in, change-password) only |
| `./features/server/auth` | `createAuth(options)`, `Auth`, `toAuthLike(auth)` |
| `./features/hono/session/middleware/session-loader` | `sessionLoader(auth)` — reads the Session once per request and passes on any cookie Better Auth refreshes while reading it |
| `./features/hono/routes` | `authRoutes(auth)` — hands `GET`/`POST` under `auth.basePath` to Better Auth; mount it at the root |
| `./shared/constants/errors` | `AUTH_ERROR_CODE` (`APP_FORBIDDEN`, `REGISTRATION_CLOSED`), `authErrorCodeSchema`, `AuthErrorCode` |
| `./shared/constants/limits` | The auth bucket defaults (10 attempts / 15 min, `auth:` key prefix), the secret and cookie-cache limits |
| `./shared/constants/headers` | `APP_HEADER` (`x-aof-app`) |
| `./shared/constants/paths` | `AUTH_PATH`, `SIGN_IN_EMAIL_PATH`, `SIGN_UP_EMAIL_PATH`, `JOIN_APP_PATH`, `CHANGE_PASSWORD_PATH`, `LIMITED_AUTH_PATHS`, `OPENAPI_SCHEMA_PATH` |
| `./shared/tests/stub-auth` | `stubAuth(overrides?)` (mounted at `/auth` unless `basePath` is overridden), `sessionFor(user?)` (a User in every App by default), `membershipsIn(role)` (that Role in every App) |
| `./shared/types/auth` | `App`, `AuthSession`, `AuthLike`, `OpenApiDocument`, `OpenApiFragment` |
| `./features/hono/types/variables` | `AuthVariables`, `AuthEnv` for a host's bindings; `SignedInEnv`, what a guard promises the handlers after it |

## Directory structure

The repo's package layout (`CLAUDE.md`, Package Layout):

```
src/
  environment/   environment (authEnvSchema), next-environment (nextAuthEnv)
  features/
    hono/        the Hono adapter: routes/ (authRoutes), constants/{http,variables},
                 types/variables (AuthEnv, SignedInEnv), tests/, and
      guards/      middleware/{require-session,require-app},
                   utils/guard, tests/ (incl. a type test)
      rate-limit/  middleware/auth-limit, tests/
      session/     middleware/session-loader, tests/
    next/        a Next App's side, through the API: actions/{sign-in,sign-out},
                 constants/{access,api},
                 utils/{access,auth-client,redirect-to,refresh-session,
                 require-app-session,session,with-session-refresh,
                 set-cookie,sign-in,sign-out}, tests/
    openapi/     openapi (authOpenApi), constants/openapi, tests/
    server/      auth (createAuth, toAuthLike), routes/join-app,
                 utils/registration, tests/
  shared/
    constants/   errors, headers, paths, limits
    types/       auth (AuthSession, AuthLike, OpenApi*)
    tests/       stub-auth (stubAuth, sessionFor, membershipsIn)
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
  .post("/v1/things", requireSession(), handler)
  .route("/v1/laura", new Hono().use(requireApp(App.LAURA)).get(...));
```

The `AuthLike` port carries the `basePath` given to `createAuth`, so the
routes, the sign-in matcher and the OpenAPI paths all read it from there and
nothing else can drift from it. Guards
throw `HTTPException(401 | 403)`; the host's `onError` renders the response.
An App's floor names the lowest Role allowed, never a list: Roles are ranked
(`ROLE_RANK`, in `@allonfire/database`), and a Role added later slots between two ranks. Every guard
types the Session as present for the handlers chained after it, so
`c.get("session")` needs no null check there.
Better Auth's own rate limiter is off. The host brings its own limiter, built
with the `AUTH_RATE_LIMIT_*` env values, and wraps it in `authLimit(auth, limiter)`: the
module decides which requests count (every route that checks or hashes a password,
`LIMITED_AUTH_PATHS`), the host owns the store,
the proxy hop count and the 429 body.

## Registration

Each App declares in `APP_SETTINGS` whether a visitor can register there
(`registration`: the Role a newcomer gets, never Admin, or `null`). Every
request that registers or joins names its App in `x-aof-app`, spelled as the
enum key (`BACK_OFFICE`):

- `POST /sign-up/email` creates the User with one Membership, in the named
  App at its Registration Role; a closed App, an unknown name or no header
  answers 403 `REGISTRATION_CLOSED` before the email is looked up.
- `POST /join-app` (needs a Session) adds a Membership in the named open App;
  a Membership already there is left alone, so a Role is never lowered.
- `POST /sign-in/email` with `x-aof-app` answers 403 `APP_FORBIDDEN` to a
  User the App does not let in, and leaves no Session or cookie behind.

The codes are `AUTH_ERROR_CODE` in `./shared/constants/errors`. These
refusals are Better Auth's `APIError`, not `CodedError`: Better Auth's handler
answers them itself (ADR 0015). Every App is
closed today.

## Trade-off

Sessions live in Postgres for 60 days from the last visit (extended at most
once a day), behind Better Auth's five-minute cookie cache. A revoked
Session reaches the guards up to five minutes late; a User's Memberships are
read on every Session read, so a Role change counts at once (ADR 0019). See
[ADR 0009](../../docs/adr/0009-auth-runs-in-the-api-sessions-in-postgres.md).

## Tests

```bash
pnpm --filter @allonfire/auth test
pnpm --filter @allonfire/auth check-types
```

Every test is `unit`: the Prisma client never connects unless a query runs.
