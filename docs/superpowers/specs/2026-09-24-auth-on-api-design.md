# Auth moves to the API — design

**Date:** 2026-09-24
**Scope:** backend only. Laura's frontend is refactored onto this in a later piece of work.

## Intent

The API (`apps/api`) becomes the only authentication server for every App — Laura
web today, the planned React Native client later. Better Auth leaves Laura's Next
process. The auth domain lives in a rebuilt `packages/auth`, written as a module
that any Hono backend can mount; `apps/api` only wires it.

Breaking Laura in the meantime is accepted. Laura's imports of the old package
fail from this change until the frontend refactor rewrites them.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Old package | `git mv packages/auth packages/auth-old`, gitignored, excluded from the pnpm workspace | Kept on this machine as reference; two packages named `@allonfire/auth` would break install |
| Session store | Postgres (`auth."Session"`) + `cookieCache` 5 min | Redis evicts TTL'd keys under `volatile-lru`; silent logouts. Redis db 2 stays reserved |
| Mount path | `/v1/auth/*` via `API_VERSION_PREFIX` | One rule: everything a client calls lives under `/v1` |
| Sign-up | `disableSignUp: true` | No sign-up UI exists; the seed hashes passwords itself. Open sign-up on a public API lets anyone in |
| Role, allowed apps | `user.additionalFields`, `input: false` | They ride in the session and the cookie cache; guards need no extra query |
| Rate limiting | Better Auth's limiter off; API's global limiter plus a stricter Redis bucket on `POST /v1/auth/sign-in/email`: 10 attempts / 15 min, keyed by client IP only | One mechanism; Better Auth's default store is per-process memory and ignores `TRUSTED_PROXY_HOPS` |
| Guard names | `requireSession`, `requireMutation`, `requireAdmin`, `requireApp` — not a generic `requireRole` | The Viewer rule is written once, in `canMutate`; matches Laura's `checkMutationAccess` / `checkAdminAccess` |
| Guard errors | Guards throw `HTTPException(401 \| 403)` | The host renders it; the API's `onError` already turns it into an RFC 9457 problem with a localised detail |
| Better Auth's own errors | Left in Better Auth's JSON shape | Its client parses that shape |
| Web topology (proxy vs subdomain) | Deferred to the frontend refactor | Config is env-driven; no `crossSubDomainCookies` now |
| React Native plugin | Not added | No RN client yet |
| Auth in `/reference` | Better Auth `openAPI()` plugin; the package's `authOpenApi(auth, basePath)` returns its paths prefixed and tagged `Auth`; the API merges them into its one `/openapi.json` | ADR 0004 promises one OpenAPI contract; one `ENABLE_DOCS` gate. Plugin HTTP routes off: `disableDefaultReference: true`, `/open-api/generate-schema` in `disabledPaths` |
| OpenAPI package | Not created | One producer, one consumer; extract when a second module contributes a fragment |
| App identifiers | `APP = { LAURA: "laura" }`, `ALL_APPS = "all"`, `App` type | A typo in `requireApp("lara")` fails to compile instead of locking everyone out |
| `/v1/me` | Not added | `GET /v1/auth/get-session` already returns the user with role and allowed apps |

## `packages/auth` — the module

Framework-free except for an optional Hono adapter. No Next, no React in this phase.

```
packages/auth/
  package.json                  @allonfire/auth; deps better-auth, @allonfire/database, zod; peer hono
  tsconfig.json
  vitest.config.ts
  src/
    constants/paths.ts          AUTH_PATH = "/auth", SIGN_IN_EMAIL_PATH = "/sign-in/email"
    constants/apps.ts           APP, ALL_APPS, App type
    environment/environment.ts  authEnvSchema: BETTER_AUTH_SECRET (min 32), BETTER_AUTH_URL (url)
    server/
      auth.ts                   createAuth(options) -> betterAuth(...); Auth, Session types
      tests/
    access/
      access.ts                 canMutate(role), isAdmin(role), canEnterApp(allowedApps, app)
      tests/
    openapi/
      openapi.ts                authOpenApi(auth, basePath): Better Auth paths prefixed, tagged Auth, plus component schemas
      tests/
    hono/
      types/variables.ts        AuthLike (handler + api.getSession), AuthVariables
      routes/auth-routes.ts     authRoutes(auth): chained Hono sub-app, GET/POST "/*" -> auth.handler(c.req.raw)
      middleware/
        session-loader.ts       sessionLoader(auth): sets c.var.session (null when anonymous)
        require-session.ts      requireSession(): 401 when no session
        require-mutation.ts     requireMutation(): 403 for a Viewer (canMutate)
        require-admin.ts        requireAdmin(): 403 unless ADMIN (isAdmin)
        require-app.ts          requireApp(app): 403 when allowedApps lacks app and "all"
      tests/
```

