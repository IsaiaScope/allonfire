# Auth on the API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Better Auth runs in `apps/api` under `/v1/auth/*`, built as a rebuilt `packages/auth` Auth module that any Hono backend can mount, with guards, a sign-in rate limit, and its endpoints merged into `/openapi.json`.

**Architecture:** `packages/auth` owns the Better Auth config, role and app constants, pure access predicates, an OpenAPI fragment builder, and a Hono adapter (routes, session loader, guards that throw `HTTPException`). Everything the adapter touches goes through a narrow `AuthLike` port, so tests pass a stub. `apps/api` only wires it: env, the instance, a stricter Redis-backed sign-in bucket, middleware order, and the docs merge.

**Tech Stack:** Better Auth 1.5 (`openAPI` plugin, Prisma adapter), Hono 4, hono-openapi `generateSpecs`, Vitest 4 (globals), zod 4, Prisma 6.

**Spec:** `docs/superpowers/specs/2026-09-24-auth-on-api-design.md`. Decisions recorded in `docs/adr/0009-auth-runs-in-the-api-sessions-in-postgres.md`; glossary terms **Auth module**, **Session** in `CONTEXT.md`.

## Global Constraints

- No commit steps. The user commits with `/iso-commit`; never run `git commit`.
- This branch is not merged alone. Laura goes red in CI here (type-check, build) and its Playwright `e2e/login.spec.ts` breaks; the frontend refactor stacks on this branch.
- Mount path `/v1/auth`, built as `${API_VERSION_PREFIX}${AUTH_PATH}`. Never a hard-coded `"/v1/auth"` in source.
- Sessions stay in Postgres; `session.cookieCache` 5 min. Nothing touches Redis db 2.
- `emailAndPassword: { enabled: true, disableSignUp: true }`; `rateLimit: { enabled: false }`.
- Sign-in bucket: 10 attempts / 15 min, keyed by client IP only, on `POST /v1/auth/sign-in/email`.
- Guards throw `HTTPException(401 | 403)`; they never build a response.
- `getSession` failing propagates as a 500. It is never read as anonymous.
- Better Auth plugin HTTP routes stay off: `disableDefaultReference: true`, `/open-api/generate-schema` in `disabledPaths`.
- Folders mirror `apps/api/src`: one folder per concept with its own `constants/`, `middleware/`, `utils/`, `types/`, `tests/`. No barrels, no `<name>.` filename prefixes, named exports only.
- Use `objectKeys` / `objectEntries` / `objectFromEntries` / `objectValues` from `@allonfire/utils/object`, never the `Object.*` versions.
- Vitest globals (no `from "vitest"` import). Every test file's first line is `// @module-tag unit` or `// @module-tag integration`; the shared setup (`packages/config/tests/vitest.setup.ts`) fails a test with neither. Postgres-dependent tests are `*.integration.test.ts` and tagged `integration`.
- `pnpm test:unit` (root, `--tags-filter=unit`) must pass with no Docker up; anything needing Postgres or Redis is `integration`.
- Test helpers already exist, so reuse them rather than writing new ones: `memoryStore(windowMs?)` (`features/rate-limit/tests/memory-store.ts`), `appDeps()`, `captureLog()`. API tests run with `LOG_LEVEL=silent`; a test that asserts on log lines uses `captureLog()`.
- New npm dependencies: only `better-auth` and `@better-auth/prisma-adapter` (already in the lockfile at 1.5.3).
- End with `pnpm dlx @biomejs/biome check --write` scoped to touched files only, never repo-wide.

## Review Focus

- A trailing slash (`POST /v1/auth/sign-in/email/`) must not slip past the sign-in bucket. Test in Task 7.
- The `Set-Cookie` header Better Auth returns must survive the API's middleware chain (security headers, CORS). Test in Task 7.
- A viewer's real session, not a stub, must be refused by `requireMutation` — proves `additionalFields` reach the guards. Test in Task 9.
- Merged `/openapi.json` must not silently overwrite a component when both documents define the same name. Test in Task 8.
- `POST /v1/auth/sign-up/email` must not create a User. Test in Task 9.

---

## File Structure

```
packages/auth-old/                      old package, git-untracked, excluded from workspace
packages/auth/
  package.json  tsconfig.json  vitest.config.ts  vitest.setup.ts  README.md
  src/
    constants/
      apps.ts            APP, ALL_APPS, App
      roles.ts           ROLE
      paths.ts           AUTH_PATH, SIGN_IN_EMAIL_PATH, OPENAPI_SCHEMA_PATH
      limits.ts          SECRET_MIN_LENGTH, COOKIE_CACHE_MAX_AGE_S
      http.ts            AUTH_HTTP_STATUS, AUTH_METHODS
      openapi.ts         AUTH_OPENAPI_TAG
    types/auth.ts        AuthSession, AuthLike, OpenApiDocument, OpenApiFragment
    environment/environment.ts          authEnvSchema
    access/access.ts                    canMutate, isAdmin, canEnterApp
    access/tests/access.test.ts
    server/auth.ts                      createAuth, toAuthLike, Auth
    server/tests/auth.test.ts
    openapi/openapi.ts                  authOpenApi
    openapi/tests/openapi.test.ts
    testing/stub-auth.ts                stubAuth, sessionFor
    hono/
      constants/variables.ts            AUTH_VAR
      types/variables.ts                AuthVariables, AuthEnv
      routes/auth-routes.ts             authRoutes
      utils/guard.ts                    guard, requiredSession
      middleware/session-loader.ts      sessionLoader
      middleware/require-session.ts     requireSession
      middleware/require-mutation.ts    requireMutation
      middleware/require-admin.ts       requireAdmin
      middleware/require-app.ts         requireApp
      tests/routes.test.ts
      tests/middleware.test.ts
apps/api/src/
  features/auth/
    auth.ts                             auth (AuthLike instance)
    constants/limits.ts                 SIGN_IN_LIMIT
    middleware/sign-in-limit.ts         signInLimit, SIGN_IN_ROUTE
    tests/auth-routes.test.ts
    tests/guards.test.ts
    tests/sign-in-limit.test.ts
    tests/sign-in.integration.test.ts
  features/environment/environment.ts   + authEnvSchema
  features/rate-limit/middleware/rate-limiter.ts   + keyPrefix option
  routes/docs/handlers.ts               generateSpecs + merge
  routes/docs/index.ts                  docsRoutes(app, auth)
  routes/docs/utils/merge.ts            mergeOpenApi
  routes/docs/tests/merge.test.ts
  shared/constants/routes.ts            + AUTH_BASE_PATH
  shared/constants/http.ts              + HTTP_METHOD
  shared/types/bindings.ts              + AuthVariables
  shared/tests/app-deps.ts              + auth, signInStore
  app.ts  index.ts
```

---

### Task 1: Retire the old package

**Files:**
- Move: `packages/auth/` → `packages/auth-old/`
- Modify: `.gitignore`, `pnpm-workspace.yaml`, possibly `biome.jsonc`

**Interfaces:**
- Produces: an empty `packages/auth` path and a workspace with no second `@allonfire/auth`.

- [ ] **Step 1: Move and untrack**

The old package now carries a `vitest.config.ts` and a `test` script from the shared-Vitest work; they move with it. `git rm --cached` also drops the staged-but-uncommitted `vitest.config.ts` from the index.

```bash
git mv packages/auth packages/auth-old
git rm -r --cached --quiet packages/auth-old
```

- [ ] **Step 2: Ignore it**

Append to `.gitignore`:

```gitignore

# Old Next-bound auth package, kept locally as reference until Laura's refactor
/packages/auth-old/
```

