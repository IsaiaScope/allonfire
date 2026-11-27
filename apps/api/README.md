<h1 align="center">@allonfire/api</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/Node-24-339933?logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Zod-4-3068B7?logo=zod&logoColor=white" alt="Zod" />
</p>

<p align="center">
  The HTTP API the apps share: sign-in, images, mail and each app's own data. Hono on Node, port 3300.
</p>

---

## 🔧 Use it

| I want to | Use |
|-----------|-----|
| read and try the endpoints | `http://localhost:3300/reference` (the document is `/openapi.json`) |
| call it with types | `ApiType` from `@allonfire/api/client`, as the type of Hono's `hc` |
| add a route | a folder under `src/features/`, mounted in `src/app.ts` ([API guide](../../docs/guides/api.md)) |

In Production the reference is served only with `API_ENABLE_DOCS=true`.

Routes are always one chain, or the typed client loses them:

```ts
export const servicesRoutes = (deps: ServicesDeps) =>
  new Hono<AuthEnv>()
    .post(SERVICES.PATH.KEEP_ALIVE, ...keepAliveHandlers(deps))
    .get(SERVICES.PATH.LIST, ...listHandlers(deps))
    .patch(SERVICES.PATH.SERVICE, ...serviceHandlers(deps));
```

| Under | What is there |
|-------|---------------|
| `/health`, `/ready` | probes, unversioned |
| `/v1/auth` | sign in and out, the Session, password reset, joining an app |
| `/v1/images` | the images the apps show, and their JPEG Export |
| `/v1/services` | the mail providers, and the daily keep-alive |
| `/v1/<app>` | data one app owns, such as `/v1/laura` |
| `/v1/back-office` | Users and overviews, for Back Office Admins |

## 🗂️ Where things are

```
src/
  index.ts       boot, signals, shutdown
  app.ts         middleware order and route mounts
  client.ts      the types a client imports
  environment/   the env schema, checked at boot
  features/      one folder per topic: routes, constants, tests
  shared/        what several features read
```

## ⚠️ Watch out

| Trap | What to do |
|------|------------|
| Separate `app.get(...)` statements pass every runtime test and break client types | chain; `src/client.test-d.ts` guards it |
| A missing `.env` stops `dev` | create it first; tests don't read it (`vitest.setup.ts`) |
| `dev` starts only Redis, telemetry and storage | the database and the image server come from `pnpm docker:up` |
| A Redis command sent before the socket is ready throws | at startup, `awaitReady()` first |
| With Redis down, the rate limits let everything through | the per-address email limit instead refuses with 503 |
| A revoked Session still passes the guards | up to five minutes; a Role change counts at once |
| Registering or joining answers 403 `REGISTRATION_CLOSED` | it needs `x-aof-app`, and every app is closed today |
| No traces or logs in OpenObserve (`localhost:5080`) | set `TELEMETRY_ENDPOINT`; the Local login is in `.env.example` |

## 💻 Run it

First time, from the repo root: [Run it locally](../../README.md#-run-it-locally), which creates `apps/api/.env` and runs `pnpm dev:setup`. Then:

| I want to | Command |
|-----------|---------|
| run it, restarting on a change | `pnpm --filter @allonfire/api dev` |
| run it once | `pnpm --filter @allonfire/api start` |
| test it | `pnpm test:services`, then `pnpm --filter @allonfire/api test` |
| check types | `pnpm --filter @allonfire/api check-types` |
| check translations | `pnpm --filter @allonfire/api i18n:check` |

The integration tests need Docker. They run on a database and a bucket of their own.

## 🔑 Environment

[`.env.example`](.env.example) lists and explains the variables. The API does not boot without these:

- `API_CORS_ORIGINS`, `API_REDIS_URL`, `DATABASE_URL`
- `AUTH_SECRET` (32 characters or more), `AUTH_URL`
- `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`
- `STORAGE_IMAGE_SERVER_URL`, `STORAGE_IMAGE_SERVER_KEY`, `STORAGE_IMAGE_SERVER_SALT`

## 📚 More

| You want to | Read |
|-------------|------|
| structure, errors, guards, Redis, i18n, setting up mail | [API guide](../../docs/guides/api.md) |
| understand images and signed links | [Images](../../docs/guides/images.md) |
| mount or use sign-in | [@allonfire/auth](../../packages/auth/README.md) |
| know why routes are grouped this way | [ADR 0035](../../docs/adr/0035-api-routes-are-grouped-by-who-calls-them.md) |
| know why telemetry works this way | [ADR 0006](../../docs/adr/0006-self-hosted-observability.md) |
