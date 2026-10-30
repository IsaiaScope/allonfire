# Test Databases, Fixtures and Local Addresses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every test that needs Postgres or MinIO runs, locally and in CI, against its own Test database and bucket built from one set of Fixtures, never the Local database; every sign-in and Image use case is covered on the real stack; test data and local addresses are each written once.

**Status:** implemented (uncommitted) @ 2026-10-09T16:33:08+02:00

**Architecture:** `@allonfire/database` owns a Test database feature (a fingerprinted template built with Liquibase and the Fixtures, cloned per package per run, dropped after) and the Fixtures (Users generated from `App` x `Role`, the Image list). `@allonfire/storage` owns a bucket per run, seeded with the Image Fixtures through the real `prepareImage`. `@allonfire/config` holds every local address once, with a guard test over the files that cannot import it. Vitest gets both as `globalSetup`; the Playwright preset creates them from the API's start command (Playwright starts web servers before global setup) and drops them in global teardown.

**Tech Stack:** Vitest 4.1 (`globalSetup`, `project.config.tagsFilter`), Playwright, Prisma 6, Liquibase in Docker (`scripts/liquibase.sh`), Better Auth, MinIO through `@aws-sdk/client-s3`, sharp, Hono, Next 16 (standalone).

**Spec:** `docs/superpowers/specs/2026-10-09-test-database-fixtures-design.md` (terms **Test database** and **Fixture** in `CONTEXT.md`).

## Global Constraints

- Never commit; `/iso-commit` is the only trigger. No AI attribution.
- No `as` casts, tests included; narrow, zod-parse, `as const satisfies`.
- No `biome-ignore` or `oxlint-disable` without asking.
- `objectKeys`/`objectValues`/`objectEntries`/`objectFromEntries` from `@allonfire/core/shared/utils/object`; `parseJson`/`parseJsonWith`/`stringifyJson` from `@allonfire/core/shared/utils/json`.
- No new npm dependency (none is needed).
- Env vars start with their owner: `DATABASE_*`, `STORAGE_*`, `API_*`.
- Database names `allonfire_test_<label>_<epoch>_<random>`, template `allonfire_test_template`; buckets `allonfire-test-<label>-<epoch>-<random>`.
- Every test file starts with `// @module-tag unit` or `// @module-tag integration`; integration files are `*.integration.test.ts`.
- Package layout: `src/{environment,shared,features}`; export keys mirror the file path without `src/` and `.ts`.
- Prose says **Local** (never "dev environment"); `DATABASE_SEED_MODE` is `local` or `prod`.
- Laura's own tests are dropped; tests using `App.LAURA` as a second App stay.
- Ports 3300 and 3400 belong to a running `pnpm dev`; never kill it. The e2e stack uses 3310 and 3410.
- The repo is on exFAT: delete `._*` files before Docker builds and actionlint.
- Before editing `turbo.json`, read the installed Turbo's bundled docs (`node_modules/turbo/docs/`), as `AGENTS.md` asks; Turbo is 2.11.7.
- CI's affected set is Turbo's own (`futureFlags.affectedUsingTaskInputs`): a task's `inputs` decide whether a change affects it. Every `inputs` this plan writes includes `"!**/*.md"`, and a test that reads files outside its package lists them with `$TURBO_ROOT$/…`, or Turbo's cache and `--affected` skip it when only those files change.
- Other sessions edit this checkout: re-read a file right before editing it, and never revert a change this plan did not make.
- End of every task: `pnpm exec biome check --write <changed files>`, then the task's tests. End of the plan: `pnpm lint`, `pnpm check-types`, the pre-commit hook (`sh -e .husky/pre-commit`).

## Review Focus

1. Two packages build the template at once (Turbo runs them in parallel): exactly one builds, the other waits and reuses it. Pinned in Task 5 (advisory lock test).
2. A run killed mid-way leaves its database and bucket: the next run sweeps those over an hour old and never one a parallel run is using. Pinned in Tasks 5 and 8 (sweep tests with a young and an old name).
3. `pnpm test:unit` with Docker stopped still passes: the global setups skip when the tag filter excludes `integration`. Pinned in Task 6 (skip test).
4. A changeset or Fixture edit rebuilds the template on the next run; an unchanged tree reuses it. Pinned in Task 5 (fingerprint test).
5. The Local seed run twice is a no-op the second time and never deletes a User outside the retired list. Pinned in Task 4.

---

## Phase A: Local addresses

### Task 1: The addresses module and its importers

**Files:**
- Create: `packages/config/local/addresses.ts`
- Create: `packages/config/local/tests/addresses.test.ts`
- Modify: `packages/config/package.json` (exports `./local/addresses`; `test` script and vitest config if missing)
- Modify: `apps/api/vitest.setup.ts`, `packages/auth/vitest.setup.ts`, `packages/database/vitest.setup.ts`, `packages/storage/vitest.setup.ts`
- Modify: `packages/config/tests/e2e/playwright.config.ts`, `apps/back-office/playwright.config.ts`
- Modify: `apps/back-office/src/shared/tests/msw/handlers.ts` (`API_TEST_URL` from the module)
- Create: `apps/api/src/shared/constants/tests/limits.test.ts`
- Modify: `packages/database/.env.example:1` (`allonfire_dev` to `allonfire`)

**Interfaces:**
- Produces: `LOCAL_PORT`, `LOCAL_URL`, `TEST_API_URL` from `@allonfire/config/local/addresses`.

- [x] **Step 1: Write the failing test**

```ts
// packages/config/local/tests/addresses.test.ts
// @module-tag unit
import { LOCAL_URL, TEST_API_URL } from "../addresses";

describe("local addresses", () => {
  it("builds every URL from its port", () => {
    expect(LOCAL_URL).toEqual({
      API: "http://localhost:3300",
      API_E2E: "http://localhost:3310",
      BACK_OFFICE: "http://localhost:3400",
      BACK_OFFICE_E2E: "http://localhost:3410",
      LAURA: "http://localhost:3200",
      MINIO: "http://localhost:9000",
      POSTGRES: "postgresql://allonfire:allonfire@localhost:5432/allonfire",
      REDIS: "redis://localhost:6379/0",
    });
  });

  it("names a host that never resolves for MSW", () => {
    expect(TEST_API_URL).toBe("http://api.test");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @allonfire/config exec vitest run local`
Expected: FAIL, "Cannot find module '../addresses'". If `config` has no vitest config yet, add `packages/config/vitest.config.ts` = `export { vitestConfig as default } from "./tests/vitest/vitest.config";`-style `defineConfig(vitestConfig)` (same idiom as other packages) and a `"test": "vitest run"` script first.

- [x] **Step 3: Write the module**

```ts
// packages/config/local/addresses.ts
/**
 * Every address the Local stack and the test stacks use, written once. The
 * files that cannot import it (compose, CI, `.env.example`, scripts' `--port`)
 * are checked against it by `tests/local-files.test.ts`.
 */
export const LOCAL_PORT = {
  API: 3300,
  API_E2E: 3310,
  BACK_OFFICE: 3400,
  BACK_OFFICE_E2E: 3410,
  LAURA: 3200,
  MINIO: 9000,
  MINIO_CONSOLE: 9001,
  POSTGRES: 5432,
  REDIS: 6379,
} as const;

/** The Local Postgres login; compose's defaults. */
export const LOCAL_POSTGRES = {
  DATABASE: "allonfire",
  PASSWORD: "allonfire",
  USER: "allonfire",
} as const;

const http = (port: number) => `http://localhost:${port}` as const;

export const LOCAL_URL = {
  API: http(LOCAL_PORT.API),
  API_E2E: http(LOCAL_PORT.API_E2E),
  BACK_OFFICE: http(LOCAL_PORT.BACK_OFFICE),
  BACK_OFFICE_E2E: http(LOCAL_PORT.BACK_OFFICE_E2E),
  LAURA: http(LOCAL_PORT.LAURA),
  MINIO: http(LOCAL_PORT.MINIO),
  POSTGRES: `postgresql://${LOCAL_POSTGRES.USER}:${LOCAL_POSTGRES.PASSWORD}@localhost:${LOCAL_PORT.POSTGRES}/${LOCAL_POSTGRES.DATABASE}`,
  /** db 0: rate limits (ADR 0002). */
  REDIS: `redis://localhost:${LOCAL_PORT.REDIS}/0`,
} as const;

/** A host that never resolves: MSW answers it, a leak fails. */
export const TEST_API_URL = "http://api.test";
```

Export: `"./local/addresses": "./local/addresses.ts"` in `packages/config/package.json`.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @allonfire/config exec vitest run local`
Expected: PASS (3 tests).

- [x] **Step 5: Replace the literals in the setups and the preset**

`apps/api/vitest.setup.ts` becomes (keep the comments that are there):

```ts
import { LOCAL_URL } from "@allonfire/config/local/addresses";
import { LOG_LEVEL } from "@allonfire/core/features/logger/constants/logger";

process.env.DATABASE_URL ??= LOCAL_URL.POSTGRES;
process.env.API_REDIS_URL ??= LOCAL_URL.REDIS;
process.env.API_CORS_ORIGINS ??= LOCAL_URL.LAURA;
process.env.AUTH_SECRET ??= "test-secret-at-least-thirty-two-characters";
process.env.AUTH_URL ??= LOCAL_URL.API;
process.env.STORAGE_ENDPOINT ??= LOCAL_URL.MINIO;
process.env.STORAGE_ACCESS_KEY ??= "allonfire";
process.env.STORAGE_SECRET_KEY ??= "allonfire";
process.env.API_LOG_LEVEL ??= LOG_LEVEL.SILENT;
```

`packages/auth/vitest.setup.ts`, `packages/database/vitest.setup.ts`, `packages/storage/vitest.setup.ts`: `process.env.DATABASE_URL ??= LOCAL_URL.POSTGRES;` (auth also `API_URL ??= TEST_API_URL`, `API_AUTH_URL ??= \`${TEST_API_URL}/v1/auth\`` if those were the values; keep what is there, swapping only the literal). Each package lists `@allonfire/config` in devDependencies already; check and add if missing.

`packages/config/tests/e2e/playwright.config.ts`: the module-private `E2E_API_PORT = 3310` goes, its uses read `LOCAL_PORT.API_E2E`; `E2E_STORAGE_ENDPOINT` goes, both web servers' `STORAGE_ENDPOINT` read `LOCAL_URL.MINIO` (relative import `../../local/addresses`). `apps/back-office/playwright.config.ts` (already imports `App` from `@allonfire/database/enums` for `AUTH_APP`): `port: LOCAL_PORT.BACK_OFFICE_E2E`. `apps/back-office/src/shared/tests/msw/handlers.ts`: drop its own `API_TEST_URL` constant and import `TEST_API_URL`; rename the uses in `handlers.ts`, `vitest.browser.config.ts` and `src/features/api/utils/tests/api.browser.test.ts` (a re-export `export { TEST_API_URL as API_TEST_URL }` is a barrel Biome refuses). `HEALTH_OK` stays as it is.

- [x] **Step 6: API default port test**

```ts
// apps/api/src/shared/constants/tests/limits.test.ts
// @module-tag unit
import { LOCAL_PORT } from "@allonfire/config/local/addresses";
import { DEFAULT_PORT } from "../limits";

it("listens where the Local stack expects the API", () => {
  expect(DEFAULT_PORT).toBe(LOCAL_PORT.API);
});
```

Run: `pnpm --filter @allonfire/api exec vitest run limits` — Expected: PASS.

- [x] **Step 7: Fix the example password and run the touched suites**

`packages/database/.env.example:1`: `DATABASE_URL="postgresql://allonfire:allonfire@localhost:5432/allonfire"`.

Run: `pnpm turbo run test --filter=@allonfire/config --filter=@allonfire/api --filter=@allonfire/auth --filter=@allonfire/storage --filter=@allonfire/database`
Expected: all pass (Docker up).

### Task 2: Guard test over the files that cannot import