- [ ] **Step 3: Exclude it from the workspace**

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "!packages/auth-old"
```

- [ ] **Step 4: Check Biome ignores it**

Run: `pnpm dlx @biomejs/biome check packages/auth-old 2>&1 | tail -3`
Expected: no files processed / ignored. If Biome lints it, add `"!packages/auth-old"` to the `files.includes` array in `biome.jsonc` (create `"files": { "includes": ["**", "!packages/auth-old"] }` if absent) and re-run.

- [ ] **Step 5: Verify**

Run: `git status --short packages/auth packages/auth-old` — expected only `D  packages/auth/...` lines (the staged `vitest.config.ts` simply disappears from the index).
Run: `ls packages/auth-old/src/server.ts` — expected: file exists.

---

### Task 2: Scaffold `packages/auth` with constants and access predicates

**Files:**
- Create: `packages/auth/package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`
- Create: `packages/auth/src/constants/{apps,roles,paths,limits,http,openapi}.ts`
- Create: `packages/auth/src/access/access.ts`
- Test: `packages/auth/src/access/tests/access.test.ts`

**Interfaces:**
- Produces: `APP`, `ALL_APPS`, `type App`, `ROLE`, `AUTH_PATH = "/auth"`, `SIGN_IN_EMAIL_PATH = "/sign-in/email"`, `OPENAPI_SCHEMA_PATH = "/open-api/generate-schema"`, `SECRET_MIN_LENGTH = 32`, `COOKIE_CACHE_MAX_AGE_S = 300`, `AUTH_HTTP_STATUS = { UNAUTHORIZED: 401, FORBIDDEN: 403 }`, `AUTH_METHODS = ["GET","POST"]`, `AUTH_OPENAPI_TAG = "Auth"`, `canMutate(role: Role): boolean`, `isAdmin(role: Role): boolean`, `canEnterApp(allowedApps: readonly string[], app: App): boolean`.

- [ ] **Step 1: Package files**

`packages/auth/package.json`:

```json
{
  "name": "@allonfire/auth",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./access": "./src/access/access.ts",
    "./constants/apps": "./src/constants/apps.ts",
    "./constants/paths": "./src/constants/paths.ts",
    "./constants/roles": "./src/constants/roles.ts",
    "./environment": "./src/environment/environment.ts",
    "./hono/middleware/require-admin": "./src/hono/middleware/require-admin.ts",
    "./hono/middleware/require-app": "./src/hono/middleware/require-app.ts",
    "./hono/middleware/require-mutation": "./src/hono/middleware/require-mutation.ts",
    "./hono/middleware/require-session": "./src/hono/middleware/require-session.ts",
    "./hono/middleware/session-loader": "./src/hono/middleware/session-loader.ts",
    "./hono/routes": "./src/hono/routes/auth-routes.ts",
    "./hono/types": "./src/hono/types/variables.ts",
    "./openapi": "./src/openapi/openapi.ts",
    "./server": "./src/server/auth.ts",
    "./testing": "./src/testing/stub-auth.ts",
    "./types": "./src/types/auth.ts"
  },
  "scripts": {
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@allonfire/database": "workspace:*",
    "@allonfire/utils": "workspace:*",
    "@better-auth/prisma-adapter": "^1.5.3",
    "better-auth": "^1.5.3",
    "zod": "^4.3.6"
  },
  "peerDependencies": {
    "hono": "^4.9.0"
  },
  "devDependencies": {
    "@allonfire/config": "workspace:*",
    "hono": "^4.9.0",
    "typescript": "~6.0.3",
    "vitest": "^4.1.11"
  }
}
```

`packages/auth/tsconfig.json`:

```json
{
  "extends": "../config/typescript/node.json",
  "compilerOptions": {
    "paths": {
      "@allonfire/database": ["../database/src/index.ts"],
      "@allonfire/utils/*": ["../utils/src/*"]
    },
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "vitest.config.ts", "vitest.setup.ts"],
  "exclude": ["node_modules"]
}
```

`packages/auth/vitest.config.ts` (the old package's one was a bare re-export; this one adds a setup file, which `mergeConfig` appends after the shared tag check):

```ts
import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      include: ["src/**/*.test.ts"],
      setupFiles: ["./vitest.setup.ts"],
    },
  })
);
```

`packages/auth/vitest.setup.ts`:

```ts
// `@allonfire/database` validates its env at import; the Prisma client never
// connects unless a query runs, so no test here needs Postgres up.
process.env.DATABASE_URL ??=
  "postgresql://allonfire:allonfire@localhost:5432/allonfire";
```

Run: `pnpm install`
Expected: succeeds; `pnpm ls -r --depth -1 | grep @allonfire/auth` shows one entry at `packages/auth`.

- [ ] **Step 2: Constants**

`src/constants/apps.ts`:

```ts
import type { ValueOf } from "@allonfire/utils/object";

/** Every App a User can be allowed into. Adding an App is one line here. */
export const APP = {
  LAURA: "laura",
} as const;

export type App = ValueOf<typeof APP>;

/** The Allowed apps value that grants every App. */
export const ALL_APPS = "all";
```

`src/constants/roles.ts`:

```ts
import type { Role } from "@allonfire/database";

/** Runtime twin of the Prisma `Role` enum; the `satisfies` fails if they drift. */
export const ROLE = {
  ADMIN: "ADMIN",
  USER: "USER",
  VIEWER: "VIEWER",
} as const satisfies { [K in Role]: K };
```

`src/constants/paths.ts`:

```ts
/** Where a host mounts the auth routes, under its own prefix. */
export const AUTH_PATH = "/auth";

/** Relative to the auth base path. Hosts rate-limit it harder. */
export const SIGN_IN_EMAIL_PATH = "/sign-in/email";

/** The `openAPI` plugin's HTTP route; disabled, the schema is read in-process. */
export const OPENAPI_SCHEMA_PATH = "/open-api/generate-schema";
```

`src/constants/limits.ts`:

```ts
/** Better Auth signs cookies with this secret; 32 chars is its own minimum advice. */
export const SECRET_MIN_LENGTH = 32;

/** How long a signed session copy in the cookie spares a Postgres read. */
export const COOKIE_CACHE_MAX_AGE_S = 5 * 60;
```

`src/constants/http.ts`:

```ts
/** The only statuses the guards throw. Numeric literals, as in apps/api. */
export const AUTH_HTTP_STATUS = {
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
} as const;

/** Methods Better Auth's handler answers. */
export const AUTH_METHODS = ["GET", "POST"] as const;
```

`src/constants/openapi.ts`:

```ts
/** Tag every Better Auth operation carries in a host's OpenAPI document. */
export const AUTH_OPENAPI_TAG = "Auth";
```

- [ ] **Step 3: Write the failing access test**

`src/access/tests/access.test.ts`:

```ts
// @module-tag unit
import { ALL_APPS, APP } from "../../constants/apps";
import { ROLE } from "../../constants/roles";
import { canEnterApp, canMutate, isAdmin } from "../access";

describe("canMutate", () => {
  it("refuses a Viewer and allows everyone else", () => {
    expect(canMutate(ROLE.VIEWER)).toBe(false);
    expect(canMutate(ROLE.USER)).toBe(true);
    expect(canMutate(ROLE.ADMIN)).toBe(true);
  });
});

describe("isAdmin", () => {
  it("is true only for ADMIN", () => {
    expect(isAdmin(ROLE.ADMIN)).toBe(true);
    expect(isAdmin(ROLE.USER)).toBe(false);
    expect(isAdmin(ROLE.VIEWER)).toBe(false);
  });
});