Exports are one path per file, no barrels: `./constants/paths`, `./constants/apps`, `./openapi`, `./environment`,
`./server`, `./access`, `./hono/routes`, `./hono/middleware/session-loader`,
`./hono/middleware/require-session`, `./hono/middleware/require-mutation`,
`./hono/middleware/require-admin`,
`./hono/middleware/require-app`, `./hono/types`.

`createAuth` options: `secret`, `baseURL`, `basePath`, `trustedOrigins`. It
configures `prismaAdapter(prisma, { provider: "postgresql" })`,
`emailAndPassword: { enabled: true, disableSignUp: true }`,
`session.cookieCache` 5 min, `user.additionalFields` `role` and `allowedApps`
with `input: false`, `rateLimit: { enabled: false }`, and
`plugins: [openAPI({ disableDefaultReference: true })]` with
`disabledPaths: ["/open-api/generate-schema"]`.

Middleware is typed against `AuthLike`, not the full Better Auth instance, so a
test passes a two-method stub and another Hono backend passes its own
`createAuth(...)`.

The frontend refactor later adds `./client` (`createAuthClient` with
`inferAdditionalFields<Auth>`), the login form and providers to this same package.
That is why the server config lives here and not in `apps/api`: the client needs
its type.

## `apps/api` — the host

```
apps/api/src/features/auth/
  auth.ts                       auth = createAuth({ ...env, basePath, trustedOrigins: env.CORS_ORIGINS })
  constants/limits.ts           sign-in window and max
  middleware/sign-in-limit.ts   limiter on POST SIGN_IN_EMAIL_PATH, own Redis key namespace and window
  tests/
```

- `environment.ts` spreads `authEnvSchema`; `.env.example`, `vitest.setup.ts`
  and `turbo.json` gain the two variables.
- `AppDeps` gains `auth: AuthLike` and `signInStore: RateLimitStore`;
  `shared/tests/app-deps.ts` supplies stubs.
- `AppBindings.Variables` includes `AuthVariables`.
- `createApp` order: existing chain -> global rate limit -> sign-in limit ->
  `sessionLoader` -> `.route(API_VERSION_PREFIX + AUTH_PATH, authRoutes(auth))`.
- `routes/docs`: `specHandler` moves from `openAPIRouteHandler` to
  `hono-openapi`'s `generateSpecs`, then `utils/merge.ts` folds in
  `authOpenApi(auth, basePath)`. Still behind `isDocsEnabled`.
- `index.ts` builds the real `auth` and a second `createRedisStore` for the
  sign-in window.

## Flow and errors

A request passes the global limiter, then the sign-in bucket (only
`POST /v1/auth/sign-in/email`), then `sessionLoader`, then either Better Auth's
handler or a domain route with guards.

- Guard denial: `HTTPException(401)` or `(403)`, rendered by the host's
  `onError` as `UNAUTHORIZED` / `FORBIDDEN` problem documents.
- `getSession` throwing (database down) propagates to `onError` as a 500. It is
  never read as "anonymous".
- Sign-in bucket exhausted: the existing limiter handler's 429 problem with
  `Retry-After`. The limiter fails open like the global one; scrypt hashing is
  the second line against guessing while Redis is down.

## Delivery

This branch is not merged on its own. CI type-checks and builds the whole repo,
so Laura goes red here; the frontend refactor stacks on this branch and both
merge to `dev` together.

Recorded in ADR 0009 (auth in the API, Sessions in Postgres); CONTEXT.md gains
**Auth module** and **Session**.

## Known trade-offs

- A role or `allowedApps` change, or a revoked session, reaches the guards up to
  5 minutes late (cookie cache).
- `packages/auth-old` exists only on this machine.
- Laura fails type-check and build until the frontend refactor.

## Testing

- `packages/auth`: `access` unit tests; each Hono middleware and `authRoutes`
  against a small Hono app with a stub `AuthLike`.
- `apps/api`: through `createApp(appDeps())` — a guarded test route answers 401
  as a problem document, the sign-in bucket answers 429 after its max,
  `/v1/auth/*` reaches the handler.
- `/openapi.json` contains `/v1/auth/sign-in/email` under tag `Auth` and still
  the existing routes; `/v1/auth/open-api/generate-schema` answers 404.
- One real sign-in test against Postgres: `*.integration.test.ts` tagged
  `// @module-tag integration`. Tests use Vitest globals.

## Unknowns to settle first (spike tasks)

- Whether Better Auth's generated paths already include `basePath`.
- Whether `disabledPaths` still allows the in-process
  `auth.api.generateOpenAPISchema()` call.
- Whether `additionalFields` accepts the `Role` enum as a literal union
  (`type: ["ADMIN","USER","VIEWER"]`) so `session.user.role` types as `Role`.