**Files:**
- Create: `packages/config/local/tests/local-files.test.ts`
- Create: `packages/config/turbo.json` (the guard's inputs outside the package)

**Interfaces:**
- Consumes: `LOCAL_PORT`, `LOCAL_URL`, `LOCAL_POSTGRES` (Task 1).

- [x] **Step 1: Write the test**

```ts
// packages/config/local/tests/local-files.test.ts
// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LOCAL_PORT, LOCAL_POSTGRES, LOCAL_URL } from "../addresses";

const REPO = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(REPO, path), "utf8");

// ponytail: exact-text checks, no YAML parser; a reformatted line fails loudly.
const EXPECTED: Record<string, readonly string[]> = {
  ".github/workflows/ci.yml": [
    `DATABASE_URL: ${LOCAL_URL.POSTGRES}`,
    `API_REDIS_URL: ${LOCAL_URL.REDIS}`,
  ],
  "apps/api/.env.example": [
    `DATABASE_URL="${LOCAL_URL.POSTGRES}"`,
    `API_REDIS_URL="${LOCAL_URL.REDIS}"`,
    `PORT=${LOCAL_PORT.API}`,
  ],
  "apps/back-office/.env.example": [
    `API_URL="${LOCAL_URL.API}"`,
    `NEXT_PUBLIC_API_URL="${LOCAL_URL.API}"`,
    `STORAGE_ENDPOINT="${LOCAL_URL.MINIO}"`,
  ],
  "apps/back-office/package.json": [
    `--port ${LOCAL_PORT.BACK_OFFICE}`,
  ],
  "docker/docker-compose.dev.yml": [
    `"${LOCAL_PORT.POSTGRES}:5432"`,
    `"${LOCAL_PORT.REDIS}:6379"`,
    `"${LOCAL_PORT.MINIO}:9000"`,
    `"${LOCAL_PORT.MINIO_CONSOLE}:9001"`,
    `POSTGRES_USER: \${POSTGRES_USER:-${LOCAL_POSTGRES.USER}}`,
  ],
  "packages/database/.env.example": [`DATABASE_URL="${LOCAL_URL.POSTGRES}"`],
};

describe.each(Object.entries(EXPECTED))("%s", (path, lines) => {
  it.each(lines)("holds %s", (line) => {
    expect(read(path)).toContain(line);
  });
});
```

CI's e2e job no longer sets `STORAGE_ENDPOINT` (the e2e preset does) and no job sets it yet; Task 15 adds it to the `test` job and adds its line here. Before writing `EXPECTED`, open each file and copy its real quoting (`"..."` or bare) into the expected strings; the strings above are the shape, the files are the truth. Where a file holds a value that disagrees with the module (e.g. a different password), fix the file, not the test.

- [x] **Step 2: Make Turbo see the files it reads**

The guard reads files outside `packages/config`, so its `test` task must list them, or a compose or CI edit replays the cached pass and `--affected` skips it:

```jsonc
// packages/config/turbo.json
{
  "$schema": "https://turborepo.com/schema.json",
  "extends": ["//"],
  "tasks": {
    "test": {
      // A package task's inputs replace the root's: repeat the defaults.
      "inputs": [
        "$TURBO_DEFAULT$",
        "!**/*.md",
        "$TURBO_ROOT$/.github/workflows/ci.yml",
        "$TURBO_ROOT$/docker/docker-compose.dev.yml",
        "$TURBO_ROOT$/apps/*/.env.example",
        "$TURBO_ROOT$/apps/*/package.json",
        "$TURBO_ROOT$/packages/*/.env.example"
      ]
    }
  }
}
```

Check it: `pnpm exec turbo run test --filter=@allonfire/config --dry=json | jq '.tasks[] | select(.taskId=="@allonfire/config#test") | .inputs | keys | map(select(startswith("../../")))'` — Expected: the root files listed above appear (Turbo prints them relative to the package).

- [x] **Step 3: Run it**

Run: `pnpm --filter @allonfire/config exec vitest run local-files`
Expected: PASS once the files agree. Then change one compose port locally, run again, Expected: FAIL naming that file and line; revert.

---

## Phase B: Fixtures and the Test database

### Task 3: Fixture Users, Image list and `seedFixtures`

**Files:**
- Create: `packages/database/src/features/seed/fixtures/users.ts`
- Create: `packages/database/src/features/seed/fixtures/images.ts`
- Create: `packages/database/src/features/seed/fixtures/seed-fixtures.ts`
- Create: `packages/database/src/features/seed/fixtures/tests/users.test.ts`
- Modify: `packages/database/src/features/seed/upsert-user.ts` (takes the client)
- Modify: `packages/database/package.json` (exports for the three fixture files)

**Interfaces:**
- Produces:
  - `FIXTURE_PASSWORD: string`
  - `FIXTURE_USER: { [A in App]: { [R in Role]: SeedUser } } & { ADMIN_EVERYWHERE: SeedUser; NO_MEMBERSHIP: SeedUser }`
  - `FIXTURE_USERS: SeedUser[]` (every one, for seeding)
  - `FIXTURE_IMAGE: Record<FixtureImageName, FixtureImage>`, `FixtureImage = { key: string; source: string; width: number; height: number; bytes: number; blurDataUrl: string; alt: { en: string; it: string }; apps: { app: App; public: boolean }[] }`
  - `seedFixtures(client: PrismaClient): Promise<void>`
  - `upsertUser(client: PrismaClient, user: SeedUser, hashedPassword: string): Promise<void>`

- [x] **Step 1: Write the failing test**

```ts
// packages/database/src/features/seed/fixtures/tests/users.test.ts
// @module-tag unit
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../../generated/prisma/enums";
import { FIXTURE_USER, FIXTURE_USERS } from "../users";

describe("fixture Users", () => {
  it("has one User per App per Role, the Membership matching", () => {
    for (const app of objectValues(App)) {
      for (const role of objectValues(Role)) {
        expect(FIXTURE_USER[app][role].memberships).toEqual([{ app, role }]);
      }
    }
  });

  it("derives each email from App and Role on the .test domain", () => {
    expect(FIXTURE_USER.BACK_OFFICE.ADMIN.email).toBe(
      "back-office-admin@allonfire.test"
    );
    expect(FIXTURE_USER.LAURA.VIEWER.email).toBe("laura-viewer@allonfire.test");
  });

  it("has an Admin in every App and a User in none", () => {
    expect(FIXTURE_USER.ADMIN_EVERYWHERE.memberships).toEqual(
      objectValues(App).map((app) => ({ app, role: Role.ADMIN }))
    );
    expect(FIXTURE_USER.NO_MEMBERSHIP.memberships).toEqual([]);
  });

  it("never repeats an email", () => {
    const emails = FIXTURE_USERS.map(({ email }) => email);
    expect(new Set(emails).size).toBe(emails.length);
  });
});
```

`seedUserSchema` requires `memberships.min(1)`; the User with no Membership needs `min(0)`. Change the schema to `.min(0)` only for fixtures: add `fixtureUserSchema = seedUserSchema.extend({ memberships: z.array(...) })` or relax `seedUserSchema` and keep `min(1)` in the env-seeded Users' check. Prefer: `SeedUser` allows zero; `seed-user.test.ts` already covers the JSON parse, which goes away in Task 4.

- [x] **Step 2: Run it** — `pnpm --filter @allonfire/database exec vitest run fixtures` — Expected: FAIL, module not found.

- [x] **Step 3: Write `users.ts`**

```ts
// packages/database/src/features/seed/fixtures/users.ts
import {
  objectFromEntries,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../generated/prisma/enums";
import type { SeedUser } from "../seed-user";

/**
 * The password of every Fixture User. Not a secret: Fixtures exist only in
 * Local and Test databases, never in Production.
 */
export const FIXTURE_PASSWORD = "fixture-password-1";

const DOMAIN = "allonfire.test";
const slug = (value: string) => value.toLowerCase().replaceAll("_", "-");

const gridUser = (app: App, role: Role): SeedUser => {
  const name = `${slug(app)}-${slug(role)}`;
  return { email: `${name}@${DOMAIN}`, memberships: [{ app, role }], name };
};

const rolesIn = (app: App) =>
  objectFromEntries(objectValues(Role).map((role) => [role, gridUser(app, role)]));

export const FIXTURE_USER = {
  ...objectFromEntries(objectValues(App).map((app) => [app, rolesIn(app)])),
  ADMIN_EVERYWHERE: {
    email: `admin-everywhere@${DOMAIN}`,
    memberships: objectValues(App).map((app) => ({ app, role: Role.ADMIN })),
    name: "admin-everywhere",
  },
  NO_MEMBERSHIP: {
    email: `no-membership@${DOMAIN}`,
    memberships: [],
    name: "no-membership",
  },
} satisfies Record<string, unknown>;

export const FIXTURE_USERS: SeedUser[] = [
  ...objectValues(App).flatMap((app) =>
    objectValues(Role).map((role) => FIXTURE_USER[app][role])
  ),
  FIXTURE_USER.ADMIN_EVERYWHERE,
  FIXTURE_USER.NO_MEMBERSHIP,
];
```

If `objectFromEntries` over `objectValues(App)` does not infer `Record<App, Record<Role, SeedUser>>`, annotate the helper's return type (`Record<Role, SeedUser>`) instead of casting; `objectFromEntries` keeps literal keys (CLAUDE.md).

- [x] **Step 4: Write `images.ts`** (rows only; files arrive in Task 8)

```ts
// packages/database/src/features/seed/fixtures/images.ts
import { App } from "../../../../generated/prisma/enums";

export type FixtureImage = {
  /** `<uuid>.avif`, fixed so tests and the sign-in page can name it. */
  key: string;
  /** File name under `@allonfire/storage`'s image fixtures. */
  source: string;
  width: number;
  height: number;
  bytes: number;
  blurDataUrl: string;
  alt: { en: string; it: string };
  apps: { app: App; public: boolean }[];
};

/**
 * The Image Fixtures. width, height, bytes and blurDataUrl are what
 * `prepareImage` produces from `source`; `@allonfire/storage`'s
 * `image-fixtures.test.ts` fails when they drift.
 */
export const FIXTURE_IMAGE = {} as const satisfies Record<string, FixtureImage>;
```

Empty until Task 8 Step 2 adds the entries its script prints; `seedFixtures` compiles and seeds no Image meanwhile.

- [x] **Step 5: `upsertUser` takes the client; `seedFixtures`**

In `upsert-user.ts` add the first parameter `client: PrismaClient` (type import from `../../../generated/prisma/client`) and replace every `prisma.` with `client.`; drop the `prisma` import. Update `seed.ts` calls to `upsertUser(prisma, …)`.

```ts
// packages/database/src/features/seed/fixtures/seed-fixtures.ts
import { objectValues } from "@allonfire/core/shared/utils/object";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../../../../generated/prisma/client";
import { upsertUser } from "../upsert-user";
import { FIXTURE_IMAGE } from "./images";
import { FIXTURE_PASSWORD, FIXTURE_USERS } from "./users";

/** Every Fixture into `client`'s database; safe to run again. */
export async function seedFixtures(client: PrismaClient): Promise<void> {
  // One scrypt hash for every Fixture User: same password, and hashing is the slow part.
  const hash = await hashPassword(FIXTURE_PASSWORD);
  for (const user of FIXTURE_USERS) {
    await upsertUser(client, user, hash);
  }
  for (const { apps, source: _source, ...image } of objectValues(FIXTURE_IMAGE)) {
    await client.image.upsert({
      create: { ...image, apps: { create: apps } },
      update: {},
      where: { key: image.key },
    });
  }
}
```

Sequential on purpose: `upsertUser` runs a transaction per User and the template has one client.

Exports in `packages/database/package.json`: `./features/seed/fixtures/users`, `./features/seed/fixtures/images`, `./features/seed/fixtures/seed-fixtures`.

- [x] **Step 6: Run** — `pnpm --filter @allonfire/database exec vitest run fixtures seed` — Expected: PASS.

### Task 4: The Local seed

**Files:**
- Modify: `packages/database/src/features/seed/seed.ts`
- Modify: `packages/database/src/environment/seed-environment.ts`
- Modify: `packages/database/src/features/seed/seed-user.ts` (drop `mockUsersFile` from `AppSeed`)
- Modify: `packages/database/src/features/apps/laura/seed/laura-seed.ts`
- Create: `packages/database/src/features/seed/retired-users.ts`
- Create: `packages/database/src/features/seed/tests/seed.integration.test.ts`
- Delete: `packages/database/src/features/seed/mock/users.json`, `packages/database/src/features/apps/laura/seed/mock/users.json`, `packages/database/src/features/apps/laura/seed/tests/laura-seed.test.ts`
- Modify: `packages/database/.env.example` (mode `local`, drop `DATABASE_SEED_TEST_PASSWORD`), root `package.json` `dev:setup` if it sets the mode, `packages/database/README.md` seed section

**Interfaces:**
- Consumes: `seedFixtures`, `upsertUser(client, …)` (Task 3).
- Produces: `DATABASE_SEED_MODE: "local" | "prod"`; `RETIRED_USER_EMAILS: readonly string[]`; `seed(client, env)` exported from `seed.ts` for the test, with `main()` calling it.

- [x] **Step 1: Write the failing test**

It runs against the Test database Task 6 provides; until Task 6 lands, run it with `DATABASE_URL` pointed at a throwaway created by hand is not needed: write it now, run it after Task 6 (Step 4 below says so).

```ts
// packages/database/src/features/seed/tests/seed.integration.test.ts
// @module-tag integration
import { prisma } from "../../prisma/client";
import { FIXTURE_USERS } from "../fixtures/users";
import { RETIRED_USER_EMAILS } from "../retired-users";
import { seed } from "../seed";

const ENV = {
  DATABASE_SEED_ADMIN_EMAIL: "seed-admin@allonfire.test",
  DATABASE_SEED_ADMIN_PASSWORD: "seed-admin-password",
  DATABASE_SEED_LAURA_VIEWER_EMAIL: "seed-laura-guest@allonfire.test",
  DATABASE_SEED_LAURA_VIEWER_PASSWORD: "seed-guest-password",
  DATABASE_SEED_MODE: "local",
} as const;

describe("the Local seed", () => {
  it("deletes the retired mock Users and nobody else", async () => {
    const [retired] = RETIRED_USER_EMAILS;
    await prisma.user.create({ data: { email: retired, emailVerified: true, name: "old" } });
    await prisma.user.create({ data: { email: "keep-me@allonfire.test", emailVerified: true, name: "keep" } });
    await seed(prisma, ENV);
    expect(await prisma.user.findUnique({ where: { email: retired } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: "keep-me@allonfire.test" } })).not.toBeNull();
  });

  it("holds every Fixture User, and a second run changes nothing", async () => {
    await seed(prisma, ENV);
    const before = await prisma.user.count();
    await seed(prisma, ENV);
    expect(await prisma.user.count()).toBe(before);
    const emails = (await prisma.user.findMany({ select: { email: true } })).map(({ email }) => email);
    expect(emails).toEqual(expect.arrayContaining(FIXTURE_USERS.map(({ email }) => email)));
  });

  it("seeds no Fixture in prod mode", async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: "@allonfire.test" }, NOT: { email: { startsWith: "seed-" } } } });
    await seed(prisma, { ...ENV, DATABASE_SEED_MODE: "prod" });
    const fixture = FIXTURE_USERS[0];
    expect(await prisma.user.findUnique({ where: { email: fixture?.email ?? "" } })).toBeNull();
  });
});
```

The Test database starts from the template, which already holds the Fixtures; the prod-mode test deletes them first. `fixture?.email ?? ""` avoids a non-null assertion under `noUncheckedIndexedAccess`.

- [x] **Step 2: Implement**

`retired-users.ts`:

```ts
/**
 * The mock Users the Local seed used before the Fixtures; deleted once from a
 * Local database that still holds them. Drop this list once none does.
 */
export const RETIRED_USER_EMAILS = [
  "allonfire-user@allonfire.com",
  "allonfire-viewer@allonfire.com",
  "laura-admin@allonfire.com",
  "laura-user@allonfire.com",
] as const;
```

`seed-environment.ts`: `DATABASE_SEED_MODE: z.enum(["local", "prod"]).default("prod")`, delete `DATABASE_SEED_TEST_PASSWORD`, comment `"prod" (default) = the real Admin and Laura's guest Viewer; "local" = also every Fixture`.

`seed.ts`: export `seed(client: PrismaClient, env: Pick<SeedEnv, …the five keys>)`:
1. upsert the env Admin (as today, through `upsertUser(client, …)`);
2. each `APP_SEEDS` entry's users with its password (as today);
3. when `env.DATABASE_SEED_MODE === "local"`: `await client.user.deleteMany({ where: { email: { in: [...RETIRED_USER_EMAILS] } } })`, then `await seedFixtures(client)`.

`main()` becomes `seed(prisma, seedEnv)` plus the existing disconnect handling. Remove `MOCK_DIR`, `readFileSync`, `parseJsonWith`, `seedUsersSchema` imports if unused. `AppSeed` loses `mockUsersFile`; `laura-seed.ts` loses it and its `resolve` import. Delete the two `mock/users.json` and `laura-seed.test.ts`. If `seed-user.test.ts` only tested the mock JSON parse, delete the cases that read files and keep the schema cases.

`seedFixtures` writes Image rows once Task 8 fills `FIXTURE_IMAGE`; the Local seed uploads their files with Task 8's `db:seed:images`.

- [x] **Step 3: Update `.env.example`** — `DATABASE_SEED_MODE="local"`, remove `DATABASE_SEED_TEST_PASSWORD`. Tell the user (summary at the end) to change their own `packages/database/.env` the same way.

- [x] **Step 4: Run after Task 6** — `pnpm --filter @allonfire/database exec vitest run seed` — Expected: PASS (3). Before Task 6 exists, run `check-types` only: `pnpm --filter @allonfire/database check-types` — Expected: no errors.

### Task 5: The Test database feature

**Files:**
- Create: `packages/database/src/features/test-database/names.ts`
- Create: `packages/database/src/features/test-database/server.ts` (maintenance connection, create, drop, list)
- Create: `packages/database/src/features/test-database/template.ts`
- Create: `packages/database/src/features/test-database/test-database.ts` (`createTestDatabase`, `dropTestDatabase`, `sweepTestDatabases`)
- Create: `packages/database/src/features/test-database/cli.ts`
- Create: `packages/database/src/features/test-database/tests/names.test.ts`
- Create: `packages/database/src/features/test-database/tests/test-database.integration.test.ts`
- Move: `packages/database/liquibase/tests/throwaway-db.ts` helpers `migrateImage`, `liquibase`, `PACKAGE_DIR`, `DOCKER_TIMEOUT` into `server.ts`/`template.ts`; the changelog and backup tests import them from the new place (`throwaway-db.ts` keeps only what only they use, or goes)
- Modify: `packages/database/package.json` (exports, script `"test-database": "tsx --env-file-if-exists=.env src/features/test-database/cli.ts"`)

**Interfaces:**
- Produces:
  - `TEMPLATE_DATABASE = "allonfire_test_template"`
  - `testRunStamp(now?: Date): string` → `"<epochSeconds>_<6 random [a-z0-9]>"`
  - `testDatabaseName(label: string, stamp: string): string` → `allonfire_test_<label>_<stamp>` (label lowercased, `-` to `_`)
  - `isStale(name: string, now: Date, maxAgeMs: number): boolean`
  - `databaseUrl(serverUrl: string, database: string): string`
  - `ensureTemplate(serverUrl: string): Promise<"built" | "reused">`
  - `createTestDatabase(serverUrl: string, label: string, stamp: string): Promise<string>` (returns the URL)
  - `dropTestDatabase(serverUrl: string, name: string): Promise<void>`
  - `sweepTestDatabases(serverUrl: string, now?: Date): Promise<string[]>` (dropped names)
  - CLI: `test-database template` builds or checks the template; `test-database create <label> <stamp>` prints the URL; `test-database drop <label> <stamp>`.

- [x] **Step 1: Write the failing unit test**

```ts
// packages/database/src/features/test-database/tests/names.test.ts
// @module-tag unit
import { MS_PER_SECOND, SECONDS_PER_HOUR } from "@allonfire/core/shared/constants/units";
import { isStale, testDatabaseName, testRunStamp } from "../names";

const MS_PER_HOUR = SECONDS_PER_HOUR * MS_PER_SECOND;

const NOW = new Date("2026-10-09T12:00:00Z");
const EPOCH = NOW.getTime() / 1000;

describe("Test database names", () => {
  it("stamps a run with its epoch seconds and a random suffix", () => {
    expect(testRunStamp(NOW)).toMatch(new RegExp(`^${EPOCH}_[a-z0-9]{6}$`));
  });

  it("names a clone by label and stamp, unquoted-safe", () => {
    expect(testDatabaseName("back-office", "1760011200_ab12cd")).toBe(
      "allonfire_test_back_office_1760011200_ab12cd"
    );
  });

  it("calls a clone stale only past the age, never the template", () => {
    const old = testDatabaseName("api", `${EPOCH - 2 * 3600}_aaaaaa`);
    const young = testDatabaseName("api", `${EPOCH - 60}_bbbbbb`);
    expect(isStale(old, NOW, MS_PER_HOUR)).toBe(true);
    expect(isStale(young, NOW, MS_PER_HOUR)).toBe(false);
    expect(isStale("allonfire_test_template", NOW, MS_PER_HOUR)).toBe(false);
    expect(isStale("allonfire", NOW, MS_PER_HOUR)).toBe(false);
  });
});
```

- [x] **Step 2: Run** — `pnpm --filter @allonfire/database exec vitest run names` — Expected: FAIL, module not found.

- [x] **Step 3: Implement `names.ts`**

```ts
// packages/database/src/features/test-database/names.ts
import { randomBytes } from "node:crypto";

export const TEST_DATABASE_PREFIX = "allonfire_test_";
export const TEMPLATE_DATABASE = `${TEST_DATABASE_PREFIX}template`;
const CLONE = /^allonfire_test_[a-z0-9_]+_(\d+)_[a-z0-9]{6}$/;
const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

const suffix = () =>
  Array.from(randomBytes(6), (byte) => SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length]).join("");

/** One stamp per run, shared by its database and bucket. */
export const testRunStamp = (now = new Date()) =>
  `${Math.floor(now.getTime() / 1000)}_${suffix()}`;

export const testDatabaseName = (label: string, stamp: string) =>
  `${TEST_DATABASE_PREFIX}${label.toLowerCase().replaceAll("-", "_")}_${stamp}`;

/** A clone older than `maxAgeMs`: a crashed run's. The template and other databases never are. */
export function isStale(name: string, now: Date, maxAgeMs: number): boolean {
  const epoch = CLONE.exec(name)?.[1];
  return epoch !== undefined && now.getTime() - Number(epoch) * 1000 > maxAgeMs;
}

export function databaseUrl(serverUrl: string, database: string): string {
  const url = new URL(serverUrl);
  url.pathname = `/${database}`;
  url.search = "";
  return url.toString();
}
```

`Array.from(…, fn)` returns `(string | undefined)[]` under `noUncheckedIndexedAccess`; use `.charAt(byte % length)` instead of indexing to stay `string`.

- [x] **Step 4: Run** — Expected: PASS (3).

- [x] **Step 5: Write the failing integration test**

```ts
// packages/database/src/features/test-database/tests/test-database.integration.test.ts
// @module-tag integration
import { PrismaClient } from "../../../../generated/prisma/client";
import { FIXTURE_USER } from "../../seed/fixtures/users";
import { TEMPLATE_DATABASE, testDatabaseName } from "../names";
import { databasesOnServer } from "../server";
import { ensureTemplate } from "../template";
import { createTestDatabase, dropTestDatabase, sweepTestDatabases } from "../test-database";

const SERVER = process.env.DATABASE_URL ?? "";
const EPOCH = Math.floor(Date.now() / 1000);

describe("Test databases", { timeout: 5 * 60_000 }, () => {
  it("builds the template once when two runs ask at the same time", async () => {
    const results = await Promise.all([ensureTemplate(SERVER), ensureTemplate(SERVER)]);
    expect(results.filter((r) => r === "built").length).toBeLessThanOrEqual(1);
    expect(await ensureTemplate(SERVER)).toBe("reused");
  });

  it("clones the template with every Fixture User, then drops the clone", async () => {
    const stamp = `${EPOCH}_clonet`;
    const url = await createTestDatabase(SERVER, "selftest", stamp);
    const client = new PrismaClient({ datasourceUrl: url });
    try {
      expect(await client.user.findUnique({ where: { email: FIXTURE_USER.BACK_OFFICE.ADMIN.email } })).not.toBeNull();
    } finally {
      await client.$disconnect();
    }
    await dropTestDatabase(SERVER, testDatabaseName("selftest", stamp));
    expect(await databasesOnServer(SERVER)).not.toContain(testDatabaseName("selftest", stamp));
  });

  it("sweeps an old clone and keeps a young one and the template", async () => {
    const oldStamp = `${EPOCH - 2 * 3600}_oldone`;
    const youngStamp = `${EPOCH}_young1`;
    await createTestDatabase(SERVER, "selftest", oldStamp);
    await createTestDatabase(SERVER, "selftest", youngStamp);
    const dropped = await sweepTestDatabases(SERVER);
    const left = await databasesOnServer(SERVER);
    expect(dropped).toContain(testDatabaseName("selftest", oldStamp));
    expect(left).toContain(testDatabaseName("selftest", youngStamp));
    expect(left).toContain(TEMPLATE_DATABASE);
    await dropTestDatabase(SERVER, testDatabaseName("selftest", youngStamp));
  });
});
```

The first test also covers Review Focus 1. The fingerprint (Review Focus 4) is unit-tested in Step 7.

- [x] **Step 6: Implement `server.ts`, `template.ts`, `test-database.ts`**

`server.ts`:

```ts
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { MS_PER_MINUTE } from "@allonfire/core/shared/constants/units";
import { PrismaClient } from "../../../generated/prisma/client";
import { databaseUrl } from "./names";

export const PACKAGE_DIR = resolve(import.meta.dirname, "../../..");
/** Liquibase runs in Docker; the first build pulls the image. */
export const DOCKER_TIMEOUT = 5 * MS_PER_MINUTE;

/** Runs `run` on the server's maintenance database, `postgres`. */
export async function onServer<T>(serverUrl: string, run: (client: PrismaClient) => Promise<T>): Promise<T> {
  const client = new PrismaClient({ datasourceUrl: databaseUrl(serverUrl, "postgres") });
  try {
    return await run(client);
  } finally {
    await client.$disconnect();
  }
}

export const databasesOnServer = (serverUrl: string) =>
  onServer(serverUrl, async (client) =>
    (await client.$queryRaw<{ datname: string }[]>`SELECT datname FROM pg_database`).map(({ datname }) => datname)
  );

/** Names come from `names.ts` (lowercase, digits, underscores), never from input. */
export const dropDatabase = (serverUrl: string, name: string) =>
  onServer(serverUrl, (client) => client.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`));