describe("canEnterApp", () => {
  it("allows the named App or all, nothing else", () => {
    expect(canEnterApp([APP.LAURA], APP.LAURA)).toBe(true);
    expect(canEnterApp([ALL_APPS], APP.LAURA)).toBe(true);
    expect(canEnterApp([], APP.LAURA)).toBe(false);
    expect(canEnterApp(["social"], APP.LAURA)).toBe(false);
  });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `pnpm --filter @allonfire/auth test`
Expected: FAIL, cannot resolve `../access`.

- [ ] **Step 5: Implement**

`src/access/access.ts`:

```ts
import type { Role } from "@allonfire/database";
import { ALL_APPS, type App } from "../constants/apps";
import { ROLE } from "../constants/roles";

/** A Viewer browses and plays; every other Role may change data. */
export const canMutate = (role: Role): boolean => role !== ROLE.VIEWER;

export const isAdmin = (role: Role): boolean => role === ROLE.ADMIN;

export const canEnterApp = (allowedApps: readonly string[], app: App): boolean =>
  allowedApps.includes(ALL_APPS) || allowedApps.includes(app);
```

- [ ] **Step 6: Run to pass**

Run: `pnpm --filter @allonfire/auth test && pnpm --filter @allonfire/auth check-types`
Expected: PASS, no type errors.

---

### Task 3: `createAuth`, the `AuthLike` port, and the spike facts

**Files:**
- Create: `packages/auth/src/types/auth.ts`
- Create: `packages/auth/src/environment/environment.ts`
- Create: `packages/auth/src/server/auth.ts`
- Test: `packages/auth/src/server/tests/auth.test.ts`

**Interfaces:**
- Consumes: constants from Task 2.
- Produces:
  - `type AuthSession = { session: { id: string; expiresAt: Date }; user: { id: string; email: string; name: string; role: Role; allowedApps: string[] } }`
  - `type OpenApiOperation = { tags?: string[] } & Record<string, unknown>`
  - `type OpenApiDocument = { paths: Record<string, Record<string, OpenApiOperation>>; components?: Record<string, Record<string, unknown>> }`
  - `type OpenApiFragment = { paths: OpenApiDocument["paths"]; components: Record<string, Record<string, unknown>>; tags: { name: string }[] }`
  - `type AuthLike = { handler(request: Request): Promise<Response>; getSession(headers: Headers): Promise<AuthSession | null>; openApi(): Promise<OpenApiDocument> }`
  - `authEnvSchema = { BETTER_AUTH_SECRET, BETTER_AUTH_URL }`
  - `type CreateAuthOptions = { secret: string; baseURL: string; basePath: string; trustedOrigins: string[] }`
  - `createAuth(options: CreateAuthOptions)`, `type Auth`, `toAuthLike(auth: Auth): AuthLike`

- [ ] **Step 1: Types and env schema**

`src/types/auth.ts`:

```ts
import type { Role } from "@allonfire/database";

/** What the guards and hosts read from a Session. Better Auth's is a superset. */
export type AuthSession = {
  session: { id: string; expiresAt: Date };
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    allowedApps: string[];
  };
};

export type OpenApiOperation = { tags?: string[] } & Record<string, unknown>;

/** Only the parts of an OpenAPI document the merge reads. */
export type OpenApiDocument = {
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: Record<string, Record<string, unknown>>;
};

/** Better Auth's paths, ready to fold into a host's document. */
export type OpenApiFragment = {
  paths: OpenApiDocument["paths"];
  components: Record<string, Record<string, unknown>>;
  tags: { name: string }[];
};

/**
 * The port every adapter uses. Narrow on purpose: a test passes a stub, and
 * Better Auth's overloaded `api.getSession` never leaks into a signature.
 */
export type AuthLike = {
  handler: (request: Request) => Promise<Response>;
  getSession: (headers: Headers) => Promise<AuthSession | null>;
  openApi: () => Promise<OpenApiDocument>;
};
```

`src/environment/environment.ts`:

```ts
import { z } from "zod";
import { SECRET_MIN_LENGTH } from "../constants/limits";

/** Spread into a host's env `server` block. */
export const authEnvSchema = {
  BETTER_AUTH_SECRET: z.string().min(SECRET_MIN_LENGTH),
  BETTER_AUTH_URL: z.url(),
};
```

- [ ] **Step 2: Write the failing server test (the spike facts live here)**

`src/server/tests/auth.test.ts`:

```ts
// @module-tag unit
import type { Role } from "@allonfire/database";
import { OPENAPI_SCHEMA_PATH, SIGN_IN_EMAIL_PATH } from "../../constants/paths";
import { type Auth, createAuth, toAuthLike } from "../auth";

const BASE_URL = "http://localhost:3300";
const BASE_PATH = "/v1/auth";

const auth = createAuth({
  basePath: BASE_PATH,
  baseURL: BASE_URL,
  secret: "x".repeat(32),
  trustedOrigins: ["http://localhost:3200"],
});

describe("createAuth", () => {
  it("generates the OpenAPI schema in-process with paths relative to basePath", async () => {
    const document = await toAuthLike(auth).openApi();
    expect(objectKeys(document.paths)).toContain(SIGN_IN_EMAIL_PATH);
    expect(objectKeys(document.paths)).not.toContain(
      `${BASE_PATH}${SIGN_IN_EMAIL_PATH}`
    );
  });

  it("does not serve the schema over HTTP", async () => {
    const res = await auth.handler(
      new Request(`${BASE_URL}${BASE_PATH}${OPENAPI_SCHEMA_PATH}`)
    );
    expect(res.status).toBe(404);
  });

  it("does not serve the plugin's reference page", async () => {
    const res = await auth.handler(
      new Request(`${BASE_URL}${BASE_PATH}/reference`)
    );
    expect(res.status).toBe(404);
  });

  it("types role as the Prisma Role union", () => {
    expectTypeOf<Auth["$Infer"]["Session"]["user"]["role"]>().toEqualTypeOf<Role>();
  });
});
```

Add at the top: `import { objectKeys } from "@allonfire/utils/object";`

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm --filter @allonfire/auth test src/server`
Expected: FAIL, cannot resolve `../auth`.

- [ ] **Step 4: Implement**

`src/server/auth.ts`:

```ts
import { prisma } from "@allonfire/database";
import { objectValues } from "@allonfire/utils/object";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";
import { ALL_APPS } from "../constants/apps";
import { COOKIE_CACHE_MAX_AGE_S } from "../constants/limits";
import { OPENAPI_SCHEMA_PATH } from "../constants/paths";
import { ROLE } from "../constants/roles";
import type { AuthLike } from "../types/auth";

export type CreateAuthOptions = {
  secret: string;
  /** Public origin the host is reached at. */
  baseURL: string;
  /** Where the host mounted the routes, e.g. `/v1/auth`. */
  basePath: string;
  /** Browser origins allowed to send cookie-bearing requests. */
  trustedOrigins: string[];
};

export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    ...options,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    disabledPaths: [OPENAPI_SCHEMA_PATH],
    // Users are created by the seed, never by a request.
    emailAndPassword: { disableSignUp: true, enabled: true },
    plugins: [openAPI({ disableDefaultReference: true })],
    // The host rate-limits with its own shared store; Better Auth's default is
    // per-process memory and does not know the proxy hop count.
    rateLimit: { enabled: false },
    session: {
      cookieCache: { enabled: true, maxAge: COOKIE_CACHE_MAX_AGE_S },
    },
    user: {
      additionalFields: {
        allowedApps: {
          defaultValue: [ALL_APPS],
          input: false,
          type: "string[]",
        },
        role: {
          defaultValue: ROLE.USER,
          input: false,
          type: objectValues(ROLE),
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export const toAuthLike = (auth: Auth): AuthLike => ({
  getSession: (headers) => auth.api.getSession({ headers }),
  handler: (request) => auth.handler(request),
  openApi: () => auth.api.generateOpenAPISchema(),
});
```

- [ ] **Step 5: Run to pass, and settle the spike facts**

Run: `pnpm --filter @allonfire/auth test src/server && pnpm --filter @allonfire/auth check-types`
Expected: PASS.

If a spike assertion fails, apply the matching fix, keep the test, re-run:
- **Paths already carry `basePath`** (first test fails): flip the two `toContain` assertions, and in Task 4 drop the `${basePath}` prefix in `authOpenApi` and its test.
- **`generateOpenAPISchema()` rejects** because of `disabledPaths`: remove `disabledPaths` from `createAuth`; in Task 5 make `authRoutes` answer `404` for `OPENAPI_SCHEMA_PATH` before calling the handler (`if (context.req.path.endsWith(OPENAPI_SCHEMA_PATH)) return context.notFound();`), and move the "does not serve the schema over HTTP" test to `hono/tests/routes.test.ts`.
- **`role` types as `string`** (type test fails, and `toAuthLike` fails to compile): change `role.type` to `"string"` and parse in the adapter:

```ts
import { z } from "zod";
const roleSchema = z.enum(ROLE);
// in toAuthLike:
getSession: async (headers) => {
  const found = await auth.api.getSession({ headers });
  return found && { ...found, user: { ...found.user, role: roleSchema.parse(found.user.role) } };
},
```

and change the type test to `expectTypeOf(...).toEqualTypeOf<string>()` with a comment naming why.

---

### Task 4: `authOpenApi` fragment builder

**Files:**
- Create: `packages/auth/src/openapi/openapi.ts`
- Create: `packages/auth/src/testing/stub-auth.ts`
- Test: `packages/auth/src/openapi/tests/openapi.test.ts`

**Interfaces:**
- Consumes: `AuthLike`, `OpenApiFragment`, `AUTH_OPENAPI_TAG`.
- Produces: `authOpenApi(auth: AuthLike, basePath: string): Promise<OpenApiFragment>`; `stubAuth(overrides?: Partial<AuthLike>): AuthLike`; `sessionFor(user?: Partial<AuthSession["user"]>): AuthSession`.

- [ ] **Step 1: Test helper**

`src/testing/stub-auth.ts`:

```ts
import { ALL_APPS } from "../constants/apps";
import { ROLE } from "../constants/roles";
import type { AuthLike, AuthSession } from "../types/auth";

const SESSION_TTL_MS = 60_000;

/** A signed-in Session; override the user fields a test is about. */
export function sessionFor(user: Partial<AuthSession["user"]> = {}): AuthSession {
  return {
    session: { expiresAt: new Date(Date.now() + SESSION_TTL_MS), id: "session-1" },
    user: {
      allowedApps: [ALL_APPS],
      email: "user@allonfire.test",
      id: "user-1",
      name: "Test User",
      role: ROLE.USER,
      ...user,
    },
  };
}

/** Anonymous, no routes, empty schema — override what the test needs. */
export function stubAuth(overrides: Partial<AuthLike> = {}): AuthLike {
  return {
    getSession: () => Promise.resolve(null),
    handler: () => Promise.resolve(new Response(null, { status: 404 })),
    openApi: () => Promise.resolve({ paths: {} }),
    ...overrides,
  };
}
```

- [ ] **Step 2: Failing test**

`src/openapi/tests/openapi.test.ts`:

```ts
// @module-tag unit
import { AUTH_OPENAPI_TAG } from "../../constants/openapi";
import { stubAuth } from "../../testing/stub-auth";
import { authOpenApi } from "../openapi";

const auth = stubAuth({
  openApi: () =>
    Promise.resolve({
      components: {
        schemas: { User: { type: "object" } },
        securitySchemes: { bearerAuth: { type: "http" } },
      },
      paths: {
        "/get-session": { get: { tags: ["Default"] } },
        "/sign-in/email": { post: { tags: ["Default"], summary: "Sign in" } },
      },
    }),
});

describe("authOpenApi", () => {
  it("prefixes every path with the base path", async () => {
    const fragment = await authOpenApi(auth, "/v1/auth");
    expect(fragment.paths).toHaveProperty(["/v1/auth/sign-in/email"]);
    expect(fragment.paths).toHaveProperty(["/v1/auth/get-session"]);
    expect(fragment.paths).not.toHaveProperty(["/sign-in/email"]);
  });

  it("retags every operation and keeps the rest of it", async () => {
    const fragment = await authOpenApi(auth, "/v1/auth");
    expect(fragment.paths["/v1/auth/sign-in/email"]?.post).toEqual({
      summary: "Sign in",
      tags: [AUTH_OPENAPI_TAG],
    });
    expect(fragment.tags).toEqual([{ name: AUTH_OPENAPI_TAG }]);
  });

  it("carries every component group so $refs still resolve", async () => {
    const fragment = await authOpenApi(auth, "/v1/auth");
    expect(fragment.components).toEqual({
      schemas: { User: { type: "object" } },
      securitySchemes: { bearerAuth: { type: "http" } },
    });
  });
});
```

- [ ] **Step 3: Run to fail**

Run: `pnpm --filter @allonfire/auth test src/openapi`
Expected: FAIL, cannot resolve `../openapi`.

- [ ] **Step 4: Implement**

`src/openapi/openapi.ts`:

```ts
import { objectEntries, objectFromEntries } from "@allonfire/utils/object";
import { AUTH_OPENAPI_TAG } from "../constants/openapi";
import type { AuthLike, OpenApiFragment } from "../types/auth";

/**
 * Better Auth's own OpenAPI document, reshaped for a host to merge: paths
 * under the host's mount point, one `Auth` tag instead of Better Auth's.
 */
export async function authOpenApi(
  auth: AuthLike,
  basePath: string
): Promise<OpenApiFragment> {
  const document = await auth.openApi();
  const paths = objectFromEntries(
    objectEntries(document.paths).map(([path, operations]) => [
      `${basePath}${path}`,
      objectFromEntries(
        objectEntries(operations).map(([method, operation]) => [
          method,
          { ...operation, tags: [AUTH_OPENAPI_TAG] },
        ])
      ),
    ])
  );
  return {
    components: document.components ?? {},
    paths,
    tags: [{ name: AUTH_OPENAPI_TAG }],
  };
}
```

- [ ] **Step 5: Run to pass**

Run: `pnpm --filter @allonfire/auth test && pnpm --filter @allonfire/auth check-types`
Expected: PASS.

---

### Task 5: Hono adapter — routes, session loader, guards

**Files:**
- Create: `packages/auth/src/hono/constants/variables.ts`, `hono/types/variables.ts`
- Create: `packages/auth/src/hono/routes/auth-routes.ts`
- Create: `packages/auth/src/hono/utils/guard.ts`
- Create: `packages/auth/src/hono/middleware/{session-loader,require-session,require-mutation,require-admin,require-app}.ts`
- Test: `packages/auth/src/hono/tests/routes.test.ts`, `packages/auth/src/hono/tests/middleware.test.ts`

**Interfaces:**
- Consumes: `AuthLike`, `AuthSession`, `canMutate`, `isAdmin`, `canEnterApp`, `App`, `AUTH_HTTP_STATUS`, `AUTH_METHODS`, `stubAuth`, `sessionFor`.
- Produces: `AUTH_VAR = { SESSION: "session" }`; `type AuthVariables = { session: AuthSession | null }`; `type AuthEnv = { Variables: AuthVariables }`; `authRoutes(auth: AuthLike)` (chained `Hono`); `sessionLoader(auth: AuthLike): MiddlewareHandler<AuthEnv>`; `requireSession()`, `requireMutation()`, `requireAdmin()`, `requireApp(app: App)` — each `MiddlewareHandler<AuthEnv>`.

- [ ] **Step 1: Failing tests**

`src/hono/tests/routes.test.ts`:

```ts
// @module-tag unit
import { Hono } from "hono";
import { stubAuth } from "../../testing/stub-auth";
import { authRoutes } from "../routes/auth-routes";

describe("authRoutes", () => {
  it("hands GET and POST to Better Auth with the original URL", async () => {
    const seen: string[] = [];
    const auth = stubAuth({
      handler: (request) => {
        seen.push(`${request.method} ${new URL(request.url).pathname}`);
        return Promise.resolve(new Response("handled"));
      },
    });
    const app = new Hono().route("/v1/auth", authRoutes(auth));

    expect(await (await app.request("/v1/auth/get-session")).text()).toBe("handled");
    await app.request("/v1/auth/sign-in/email", { method: "POST" });

    expect(seen).toEqual(["GET /v1/auth/get-session", "POST /v1/auth/sign-in/email"]);
  });

  it("does not answer other methods", async () => {
    const app = new Hono().route("/v1/auth", authRoutes(stubAuth()));
    expect((await app.request("/v1/auth/x", { method: "PUT" })).status).toBe(404);
  });
});
```

`src/hono/tests/middleware.test.ts`:

```ts
// @module-tag unit
import { Hono, type MiddlewareHandler } from "hono";
import { APP } from "../../constants/apps";
import { ROLE } from "../../constants/roles";
import { sessionFor, stubAuth } from "../../testing/stub-auth";
import type { AuthSession } from "../../types/auth";
import { requireAdmin } from "../middleware/require-admin";
import { requireApp } from "../middleware/require-app";
import { requireMutation } from "../middleware/require-mutation";
import { requireSession } from "../middleware/require-session";
import { sessionLoader } from "../middleware/session-loader";
import type { AuthEnv } from "../types/variables";

async function status(
  session: AuthSession | null,
  guard: MiddlewareHandler<AuthEnv>
): Promise<number> {
  const app = new Hono<AuthEnv>()
    .use(sessionLoader(stubAuth({ getSession: () => Promise.resolve(session) })))
    .get("/", guard, (context) => context.text("ok"));
  return (await app.request("/")).status;
}

describe("requireSession", () => {
  it("401 when anonymous, 200 when signed in", async () => {
    expect(await status(null, requireSession())).toBe(401);
    expect(await status(sessionFor(), requireSession())).toBe(200);
  });

  it("401 when no loader ran", async () => {
    const app = new Hono<AuthEnv>().get("/", requireSession(), (c) => c.text("ok"));
    expect((await app.request("/")).status).toBe(401);
  });
});

describe("requireMutation", () => {
  it("refuses a Viewer, allows a User, 401 when anonymous", async () => {
    expect(await status(sessionFor({ role: ROLE.VIEWER }), requireMutation())).toBe(403);
    expect(await status(sessionFor({ role: ROLE.USER }), requireMutation())).toBe(200);
    expect(await status(null, requireMutation())).toBe(401);
  });
});

describe("requireAdmin", () => {
  it("allows only ADMIN", async () => {
    expect(await status(sessionFor({ role: ROLE.USER }), requireAdmin())).toBe(403);
    expect(await status(sessionFor({ role: ROLE.ADMIN }), requireAdmin())).toBe(200);
  });
});

describe("requireApp", () => {
  it("allows the named App or all", async () => {
    const guard = requireApp(APP.LAURA);
    expect(await status(sessionFor({ allowedApps: [APP.LAURA] }), guard)).toBe(200);
    expect(await status(sessionFor({ allowedApps: ["all"] }), guard)).toBe(200);
    expect(await status(sessionFor({ allowedApps: [] }), guard)).toBe(403);
  });
});

describe("sessionLoader", () => {
  it("forwards the request's cookie to getSession", async () => {
    let cookie: string | null = null;
    const auth = stubAuth({
      getSession: (headers) => {
        cookie = headers.get("cookie");
        return Promise.resolve(null);
      },
    });
    const app = new Hono<AuthEnv>().use(sessionLoader(auth)).get("/", (c) => c.text("ok"));
    await app.request("/", { headers: { cookie: "a=1" } });
    expect(cookie).toBe("a=1");
  });

  it("lets a getSession failure surface as 500, never as anonymous", async () => {
    const auth = stubAuth({ getSession: () => Promise.reject(new Error("db down")) });
    const app = new Hono<AuthEnv>()
      .use(sessionLoader(auth))
      .get("/", (c) => c.text("ok"));
    expect((await app.request("/")).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @allonfire/auth test src/hono`
Expected: FAIL, cannot resolve the middleware modules.

- [ ] **Step 3: Implement**

`src/hono/constants/variables.ts`:

```ts
/** Context keys the adapter sets; a host's bindings include `AuthVariables`. */
export const AUTH_VAR = {
  SESSION: "session",
} as const;
```

`src/hono/types/variables.ts`:

```ts
import type { AuthSession } from "../../types/auth";
import type { AUTH_VAR } from "../constants/variables";

export type AuthVariables = {
  /** Set by `sessionLoader`; null when the request is anonymous. */
  [AUTH_VAR.SESSION]: AuthSession | null;
};

export type AuthEnv = { Variables: AuthVariables };
```

`src/hono/routes/auth-routes.ts`:

```ts
import { Hono } from "hono";
import { AUTH_METHODS } from "../../constants/http";
import type { AuthLike } from "../../types/auth";

/** Mount under the same path given to `createAuth` as `basePath`. */
export const authRoutes = (auth: AuthLike) =>
  new Hono().on([...AUTH_METHODS], "/*", (context) =>
    auth.handler(context.req.raw)
  );
```

`src/hono/utils/guard.ts`:

```ts
import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { AUTH_HTTP_STATUS } from "../../constants/http";
import type { AuthSession } from "../../types/auth";
import { AUTH_VAR } from "../constants/variables";
import type { AuthEnv } from "../types/variables";

/** The request's Session, or a 401 the host renders. */
export function requiredSession(context: Context<AuthEnv>): AuthSession {
  const session = context.get(AUTH_VAR.SESSION);
  if (!session) {
    throw new HTTPException(AUTH_HTTP_STATUS.UNAUTHORIZED);
  }
  return session;
}

/** 401 without a Session, 403 when `allows` says no. */
export const guard =
  (allows: (session: AuthSession) => boolean): MiddlewareHandler<AuthEnv> =>
  async (context, next) => {
    if (!allows(requiredSession(context))) {
      throw new HTTPException(AUTH_HTTP_STATUS.FORBIDDEN);
    }
    await next();
  };
```

`src/hono/middleware/session-loader.ts`:

```ts
import type { MiddlewareHandler } from "hono";
import type { AuthLike } from "../../types/auth";
import { AUTH_VAR } from "../constants/variables";
import type { AuthEnv } from "../types/variables";

/**
 * Reads the Session once per request. A failing lookup throws on purpose: a
 * database outage must not quietly turn every User anonymous.
 */
export const sessionLoader =
  (auth: AuthLike): MiddlewareHandler<AuthEnv> =>
  async (context, next) => {
    context.set(AUTH_VAR.SESSION, await auth.getSession(context.req.raw.headers));
    await next();
  };
```

`src/hono/middleware/require-session.ts`:

```ts
import { guard } from "../utils/guard";

export const requireSession = () => guard(() => true);
```

`src/hono/middleware/require-mutation.ts`:

```ts
import { canMutate } from "../../access/access";
import { guard } from "../utils/guard";

/** Everyone signed in except a Viewer. */
export const requireMutation = () => guard(({ user }) => canMutate(user.role));
```

`src/hono/middleware/require-admin.ts`:

```ts
import { isAdmin } from "../../access/access";
import { guard } from "../utils/guard";

export const requireAdmin = () => guard(({ user }) => isAdmin(user.role));
```

`src/hono/middleware/require-app.ts`:

```ts
import { canEnterApp } from "../../access/access";
import type { App } from "../../constants/apps";
import { guard } from "../utils/guard";

export const requireApp = (app: App) =>
  guard(({ user }) => canEnterApp(user.allowedApps, app));
```

- [ ] **Step 4: Run to pass**

Run: `pnpm --filter @allonfire/auth test && pnpm --filter @allonfire/auth check-types`
Expected: PASS.

---

### Task 6: API env, instance, bindings, rate-limiter key prefix

**Files:**
- Modify: `apps/api/package.json` (add `"@allonfire/auth": "workspace:*"` to dependencies, `"better-auth": "^1.5.3"` to devDependencies)
- Modify: `apps/api/src/features/environment/environment.ts`
- Modify: `apps/api/vitest.setup.ts`, `apps/api/.env.example`
- Modify: `apps/api/src/shared/constants/routes.ts`, `apps/api/src/shared/constants/http.ts`, `apps/api/src/shared/types/bindings.ts`
- Create: `apps/api/src/features/auth/auth.ts`
- Modify: `apps/api/src/features/rate-limit/middleware/rate-limiter.ts`
- Test: `apps/api/src/features/rate-limit/tests/rate-limiter.test.ts`

**Interfaces:**
- Consumes: `authEnvSchema`, `createAuth`, `toAuthLike`, `AUTH_PATH`, `AuthVariables`.
- Produces: `env.BETTER_AUTH_SECRET`, `env.BETTER_AUTH_URL`; `AUTH_BASE_PATH = "/v1/auth"`; `HTTP_METHOD = { GET: "GET", POST: "POST" }`; `auth: AuthLike` from `features/auth/auth.ts`; `createRateLimiter({ ..., keyPrefix?: string })`.

- [ ] **Step 1: Failing test for the key prefix**

Append to `apps/api/src/features/rate-limit/tests/rate-limiter.test.ts` (already tagged `unit`; uses `memoryStore`, which the file already imports from `./memory-store`):

```ts
describe("createRateLimiter keyPrefix", () => {
  it("counts under its own namespace", async () => {
    const store = memoryStore();
    const app = new Hono().use(
      createRateLimiter({
        keyPrefix: "sign-in:",
        limit: 10,
        store,
        trustedHops: 0,
        windowMs: 60_000,
      })
    ).get("/", (context) => context.text("ok"));

    await app.request("/");

    expect([...store.hits.keys()]).toEqual(["sign-in:unknown"]);
  });
});
```

(`unknown` is `UNKNOWN_REQUEST_ID`, what `clientKey` returns when `app.request()` has no socket.)

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @allonfire/api test src/features/rate-limit/tests/rate-limiter.test.ts`
Expected: FAIL — type error on `keyPrefix` / key is `unknown`.

- [ ] **Step 3: Implement the prefix**

In `createRateLimiter`'s options type add:

```ts
  /** Separates this limiter's counters from another sharing the store's namespace. */
  keyPrefix?: string;
```

and replace its `keyGenerator` with:

```ts
    keyGenerator: (context) =>
      `${opts.keyPrefix ?? ""}${clientKey(context, opts.trustedHops)}`,
```

Run the test again. Expected: PASS.

- [ ] **Step 4: Env, constants, bindings, instance**

`environment.ts`: add `import { authEnvSchema } from "@allonfire/auth/environment";` and spread it beside `databaseEnvSchema` in `server`:

```ts
      ...runtimeEnvSchema,
      ...databaseEnvSchema,
      ...authEnvSchema,
```

`vitest.setup.ts`, after `CORS_ORIGINS`:

```ts
process.env.BETTER_AUTH_SECRET ??= "test-secret-at-least-thirty-two-characters";
process.env.BETTER_AUTH_URL ??= "http://localhost:3300";
```

`.env.example`, after `CORS_ORIGINS`:

```bash
# Better Auth. The secret signs session cookies — generate your own with
# `openssl rand -base64 32`; at least 32 characters. The URL is this API's
# public origin; auth routes live under /v1/auth.
BETTER_AUTH_SECRET="changeme-generate-with-openssl-rand-base64-32"
BETTER_AUTH_URL="http://localhost:3300"
```

`shared/constants/routes.ts`, after `API_VERSION_PREFIX`:

```ts
import { AUTH_PATH } from "@allonfire/auth/constants/paths";

/** Where the Auth module is mounted and what `createAuth` gets as `basePath`. */
export const AUTH_BASE_PATH = `${API_VERSION_PREFIX}${AUTH_PATH}`;
```

(put the import at the top of the file.)

`shared/constants/http.ts`, after `HTTP_STATUS`:

```ts
/** Request methods the API matches on by name. */
export const HTTP_METHOD = {
  GET: "GET",
  POST: "POST",
} as const;
```

`shared/types/bindings.ts`:

```ts
import type { AuthVariables } from "@allonfire/auth/hono/types";
import type { PinoLogger } from "hono-pino";
import type { Locale } from "../../features/i18n/constants/locales";
import type { CONTEXT_VAR } from "../constants/runtime";

export type AppBindings = {
  /** `AuthVariables` adds the Session `sessionLoader` sets. */
  Variables: AuthVariables & {
    [CONTEXT_VAR.REQUEST_ID]: string;
    /** `hono-pino` puts its own wrapper here, not the bare pino logger. */
    [CONTEXT_VAR.LOGGER]: PinoLogger;
    /** Set by `localeResolver`; every error message is rendered in it. */
    [CONTEXT_VAR.LOCALE]: Locale;
  };
};
```

`features/auth/auth.ts`:

```ts
import { createAuth, toAuthLike } from "@allonfire/auth/server";
import { AUTH_BASE_PATH } from "../../shared/constants/routes";
import { env } from "../environment/environment";

/** Built once at import. Tests never import this; they pass a stub to `createApp`. */
export const auth = toAuthLike(
  createAuth({
    basePath: AUTH_BASE_PATH,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.CORS_ORIGINS,
  })
);
```

- [ ] **Step 5: Verify**

Run: `pnpm install && pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: PASS. Add the two variables to your local `apps/api/.env` or `dev` will refuse to boot.

---

### Task 7: Sign-in bucket and `createApp` wiring

**Files:**
- Create: `apps/api/src/features/auth/constants/limits.ts`
- Create: `apps/api/src/features/auth/middleware/sign-in-limit.ts`
- Modify: `apps/api/src/app.ts`, `apps/api/src/index.ts`, `apps/api/src/shared/tests/app-deps.ts`, `apps/api/src/routes/docs/index.ts` (temporary signature only, finished in Task 8)
- Test: `apps/api/src/features/auth/tests/{sign-in-limit,auth-routes,guards}.test.ts`

**Interfaces:**
- Consumes: `memoryStore(windowMs?)` from `features/rate-limit/tests/memory-store.ts`, `createRateLimiter`, `RateLimitStore`, `AUTH_BASE_PATH`, `HTTP_METHOD`, `SIGN_IN_EMAIL_PATH`, `sessionLoader`, `authRoutes`, `stubAuth`, `sessionFor`, `requireSession`, `requireMutation`.
- Produces: `SIGN_IN_LIMIT = { MAX: 10, WINDOW_MS: 900_000, KEY_PREFIX: "sign-in:" }`; `SIGN_IN_ROUTE`; `signInLimit(store: RateLimitStore): MiddlewareHandler<AppBindings>`; `AppDeps` gains `auth: AuthLike` and `signInStore: RateLimitStore`; `appDeps()` supplies both.

- [ ] **Step 1: Test deps**

`shared/tests/app-deps.ts` — keep `memoryStore` (`features/rate-limit/tests/memory-store.ts`), add the two new deps:

```ts
import { stubAuth } from "@allonfire/auth/testing";
import type { AppDeps } from "../../app";
import { SIGN_IN_LIMIT } from "../../features/auth/constants/limits";
import { memoryStore } from "../../features/rate-limit/tests/memory-store";

/**
 * Dependencies for `createApp` in tests that drive a feature through the whole
 * middleware chain: healthy checks, in-memory rate-limit stores and an
 * anonymous stub auth.
 */
export function appDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    auth: stubAuth(),
    checkDatabase: async () => true,
    checkRedis: async () => true,
    signInStore: memoryStore(SIGN_IN_LIMIT.WINDOW_MS),
    store: memoryStore(),
    ...overrides,
  };
}
```

`features/auth/constants/limits.ts` (below, Step 4) must exist before this compiles; write it first if the type-check runs between steps.

- [ ] **Step 2: Failing tests**

`features/auth/tests/sign-in-limit.test.ts`:

```ts
// @module-tag unit
import { stubAuth } from "@allonfire/auth/testing";
import { createApp } from "../../../app";
import { HTTP_HEADER } from "../../../shared/constants/http";
import { memoryStore } from "../../rate-limit/tests/memory-store";
import { appDeps } from "../../../shared/tests/app-deps";
import { SIGN_IN_LIMIT } from "../constants/limits";
import { SIGN_IN_ROUTE } from "../middleware/sign-in-limit";

const ok = stubAuth({ handler: () => Promise.resolve(new Response("{}")) });

describe("sign-in bucket", () => {
  it("answers 429 as a problem document after the limit", async () => {
    const app = createApp(appDeps({ auth: ok }));
    for (let i = 0; i < SIGN_IN_LIMIT.MAX; i++) {
      expect((await app.request(SIGN_IN_ROUTE, { method: "POST" })).status).toBe(200);
    }
    const res = await app.request(SIGN_IN_ROUTE, { method: "POST" });
    expect(res.status).toBe(429);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(res.headers.get(HTTP_HEADER.RETRY_AFTER)).not.toBeNull();
  });

  it("counts only sign-in, under its own key", async () => {
    const signInStore = memoryStore();
    const store = memoryStore();
    const app = createApp(appDeps({ auth: ok, signInStore, store }));

    await app.request("/v1/auth/get-session");
    expect(signInStore.hits.size).toBe(0);

    await app.request(SIGN_IN_ROUTE, { method: "POST" });
    expect([...signInStore.hits.keys()]).toEqual([
      `${SIGN_IN_LIMIT.KEY_PREFIX}unknown`,
    ]);
    expect([...store.hits.keys()]).toEqual(["unknown"]);
  });

  it("counts a trailing-slash variant too", async () => {
    const signInStore = memoryStore();
    const app = createApp(appDeps({ auth: ok, signInStore }));
    await app.request(`${SIGN_IN_ROUTE}/`, { method: "POST" });
    expect(signInStore.hits.size).toBe(1);
  });
});
```

`features/auth/tests/auth-routes.test.ts`:

```ts
// @module-tag unit
import { stubAuth } from "@allonfire/auth/testing";
import { createApp } from "../../../app";
import { appDeps } from "../../../shared/tests/app-deps";

describe("/v1/auth/*", () => {
  it("reaches Better Auth and keeps its Set-Cookie", async () => {
    const auth = stubAuth({
      handler: () =>
        Promise.resolve(
          new Response("{}", {
            headers: { "set-cookie": "better-auth.session_token=abc; Path=/; HttpOnly" },
          })
        ),
    });
    const res = await createApp(appDeps({ auth })).request("/v1/auth/get-session", {
      headers: { origin: "http://localhost:3200" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie()).toEqual([
      "better-auth.session_token=abc; Path=/; HttpOnly",
    ]);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });
});
```

`features/auth/tests/guards.test.ts`:

```ts
// @module-tag unit
import { requireMutation } from "@allonfire/auth/hono/middleware/require-mutation";
import { requireSession } from "@allonfire/auth/hono/middleware/require-session";
import { ROLE } from "@allonfire/auth/constants/roles";
import { sessionFor, stubAuth } from "@allonfire/auth/testing";
import type { AuthSession } from "@allonfire/auth/types";
import { createApp } from "../../../app";
import type { ProblemDetails } from "../../errors/middleware/error-handler";
import { appDeps } from "../../../shared/tests/app-deps";

function guarded(session: AuthSession | null) {
  return createApp(
    appDeps({ auth: stubAuth({ getSession: () => Promise.resolve(session) }) })
  )
    .get("/v1/guarded", requireSession(), (c) => c.text("ok"))
    .get("/v1/mutate", requireMutation(), (c) => c.text("ok"));
}

describe("guards through the API", () => {
  it("renders 401 as a localised problem document", async () => {
    const res = await guarded(null).request("/v1/guarded", {
      headers: { "accept-language": "it" },
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    const body = (await res.json()) as ProblemDetails;
    expect(body).toMatchObject({ code: "UNAUTHORIZED", instance: "/v1/guarded", status: 401 });
    expect(body.detail).not.toBe("Authentication required");
  });

  it("renders 403 for a Viewer", async () => {
    const res = await guarded(sessionFor({ role: ROLE.VIEWER })).request("/v1/mutate");
    expect(res.status).toBe(403);
    expect(((await res.json()) as ProblemDetails).code).toBe("FORBIDDEN");
  });

  it("renders a failing session lookup as 500", async () => {
    const app = createApp(
      appDeps({ auth: stubAuth({ getSession: () => Promise.reject(new Error("db down")) }) })
    ).get("/v1/guarded", requireSession(), (c) => c.text("ok"));
    const res = await app.request("/v1/guarded");
    expect(res.status).toBe(500);
    expect(((await res.json()) as ProblemDetails).code).toBe("INTERNAL_ERROR");
  });
});
```

- [ ] **Step 3: Run to fail**

Run: `pnpm --filter @allonfire/api test src/features/auth`
Expected: FAIL — missing `constants/limits`, `middleware/sign-in-limit`, and `createApp` rejects the new deps.

- [ ] **Step 4: Implement the bucket**

`features/auth/constants/limits.ts`:

```ts
/**
 * Password guessing gets its own, much smaller bucket than the global one.
 * Keyed by IP only: IP+email would let one address spray many accounts.
 * 10 leaves room for a household sharing one public IP.
 */
export const SIGN_IN_LIMIT = {
  KEY_PREFIX: "sign-in:",
  MAX: 10,
  WINDOW_MS: 15 * 60_000,
} as const;

/** `/a/b/` and `/a/b` are one route to the limiter. */
export const TRAILING_SLASHES = /\/+$/;
```

`features/auth/middleware/sign-in-limit.ts`:

```ts
import { SIGN_IN_EMAIL_PATH } from "@allonfire/auth/constants/paths";
import type { MiddlewareHandler } from "hono";
import { HTTP_METHOD } from "../../../shared/constants/http";
import { AUTH_BASE_PATH } from "../../../shared/constants/routes";
import type { AppBindings } from "../../../shared/types/bindings";
import { env } from "../../environment/environment";
import {
  createRateLimiter,
  type RateLimitStore,
} from "../../rate-limit/middleware/rate-limiter";
import { SIGN_IN_LIMIT, TRAILING_SLASHES } from "../constants/limits";

export const SIGN_IN_ROUTE = `${AUTH_BASE_PATH}${SIGN_IN_EMAIL_PATH}`;

/**
 * Fails open like the global limiter: with Redis down, scrypt's cost per guess
 * is the only brake. `store` must be built with `SIGN_IN_LIMIT.WINDOW_MS`.
 */
export const signInLimit = (
  store: RateLimitStore
): MiddlewareHandler<AppBindings> => {
  const limiter = createRateLimiter({
    keyPrefix: SIGN_IN_LIMIT.KEY_PREFIX,
    limit: SIGN_IN_LIMIT.MAX,
    store,
    trustedHops: env.TRUSTED_PROXY_HOPS,
    windowMs: SIGN_IN_LIMIT.WINDOW_MS,
  });
  return (context, next) =>
    context.req.method === HTTP_METHOD.POST &&
    context.req.path.replace(TRAILING_SLASHES, "") === SIGN_IN_ROUTE
      ? limiter(context, next)
      : next();
};
```

- [ ] **Step 5: Wire `createApp`**

`app.ts` — imports:

```ts
import { authRoutes } from "@allonfire/auth/hono/routes";
import { sessionLoader } from "@allonfire/auth/hono/middleware/session-loader";
import type { AuthLike } from "@allonfire/auth/types";
import { signInLimit } from "./features/auth/middleware/sign-in-limit";
import { AUTH_BASE_PATH, ROOT_PATH } from "./shared/constants/routes";
```

`AppDeps`:

```ts
export type AppDeps = HealthDeps & {
  store: RateLimitStore;
  /** Built with the sign-in window; its own Redis key namespace. */
  signInStore: RateLimitStore;
  auth: AuthLike;
  /** Optional so tests can capture log output. Defaults to the shared logger. */
  logger?: Logger;
};
```

Chain tail, replacing `.use(rateLimit(deps.store)).route(ROOT_PATH, healthRoutes(deps));` and the return:

```ts
    .use(rateLimit(deps.store))
    .use(signInLimit(deps.signInStore))
    // After the limiters, so a flood of requests never reaches the Session read.
    .use(sessionLoader(deps.auth))
    .route(ROOT_PATH, healthRoutes(deps))
    .route(AUTH_BASE_PATH, authRoutes(deps.auth));

  return app
    .route(ROOT_PATH, docsRoutes(app, deps.auth))
    .onError(onError)
    .notFound(notFound);
```

`routes/docs/index.ts` — accept the dependency now (used in Task 8):

```ts
import type { AuthLike } from "@allonfire/auth/types";
// ...
/** Mount after the routes the spec should describe. */
export const docsRoutes = (app: Hono<AppBindings>, _auth: AuthLike) =>
```

and in `routes/docs/tests/spec.test.ts` (whose `spec()` now builds `healthRoutes(appDeps())`) change `docsRoutes(app)` to `docsRoutes(app, appDeps().auth)` — no new import needed.

`index.ts`:

```ts
import { auth } from "./features/auth/auth";
import { SIGN_IN_LIMIT } from "./features/auth/constants/limits";
// ...
const app = createApp({
  auth,
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  },
  checkRedis: async () => (await redis.ping()) === REDIS_PING_REPLY,
  signInStore: createRedisStore(redis, SIGN_IN_LIMIT.WINDOW_MS),
  store: createRedisStore(redis, env.RATE_LIMIT_WINDOW_MS),
});
```

- [ ] **Step 6: Run to pass**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: PASS, including `src/client.test-d.ts` (routes still chained).

---

### Task 8: Better Auth endpoints in `/openapi.json`

**Files:**
- Create: `apps/api/src/routes/docs/utils/merge.ts`
- Modify: `apps/api/src/routes/docs/handlers.ts`, `apps/api/src/routes/docs/index.ts`
- Test: `apps/api/src/routes/docs/tests/merge.test.ts`, `apps/api/src/routes/docs/tests/spec.test.ts`

**Interfaces:**
- Consumes: `authOpenApi`, `OpenApiFragment`, `AuthLike`, `AUTH_BASE_PATH`, `stubAuth`.
- Produces: `mergeOpenApi<T extends MergeableDocument>(base: T, fragment: OpenApiFragment): T`; `specHandler(app, auth)`.

- [ ] **Step 1: Failing merge test**

`routes/docs/tests/merge.test.ts`:

```ts
// @module-tag unit
import { mergeOpenApi } from "../utils/merge";

const fragment = {
  components: { schemas: { User: { type: "object" } } },
  paths: { "/v1/auth/get-session": { get: { tags: ["Auth"] } } },
  tags: [{ name: "Auth" }],
};

describe("mergeOpenApi", () => {
  it("adds paths, component groups and tags next to the base ones", () => {
    const merged = mergeOpenApi(
      {
        components: { responses: { Problem: { description: "x" } } },
        openapi: "3.1.0",
        paths: { "/health": { get: {} } },
        tags: [{ name: "Infrastructure" }],
      },
      fragment
    );
    expect(merged.paths).toHaveProperty(["/health"]);
    expect(merged.paths).toHaveProperty(["/v1/auth/get-session"]);
    expect(merged.components).toEqual({
      responses: { Problem: { description: "x" } },
      schemas: { User: { type: "object" } },
    });
    expect(merged.tags).toEqual([{ name: "Infrastructure" }, { name: "Auth" }]);
    expect(merged.openapi).toBe("3.1.0");
  });

  it("throws rather than overwrite a component both documents define", () => {
    expect(() =>
      mergeOpenApi(
        { components: { schemas: { User: {} } }, paths: {} },
        fragment
      )
    ).toThrow("schemas.User");
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @allonfire/api test src/routes/docs/tests/merge.test.ts`
Expected: FAIL, cannot resolve `../utils/merge`.

- [ ] **Step 3: Implement the merge**

`routes/docs/utils/merge.ts`:

```ts
import type { OpenApiFragment } from "@allonfire/auth/types";
import { objectEntries, objectFromEntries, objectKeys } from "@allonfire/utils/object";

type ComponentGroups = Record<string, Record<string, unknown>>;

export type MergeableDocument = {
  paths?: Record<string, unknown>;
  components?: ComponentGroups;
  tags?: unknown[];
};

function mergeComponents(base: ComponentGroups, extra: ComponentGroups): ComponentGroups {
  const groups = new Set([...objectKeys(base), ...objectKeys(extra)]);
  return objectFromEntries(
    [...groups].map((group) => {
      const ours = base[group] ?? {};
      const theirs = extra[group] ?? {};
      const clash = objectKeys(theirs).find((name) => name in ours);
      if (clash) {
        throw new Error(`OpenAPI component defined twice: ${group}.${clash}`);
      }
      return [group, { ...ours, ...theirs }];
    })
  );
}

/** Folds a module's fragment into the host document; the output is only serialised. */
export const mergeOpenApi = <T extends MergeableDocument>(
  base: T,
  fragment: OpenApiFragment
): T => ({
  ...base,
  components: mergeComponents(base.components ?? {}, fragment.components),
  paths: { ...base.paths, ...fragment.paths },
  tags: [...(base.tags ?? []), ...fragment.tags],
});
```

If `objectEntries` ends up unused, drop it from the import. Run the test. Expected: PASS.

- [ ] **Step 4: Failing spec test through `createApp`**

Add to the imports at the top of `routes/docs/tests/spec.test.ts` (below its `// @module-tag unit` line — Biome rejects imports after code):

```ts
import { createApp } from "../../../app";
import { appDeps } from "../../../shared/tests/app-deps";
```

and append:

```ts
describe("GET /openapi.json with the Auth module", () => {
  it("documents Better Auth's endpoints under /v1/auth, tagged Auth", async () => {
    const auth = stubAuth({
      openApi: () =>
        Promise.resolve({
          components: { schemas: { Session: { type: "object" } } },
          paths: { "/sign-in/email": { post: { tags: ["Default"] } } },
        }),
    });
    const res = await createApp(appDeps({ auth })).request("/openapi.json");
    const document = (await res.json()) as {
      paths: Record<string, Record<string, { tags?: string[] }>>;
      components: { schemas: Record<string, unknown> };
    };

    expect(document.paths["/v1/auth/sign-in/email"]?.post?.tags).toEqual(["Auth"]);
    expect(document.paths).toHaveProperty(["/health"]);
    expect(document.paths).not.toHaveProperty(["/v1/auth/*"]);
    expect(document.components.schemas).toHaveProperty(["Session"]);
  });
});
```

Run: `pnpm --filter @allonfire/api test src/routes/docs`
Expected: FAIL — `/v1/auth/sign-in/email` missing.

- [ ] **Step 5: Switch the spec handler**

`routes/docs/handlers.ts` — replace the `openAPIRouteHandler` import with `generateSpecs`, and `specHandler` with the block below. `DOCUMENTATION` is the `documentation` object the current `openAPIRouteHandler(app, { documentation: … })` call passes, moved out unchanged; if that object has gained fields since this plan was written, carry them over as they are:

```ts
import { authOpenApi } from "@allonfire/auth/openapi";
import type { AuthLike } from "@allonfire/auth/types";
import { generateSpecs, resolver } from "hono-openapi";
import { AUTH_BASE_PATH } from "../../shared/constants/routes";
import { mergeOpenApi } from "./utils/merge";

const DOCUMENTATION = {
  components: {
    // Every error the API sends; a route documents one with
    // `$ref: "#/components/responses/Problem"`.
    responses: {
      [OPENAPI_RESPONSE.PROBLEM]: {
        content: {
          [CONTENT_TYPE.PROBLEM_JSON]: {
            schema: resolver(problemDetailsSchema),
          },
        },
        description: OPENAPI_DOC.PROBLEM_DESCRIPTION,
      },
    },
  },
  info: {
    description: OPENAPI_DOC.DESCRIPTION,
    title: OPENAPI_DOC.TITLE,
    version: pkg.version,
  },
};

/**
 * The spec is generated from every route registered on `app` so far, plus the
 * Auth module's endpoints, which Better Auth describes itself.
 */
export const specHandler = (app: Hono<AppBindings>, auth: AuthLike) =>
  whenEnabled(async (context) => {
    const [spec, authSpec] = await Promise.all([
      generateSpecs(app, { documentation: DOCUMENTATION }),
      authOpenApi(auth, AUTH_BASE_PATH),
    ]);
    return context.json(mergeOpenApi(spec, authSpec));
  });
```

`routes/docs/index.ts`:

```ts
export const docsRoutes = (app: Hono<AppBindings>, auth: AuthLike) =>
  new Hono<AppBindings>()
    .get(DOCS_ROUTE.OPENAPI, specHandler(app, auth))
    .get(DOCS_ROUTE.REFERENCE, referenceHandler);
```

If `check-types` rejects `mergeOpenApi(spec, …)` because `openapi-types` declares
`ComponentsObject` as an interface (interfaces carry no implicit index
signature), widen `MergeableDocument.components` to `object` and read it in
`mergeComponents` through one `objectEntries(base) as [string, Record<string, unknown>][]`,
with a comment naming the interface as the reason.

If `/v1/auth/*` shows up in the generated spec, pass `exclude: [\`${AUTH_BASE_PATH}/*\`]` to `generateSpecs`.

- [ ] **Step 6: Run to pass**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: PASS, including the existing `routes/docs/tests/routes.test.ts` gating tests.

---

### Task 9: Real sign-in against Postgres

**Files:**
- Test: `apps/api/src/features/auth/tests/sign-in.integration.test.ts`

**Interfaces:**
- Consumes: `auth` from `features/auth/auth.ts`, `createApp`, `appDeps`, `requireMutation`, `APP`, `ROLE`.

- [ ] **Step 1: Write the test**

```ts
// @module-tag integration
import { APP } from "@allonfire/auth/constants/apps";
import { ROLE } from "@allonfire/auth/constants/roles";
import { requireMutation } from "@allonfire/auth/hono/middleware/require-mutation";
import { prisma } from "@allonfire/database";
import { hashPassword } from "better-auth/crypto";
import { createApp } from "../../../app";
import { appDeps } from "../../../shared/tests/app-deps";
import { auth } from "../auth";

const EMAIL = "sign-in-integration@allonfire.test";
const SIGN_UP_EMAIL = "sign-up-integration@allonfire.test";
const PASSWORD = "integration-password-1";
const ORIGIN = "http://localhost:3200";

const app = createApp(appDeps({ auth })).get("/v1/mutate", requireMutation(), (c) =>
  c.text("ok")
);

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (cause) {
    throw new Error(
      "Postgres unavailable — run: pnpm docker:up && pnpm --filter @allonfire/database db:update",
      { cause }
    );
  }
  const user = await prisma.user.upsert({
    create: { allowedApps: [APP.LAURA], email: EMAIL, emailVerified: true, name: "Integration", role: ROLE.VIEWER },
    update: {},
    where: { email: EMAIL },
  });
  await prisma.account.deleteMany({ where: { userId: user.id } });
  await prisma.account.create({
    data: {
      accountId: user.id,
      password: await hashPassword(PASSWORD),
      providerId: "credential",
      userId: user.id,
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [EMAIL, SIGN_UP_EMAIL] } } });
  await prisma.$disconnect();
});

async function signIn(): Promise<string> {
  const res = await app.request("/v1/auth/sign-in/email", {
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    headers: { "content-type": "application/json", origin: ORIGIN },
    method: "POST",
  });
  expect(res.status).toBe(200);
  return res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

describe("sign-in against Postgres", () => {
  it("returns a Session carrying role and allowed apps", async () => {
    const cookie = await signIn();
    const res = await app.request("/v1/auth/get-session", { headers: { cookie } });
    const body = (await res.json()) as { user: Record<string, unknown> };
    expect(body.user).toMatchObject({
      allowedApps: [APP.LAURA],
      email: EMAIL,
      role: ROLE.VIEWER,
    });
  });

  it("refuses a real Viewer Session at requireMutation", async () => {
    const cookie = await signIn();
    const res = await app.request("/v1/mutate", { headers: { cookie } });
    expect(res.status).toBe(403);
  });

  it("does not let a request create a User", async () => {
    const res = await app.request("/v1/auth/sign-up/email", {
      body: JSON.stringify({ email: SIGN_UP_EMAIL, name: "x", password: PASSWORD }),
      headers: { "content-type": "application/json", origin: ORIGIN },
      method: "POST",
    });
    expect(res.ok).toBe(false);
    expect(await prisma.user.count({ where: { email: SIGN_UP_EMAIL } })).toBe(0);
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm docker:up && pnpm --filter @allonfire/database db:update && pnpm --filter @allonfire/api test src/features/auth/tests/sign-in.integration.test.ts`
Expected: PASS. If sign-in answers 403 with an origin error, check `CORS_ORIGINS` in `vitest.setup.ts` equals `ORIGIN`.

---

### Task 10: Docs and final checks

**Files:**
- Create: `packages/auth/README.md`
- Modify: `apps/api/README.md`, `CLAUDE.md`

- [ ] **Step 1: `packages/auth/README.md`**

Centered header and HTML badges like the other package READMEs (Better Auth 1.5, Hono 4, Prisma, Zod 4). Sections:
- What it is: the Auth module — Better Auth config, roles and Apps, access predicates, a Hono adapter, the OpenAPI fragment. No Next, no React yet; the frontend refactor adds `./client`.
- Exports table: every entry of `package.json` `exports` with one line each.
- Directory structure: the `src/` tree from this plan's File Structure.
- Mounting it in a Hono backend (the snippet below).
- Trade-off: role / allowed-apps changes and revoked Sessions reach guards up to 5 minutes late (cookie cache). Link ADR 0009.

```ts
const auth = toAuthLike(createAuth({ basePath: "/v1/auth", baseURL, secret, trustedOrigins }));

new Hono()
  .use(sessionLoader(auth))
  .route("/v1/auth", authRoutes(auth))
  .post("/v1/things", requireMutation(), handler);
```

- [ ] **Step 2: `apps/api/README.md`**

- Intro: replace "no auth yet" with "auth via the Auth module (`packages/auth`) under `/v1/auth`".
- Environment: add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` to the required list.
- New `## Auth` section: mount point; guards (`requireSession`, `requireMutation`, `requireAdmin`, `requireApp`) throw and `onError` renders problems; sign-in bucket 10 / 15 min per IP, fails open; Sessions in Postgres, Redis db 2 still reserved (ADR 0009); Better Auth's endpoints appear in `/reference` under the `Auth` tag.
- Redis table: index 0 row notes it also holds `ratelimit:sign-in:*`.

- [ ] **Step 3: `CLAUDE.md`**

- API App Structure: "No auth and no domain endpoints yet" becomes "No domain endpoints yet; auth is the Auth module (`packages/auth`) mounted at `/v1/auth`".
- Tree: add `features/auth/  auth (instance), constants/limits, middleware/sign-in-limit`, and `routes/docs/utils/merge`.
- Required env line: add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- New bullet: "**Auth guards** come from `@allonfire/auth/hono/middleware/*` and throw `HTTPException`; never build a 401/403 by hand."
- Viewer Role System: `checkMutationAccess` now lives in `packages/auth-old` (local only) until Laura's refactor; the API uses `requireMutation`.

- [ ] **Step 4: Full verification**

Run:

```bash
pnpm --filter @allonfire/auth test
pnpm --filter @allonfire/auth check-types
pnpm --filter @allonfire/api test
pnpm --filter @allonfire/api check-types
pnpm --filter @allonfire/api i18n:check
```

Then from the repo root with Docker stopped:

```bash
pnpm test:unit
```

Expected: all PASS; no test fails for a missing `// @module-tag`. `pnpm check-types` repo-wide fails only in `@allonfire/laura`, and Laura's Playwright `e2e/login.spec.ts` fails too (it signs in through the old package). Both are accepted and fixed by the frontend refactor; CI does not run e2e.

- [ ] **Step 5: Format touched files only**

```bash
pnpm dlx @biomejs/biome check --write packages/auth apps/api/src apps/api/vitest.setup.ts pnpm-workspace.yaml
```

Expected: no remaining errors. Never add a `biome-ignore`; fix the code or ask.

- [ ] **Step 6: Smoke the real server**

With `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in `apps/api/.env`:

```bash
pnpm --filter @allonfire/api dev
curl -s localhost:3300/v1/auth/get-session        # null
curl -s localhost:3300/openapi.json | grep -c '/v1/auth/'   # > 0
curl -s -o /dev/null -w '%{http_code}\n' localhost:3300/v1/auth/open-api/generate-schema  # 404
```
