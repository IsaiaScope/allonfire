# @allonfire/api

The HTTP backend for the AllOnFire apps. Hono on Node, no auth yet, no domain
endpoints yet.

## Running it

```bash
cp .env.example .env
pnpm --filter @allonfire/api dev      # starts Redis via predev, then tsx watch
```

Then: `http://localhost:3300/health`, `/ready`, `/reference`.

`.env` is required — `dev` passes `--env-file=.env` to Node, so a missing file
fails at startup rather than deep inside the env schema. Tests do not read it;
they get their values from `vitest.setup.ts`.

## Environment

Every variable is documented in `.env.example`. `DATABASE_URL`, `REDIS_URL` and
`CORS_ORIGINS` are required — the process exits at boot if any is missing.

## Writing routes

**Routes must be chained.** `hc<AppType>` derives client types from the chained
return value; separate statements silently degrade them to nothing.

```ts
// correct
export const createThingRoutes = (deps: Deps) =>
  new Hono()
    .get("/things", (c) => c.json({ things: [] }))
    .post("/things", validator("json", schema, validationHook), (c) => c.json({}, 201));

// wrong — client types become unusable, and no runtime test will notice
const app = new Hono();
app.get("/things", handler);
```

`src/client.test-d.ts` guards this. If it starts failing, a route was un-chained.

**Domain routes mount under `/v1`:**

```ts
.route("/v1", createThingRoutes(deps))
```

`/health` and `/ready` stay unversioned — infrastructure endpoints are not part
of the API contract.

**Handlers stay thin.** Domain logic lives in `@allonfire/database`. Validate,
call a service, shape a response.

## Redis

One project-scoped instance, split by database index:

| index | contents | expiry |
|---|---|---|
| 0 | rate-limit counters | always |
| 1 | cache (reserved, unused) | always |
| 2 | sessions (reserved, unused) | never |

Eviction policy is server-wide, so the instance runs `volatile-lru` and only
keys that are safe to lose carry a TTL. Never set a TTL on a session key.

The client runs with `enableOfflineQueue: false` so an outage fails fast instead
of queueing. Anything issuing a command at startup must `awaitReady()` first —
ioredis connects asynchronously, and a command sent before the socket is
writable throws rather than waiting.

## Tests

```bash
pnpm --filter @allonfire/api test
```

All tests but one run with stubs and no container. The rate-limit integration
test requires Redis and will tell you the command to start it.