export function migrateImage(url: string, extraEnv: readonly string[], ...args: string[]): string {
  return execFileSync("env", [`DATABASE_URL=${url}`, ...extraEnv, "bash", "scripts/liquibase.sh", ...args], {
    cwd: PACKAGE_DIR, encoding: "utf8", stdio: "pipe",
  });
}

export const liquibase = (url: string, ...args: string[]) => migrateImage(url, [], ...args);
```

(Keep the comments `throwaway-db.ts` had on `migrateImage`.) Move `executeFile`, `clientFor`, `tablesIn`, `throwawayUrl`, `recreateDatabase` users in the liquibase tests onto these: `throwawayUrl(db)` becomes `databaseUrl(env.DATABASE_URL, db)`; `recreateDatabase` becomes `dropDatabase` then `onServer(…CREATE DATABASE…)`. Keep `executeFile` and `tablesIn` in `liquibase/tests/throwaway-db.ts` (only those tests use them).

`template.ts`:

```ts
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { PrismaClient } from "../../../generated/prisma/client";
import { seedFixtures } from "../seed/fixtures/seed-fixtures";
import { TEMPLATE_DATABASE, databaseUrl } from "./names";
import { PACKAGE_DIR, dropDatabase, liquibase, onServer } from "./server";

/** What the template is built from: a change to any rebuilds it. */
const SOURCES = ["changelog", "src/features/seed"];
/** Any constant; every run asks Postgres for this one lock. */
const TEMPLATE_LOCK = 4_180_017;

