<h1 align="center">@allonfire/auth</h1>

<p align="center">
  <img src="https://img.shields.io/badge/BetterAuth-1.5-8B5CF6?logoColor=white" alt="BetterAuth" />
  <img src="https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/Prisma-adapter-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Zod-4-3068B7?logo=zod&logoColor=white" alt="Zod" />
</p>

<p align="center">
  Sign-in, Sessions, access guards and User management: mounted by a Hono backend, and used by a Next App through it.
</p>

---

## 🔧 Use it

| I want to | Use |
|-----------|-------------------------------------------|
| run auth in a Hono backend | `createAuth` with `toAuthLike`, then `authRoutes`, `sessionLoader`, `authLimit`, `authOpenApi` |
| keep a route to some people | `requireSession()`, `requireApp(app, min?)`, `manageGuard(canManage)` |
| mount the User management routes | `userRoutes(deps)` |
| sign in, sign out or reset a password in a Next App | the actions `signIn`, `signOut`, `requestPasswordReset`, `resetPassword` |
| keep a page signed-in | `withAppSession`, `requireAppSession`, `hasSectionRole` |
| guard and renew in `proxy.ts` | `withSignInGate`, `withSessionRefresh` |
| test without a real instance | `stubAuth`, `sessionFor`, `moduleTestHost`, `stubUserDeps` |

Imports are per file: [`package.json`](package.json) lists the exports, and each one's comment has its rules.

How the API mounts it, cut down from `apps/api`:

```ts
const auth = toAuthLike(
  createAuth({
    avatarLink,
    basePath: API.PATH.AUTH,
    baseURL: env.AUTH_URL,
    cookieDomain: env.AUTH_COOKIE_DOMAIN,
    mail: authMail,
    secret: env.AUTH_SECRET,
    trustedOrigins: env.API_CORS_ORIGINS,
  })
);

new Hono<AppBindings>()
  .use(authRateLimit(auth, store)) // the host's limiter, wrapped in authLimit
  .route(API.PATH.ROOT, authRoutes(auth))
  .use(sessionLoader(auth));
```

## 🗂️ Where things are

```
src/
  environment/   the backend's and a Next App's env schemas
  features/
    hono/        routes, Session loader, guards, rate limit
    next/        a Next App's side: actions, page and proxy guards
    openapi/     Better Auth's paths for the host's document
    server/      createAuth, Registration, mail, joining an app
    users/       User management routes and password rules
  shared/        the AUTH constants, types, test helpers
```

## ⚠️ Watch out

| Trap | What to know |
|------|--------------|
| A Next App never runs Better Auth | it calls the API from its own server and sets the cookies the API answers with |
| `API_AUTH_URL` in Production | the internal address: through the proxy, the per-IP limits count every visitor as one |
| Mount order | `authRoutes` goes before `sessionLoader`: Better Auth reads its own Session there |
| No limit on password guessing | Better Auth's limiter is off: the host brings one and wraps it in `authLimit` |
| Better Auth's routes ignore `CodedError` | refuse there with `APIError` and an `AUTH.ERROR_CODE` ([ADR 0015](../../docs/adr/0015-http-modules-ship-as-packages-and-throw-coded-errors.md)) |
| A revoked Session still passes | up to five minutes (cookie cache); Roles are read on every Session read |
| Registering or joining is refused | the request needs `x-aof-app`, and every app is closed today (`ACCESS.APP_SETTINGS`) |

## 🧪 Test it

```bash
pnpm test:services
pnpm --filter @allonfire/auth test
pnpm --filter @allonfire/auth check-types
```

The services are for the `*.integration.test.ts` files, which run on a Test database.

## 📚 More

`Role`, `App` and the access rules live in [@allonfire/database](../database/README.md).

| You want to | Read |
|-------------|------|
| build a signed-in page | [Next Apps](../../docs/guides/next-apps.md) |
| see the API's guards in use | [API guide](../../docs/guides/api.md) |
| know why auth runs in the API | [ADR 0009](../../docs/adr/0009-auth-runs-in-the-api-sessions-in-postgres.md) |
| know how Roles and Registration work | [ADR 0019](../../docs/adr/0019-roles-are-per-app-memberships.md) |