const filesUnder = (dir: string): string[] =>
  readdirSync(join(PACKAGE_DIR, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("._"))
    .map((entry) => relative(PACKAGE_DIR, join(entry.parentPath, entry.name)))
    .sort();

export function templateFingerprint(): string {
  const hash = createHash("sha256");
  for (const file of SOURCES.flatMap(filesUnder)) {
    hash.update(file).update(readFileSync(join(PACKAGE_DIR, file)));
  }
  return hash.digest("hex");
}

const commentOf = (serverUrl: string) =>
  onServer(serverUrl, async (client) => {
    const rows = await client.$queryRaw<{ comment: string | null }[]>`
      SELECT shobj_description(oid, 'pg_database') AS comment
      FROM pg_database WHERE datname = ${TEMPLATE_DATABASE}`;
    return rows[0]?.comment ?? null;
  });

/**
 * Builds `allonfire_test_template` when it is missing or older than the
 * changelog and Fixtures. A session-level advisory lock makes parallel runs
 * build it once: the second waits, then finds it current.
 */
export async function ensureTemplate(serverUrl: string): Promise<"built" | "reused"> {
  const fingerprint = templateFingerprint();
  if ((await commentOf(serverUrl)) === fingerprint) {
    return "reused";
  }
  const lock = new PrismaClient({ datasourceUrl: databaseUrl(serverUrl, "postgres") });
  try {
    await lock.$executeRaw`SELECT pg_advisory_lock(${TEMPLATE_LOCK})`;
    if ((await commentOf(serverUrl)) === fingerprint) {
      return "reused";
    }
    await dropDatabase(serverUrl, TEMPLATE_DATABASE);
    await onServer(serverUrl, (client) => client.$executeRawUnsafe(`CREATE DATABASE ${TEMPLATE_DATABASE}`));
    const url = databaseUrl(serverUrl, TEMPLATE_DATABASE);
    liquibase(url, "update");
    const seeder = new PrismaClient({ datasourceUrl: url });
    try {
      await seedFixtures(seeder);
    } finally {
      await seeder.$disconnect();
    }
    // COMMENT takes no bind parameter; the fingerprint is hex.
    await onServer(serverUrl, (client) =>
      client.$executeRawUnsafe(`COMMENT ON DATABASE ${TEMPLATE_DATABASE} IS '${fingerprint}'`)
    );
    return "built";
  } finally {
    await lock.$executeRaw`SELECT pg_advisory_unlock(${TEMPLATE_LOCK})`;
    await lock.$disconnect();
  }
}
```

The `liquibase.sh` script runs `node --env-file` only when `DATABASE_URL` is unset, and rewrites `@localhost` to `host.docker.internal`; both already hold.

`test-database.ts`:

```ts
import { MS_PER_SECOND, SECONDS_PER_HOUR } from "@allonfire/core/shared/constants/units";
import { TEMPLATE_DATABASE, TEST_DATABASE_PREFIX, databaseUrl, isStale, testDatabaseName } from "./names";
import { databasesOnServer, dropDatabase, onServer } from "./server";

/** A clone younger than this belongs to a run still going. */
export const STALE_AFTER_MS = SECONDS_PER_HOUR * MS_PER_SECOND;

export async function createTestDatabase(serverUrl: string, label: string, stamp: string): Promise<string> {
  const name = testDatabaseName(label, stamp);
  await onServer(serverUrl, (client) =>
    client.$executeRawUnsafe(`CREATE DATABASE ${name} TEMPLATE ${TEMPLATE_DATABASE}`)
  );
  return databaseUrl(serverUrl, name);
}

export const dropTestDatabase = dropDatabase;

/** Drops crashed runs' clones; a clone younger than an hour belongs to a run still going. */
export async function sweepTestDatabases(serverUrl: string, now = new Date()): Promise<string[]> {
  const stale = (await databasesOnServer(serverUrl)).filter(
    (name) => name.startsWith(TEST_DATABASE_PREFIX) && isStale(name, now, STALE_AFTER_MS)
  );
  for (const name of stale) {
    await dropDatabase(serverUrl, name);
  }
  return stale;
}
```

- [x] **Step 7: Fingerprint unit test**

```ts
// packages/database/src/features/test-database/tests/template.test.ts
// @module-tag unit
import { templateFingerprint } from "../template";

it("fingerprints the same tree the same way", () => {
  expect(templateFingerprint()).toBe(templateFingerprint());
  expect(templateFingerprint()).toMatch(/^[0-9a-f]{64}$/);
});
```

Covering "a changeset edit rebuilds" end to end needs writing into `changelog/`; the integration test's second `ensureTemplate` returning `"reused"` plus this purity check is the agreed coverage.

- [x] **Step 8: CLI**

```ts
// packages/database/src/features/test-database/cli.ts
// The e2e preset's commands (Playwright starts web servers before global
// setup, so the API's start command makes its database):
//   test-database template                 builds or checks the template
//   test-database create <label> <stamp>   prints the clone's URL
//   test-database drop <label> <stamp>
import { env } from "../../environment/environment";
import { testDatabaseName } from "./names";
import { ensureTemplate } from "./template";
import { createTestDatabase, dropTestDatabase, sweepTestDatabases } from "./test-database";

const [command, label, stamp] = process.argv.slice(2);
if (command !== "template" && !(label && stamp)) {
  throw new Error("Usage: test-database template | <create|drop> <label> <stamp>");
}
if (command === "template") {
  // CI's db:drift checks the template; `label` and `stamp` are unused here.
  await ensureTemplate(env.DATABASE_URL);
} else if (command === "create") {
  await ensureTemplate(env.DATABASE_URL);
  await sweepTestDatabases(env.DATABASE_URL);
  process.stdout.write(await createTestDatabase(env.DATABASE_URL, label, stamp));
} else if (command === "drop") {
  await dropTestDatabase(env.DATABASE_URL, testDatabaseName(label, stamp));
} else {
  throw new Error(`Unknown command: ${command}`);
}
```

`env.DATABASE_URL` is the server (the Local `allonfire` URL from `.env`, or CI's); the clone is a sibling on it.

- [x] **Step 9: Run** — this file needs Task 6's global setup to have `DATABASE_URL`; with Docker up run it directly against the Local server: `DATABASE_URL=postgresql://allonfire:allonfire@localhost:5432/allonfire pnpm --filter @allonfire/database exec vitest run test-database template names` — Expected: PASS. Then `pnpm --filter @allonfire/database exec vitest run liquibase` — Expected: the changelog and backup tests still pass on the moved helpers.

### Task 6: Vitest global setup, wired into every package with integration tests

**Files:**
- Create: `packages/database/src/features/test-database/global-setup.ts`
- Create: `packages/database/src/features/test-database/tests/global-setup.test.ts`
- Modify: `packages/database/vitest.config.ts`, `packages/auth/vitest.config.ts`, `apps/api/vitest.config.ts` (`globalSetup`)
- Modify: `apps/api/src/features/auth/tests/sign-in.integration.test.ts` (fixtures; Task 10 extends it)
- Modify: `packages/database/src/features/image/tests/image.integration.test.ts` (drop cleanup that only guarded the shared database; keep unique keys)
- Modify: `packages/database/package.json` (export `./features/test-database/global-setup`)

**Interfaces:**
- Consumes: Task 5's functions.
- Produces: default export `setup(project: TestProject): Promise<(() => Promise<void>) | undefined>`; `runsIntegration(tagsFilter: readonly string[] | undefined): boolean`.

- [x] **Step 1: Write the failing test**

```ts
// packages/database/src/features/test-database/tests/global-setup.test.ts
// @module-tag unit
import { runsIntegration } from "../global-setup";

describe("runsIntegration", () => {
  it("is true with no tag filter", () => {
    expect(runsIntegration(undefined)).toBe(true);
    expect(runsIntegration([])).toBe(true);
  });
  it("is false for a unit-only run", () => {
    expect(runsIntegration(["unit"])).toBe(false);
  });
  it("is true when the filter names integration", () => {
    expect(runsIntegration(["integration"])).toBe(true);
  });
});
```

- [x] **Step 2: Run** — Expected: FAIL, module not found.

- [x] **Step 3: Implement**

```ts
// packages/database/src/features/test-database/global-setup.ts
import { basename } from "node:path";
import { LOCAL_URL } from "@allonfire/config/local/addresses";
import type { TestProject } from "vitest/node";
import { testDatabaseName, testRunStamp } from "./names";
import { ensureTemplate } from "./template";
import { createTestDatabase, dropTestDatabase, sweepTestDatabases } from "./test-database";

/** A unit-only run (`--tags-filter=unit`) needs no Postgres. */
export const runsIntegration = (tagsFilter: readonly string[] | undefined) =>
  !tagsFilter?.length || tagsFilter.includes("integration");

/**
 * Vitest `globalSetup`: a Test database for this package's run, cloned from
 * the template, handed to the workers as `DATABASE_URL` (they are forked
 * after this runs), dropped when the run ends.
 */
export default async function setup(project: TestProject) {
  if (!runsIntegration(project.config.tagsFilter)) {
    return;
  }
  const server = process.env.DATABASE_URL ?? LOCAL_URL.POSTGRES;
  const label = basename(project.config.root);
  const stamp = testRunStamp();
  await ensureTemplate(server);
  await sweepTestDatabases(server);
  process.env.DATABASE_URL = await createTestDatabase(server, label, stamp);
  return () => dropTestDatabase(server, testDatabaseName(label, stamp));
}
```

`@allonfire/config` becomes a dependency of `@allonfire/database` only as a devDependency (it already is); the global setup runs under Vitest only. Check the `project.config.tagsFilter` type in `vitest/node`; if it is `string[] | undefined`, the signature above takes it without a cast.

In each of `packages/database/vitest.config.ts`, `packages/auth/vitest.config.ts`, `apps/api/vitest.config.ts` add to `test`: `globalSetup: ["@allonfire/database/features/test-database/global-setup"]` (if Vitest does not resolve a package specifier there, use `require.resolve`-free `import.meta.resolve("@allonfire/database/features/test-database/global-setup")` and pass the resulting path). `@allonfire/auth` and `@allonfire/api` already depend on `@allonfire/database`.

- [x] **Step 4: Fixture Users in the existing sign-in test**

In `apps/api/src/features/auth/tests/sign-in.integration.test.ts`: delete `EMAIL`, `PASSWORD`, the `beforeAll` upsert and the `afterAll` delete; `signIn` posts `FIXTURE_USER.LAURA.VIEWER` with `FIXTURE_PASSWORD` (the same role the test used), and `ORIGIN` becomes `LOCAL_URL.LAURA`. Keep the Postgres-unavailable message in a `beforeAll` that only checks `SELECT 1`, now saying `pnpm docker:up`. `SIGN_UP_EMAIL` stays unique; its cleanup goes (the clone is dropped).

- [x] **Step 5: Run**

Run: `pnpm turbo run test --filter=@allonfire/database --filter=@allonfire/auth --filter=@allonfire/api --output-logs=errors-only`
Expected: all pass. Then `psql`-free check that the Local data is untouched: `docker exec allonfire-postgres psql -U allonfire -d allonfire -tc "SELECT count(*) FROM auth.\"User\" WHERE email LIKE '%@registration.allonfire.test'"` — Expected: `0` new rows from this run. Then `pnpm test:unit` with `docker stop allonfire-postgres` — Expected: PASS (Review Focus 3); `docker start allonfire-postgres` after.

Also run Task 4's pending test: `pnpm --filter @allonfire/database exec vitest run seed` — Expected: PASS.

---

## Phase C: Images on the real stack

### Task 7: The bucket from env

**Files:**
- Modify: `packages/storage/src/environment/environment.ts` (`STORAGE_BUCKET: z.string().min(3).default("image")` in `storageEnvSchema`)
- Modify: `packages/storage/src/features/image/objects/image-objects.ts` (`env.STORAGE_BUCKET`)
- Modify: `packages/storage/src/features/image/constants/bucket.ts` (`IMAGE_BUCKET` renamed `DEFAULT_IMAGE_BUCKET`, the Production name)
- Modify: `packages/storage/src/features/image/next/with-storage-images.ts` (option `bucket`, default `DEFAULT_IMAGE_BUCKET`)
- Modify: `packages/storage/src/features/image/next/tests/with-storage-images.test.ts`
- Modify: `apps/back-office/src/environment/build-environment.ts` (`STORAGE_BUCKET` with default), `apps/back-office/next.config.ts` (passes it), `apps/api/.env.example` and `apps/back-office/.env.example` (commented `# STORAGE_BUCKET="image"`)
- Modify: `turbo.json` `build.env` (add `STORAGE_BUCKET`)

**Interfaces:**
- Produces: `withStorageImages(config, { origin, bucket? })`; `env.STORAGE_BUCKET`.

- [x] **Step 1: Failing test** — in `with-storage-images.test.ts` add:

```ts
it("rewrites into the bucket it is given", async () => {
  const config = withStorageImages({}, { bucket: "allonfire-test-x", origin: "http://minio:9000" });
  const rewrites = await config.rewrites?.();
  expect(rewrites).toEqual(
    expect.arrayContaining([expect.objectContaining({ destination: "http://minio:9000/allonfire-test-x/:key" })])
  );
});
```

(Match the existing tests' way of reading `rewrites`; copy it.)

- [x] **Step 2: Run** — `pnpm --filter @allonfire/storage exec vitest run with-storage-images` — Expected: FAIL (bucket ignored).

- [x] **Step 3: Implement** the option (`bucket = DEFAULT_IMAGE_BUCKET`), the env var, `image-objects.ts` reading `env.STORAGE_BUCKET`, and the Back Office build env (`STORAGE_BUCKET: z.string().min(3).default("image")`, passed as `bucket: buildEnv.STORAGE_BUCKET`). Grep for `IMAGE_BUCKET` and update every importer.

- [x] **Step 4: Run** — `pnpm turbo run test check-types --filter=@allonfire/storage --filter=@allonfire/back-office --filter=@allonfire/api` — Expected: pass.

### Task 8: Image Fixture files and a bucket per run

**Files:**
- Create: `packages/storage/src/features/image/fixtures/files/` with `photo.jpg`, `graphic.png`, `photo.webp`, `photo.avif`, `animation.gif` (small: 640x480 or less, each under 100 KB, generated with sharp from one CC0 or self-made image; the `.heic` is copied from `prepare/tests/fixtures/colors-no-alpha.heic`), and `sign-in.jpg` (Task 9)
- Create: `packages/storage/src/features/image/fixtures/scripts/describe-fixtures.ts` (prints each file's `prepareImage` width, height, bytes, blurDataUrl, for pasting into `FIXTURE_IMAGE`)
- Create: `packages/storage/src/features/image/fixtures/tests/image-fixtures.test.ts`
- Create: `packages/storage/src/features/test-bucket/names.ts`, `bucket.ts`, `global-setup.ts`, `cli.ts`, `tests/names.test.ts`, `tests/test-bucket.integration.test.ts`
- Create: `packages/storage/src/features/image/fixtures/upload-fixtures.ts` (`uploadImageFixtures(bucket)`)
- Create: `packages/storage/src/features/image/fixtures/seed-local.ts` (Local seed of the files into `image`)
- Modify: `packages/database/src/features/seed/fixtures/images.ts` (the real entries)
- Modify: `packages/storage/package.json` (exports; scripts `"test-bucket": "tsx --env-file-if-exists=../../apps/api/.env src/features/test-bucket/cli.ts"`, `"db:seed:images": "tsx --env-file-if-exists=../../apps/api/.env src/features/image/fixtures/seed-local.ts"`), root `package.json` `dev:setup` (runs it after `db:seed`)
- Modify: `packages/storage/vitest.config.ts`, `apps/api/vitest.config.ts` (`globalSetup` adds the bucket one)

**Interfaces:**
- Consumes: `FIXTURE_IMAGE`, `testRunStamp`, `isStale` shape (re-implemented for buckets in `test-bucket/names.ts`: `testBucketName(label, stamp)` → `allonfire-test-<label>-<stamp with _ → ->`), `prepareImage`, `putObject`.
- Produces: `createTestBucket(label, stamp): Promise<string>`, `dropTestBucket(name)`, `sweepTestBuckets(now?)`, `uploadImageFixtures(bucket)`; CLI `test-bucket create|drop|name <label> <stamp>` (create prints the name).

- [x] **Step 1: Fixture entries test (fails until the list is filled)**

```ts
// packages/storage/src/features/image/fixtures/tests/image-fixtures.test.ts
// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FIXTURE_IMAGE } from "@allonfire/database/features/seed/fixtures/images";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { prepareImage } from "../../prepare/prepare-image";

const FILES = resolve(import.meta.dirname, "../files");

describe.each(objectValues(FIXTURE_IMAGE))("Image Fixture $key", (fixture) => {
  it("holds what prepareImage makes of its source", async () => {
    const prepared = await prepareImage(readFileSync(resolve(FILES, fixture.source)));
    expect({ blurDataUrl: prepared.blurDataUrl, bytes: prepared.bytes, height: prepared.height, width: prepared.width })
      .toEqual({ blurDataUrl: fixture.blurDataUrl, bytes: fixture.bytes, height: fixture.height, width: fixture.width });
  });
});

it("has one Fixture per accepted format", () => {
  const extensions = objectValues(FIXTURE_IMAGE).map(({ source }) => source.split(".").pop());
  expect(new Set(extensions)).toEqual(new Set(["jpg", "png", "webp", "avif", "heic"]));
});
```

`animation.gif` is the refused format; it is not a Fixture row (it never becomes an Image), Task 13 reads it by path.

If AVIF encoding is not byte-stable across sharp builds (CI vs macOS), drop `bytes` and `blurDataUrl` from the equality and keep width and height; record that ruling in the plan's log.

- [x] **Step 2: Generate the files and fill `FIXTURE_IMAGE`**

Write `describe-fixtures.ts` (reads `files/*`, runs `prepareImage`, prints a TypeScript object literal per file). Run it: `pnpm --filter @allonfire/storage exec tsx src/features/image/fixtures/scripts/describe-fixtures.ts`. Paste into `FIXTURE_IMAGE` with fixed keys (`randomUUID()` once, written down) and placements that cover the rules:

| Name | Source | Placements |
|---|---|---|
| `PUBLIC_IN_BACK_OFFICE` | `photo.jpg` | BACK_OFFICE public |
| `PRIVATE_IN_BACK_OFFICE` | `graphic.png` | BACK_OFFICE private |
| `PRIVATE_IN_LAURA` | `photo.webp` | LAURA private |
| `IN_BOTH_APPS` | `photo.avif` | BACK_OFFICE private, LAURA public |
| `HEIC_IN_BACK_OFFICE` | `colors-no-alpha.heic` | BACK_OFFICE private |
| `SIGN_IN` | `sign-in.jpg` | BACK_OFFICE public (Task 9) |

Alt: `{ en: "<what it shows>", it: "<Italian>" }`; the sign-in photo's alt is empty (decorative), as today.

- [x] **Step 3: Run** — `pnpm --filter @allonfire/storage exec vitest run image-fixtures` — Expected: PASS.

- [x] **Step 4: Bucket names test, then implementation**

```ts
// packages/storage/src/features/test-bucket/tests/names.test.ts
// @module-tag unit
import { isStaleBucket, testBucketName } from "../names";

const NOW = new Date("2026-10-09T12:00:00Z");
const EPOCH = NOW.getTime() / 1000;

it("names a bucket S3 accepts", () => {
  const name = testBucketName("back-office", "1760011200_ab12cd");
  expect(name).toBe("allonfire-test-back-office-1760011200-ab12cd");
  expect(name).toMatch(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/);
});

it("calls a bucket stale only past an hour, never `image`", () => {
  expect(isStaleBucket(testBucketName("api", `${EPOCH - 7200}_aaaaaa`), NOW)).toBe(true);
  expect(isStaleBucket(testBucketName("api", `${EPOCH - 60}_bbbbbb`), NOW)).toBe(false);
  expect(isStaleBucket("image", NOW)).toBe(false);
});
```

Run — Expected: FAIL; implement `names.ts` (`testBucketName = (label, stamp) => \`allonfire-test-${label}-${stamp.replaceAll("_", "-")}\``, `isStaleBucket` parsing the epoch with `/^allonfire-test-[a-z0-9-]+-(\d+)-[a-z0-9]{6}$/`); run — Expected: PASS.

`bucket.ts` (uses the package's `s3` client):

```ts
import { CreateBucketCommand, DeleteBucketCommand, ListBucketsCommand, ListObjectsV2Command, PutBucketPolicyCommand } from "@aws-sdk/client-s3";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { deleteObjects } from "../s3/objects";
import { s3 } from "../s3/client";
import { uploadImageFixtures } from "../image/fixtures/upload-fixtures";
import { isStaleBucket, testBucketName } from "./names";

/** Anyone reads a key, nobody lists: the policy `minio-init` gives `image`. */
const readOnlyPolicy = (bucket: string) =>
  stringifyJson({
    Statement: [{ Action: ["s3:GetObject"], Effect: "Allow", Principal: { AWS: ["*"] }, Resource: [`arn:aws:s3:::${bucket}/*`] }],
    Version: "2012-10-17",
  });

export async function createTestBucket(label: string, stamp: string): Promise<string> {
  const bucket = testBucketName(label, stamp);
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: readOnlyPolicy(bucket) }));
  await uploadImageFixtures(bucket);
  return bucket;
}

export async function dropTestBucket(bucket: string): Promise<void> {
  const { Contents = [] } = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
  await deleteObjects(bucket, Contents.flatMap(({ Key }) => (Key ? [Key] : [])));
  await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
}

export async function sweepTestBuckets(now = new Date()): Promise<string[]> {
  const { Buckets = [] } = await s3.send(new ListBucketsCommand({}));
  const stale = Buckets.flatMap(({ Name }) => (Name && isStaleBucket(Name, now) ? [Name] : []));
  for (const bucket of stale) {
    await dropTestBucket(bucket);
  }
  return stale;
}
```

A test bucket holds the Fixtures plus what a run uploads, well under ListObjectsV2's 1000; note it with a `ponytail:` comment.

`upload-fixtures.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { FIXTURE_IMAGE } from "@allonfire/database/features/seed/fixtures/images";
import { putObject } from "../../s3/objects";
import { IMAGE_FORMAT } from "../constants/format";
import { prepareImage } from "../prepare/prepare-image";

const FILES = resolve(import.meta.dirname, "files");

/** Every Image Fixture's file, through the real pipeline, under its key. */
export async function uploadImageFixtures(bucket: string): Promise<void> {
  await Promise.all(
    objectValues(FIXTURE_IMAGE).map(async ({ key, source }) => {
      const { buffer } = await prepareImage(readFileSync(resolve(FILES, source)));
      await putObject(bucket, key, buffer, { contentType: IMAGE_FORMAT.CONTENT_TYPE });
    })
  );
}
```

`global-setup.ts` mirrors the database one: skip on unit-only runs (import `runsIntegration` from `@allonfire/database/features/test-database/global-setup`), default `STORAGE_*` from `LOCAL_URL.MINIO` and `allonfire`/`allonfire` before importing the client (dynamic `await import("./bucket")` after setting env, since `s3/client.ts` reads env at import), `sweepTestBuckets()`, `createTestBucket(basename(root), testRunStamp())`, set `process.env.STORAGE_BUCKET`, return the drop.

`cli.ts`: `create` (sweep, create, print the name), `drop`, `name` (print `testBucketName`). `seed-local.ts`: `uploadImageFixtures(env.STORAGE_BUCKET)` (Local default `image`).

- [x] **Step 5: Integration test for the bucket**

```ts
// packages/storage/src/features/test-bucket/tests/test-bucket.integration.test.ts
// @module-tag integration
import { objectValues } from "@allonfire/core/shared/utils/object";
import { FIXTURE_IMAGE } from "@allonfire/database/features/seed/fixtures/images";
import { LOCAL_URL } from "@allonfire/config/local/addresses";

it("serves every Image Fixture publicly as AVIF from the run's bucket", async () => {
  const bucket = process.env.STORAGE_BUCKET ?? "";
  for (const { key } of objectValues(FIXTURE_IMAGE)) {
    const res = await fetch(`${process.env.STORAGE_ENDPOINT ?? LOCAL_URL.MINIO}/${bucket}/${key}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/avif");
  }
});
```

Add both global setups to `packages/storage/vitest.config.ts` (database first: `seedFixtures` rows are not needed here, but `@allonfire/database` validates `DATABASE_URL` at import) and the bucket one to `apps/api/vitest.config.ts`.

Run: `pnpm --filter @allonfire/storage exec vitest run test-bucket` — Expected: PASS. Then `docker exec allonfire-minio sh -c 'ls /data'` (or `mc ls`) — Expected: no `allonfire-test-*` bucket left behind by this run.

- [x] **Step 6: Local seed of the files** — run `pnpm --filter @allonfire/storage db:seed:images` — Expected: the six keys exist in `image` (`curl -sI http://localhost:9000/image/<key>` → 200).

### Task 9: The sign-in photo as an AVIF Fixture

**Files:**
- Create: `packages/storage/src/features/image/fixtures/files/sign-in.jpg` (download the Unsplash original named in `sign-in-image.ts`, resized to 2400x1600, JPEG quality 85)
- Modify: `packages/database/src/features/seed/fixtures/images.ts` (`SIGN_IN` entry from `describe-fixtures.ts`)
- Modify: `apps/back-office/src/features/auth/constants/sign-in-image.ts` (key, blur, width, height from `FIXTURE_IMAGE.SIGN_IN`)

**Interfaces:**
- Consumes: `FIXTURE_IMAGE.SIGN_IN`.

- [x] **Step 1: Failing test** — `apps/back-office/src/features/auth/constants/tests/sign-in-image.test.ts`:

```ts
// @module-tag unit
import { FIXTURE_IMAGE } from "@allonfire/database/features/seed/fixtures/images";
import { SIGN_IN_IMAGE } from "../sign-in-image";

it("shows the Fixture the seed stores, as AVIF", () => {
  expect(SIGN_IN_IMAGE.key).toBe(FIXTURE_IMAGE.SIGN_IN.key);
  expect(SIGN_IN_IMAGE.key.endsWith(".avif")).toBe(true);
  expect(SIGN_IN_IMAGE.blurDataUrl).toBe(FIXTURE_IMAGE.SIGN_IN.blurDataUrl);
});
```

- [x] **Step 2: Run** — Expected: FAIL (`.webp` key).

- [x] **Step 3: Implement** — `SIGN_IN_IMAGE` takes `key`, `blurDataUrl`, `width`, `height` from `FIXTURE_IMAGE.SIGN_IN` (spread the four fields; keep the credit comment, replace the "ponytail: each environment needs this uploaded" note with: "Local and Test databases get it from the seed; Production needs it uploaded once (POST /v1/images) under this key: see the plan's deploy note."). The Back Office already depends on `@allonfire/database`. If importing a Fixture into App code is refused by Biome's restricted imports, copy the four values and keep the test above as the guard.

- [x] **Step 4: Run** — `pnpm --filter @allonfire/back-office exec vitest run sign-in-image` and `pnpm --filter @allonfire/storage exec vitest run image-fixtures` — Expected: PASS.

---

## Phase D: Sign-in coverage

### Task 10: Sign-in, session, Registration, join-app and rate limit on the real stack

**Files:**
- Modify: `apps/api/src/features/auth/tests/sign-in.integration.test.ts`
- Create: `apps/api/src/features/auth/tests/sign-in-helpers.ts` (`signIn(app, user, appName?)`, `cookieOf(res)`, `getSession(app, cookie)`)
- Create: `apps/api/src/features/auth/tests/rate-limit.integration.test.ts`

**Interfaces:**
- Consumes: `FIXTURE_USER`, `FIXTURE_PASSWORD`, `LOCAL_URL`, `createApp`, `appDeps`, `auth`, `createRedisStore`, `createRedis`.
- Produces: `signIn(app: Hono, user: { email: string }, options?: { appName?: string; password?: string }): Promise<Response>`.

- [x] **Step 1: Write the helpers**

```ts
// apps/api/src/features/auth/tests/sign-in-helpers.ts
import { APP_HEADER } from "@allonfire/auth/shared/constants/headers";
import { LOCAL_URL } from "@allonfire/config/local/addresses";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { FIXTURE_PASSWORD } from "@allonfire/database/features/seed/fixtures/users";
import { z } from "zod";

type TestApp = { request: (path: string, init?: RequestInit) => Response | Promise<Response> };

export const signIn = (
  app: TestApp,
  { email }: { email: string },
  { appName, password = FIXTURE_PASSWORD }: { appName?: string; password?: string } = {}
) =>
  app.request("/v1/auth/sign-in/email", {
    body: stringifyJson({ email, password }),
    headers: {
      "content-type": "application/json",
      origin: LOCAL_URL.LAURA,
      ...(appName && { [APP_HEADER]: appName }),
    },
    method: "POST",
  });

/** The Session cookies a response set, as one `cookie` header. */
export const cookieOf = (res: Response) =>
  res.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");

const sessionSchema = z
  .object({ user: z.object({ email: z.string(), memberships: z.array(z.object({ app: z.string(), role: z.string() })) }) })
  .nullable();

export async function getSession(app: TestApp, cookie: string) {
  const res = await app.request("/v1/auth/get-session", { headers: { cookie, origin: LOCAL_URL.LAURA } });
  return sessionSchema.parse(await res.json());
}
```

If the existing test already has `signIn`/cookie helpers, move them here instead of writing new ones.

- [x] **Step 2: Write the failing tests** (they fail where behaviour is new to the suite, pass where it is pinned; read each failure)

```ts
// in sign-in.integration.test.ts, a table over the Back Office floor
const BACK_OFFICE_CASES = [
  { status: 200, user: FIXTURE_USER.BACK_OFFICE.ADMIN },
  { status: 403, user: FIXTURE_USER.BACK_OFFICE.USER },
  { status: 403, user: FIXTURE_USER.BACK_OFFICE.VIEWER },
  { status: 403, user: FIXTURE_USER.NO_MEMBERSHIP },
] as const;

it.each(BACK_OFFICE_CASES)("signs $user.email into the Back Office: $status", async ({ status, user }) => {
  const res = await signIn(app, user, { appName: "back-office" });
  expect(res.status).toBe(status);
  if (status === 403) {
    expect((await problemOf(res)).code).toBe(AUTH_ERROR_CODE.APP_FORBIDDEN);
    expect(await prisma.session.count({ where: { user: { email: user.email } } })).toBe(0);
  }
});

it("answers 401 to a wrong password and to an unknown email", async () => {
  expect((await signIn(app, FIXTURE_USER.BACK_OFFICE.ADMIN, { password: "wrong-password-1" })).status).toBe(401);
  expect((await signIn(app, { email: "nobody@allonfire.test" })).status).toBe(401);
});

it("returns the Memberships with the Session, and nothing after sign-out", async () => {
  const cookie = cookieOf(await signIn(app, FIXTURE_USER.ADMIN_EVERYWHERE));
  const session = await getSession(app, cookie);
  expect(session?.user.memberships).toHaveLength(2);
  await app.request("/v1/auth/sign-out", { headers: { cookie, origin: LOCAL_URL.LAURA }, method: "POST" });
  expect(await getSession(app, cookie)).toBeNull();
});

it.each(["back-office", "laura"])("refuses Registration into %s with REGISTRATION_CLOSED", async (appName) => {
  const email = `closed-${appName}-${Date.now()}@registration.allonfire.test`;
  const res = await app.request("/v1/auth/sign-up/email", {
    body: stringifyJson({ email, name: "closed", password: FIXTURE_PASSWORD }),
    headers: { "content-type": "application/json", origin: LOCAL_URL.LAURA, [APP_HEADER]: appName },
    method: "POST",
  });
  expect(res.status).toBe(403);
  expect((await problemOf(res)).code).toBe(AUTH_ERROR_CODE.REGISTRATION_CLOSED);
  expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
});
```

Imports: `AUTH_ERROR_CODE` from `@allonfire/auth/shared/constants/errors`, `APP_HEADER` from `@allonfire/auth/shared/constants/headers`, `problemOf` from `../../errors/tests/problem-of`. The header value the hook reads is the App as the existing test sends it (`App.BACK_OFFICE` or its mapped `back-office`): copy the form `sign-in.integration.test.ts` uses today and replace the string literals above with it.

Join-app with the real `APP_SETTINGS` (every App closed; the route answers 403 `REGISTRATION_CLOSED` for a closed App, an unknown name or no header, per its OpenAPI description):

```ts
it("refuses joining a closed App and adds no Membership", async () => {
  const user = FIXTURE_USER.LAURA.VIEWER;
  const cookie = cookieOf(await signIn(app, user));
  const res = await app.request("/v1/auth/join-app", {
    headers: { cookie, origin: LOCAL_URL.LAURA, [APP_HEADER]: BACK_OFFICE_HEADER },
    method: "POST",
  });
  expect(res.status).toBe(403);
  expect((await problemOf(res)).code).toBe(AUTH_ERROR_CODE.REGISTRATION_CLOSED);
  expect(await prisma.membership.count({ where: { app: App.BACK_OFFICE, user: { email: user.email } } })).toBe(0);
});

it("refuses a signed-out visitor", async () => {
  const res = await app.request("/v1/auth/join-app", {
    headers: { origin: LOCAL_URL.LAURA, [APP_HEADER]: BACK_OFFICE_HEADER },
    method: "POST",
  });
  expect(res.status).toBe(401);
});
```

`BACK_OFFICE_HEADER` is the header value the existing test sends for the Back Office (see the note above). If the visitor case answers another status, pin what the route answers and note it in the plan's log; do not change the route.

```ts
// apps/api/src/features/auth/tests/rate-limit.integration.test.ts
// @module-tag integration
// The auth bucket on real Redis, with its own key prefix so no other run counts.
import { DEFAULT_AUTH_RATE_LIMIT_MAX } from "@allonfire/auth/shared/constants/limits";
import { FIXTURE_USER } from "@allonfire/database/features/seed/fixtures/users";
import { createApp } from "../../../app";
import { env } from "../../../environment/environment";
import { appDeps } from "../../../shared/tests/app-deps";
import { createRedisStore } from "../../rate-limit/middleware/rate-limiter";
import { createRedis } from "../../redis/redis";
import { auth } from "../auth";
import { signIn } from "./sign-in-helpers";

// env is parsed at import: the prefix must exist before the imports run.
vi.hoisted(() => {
  process.env.AUTH_RATE_LIMIT_KEY_PREFIX = `auth:test:${Date.now()}:`;
});

const redis = createRedis(env.API_REDIS_URL);
const app = createApp(appDeps({ auth, store: createRedisStore(redis) }));

afterAll(async () => {
  await redis.quit();
});

it("answers 429 once the auth limit is spent inside the window", async () => {
  for (let attempt = 0; attempt < DEFAULT_AUTH_RATE_LIMIT_MAX; attempt += 1) {
    const res = await signIn(app, FIXTURE_USER.BACK_OFFICE.ADMIN, { password: "wrong-password-1" });
    expect(res.status).toBe(401);
  }
  expect((await signIn(app, FIXTURE_USER.BACK_OFFICE.ADMIN)).status).toBe(429);
});
```

- [x] **Step 3: Run** — `pnpm --filter @allonfire/api exec vitest run sign-in rate-limit` — Expected: PASS once helpers exist; any FAIL here is a real behaviour difference: stop and report it, do not change the expected status to match.

### Task 11: Change-password

**Files:**
- Create: `apps/api/src/features/auth/tests/change-password.integration.test.ts`

- [x] **Step 1: Write the test**

```ts
// @module-tag integration
import { LOCAL_URL } from "@allonfire/config/local/addresses";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database";
import { App, Role } from "@allonfire/database/enums";
import { FIXTURE_PASSWORD } from "@allonfire/database/features/seed/fixtures/users";
import { upsertUser } from "@allonfire/database/features/seed/upsert-user";
import { hashPassword } from "better-auth/crypto";
import { createApp } from "../../../app";
import { appDeps } from "../../../shared/tests/app-deps";
import { auth } from "../auth";
import { cookieOf, getSession, signIn } from "./sign-in-helpers";

const app = createApp(appDeps({ auth }));

describe("change-password", () => {
  // A User of its own: changing a Fixture's password would break the tests beside it.
  const email = `change-password-${Date.now()}@allonfire.test`;
  beforeAll(async () => {
    await upsertUser(prisma, { email, memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }], name: "changer" }, await hashPassword(FIXTURE_PASSWORD));
  });

  const changePassword = (cookie: string, currentPassword: string, newPassword: string) =>
    app.request("/v1/auth/change-password", {
      body: stringifyJson({ currentPassword, newPassword }),
      headers: { cookie, "content-type": "application/json", origin: LOCAL_URL.LAURA },
      method: "POST",
    });

  it("takes the right current password; then the new signs in and the old does not", async () => {
    const cookie = cookieOf(await signIn(app, { email }));
    const res = await changePassword(cookie, FIXTURE_PASSWORD, "changed-password-1");
    expect(res.status).toBe(200);
    expect((await signIn(app, { email }, { password: "changed-password-1" })).status).toBe(200);
    expect((await signIn(app, { email })).status).toBe(401);
  });

  it("refuses a wrong current password and keeps the old one", async () => {
    const cookie = cookieOf(await signIn(app, { email }, { password: "changed-password-1" }));
    const res = await changePassword(cookie, "wrong-password-1", "never-applied-1");
    expect(res.status).toBe(400);
    expect((await signIn(app, { email }, { password: "changed-password-1" })).status).toBe(200);
  });

  it("keeps the User's other Sessions (revokeOtherSessions not sent)", async () => {
    const first = cookieOf(await signIn(app, { email }, { password: "changed-password-1" }));
    const second = cookieOf(await signIn(app, { email }, { password: "changed-password-1" }));
    expect((await changePassword(first, "changed-password-1", "changed-password-2")).status).toBe(200);
    expect(await getSession(app, second)).not.toBeNull();
  });
});
```

The three tests run in file order on one User (Vitest runs a file's tests in sequence). `400` is Better Auth's answer to a wrong current password (`INVALID_PASSWORD`); if the run shows another status, the API's error handler maps it: pin the observed status and note it in the plan's log, never loosen to "any 4xx".

`upsertUser` needs the export `./features/seed/upsert-user` in `packages/database/package.json`.

- [x] **Step 2: Run** — `pnpm --filter @allonfire/api exec vitest run change-password` — Expected: PASS.

### Task 12: The e2e stack on a Test database and bucket, and the Back Office cases

**Files:**
- Modify: `packages/config/tests/e2e/playwright.config.ts`
- Create: `packages/config/tests/e2e/global-teardown.ts`
- Modify: `apps/back-office/e2e/sign-in.spec.ts`, `apps/back-office/e2e/smoke.spec.ts`
- Delete: `apps/back-office/e2e/users.ts`
- Modify: `turbo.json` (`test:e2e.passThroughEnv`: drop `DATABASE_SEED_*`)

**Interfaces:**
- Consumes: the `test-database` and `test-bucket` CLIs (Tasks 5, 8), `FIXTURE_USER`, `FIXTURE_PASSWORD`, `FIXTURE_IMAGE.SIGN_IN`, `LOCAL_PORT`, `LOCAL_URL`.

- [x] **Step 1: Preset**

In `playwright.config.ts`:

```ts
/**
 * One stamp per Playwright run, fixed in the main process and inherited by
 * workers and teardown. Playwright starts web servers before global setup, so
 * the API's command makes the run's database and bucket.
 */
process.env.CONFIG_E2E_STAMP ??= `${Math.floor(Date.now() / 1000)}_${randomBytes(3).toString("hex")}`;
const stamp = process.env.CONFIG_E2E_STAMP;
const label = "e2e";
const database = `pnpm -s --filter @allonfire/database test-database`;
const bucket = `pnpm -s --filter @allonfire/storage test-bucket`;
```

API web server `command` (its `env` keeps `STORAGE_ENDPOINT: LOCAL_URL.MINIO` and the rest it has today):

```ts
`DATABASE_URL="$(${database} create ${label} ${stamp})" STORAGE_BUCKET="$(${bucket} create ${label} ${stamp})" pnpm --filter @allonfire/api start`
```

App web server `env` gains `STORAGE_BUCKET` — the build bakes it, so the App command becomes `` `STORAGE_BUCKET="$(${bucket} name ${label} ${stamp})" pnpm build && …` `` keeping the standalone copy steps. `globalTeardown: resolve(import.meta.dirname, "global-teardown.ts")`:

```ts
// packages/config/tests/e2e/global-teardown.ts
import { execFileSync } from "node:child_process";

/** Drops the run's database and bucket; the web servers stop after this. */
export default function teardown(): void {
  const stamp = process.env.CONFIG_E2E_STAMP;
  if (!stamp) {
    return;
  }
  for (const [filter, script] of [["@allonfire/database", "test-database"], ["@allonfire/storage", "test-bucket"]] as const) {
    execFileSync("pnpm", ["-s", "--filter", filter, script, "drop", "e2e", stamp], { stdio: "inherit" });
  }
}
```

The stamp format `<epoch>_<6 hex>` matches `testRunStamp`'s shape (hex is within `[a-z0-9]`). `CONFIG_E2E_STAMP` is owned by `@allonfire/config`.

- [x] **Step 2: Specs**

`sign-in.spec.ts` imports `FIXTURE_USER`, `FIXTURE_PASSWORD`; `signIn(page, user)` fills `user.email` and `FIXTURE_PASSWORD`. Cases:

```ts
test("an Admin signs in, lands home, and stays signed in after a reload", async ({ page }) => {
  await signIn(page, FIXTURE_USER.BACK_OFFICE.ADMIN);
  await expect(page).toHaveURL(HOME_URL);
  await page.reload();
  await expect(page).toHaveURL(HOME_URL);
});

for (const user of [FIXTURE_USER.BACK_OFFICE.USER, FIXTURE_USER.BACK_OFFICE.VIEWER, FIXTURE_USER.NO_MEMBERSHIP]) {
  test(`${user.email} is refused`, async ({ page }) => {
    await signIn(page, user);
    await expect(formAlert(page)).toHaveText("This account cannot enter the Back Office.");
  });
}

test("a wrong password is refused", async ({ page }) => {
  await signIn(page, FIXTURE_USER.BACK_OFFICE.ADMIN, { password: "wrong-password-1" });
  await expect(formAlert(page)).toHaveText(EN.signIn.invalid);
});

test("signing out returns to sign-in and keeps home closed", async ({ page }) => {
  await signIn(page, FIXTURE_USER.BACK_OFFICE.ADMIN);
  await expect(page).toHaveURL(HOME_URL);
  await page.getByRole("button", { name: EN.home.signOut }).click();
  await expect(page).toHaveURL(SIGN_IN_URL);
  await page.goto("/");
  await expect(page).toHaveURL(SIGN_IN_URL);
});

test("Italian sign-in shows the refusal in Italian", async ({ page }) => {
  await signIn(page, FIXTURE_USER.BACK_OFFICE.USER, { locale: "it" });
  await expect(formAlert(page)).toHaveText(IT.signIn.forbidden);
});
```

`EN` and `IT` are the Back Office's translation JSON files, imported with `with { type: "json" }` (the same way the App loads them); the key paths above (`signIn.invalid`, `signIn.forbidden`, `home.signOut`) are the shape: open the files and use their real keys, so no message is ever retyped. The refusal test above uses `EN.signIn.forbidden` in place of the English literal. `signIn(page, user, { locale, password })` goes to `/${locale}/sign-in` when a locale is given and fills `password ?? FIXTURE_PASSWORD`; the sign-in form's field labels are read from the same files for the Italian case. Four sign-ins plus three refusals plus one Italian is eight attempts from one address, under the limit of ten; keep it so (Review: no rate-limit test in e2e).

`smoke.spec.ts` adds:

```ts
test("loads the sign-in photo from storage", async ({ page }) => {
  const photo = page.waitForResponse((res) => res.url().includes(`/storage/images/${FIXTURE_IMAGE.SIGN_IN.key}`) || res.url().includes(FIXTURE_IMAGE.SIGN_IN.key));
  await page.goto("/sign-in");
  expect((await photo).status()).toBe(200);
});
```

(Next's optimizer requests `/_next/image?url=/storage/images/<key>`; match the key in the URL.)

- [x] **Step 3: Run** — `pnpm exec turbo run test:e2e --force` — Expected: all pass; afterwards no `allonfire_test_e2e_*` database (`docker exec allonfire-postgres psql -U allonfire -tc "SELECT datname FROM pg_database WHERE datname LIKE 'allonfire_test_e2e%'"` → empty) and no `allonfire-test-e2e-*` bucket.

---

## Phase E: Images coverage

### Task 13: Real Image dependencies for the API, and the upload cases

**Files:**
- Create: `apps/api/src/features/image/image-deps.ts` (`imageDeps(log)`: the object `index.ts` builds today)
- Modify: `apps/api/src/index.ts` (uses it)
- Create: `apps/api/src/features/image/tests/image-test-app.ts` (`imageTestApp()`: `createApp(appDeps({ auth, images: imageDeps(silentLog) }))`, plus `signedIn(user)` returning a cookie)
- Create: `apps/api/src/features/image/tests/upload.integration.test.ts`

**Interfaces:**
- Produces: `imageDeps(log: ImageDeps["log"]): ImageDeps`; `imageTestApp()` (the app); `cookieFor(app, user): Promise<string>` (signs in with `FIXTURE_PASSWORD`, returns `cookieOf(res)`); `upload(app, cookie, files: { name: string; bytes: Buffer }[], apps: { app: App; public: boolean }[]): Promise<Response>` (multipart `POST /v1/images`: each file under `file`, and `meta` = `stringifyJson(files.map(() => ({ alt: { en: "test", it: "test" }, apps })))`, per `uploadFormSchema`); `uploaded(res)`, `jpeg()`, `listKeys`, `idOf`, `objectCount`.

- [x] **Step 1: Extract `imageDeps`** — move the `images: { … }` literal from `index.ts` into `imageDeps(log)`; `index.ts` passes `imageDeps(logger)`. Run `pnpm --filter @allonfire/api check-types` — Expected: clean.

- [x] **Step 2: Write the upload tests**

```ts
// @module-tag integration
const FILES = resolve(import.meta.dirname, "../../../../../../packages/storage/src/features/image/fixtures/files");
const ACCEPTED = ["photo.jpg", "graphic.png", "photo.webp", "photo.avif", "colors-no-alpha.heic"];

it.each(ACCEPTED)("stores %s as AVIF with its size", async (name) => {
  const cookie = await cookieFor(app, FIXTURE_USER.BACK_OFFICE.ADMIN);
  const res = await upload(app, cookie, [{ bytes: readFileSync(resolve(FILES, name)), name }], [{ app: App.BACK_OFFICE, public: true }]);
  expect(res.status).toBe(201);
  const [image] = (await res.json()).images;  // parse with the response schema the module exports
  expect(image.key).toMatch(/\.avif$/);
  const stored = await fetch(`${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET}/${image.key}`);
  expect(stored.headers.get("content-type")).toBe("image/avif");
  expect(image.width).toBeGreaterThan(0);
});

it("refuses a GIF and stores nothing", async () => {
  const cookie = await cookieFor(app, FIXTURE_USER.BACK_OFFICE.ADMIN);
  const before = { objects: await objectCount(), rows: await prisma.image.count() };
  const res = await upload(app, cookie, [{ bytes: readFileSync(resolve(FILES, "animation.gif")), name: "animation.gif" }], [{ app: App.BACK_OFFICE, public: true }]);
  expect((await problemOf(res)).code).toBe(IMAGE_ERROR_CODE.UNSUPPORTED_IMAGE);
  expect({ objects: await objectCount(), rows: await prisma.image.count() }).toEqual(before);
});

it.each([
  { cookie: () => cookieFor(app, FIXTURE_USER.BACK_OFFICE.USER), into: [App.BACK_OFFICE], status: 403 },
  { cookie: async () => "", into: [App.BACK_OFFICE], status: 401 },
  { cookie: () => cookieFor(app, FIXTURE_USER.BACK_OFFICE.ADMIN), into: [App.BACK_OFFICE, App.LAURA], status: 403 },
])("refuses an upload into $into with $status", async ({ cookie, into, status }) => {
  const res = await upload(app, await cookie(), [{ bytes: readFileSync(resolve(FILES, "photo.jpg")), name: "photo.jpg" }], into.map((app) => ({ app, public: false })));
  expect(res.status).toBe(status);
});

it("refuses a file over the size limit", async () => {
  const cookie = await cookieFor(app, FIXTURE_USER.BACK_OFFICE.ADMIN);
  const res = await upload(app, cookie, [{ bytes: Buffer.alloc(MAX_FILE_BYTES + 1), name: "big.jpg" }], [{ app: App.BACK_OFFICE, public: false }]);
  expect((await problemOf(res)).code).toBe(IMAGE_ERROR_CODE.PAYLOAD_TOO_LARGE);
});
```

`objectCount()` lists the run's bucket (`ListObjectsV2Command` on `process.env.STORAGE_BUCKET`, `KeyCount`); put it in `image-test-app.ts`. `IMAGE_ERROR_CODE` and `MAX_FILE_BYTES` come from `@allonfire/storage/features/image/hono/constants/{errors,limits}`. The statuses for each code are the API's `ERROR_STATUS`; if the size case answers `IMAGE_TOO_LARGE` instead of `PAYLOAD_TOO_LARGE`, pin the observed code and note it. Parse 201 bodies with the module's exported zod schema in `hono/constants/schemas.ts` in place of `res.json()`.

The fixtures path climbs out of the App into a package folder; if the storage package exports the files folder path (`export const IMAGE_FIXTURE_FILES = resolve(import.meta.dirname, "files")` in `upload-fixtures.ts`, exported), import that instead of the relative climb.

- [x] **Step 3: Run** — `pnpm --filter @allonfire/api exec vitest run upload` — Expected: PASS.

### Task 14: List, get, patch and delete on real data

**Files:**
- Create: `apps/api/src/features/image/tests/read.integration.test.ts`
- Create: `apps/api/src/features/image/tests/write.integration.test.ts`

**Interfaces:**
- Consumes: `imageTestApp`, `cookieFor`, `FIXTURE_IMAGE`, `FIXTURE_USER`.

- [x] **Step 1: Read tests**

```ts
it("shows a visitor only public Images", async () => {
  const keys = await listKeys(app); // GET /v1/images, no cookie, follow every cursor
  expect(keys).toContain(FIXTURE_IMAGE.PUBLIC_IN_BACK_OFFICE.key);
  expect(keys).toContain(FIXTURE_IMAGE.IN_BOTH_APPS.key);           // public in Laura
  expect(keys).not.toContain(FIXTURE_IMAGE.PRIVATE_IN_BACK_OFFICE.key);
});

it("shows a Back Office Admin its private Images, not Laura's", async () => {
  const keys = await listKeys(app, await cookieFor(app, FIXTURE_USER.BACK_OFFICE.ADMIN));
  expect(keys).toContain(FIXTURE_IMAGE.PRIVATE_IN_BACK_OFFICE.key);
  expect(keys).not.toContain(FIXTURE_IMAGE.PRIVATE_IN_LAURA.key);
});

it("filters by App and pages by cursor", async () => {
  const cookie = await cookieFor(app, FIXTURE_USER.ADMIN_EVERYWHERE);
  const all = await listKeys(app, cookie, { app: App.BACK_OFFICE });
  const paged = await listKeys(app, cookie, { app: App.BACK_OFFICE, limit: 1 });
  expect(paged).toEqual(all);
  expect(all).not.toContain(FIXTURE_IMAGE.PRIVATE_IN_LAURA.key);
});
```

`listKeys(app, cookie?, { app?, limit? })` (in `image-test-app.ts`) calls `GET /v1/images?app=&limit=&cursor=`, follows `nextCursor` until it is absent, parses each page with the module's list schema, and returns the keys in order; with `limit: 1` that is one request per Image, so equality with the unpaged list proves the cursor neither skips nor repeats.

```ts

it("answers 404 for a private Image to someone who cannot enter its App", async () => {
  const cookie = await cookieFor(app, FIXTURE_USER.BACK_OFFICE.ADMIN);
  const res = await app.request(`/v1/images/${await idOf(FIXTURE_IMAGE.PRIVATE_IN_LAURA.key)}`, { headers: { cookie } });
  expect(res.status).toBe(404);
});
```

`idOf(key)` reads `prisma.image.findUniqueOrThrow({ where: { key } })` and returns its `id`.

- [x] **Step 2: Write tests** — each creates its own Image by upload first (never mutate a Fixture other tests read):

```ts
// apps/api/src/features/image/tests/write.integration.test.ts
// @module-tag integration
const BOTH = [{ app: App.BACK_OFFICE, public: false }, { app: App.LAURA, public: false }];
const BACK_OFFICE_ONLY = [{ app: App.BACK_OFFICE, public: true }];

/** A fresh Image placed in `apps`, uploaded by the Admin of every App. */
const fresh = async (apps: { app: App; public: boolean }[]) => {
  const cookie = await cookieFor(app, FIXTURE_USER.ADMIN_EVERYWHERE);
  const [image] = await uploaded(await upload(app, cookie, [jpeg()], apps));
  return image;
};
const patch = async (user: { email: string }, body: unknown) =>
  app.request("/v1/images", {
    body: stringifyJson(body),
    headers: { "content-type": "application/json", cookie: await cookieFor(app, user), origin: LOCAL_URL.LAURA },
    method: "PATCH",
  });
const remove = async (user: { email: string }, body: unknown) =>
  app.request("/v1/images", {
    body: stringifyJson(body),
    headers: { "content-type": "application/json", cookie: await cookieFor(app, user), origin: LOCAL_URL.LAURA },
    method: "DELETE",
  });
const served = async (key: string) =>
  (await fetch(`${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET}/${key}`)).status;

it("changes alt only for an Admin of every App the Image is in", async () => {
  const image = await fresh(BOTH);
  const alt = { en: "changed", it: "cambiato" };
  expect((await patch(FIXTURE_USER.BACK_OFFICE.ADMIN, [{ alt, id: image.id }])).status).toBe(403);
  expect((await patch(FIXTURE_USER.ADMIN_EVERYWHERE, [{ alt, id: image.id }])).status).toBe(200);
  expect((await prisma.image.findUniqueOrThrow({ where: { id: image.id } })).alt).toEqual(alt);
});

it("adds a placement only for an Admin of the App it adds", async () => {
  const image = await fresh(BACK_OFFICE_ONLY);
  const apps = [...BACK_OFFICE_ONLY, { app: App.LAURA, public: false }];
  expect((await patch(FIXTURE_USER.BACK_OFFICE.ADMIN, [{ apps, id: image.id }])).status).toBe(403);
  expect((await patch(FIXTURE_USER.ADMIN_EVERYWHERE, [{ apps, id: image.id }])).status).toBe(200);
  expect(await prisma.imageApp.count({ where: { imageId: image.id } })).toBe(2);
});

it("lets an App's Admin make its placement private, hiding it from visitors", async () => {
  const image = await fresh(BACK_OFFICE_ONLY);
  const res = await patch(FIXTURE_USER.BACK_OFFICE.ADMIN, [{ apps: [{ app: App.BACK_OFFICE, public: false }], id: image.id }]);
  expect(res.status).toBe(200);
  expect(await listKeys(app)).not.toContain(image.key);
});

it("takes an Image out of one App and keeps it in the other", async () => {
  const image = await fresh(BOTH);
  expect((await remove(FIXTURE_USER.BACK_OFFICE.ADMIN, { app: App.BACK_OFFICE, ids: [image.id] })).status).toBe(200);
  expect(await prisma.imageApp.findMany({ select: { app: true }, where: { imageId: image.id } })).toEqual([{ app: App.LAURA }]);
  expect(await served(image.key)).toBe(200);
});

it("deletes the row and the file with the last placement", async () => {
  const image = await fresh(BACK_OFFICE_ONLY);
  expect((await remove(FIXTURE_USER.BACK_OFFICE.ADMIN, { app: App.BACK_OFFICE, ids: [image.id] })).status).toBe(200);
  expect(await prisma.image.findUnique({ where: { id: image.id } })).toBeNull();
  expect(await served(image.key)).toBe(404);
});

it("deletes everywhere only for an Admin of every App", async () => {
  const image = await fresh(BOTH);
  expect((await remove(FIXTURE_USER.BACK_OFFICE.ADMIN, { ids: [image.id] })).status).toBe(403);
  expect((await remove(FIXTURE_USER.ADMIN_EVERYWHERE, { ids: [image.id] })).status).toBe(200);
  expect(await prisma.image.findUnique({ where: { id: image.id } })).toBeNull();
  expect(await served(image.key)).toBe(404);
});
```

Helpers in `image-test-app.ts`: `jpeg()` returns `{ bytes: readFileSync(<fixtures>/photo.jpg), name: "photo.jpg" }`; `uploaded(res)` asserts 201 and parses the body with the module's upload response schema, returning `{ id, key }[]`. MinIO answers a missing key with 404 under the public-read policy (no ListBucket, so not 403); if it answers 403, pin that and note it. The success statuses (200 here) are what the routes answer today: read `write-handlers.ts` before running and use its status constants (`HTTP_STATUS`) instead of the numbers.

- [x] **Step 3: Run** — `pnpm --filter @allonfire/api exec vitest run read write` — Expected: PASS.

---

## Phase F: CI, hook, docs

### Task 15: CI, Turbo and documentation

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `turbo.json`
- Modify: `CLAUDE.md`, `packages/database/README.md`, `packages/storage/README.md`, `packages/config/README.md`, `README.md` (deploy note)

- [x] **Step 1: CI `test` job** — remove `Apply the changelog` (`pnpm db:update`); keep `db:generate`; move `db:drift` after the tests and point it at the template: `DATABASE_URL=postgresql://allonfire:allonfire@localhost:5432/allonfire_test_template pnpm db:drift` preceded by `pnpm --filter @allonfire/database test-database template`, so the template exists even when `--affected` ran no integration test. Add a step before the tests: `docker compose -f docker/docker-compose.dev.yml up -d --wait minio` and job env `STORAGE_ENDPOINT: http://localhost:9000`, `STORAGE_ACCESS_KEY: allonfire`, `STORAGE_SECRET_KEY: allonfire`. Add `` `STORAGE_ENDPOINT: ${LOCAL_URL.MINIO}` `` to the `ci.yml` entry of Task 2's guard test.

- [x] **Step 2: CI `e2e` job** — remove `Apply the changelog`, `Seed the Users`, `Create the bucket` (each run makes its own) and the six `DATABASE_SEED_*` env lines (`MODE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TEST_PASSWORD`, `LAURA_VIEWER_EMAIL`, `LAURA_VIEWER_PASSWORD`); keep `db:generate` and the single `Browser and end-to-end tests` step (`turbo run test:browser test:e2e --affected`).

- [x] **Step 3: Turbo** — `test:e2e.passThroughEnv` is `["CI", "DATABASE_SEED_*"]` today; make it `["CI", "CONFIG_E2E_STAMP"]`. `globalPassThroughEnv` gains `STORAGE_BUCKET`.

- [x] **Step 4: Docs**
  - `CLAUDE.md` test-layers paragraph: integration tests run on a Test database cloned per package per run from `allonfire_test_template` (Liquibase plus the Fixtures, rebuilt when `changelog/` or `src/features/seed/` change) and a bucket per run; Fixtures from `@allonfire/database/features/seed/fixtures/*` (`FIXTURE_USER`, `FIXTURE_PASSWORD`, `FIXTURE_IMAGE`), never retyped; local addresses from `@allonfire/config/local/addresses`; `DATABASE_SEED_MODE=local`. Database Schema Quick Reference: the seed line.
  - `packages/database/README.md`: Test database and Fixtures sections; `packages/storage/README.md`: bucket per run, Image Fixtures, `db:seed:images`; `packages/config/README.md`: `local/addresses` and the guard test.
  - `README.md` Deploy section: "Before the first deploy of this change, upload the sign-in photo to Production under `FIXTURE_IMAGE.SIGN_IN.key` (POST /v1/images as an Admin of the Back Office, then set the key)", and Local setup: change `packages/database/.env` to `DATABASE_SEED_MODE="local"` and drop `DATABASE_SEED_TEST_PASSWORD`.

- [x] **Step 5: Verify everything**

Run, in order (Docker up; `find . -name '._*' -not -path './node_modules/*' -delete` first):
- `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7` — Expected: exit 0.
- `pnpm lint` — Expected: exit 0.
- `pnpm check-types` — Expected: exit 0.
- `sh -e .husky/pre-commit` — Expected: exit 0.
- `docker exec allonfire-postgres psql -U allonfire -tc "SELECT datname FROM pg_database WHERE datname LIKE 'allonfire_test_%' AND datname <> 'allonfire_test_template'"` — Expected: empty.
- `pnpm db:seed` then `pnpm --filter @allonfire/storage db:seed:images` on the Local stack, then sign in at `http://localhost:3400/sign-in` as `FIXTURE_USER.BACK_OFFICE.ADMIN` — Expected: home, sign-in photo visible before sign-in.

## Implementation Log
- Implemented: 2026-10-09T16:33:08+02:00
- Workspace: current-branch — feat/design-package
- Committed: no — awaiting user review
