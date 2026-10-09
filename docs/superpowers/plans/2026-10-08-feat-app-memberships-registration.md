# Roles per App and Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move a User's Role into one Membership per App, declare each App's floor and Registration in `APP_SETTINGS`, and enforce sign-up, joining and entry in the API.

**Status:** implemented (uncommitted) @ 2026-10-08T12:17:41Z

**Architecture:** `packages/database` owns the data (`App` enum, `Membership` table, rewritten changesets) and every access rule (`roleIn`, `canEnterApp`, `canManageImage`, `APP_SETTINGS`). `packages/auth` wires them into Better Auth: `customSession` carries Memberships, hooks refuse sign-up for a closed App and sign-in for a User the named App does not let in, a plugin endpoint `/join-app` adds a Membership. The Image module and the Next adapter switch to the new rules; `requireRole` and `AUTH_MIN_ROLE` disappear.

**Tech Stack:** Prisma 6, Liquibase (Docker), Better Auth 1.5.3 (`better-auth/api`, `better-auth/plugins`), Hono 4, Next 16, zod 4, Vitest 4 (globals).

**Spec:** `docs/superpowers/specs/2026-10-08-app-memberships-registration-design.md` (ADR 0019, `CONTEXT.md` already updated)

## Global Constraints

- Never commit: leave every change in the working tree; the user commits with `/iso-commit`.
- No `as` casts except `as const`; no `biome-ignore`; no `Object.keys/values/entries/fromEntries` (use `objectKeys`, `objectValues`, `objectEntries`, `objectFromEntries` from `@allonfire/core/shared/utils/object`); no `JSON.parse/stringify` (use `parseJson`, `stringifyJson`).
- Every test file starts with `// @module-tag unit` or `// @module-tag integration`; integration files are named `*.integration.test.ts`; Vitest globals, no `from "vitest"`.
- A constant's type comes from zod (`z.enum(X)`); lookup tables are `as const satisfies Record<K, V>`, never annotated `: Record<K, V>`.
- Package exports mirror the file path without `src/` and `.ts`, one line per file.
- The header is `x-aof-app` and carries the enum key, as `AUTH_APP` does: `LAURA`, `BACK_OFFICE`. Any other spelling (`back-office`) names no App.
- Error codes: `REGISTRATION_CLOSED` (sign-up or join for a closed or unnamed App), `APP_FORBIDDEN` (sign-in refused by the named App), both 403.
- A Registration Role is never `ADMIN` (`registrationRoleSchema = roleSchema.exclude([Role.ADMIN])`).
- `APP_SETTINGS` today: `LAURA { minRole: VIEWER, registration: null }`, `BACK_OFFICE { minRole: ADMIN, registration: null }`.
- Dropping the Local database (Task 1) is expected and approved in the spec; Production has never run a changeset after `0000-baseline`.
- End of every task: `pnpm exec biome check --write <files the task touched>`; end of the plan: `pnpm check-types`, `pnpm lint`, `pnpm test` (Postgres up), all green.

## Review Focus

- A refused sign-in (`APP_FORBIDDEN`) must leave the browser with no usable Session: no session row, and no `session_token`/`session_data` cookie carrying a value (the five-minute cookie cache would otherwise keep a deleted Session alive). Pinned in Task 5.
- Sign-up with an email that already exists, for a closed App, must answer 403 `REGISTRATION_CLOSED`, not `USER_ALREADY_EXISTS` (which would reveal the account). Pinned in Task 5.
- Joining an App the User already belongs to must never change their Role there (an Admin stays Admin). Pinned in Task 5.
- A patch or delete batch mixing an Image the User manages with one they do not must write nothing. Pinned in Task 8.
- `x-aof-app` spelled as the stored value (`back-office`) or any unknown text must answer 403, never 500. Pinned in Task 5.

---

### Task 1: `App` enum, `Membership` table, rewritten changesets

**Files:**
- Modify: `packages/database/prisma/schema/auth.prisma`
- Modify: `packages/database/prisma/schema/image.prisma`
- Delete: `packages/database/changelog/changesets/0002-allowed-app-enum.sql`
- Create: `packages/database/changelog/changesets/0002-app-memberships.sql`
- Modify: `packages/database/changelog/changesets/0003-image-schema.sql`
- Delete: `packages/database/changelog/changesets/0004-allowed-app-back-office.sql`
- Test: `packages/database/liquibase/tests/changelog.integration.test.ts`

**Interfaces:**
- Produces: Prisma enum `App` (`LAURA`→`laura`, `BACK_OFFICE`→`back-office`) exported from `@allonfire/database/enums`; model `Membership { userId, app: App, role: Role, createdAt }` with compound id `userId_app`; `User.memberships`; `Image.app: App`. `AllowedApp` no longer exists.

- [x] **Step 1: Write the failing changelog tests**

In `changelog.integration.test.ts` replace the table constants and add the mapping checks:

```ts
const AUTH_TABLES = ["Account", "Membership", "Session", "User", "Verification"];
const LAURA_TABLES = ["GameScore"];
const IMAGE_TABLES = ["Image"];
/** What the baseline holds in public; 0003 dropped Laura's photo and quiz tables, its rollback brings them back. */
const BASELINE_TABLES = [
  "Account",
  "Session",
  "User",
  "Verification",
  ...LAURA_TABLES,
  "Favorite",
  "Photo",
  "QuizAnswer",
  "QuizQuestion",
].sort();

const BASELINE = resolve(PACKAGE_DIR, "changelog/changesets/0000-baseline.sql");
const EXISTING_USER = "existing-user";
const LAURA_VIEWER = "laura-viewer";
```

In `describe("changelog on a database that already has the tables")`, insert the second User beside the first one in `beforeAll` (before `liquibase(url, "update")`):

```ts
    await client.$executeRaw`
      INSERT INTO public."User" (id, email, "updatedAt")
      VALUES (${EXISTING_USER}, 'existing@allonfire.test', now())
    `;
    await client.$executeRaw`
      INSERT INTO public."User" (id, email, "updatedAt", role, "allowedApps")
      VALUES (${LAURA_VIEWER}, 'viewer@allonfire.test', now(), 'VIEWER', ARRAY['laura', 'social'])
    `;
```

Change `"keeps existing rows"` to expect both ids, and add:

```ts
  it("keeps existing rows", async () => {
    const rows = await client.$queryRaw<{ id: string }[]>`
      SELECT id FROM auth."User" ORDER BY id
    `;
    expect(rows).toEqual([{ id: EXISTING_USER }, { id: LAURA_VIEWER }]);
  });

  it("turns each User's Allowed apps and Role into Memberships", async () => {
    const rows = await client.$queryRaw<
      { userId: string; app: string; role: string }[]
    >`
      SELECT "userId", app::TEXT AS app, role::TEXT AS role
      FROM auth."Membership" ORDER BY "userId", app
    `;
    // `all` reached every App; `laura` Laura; `social` nothing.
    expect(rows).toEqual([
      { app: "laura", role: "USER", userId: EXISTING_USER },
      { app: "back-office", role: "USER", userId: EXISTING_USER },
      { app: "laura", role: "VIEWER", userId: LAURA_VIEWER },
    ]);
  });

  it("drops role and allowedApps from User", async () => {
    const columns = await client.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'User'
        AND column_name IN ('role', 'allowedApps')
    `;
    expect(columns).toEqual([]);
  });
```

Note: Postgres orders an enum by declaration (`laura` before `back-office`), so `ORDER BY app` gives the order above.

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`
Expected: FAIL — `auth` tables lack `Membership`, no `auth."Membership"` relation.

- [x] **Step 3: Rewrite the Prisma schema**

`auth.prisma`: replace the `AllowedApp` enum and the two `User` columns:

```prisma
/// An App of the monorepo. Upper-case in code like Role; stored as the App
/// names themselves.
enum App {
  LAURA       @map("laura")
  BACK_OFFICE @map("back-office")

  @@schema("auth")
}

model User {
  id            String       @id @default(cuid(2))
  email         String       @unique
  name          String?
  emailVerified Boolean      @default(false)
  image         String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  sessions      Session[]
  accounts      Account[]
  memberships   Membership[]
  images        Image[]
  gameScores    GameScore[]

  @@schema("auth")
}

/// A User's place in one App, and their Role there (ADR 0019).
model Membership {
  userId    String
  app       App
  role      Role
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, app])
  @@schema("auth")
}
```

`image.prisma`: the header comment becomes `// Images, each shown by one App (ADR 0013, ADR 0019).`; the `app` field becomes:

```prisma
  /// The App that shows it.
  app         App
```

- [x] **Step 4: Rewrite the changesets**

Delete `0002-allowed-app-enum.sql` and `0004-allowed-app-back-office.sql`. Create `0002-app-memberships.sql`:

```sql
--liquibase formatted sql logicalFilePath:changesets/0002-app-memberships.sql

--changeset isaia:0002-app-memberships
--comment: A User's Role moves into one Membership per App (ADR 0019) and nothing spans every App, so the enum names Apps only. Each baseline User keeps their Role in every App their Allowed apps reached: all reached every App, laura Laura; other names (social) reached nothing.
CREATE TYPE "auth"."App" AS ENUM ('laura', 'back-office');
CREATE TABLE "auth"."Membership" (
    "userId" TEXT NOT NULL,
    "app" "auth"."App" NOT NULL,
    "role" "auth"."Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("userId", "app")
);
ALTER TABLE "auth"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "auth"."Membership" ("userId", "app", "role")
SELECT u."id", a."app", u."role"
FROM "auth"."User" u
CROSS JOIN unnest(enum_range(NULL::"auth"."App")) AS a("app")
WHERE 'all' = ANY(u."allowedApps") OR a."app"::TEXT = ANY(u."allowedApps");
ALTER TABLE "auth"."User" DROP COLUMN "role";
ALTER TABLE "auth"."User" DROP COLUMN "allowedApps";
--rollback ALTER TABLE "auth"."User" ADD COLUMN "role" "auth"."Role" NOT NULL DEFAULT 'USER';
--rollback ALTER TABLE "auth"."User" ADD COLUMN "allowedApps" TEXT[] DEFAULT ARRAY['all']::TEXT[];
--rollback UPDATE "auth"."User" u SET "role" = m."role", "allowedApps" = m."apps" FROM (SELECT "userId", array_agg("app"::TEXT ORDER BY "app") AS "apps", (array_agg("role" ORDER BY CASE "role" WHEN 'ADMIN' THEN 1 WHEN 'USER' THEN 2 ELSE 3 END))[1] AS "role" FROM "auth"."Membership" GROUP BY "userId") m WHERE u."id" = m."userId";
--rollback DROP TABLE "auth"."Membership";
--rollback DROP TYPE "auth"."App";
```

In `0003-image-schema.sql` change the column line to:

```sql
    "app" "auth"."App" NOT NULL,
```

and the `--comment:` line to end with `Each Image belongs to one App (ADR 0019).`

- [x] **Step 5: Regenerate and rebuild the Local database**

The Local database recorded the old `0002`–`0004` checksums, so it is rebuilt from zero (approved in the spec):

```bash
pnpm db:generate
docker exec allonfire-postgres psql -U allonfire -d postgres \
  -c 'DROP DATABASE IF EXISTS allonfire WITH (FORCE)' -c 'CREATE DATABASE allonfire'
pnpm db:update
pnpm db:drift
```

Expected: `db:update` applies `0000`–`0003`; `db:drift` exits 0 (no difference between the schema files and the database). Do not run `db:seed` yet: the seed is rewritten in Task 3.

- [x] **Step 6: Run the changelog tests to verify they pass**

Run: `pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`
Expected: PASS, including the rollback describe (`CHANGESETS_AFTER_BASELINE` is now 3).

---

### Task 2: Access rules and `APP_SETTINGS`

**Files:**
- Create: `packages/database/src/features/auth/access/constants/app-settings.ts`
- Modify: `packages/database/src/features/auth/access/constants/schemas.ts`
- Modify: `packages/database/src/features/auth/access/access.ts`
- Modify: `packages/database/package.json` (exports)
- Test: `packages/database/src/features/auth/access/tests/access.test.ts`
- Test: `packages/database/src/features/auth/access/tests/app-settings.test.ts`

**Interfaces:**
- Consumes: `App`, `Role` from `generated/prisma/enums` (Task 1).
- Produces:
  - `app-settings.ts`: `registrationRoleSchema`, `type RegistrationRole`, `type AppSettings = { minRole: Role; registration: RegistrationRole | null }`, `type AppSettingsTable = Readonly<Record<App, AppSettings>>`, `APP_SETTINGS`.
  - `schemas.ts`: `roleSchema`, `appSchema = z.enum(App)`, `export type { App }`. `allowedAppSchema` deleted.
  - `access.ts`: `type AccessMembership = { app: App; role: Role }`, `type AccessUser = { memberships: readonly AccessMembership[] }`, `hasRole(role, min)`, `roleIn(user, app): Role | undefined`, `canEnterApp(user, app, settings = APP_SETTINGS): boolean`, `canManageImage(user, app): boolean`, `accessUserFrom(user: { memberships: readonly { app: string; role: string }[] }): AccessUser`. `AppPolicy` and `canSeeContent` deleted.

- [x] **Step 1: Write the failing tests**

Replace `access.test.ts`:

```ts
// @module-tag unit
import { App, Role } from "../../../../../generated/prisma/enums";
import {
  accessUserFrom,
  canEnterApp,
  canManageImage,
  hasRole,
  roleIn,
} from "../access";
import type { AppSettingsTable } from "../constants/app-settings";
import { appSchema } from "../constants/schemas";

const member = (app: App, role: Role) => ({
  memberships: [{ app, role }],
});

describe("hasRole", () => {
  it("reaches its own Role and every one below, never above", () => {
    expect(hasRole(Role.ADMIN, Role.VIEWER)).toBe(true);
    expect(hasRole(Role.USER, Role.USER)).toBe(true);
    expect(hasRole(Role.VIEWER, Role.USER)).toBe(false);
    expect(hasRole(Role.USER, Role.ADMIN)).toBe(false);
  });

  it("accepts only known Roles at compile time", () => {
    // @ts-expect-error "OWNER" is not a Role
    hasRole("OWNER", Role.USER);
  });
});

describe("roleIn", () => {
  it("is the Role of the User's Membership in that App, or nothing", () => {
    const user = {
      memberships: [
        { app: App.LAURA, role: Role.VIEWER },
        { app: App.BACK_OFFICE, role: Role.ADMIN },
      ],
    };
    expect(roleIn(user, App.LAURA)).toBe(Role.VIEWER);
    expect(roleIn(user, App.BACK_OFFICE)).toBe(Role.ADMIN);
    expect(roleIn({ memberships: [] }, App.LAURA)).toBeUndefined();
  });
});

describe("canEnterApp", () => {
  it("needs a Membership in the App", () => {
    expect(canEnterApp(member(App.LAURA, Role.VIEWER), App.LAURA)).toBe(true);
    expect(canEnterApp(member(App.LAURA, Role.ADMIN), App.BACK_OFFICE)).toBe(
      false
    );
  });

  it("needs the Role there to reach the App's floor", () => {
    expect(
      canEnterApp(member(App.BACK_OFFICE, Role.USER), App.BACK_OFFICE)
    ).toBe(false);
    expect(
      canEnterApp(member(App.BACK_OFFICE, Role.ADMIN), App.BACK_OFFICE)
    ).toBe(true);
  });

  it("reads the floor from the settings it is given", () => {
    const strict: AppSettingsTable = {
      [App.BACK_OFFICE]: { minRole: Role.ADMIN, registration: null },
      [App.LAURA]: { minRole: Role.ADMIN, registration: null },
    };
    expect(canEnterApp(member(App.LAURA, Role.VIEWER), App.LAURA, strict)).toBe(
      false
    );
  });
});

describe("canManageImage", () => {
  it("needs the Admin Role in the Image's App", () => {
    expect(canManageImage(member(App.LAURA, Role.ADMIN), App.LAURA)).toBe(true);
    expect(canManageImage(member(App.LAURA, Role.USER), App.LAURA)).toBe(false);
    expect(
      canManageImage(member(App.BACK_OFFICE, Role.ADMIN), App.LAURA)
    ).toBe(false);
  });
});

describe("appSchema", () => {
  it("is every App, and only Apps", () => {
    expect(appSchema.options).toEqual([App.LAURA, App.BACK_OFFICE]);
    expect(appSchema.safeParse("ALL").success).toBe(false);
    expect(appSchema.safeParse("back-office").success).toBe(false);
  });
});

describe("accessUserFrom", () => {
  it("narrows Memberships read as strings, dropping unknown Apps", () => {
    expect(
      accessUserFrom({
        memberships: [
          { app: App.LAURA, role: Role.VIEWER },
          { app: "social", role: Role.ADMIN },
        ],
      })
    ).toEqual({ memberships: [{ app: App.LAURA, role: Role.VIEWER }] });
  });

  it("throws on a Role this build does not know, never guesses", () => {
    expect(() =>
      accessUserFrom({ memberships: [{ app: App.LAURA, role: "MODERATOR" }] })
    ).toThrow('Unknown Role "MODERATOR"');
  });
});
```

Create `app-settings.test.ts`:

```ts
// @module-tag unit
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../../generated/prisma/enums";
import { hasRole } from "../access";
import {
  APP_SETTINGS,
  type AppSettingsTable,
  registrationRoleSchema,
} from "../constants/app-settings";

describe("APP_SETTINGS", () => {
  it("gives every open App's newcomers a Role the App lets in", () => {
    // Widened, so a future open row is checked too.
    const settings: AppSettingsTable = APP_SETTINGS;
    for (const [app, { minRole, registration }] of objectEntries(settings)) {
      expect({
        app,
        reaches: registration === null || hasRole(registration, minRole),
      }).toEqual({ app, reaches: true });
    }
  });

  it("keeps the Back office sign-in only and Admin-only", () => {
    expect(APP_SETTINGS[App.BACK_OFFICE]).toEqual({
      minRole: Role.ADMIN,
      registration: null,
    });
  });

  it("never gives a stranger the Admin Role", () => {
    expect(registrationRoleSchema.safeParse(Role.ADMIN).success).toBe(false);
    expect(registrationRoleSchema.options).toEqual([Role.USER, Role.VIEWER]);
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/auth/access`
Expected: FAIL — `roleIn`, `canManageImage` and `../constants/app-settings` do not exist.

- [x] **Step 3: Implement**

`constants/schemas.ts`:

```ts
import { z } from "zod";
import { App, Role } from "../../../../../generated/prisma/enums";

export type { App } from "../../../../../generated/prisma/enums";

/** Every Role, from the Prisma enum; the one schema every package parses with. */
export const roleSchema = z.enum(Role);

/** Every App, from the Prisma enum, spelled as its keys (`BACK_OFFICE`). */
export const appSchema = z.enum(App);
```

`constants/app-settings.ts`:

```ts
import type { z } from "zod";
import { App, Role } from "../../../../../generated/prisma/enums";
import { roleSchema } from "./schemas";

/** A Role a stranger can be given by Registration: never Admin. */
export const registrationRoleSchema = roleSchema.exclude([Role.ADMIN]);
export type RegistrationRole = z.infer<typeof registrationRoleSchema>;

/** What an App declares about itself (ADR 0019); more fields can follow. */
export type AppSettings = {
  /** The lowest Role this App lets in. */
  minRole: Role;
  /** The Role a visitor registering here gets; null: Registration is closed. */
  registration: RegistrationRole | null;
};

export type AppSettingsTable = Readonly<Record<App, AppSettings>>;

/**
 * Every App's settings, read by the API (which enforces them) and every App.
 * A new App fails to compile until its row is here.
 */
export const APP_SETTINGS = {
  [App.LAURA]: { minRole: Role.VIEWER, registration: null },
  [App.BACK_OFFICE]: { minRole: Role.ADMIN, registration: null },
} as const satisfies AppSettingsTable;
```

`access.ts`:

```ts
import { Role } from "../../../../generated/prisma/enums";
import {
  APP_SETTINGS,
  type AppSettingsTable,
} from "./constants/app-settings";
import { ROLE_RANK } from "./constants/roles";
import { type App, appSchema, roleSchema } from "./constants/schemas";

/**
 * Every rule about Roles and Memberships, beside the enums they read, so the
 * API, every App and this package's own services apply the same ones.
 */

/** One App a User belongs to, and their Role there. */
export type AccessMembership = { app: App; role: Role };

/** What the rules read from a User. */
export type AccessUser = { memberships: readonly AccessMembership[] };

/** True when `role` reaches at least `min`: `hasRole(Role.ADMIN, Role.USER)`. */
export const hasRole = (role: Role, min: Role): boolean =>
  ROLE_RANK[role] >= ROLE_RANK[min];

/** The User's Role in `app`, or `undefined` when they do not belong to it. */
export const roleIn = (user: AccessUser, app: App): Role | undefined =>
  user.memberships.find((membership) => membership.app === app)?.role;

/**
 * Whether a User is allowed into an App: they belong to it and their Role
 * there reaches the App's floor. The API's `requireApp` and sign-in check, a
 * Next App's `canAccess` and the Image module's reads all apply it.
 */
export const canEnterApp = (
  user: AccessUser,
  app: App,
  settings: AppSettingsTable = APP_SETTINGS
): boolean => {
  const role = roleIn(user, app);
  return role !== undefined && hasRole(role, settings[app].minRole);
};

/** Whether a User uploads, edits or deletes the Images of `app`: Admin there. */
export const canManageImage = (user: AccessUser, app: App): boolean =>
  roleIn(user, app) === Role.ADMIN;

/**
 * Memberships read as plain strings (JSON from the API), narrowed without a
 * cast. An unknown App grants nothing, so it is dropped. An unknown Role means
 * the database is ahead of this build: throw, so the host logs it and answers
 * 500, instead of letting `hasRole` read an `undefined` rank.
 */
export const accessUserFrom = (user: {
  memberships: readonly { app: string; role: string }[];
}): AccessUser => ({
  memberships: user.memberships.flatMap(({ app, role }) => {
    const parsedApp = appSchema.safeParse(app);
    if (!parsedApp.success) {
      return [];
    }
    const parsedRole = roleSchema.safeParse(role);
    if (!parsedRole.success) {
      throw new Error(`Unknown Role "${role}": the database is ahead of this build`);
    }
    return [{ app: parsedApp.data, role: parsedRole.data }];
  }),
});
```

`packages/database/package.json` exports, after the `access` line:

```json
    "./features/auth/access/constants/app-settings": "./src/features/auth/access/constants/app-settings.ts",
```

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/auth/access`
Expected: PASS.

---

### Task 3: Seed and user service on Memberships

**Files:**
- Modify: `packages/database/src/features/seed/seed-user.ts`
- Modify: `packages/database/src/features/seed/upsert-user.ts`
- Modify: `packages/database/src/features/seed/seed.ts`
- Modify: `packages/database/src/features/seed/mock/users.json`
- Modify: `packages/database/src/features/apps/laura/seed/laura-seed.ts`
- Modify: `packages/database/src/features/apps/laura/seed/mock/users.json`
- Modify: `packages/database/src/features/auth/user.service.ts`
- Test: `packages/database/src/features/seed/tests/seed-user.test.ts`
- Test: `packages/database/src/features/apps/laura/seed/tests/laura-seed.test.ts`

**Interfaces:**
- Consumes: `appSchema`, `roleSchema` (Task 2); Prisma `Membership` (Task 1).
- Produces: `seedUserSchema = { email, name, memberships: { app, role }[] (min 1) }`; `upsertUser(user, hash)` replaces a seeded User's Memberships; `getUserById`/`getUsers` select `memberships: { select: { app, role } }`; `updateUserAllowedApps` deleted (no callers).

- [x] **Step 1: Write the failing tests**

`seed-user.test.ts`, second test:

```ts
  it("rejects an unknown Role or App, and a User in no App", () => {
    const user = {
      email: "a@b.test",
      memberships: [{ app: "LAURA", role: "ADMIN" }],
      name: "a",
    };
    expect(seedUsersSchema.safeParse([user]).success).toBe(true);
    expect(
      seedUsersSchema.safeParse([
        { ...user, memberships: [{ app: "LAURA", role: "OWNER" }] },
      ]).success
    ).toBe(false);
    expect(
      seedUsersSchema.safeParse([
        { ...user, memberships: [{ app: "ALL", role: "ADMIN" }] },
      ]).success
    ).toBe(false);
    expect(
      seedUsersSchema.safeParse([{ ...user, memberships: [] }]).success
    ).toBe(false);
  });
```

`laura-seed.test.ts`: replace the `AllowedApp` import with `import { App, Role } from "../../../../../../generated/prisma/enums";` and the three assertions:

```ts
    expect(
      users.every(({ memberships }) =>
        memberships.some(({ app }) => app === App.LAURA)
      )
    ).toBe(true);
```

```ts
    ).toEqual([
      {
        email: "guest@laura.test",
        memberships: [{ app: App.LAURA, role: Role.VIEWER }],
        name: "guest",
      },
    ]);
```

```ts
describe("the shared seed", () => {
  it("holds no App's users, only users of every App", () => {
    const users = mockUsers(
      resolve(import.meta.dirname, "../../../../seed/mock/users.json")
    );
    const everyApp = [...objectValues(App)].sort().join();
    expect(
      users.every(
        ({ memberships }) =>
          memberships
            .map(({ app }) => app)
            .sort()
            .join() === everyApp
      )
    ).toBe(true);
  });
});
```

(add `import { objectValues } from "@allonfire/core/shared/utils/object";`)

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/seed src/features/apps/laura`
Expected: FAIL — schema still wants `role`/`allowedApps`.

- [x] **Step 3: Implement**

`seed-user.ts`:

```ts
import { z } from "zod";
import type { SeedEnv } from "../../environment/seed-environment";
import { appSchema, roleSchema } from "../auth/access/constants/schemas";

/** A seeded User and the Apps they belong to. Parsed, not cast: a typo in the mock file fails the seed. */
export const seedUserSchema = z.object({
  email: z.email(),
  memberships: z
    .array(z.object({ app: appSchema, role: roleSchema }))
    .min(1),
  name: z.string(),
});
```

(rest of the file unchanged)

`upsert-user.ts`:

```ts
import { prisma } from "../prisma/client";
import type { SeedUser } from "./seed-user";

/** Creates or updates a seeded User, its Memberships and its password login. */
export async function upsertUser(
  { email, name, memberships }: SeedUser,
  hashedPassword: string
) {
  const user = await prisma.user.upsert({
    create: { email, emailVerified: true, name },
    update: {},
    where: { email },
  });

  // The listed Memberships are the whole truth for a seeded User.
  await prisma.$transaction([
    prisma.membership.deleteMany({ where: { userId: user.id } }),
    prisma.membership.createMany({
      data: memberships.map(({ app, role }) => ({ app, role, userId: user.id })),
    }),
  ]);

  const existingAccount = await prisma.account.findFirst({
    where: { providerId: "credential", userId: user.id },
  });

  if (existingAccount) {
    await prisma.account.update({
      data: { password: hashedPassword },
      where: { id: existingAccount.id },
    });
  } else {
    await prisma.account.create({
      data: {
        accountId: user.id,
        password: hashedPassword,
        providerId: "credential",
        userId: user.id,
      },
    });
  }

  console.log(
    `Seeded: ${email} (${memberships.map(({ app, role }) => `${app}: ${role}`).join(", ")})`
  );
}
```

`seed.ts`: import `App, Role` from `../../../generated/prisma/client` and `objectValues` from `@allonfire/core/shared/utils/object`; the admin becomes:

```ts
  await upsertUser(
    {
      email: seedEnv.DATABASE_SEED_ADMIN_EMAIL,
      // An Admin of every App there is today; a new App's changeset adds its row.
      memberships: objectValues(App).map((app) => ({ app, role: Role.ADMIN })),
      name: adminName,
    },
    adminHash
  );
```

`seed/mock/users.json`:

```json
[
  {
    "email": "allonfire-user@allonfire.com",
    "name": "allonfire-user",
    "memberships": [
      { "app": "LAURA", "role": "USER" },
      { "app": "BACK_OFFICE", "role": "USER" }
    ]
  },
  {
    "email": "allonfire-viewer@allonfire.com",
    "name": "allonfire-viewer",
    "memberships": [
      { "app": "LAURA", "role": "VIEWER" },
      { "app": "BACK_OFFICE", "role": "VIEWER" }
    ]
  }
]
```

`apps/laura/seed/mock/users.json`:

```json
[
  {
    "email": "laura-admin@allonfire.com",
    "name": "laura-admin",
    "memberships": [{ "app": "LAURA", "role": "ADMIN" }]
  },
  {
    "email": "laura-user@allonfire.com",
    "name": "laura-user",
    "memberships": [{ "app": "LAURA", "role": "USER" }]
  }
]
```

`laura-seed.ts`: import `App, Role` instead of `AllowedApp, Role`; the user becomes:

```ts
  {
    email,
    memberships: [{ app: App.LAURA, role: Role.VIEWER }],
    name: email.split("@")[0] ?? "laura-viewer",
  },
```

`user.service.ts`: drop the `AllowedApp` import and `updateUserAllowedApps`; in both selects replace `allowedApps: true` and `role: true` with:

```ts
      memberships: { select: { app: true, role: true } },
```

- [x] **Step 4: Run the tests and seed the Local database**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/seed src/features/apps/laura && pnpm db:seed`
Expected: tests PASS; the seed prints `Seeded: <admin> (LAURA: ADMIN, BACK_OFFICE: ADMIN)` and the Laura Viewer line. (The seed sources `packages/database/.env`; never print its values.)

---

### Task 4: Image service on `App`

**Files:**
- Modify: `packages/database/src/features/image/image.service.ts`
- Test: `packages/database/src/features/image/tests/image.integration.test.ts`

**Interfaces:**
- Consumes: Prisma `App` (Task 1).
- Produces: `ImageChange.app?: App`; `listImages({ app: App, cursor?, limit })` returns only that App's Images; new `appsOfImages(ids: readonly string[]): Promise<Map<string, App>>`, throwing `ImageNotFoundError` naming every unknown id.

- [x] **Step 1: Write the failing tests**

In `image.integration.test.ts` replace every `AllowedApp` with `App` (import from the generated enums as today), then replace the listing test and the move assertions:

```ts
  it("lists only the App's own Images, newest first", async () => {
    const [first] = await createImages([image("laura-1", App.LAURA)]);
    const [second] = await createImages([image("laura-2", App.LAURA)]);
    await createImages([image("office", App.BACK_OFFICE)]);
    const listed = await listImages({ app: App.LAURA, limit: 10 });
    const ours = listed.filter(({ key }) => key.startsWith(KEY_PREFIX));
    expect(ours.map(({ id }) => id)).toEqual([second?.id, first?.id]);
  });
```

In the update test, `{ app: AllowedApp.ALL, ... }` becomes `{ app: App.BACK_OFFICE, ... }` and the last assertion `expect(moved?.app).toBe(App.BACK_OFFICE);`. Add:

```ts
  it("names each Image's App, or every id it does not know", async () => {
    const [one] = await createImages([image("apps-of", App.BACK_OFFICE)]);
    const id = one?.id ?? "";
    expect(await appsOfImages([id, id])).toEqual(new Map([[id, App.BACK_OFFICE]]));
    await expect(appsOfImages([id, "missing"])).rejects.toMatchObject({
      ids: ["missing"],
    });
  });
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/image`
Expected: FAIL — `appsOfImages` is not exported; the listing still returns other rows only by app (types fail on `AllowedApp`).

- [x] **Step 3: Implement**

In `image.service.ts`: import `type App` from `../../../generated/prisma/enums` instead of `AllowedApp`; `ImageChange.app?: App | undefined`; `listImages`' param `app: App`, its doc comment `/** The App's Images, newest first. ... */` and its filter `app,` instead of `app: { in: [app, AllowedApp.ALL] },`. Add:

```ts
/** Each Image's App, by id; throws `ImageNotFoundError` unless every id exists. */
export async function appsOfImages(
  ids: readonly string[]
): Promise<Map<string, App>> {
  const unique = [...new Set(ids)];
  const rows = await prisma.image.findMany({
    select: { app: true, id: true },
    where: { id: { in: unique } },
  });
  const apps = new Map(rows.map(({ app, id }) => [id, app]));
  const missing = unique.filter((id) => !apps.has(id));
  if (missing.length > 0) {
    throw new ImageNotFoundError(missing);
  }
  return apps;
}
```

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/database exec vitest run && pnpm --filter @allonfire/database check-types`
Expected: PASS, no type errors in `packages/database`.

---

### Task 5: Auth module server — Session, Registration, joining, entry

**Files:**
- Modify: `packages/auth/src/shared/constants/paths.ts`
- Create: `packages/auth/src/shared/constants/errors.ts`
- Modify: `packages/auth/src/shared/types/auth.ts`
- Modify: `packages/auth/src/shared/tests/stub-auth.ts`
- Modify: `packages/auth/src/features/server/auth.ts`
- Create: `packages/auth/src/features/server/registration.ts`
- Create: `packages/auth/src/features/server/join-app.ts`
- Modify: `packages/auth/package.json` (exports)
- Test: `packages/auth/src/features/server/tests/auth.test.ts`
- Test: `packages/auth/src/features/server/tests/registration.integration.test.ts`

**Interfaces:**
- Consumes: `APP_SETTINGS`, `AppSettingsTable`, `canEnterApp`, `appSchema`, `AccessMembership` (Task 2); `prisma.membership` (Task 1).
- Produces:
  - `paths.ts`: `APP_HEADER = "x-aof-app"`, `SIGN_UP_EMAIL_PATH = "/sign-up/email"`, `JOIN_APP_PATH = "/join-app"`, `LIMITED_AUTH_PATHS = [SIGN_IN_EMAIL_PATH, SIGN_UP_EMAIL_PATH, CHANGE_PASSWORD_PATH]`.
  - `errors.ts`: `AUTH_ERROR_CODE = { APP_FORBIDDEN, REGISTRATION_CLOSED }`, `authErrorCodeSchema`, `type AuthErrorCode`.
  - `AuthSession.user = { id, email, name, memberships: readonly AccessMembership[] }`.
  - `createAuth({ ..., apps: AppSettingsTable })`; `Auth["$Infer"]["Session"]["user"]["memberships"]`.
  - `sessionFor(user?)` defaults to `memberships: [{ LAURA, USER }, { BACK_OFFICE, USER }]`; new `membershipsIn(role)` gives that Role in every App.

- [x] **Step 1: Write the failing integration test**

Create `registration.integration.test.ts`:

```ts
// @module-tag integration

import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database";
import { App, Role } from "@allonfire/database/enums";
import {
  APP_SETTINGS,
  type AppSettingsTable,
} from "@allonfire/database/features/auth/access/constants/app-settings";
import { z } from "zod";
import { AUTH_ERROR_CODE } from "../../../shared/constants/errors";
import {
  APP_HEADER,
  JOIN_APP_PATH,
  SIGN_IN_EMAIL_PATH,
  SIGN_UP_EMAIL_PATH,
} from "../../../shared/constants/paths";
import { createAuth } from "../auth";

const BASE_URL = "http://localhost:3300";
const BASE_PATH = "/v1/auth";
const ORIGIN = "http://localhost:3200";
const PASSWORD = "registration-password-1";
const EMAIL_DOMAIN = "@registration.allonfire.test";
const TOKEN_COOKIE = "better-auth.session_token=";
const DATA_COOKIE = "better-auth.session_data=";

/** Both Apps open, so registering and joining can be watched. */
const OPEN: AppSettingsTable = {
  [App.BACK_OFFICE]: { minRole: Role.USER, registration: Role.USER },
  [App.LAURA]: { minRole: Role.VIEWER, registration: Role.VIEWER },
};

const options = {
  basePath: BASE_PATH,
  baseURL: BASE_URL,
  secret: "x".repeat(32),
  trustedOrigins: [ORIGIN],
};
const open = createAuth({ ...options, apps: OPEN });
const closed = createAuth({ ...options, apps: APP_SETTINGS });

type Instance = typeof open;

const errorBody = z.object({ code: z.string() });

let sequence = 0;
const nextEmail = () => {
  sequence += 1;
  return `user-${Date.now()}-${sequence}${EMAIL_DOMAIN}`;
};

const post = (
  instance: Instance,
  path: string,
  body: object,
  headers: Record<string, string> = {}
) =>
  instance.handler(
    new Request(`${BASE_URL}${BASE_PATH}${path}`, {
      body: stringifyJson(body),
      headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
      method: "POST",
    })
  );

const signUp = (instance: Instance, email: string, app?: string) =>
  post(
    instance,
    SIGN_UP_EMAIL_PATH,
    { email, name: "New", password: PASSWORD },
    app ? { [APP_HEADER]: app } : {}
  );

const signIn = (instance: Instance, email: string, app?: string) =>
  post(
    instance,
    SIGN_IN_EMAIL_PATH,
    { email, password: PASSWORD },
    app ? { [APP_HEADER]: app } : {}
  );

/** The cookies a response set, as a request sends them back. */
const cookieOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

/** Session cookies that still carry a value; a cleared one has none. */
const liveSessionCookies = (res: Response) =>
  res.headers
    .getSetCookie()
    .filter(
      (cookie) =>
        (cookie.startsWith(TOKEN_COOKIE) || cookie.startsWith(DATA_COOKIE)) &&
        !cookie.startsWith(`${TOKEN_COOKIE};`) &&
        !cookie.startsWith(`${DATA_COOKIE};`)
    );

const membershipsOf = (email: string) =>
  prisma.membership.findMany({
    orderBy: { app: "asc" },
    select: { app: true, role: true },
    where: { user: { email } },
  });

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (cause) {
    throw new Error(
      "Postgres unavailable — run: pnpm docker:up && pnpm db:update",
      { cause }
    );
  }
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
  await prisma.$disconnect();
});

describe("Registration", () => {
  it("creates the User with one Membership: the App, at its Registration Role", async () => {
    const email = nextEmail();
    const res = await signUp(open, email, App.LAURA);
    expect(res.status).toBe(200);
    expect(await membershipsOf(email)).toEqual([
      { app: App.LAURA, role: Role.VIEWER },
    ]);
  });

  it.each([
    ["a closed App", App.BACK_OFFICE],
    ["the stored spelling", "back-office"],
    ["an unknown App", "social"],
    ["no App", undefined],
  ])("refuses %s with 403 and writes nothing", async (_, app) => {
    const email = nextEmail();
    const res = await signUp(closed, email, app);
    expect(res.status).toBe(403);
    expect(errorBody.parse(await res.json()).code).toBe(
      AUTH_ERROR_CODE.REGISTRATION_CLOSED
    );
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });

  it("refuses a closed App before saying an email is taken", async () => {
    const email = nextEmail();
    await signUp(open, email, App.LAURA);
    const res = await signUp(closed, email, App.LAURA);
    expect(res.status).toBe(403);
    expect(errorBody.parse(await res.json()).code).toBe(
      AUTH_ERROR_CODE.REGISTRATION_CLOSED
    );
  });
});

describe("joining another App", () => {
  it("adds a Membership at that App's Registration Role", async () => {
    const email = nextEmail();
    const cookie = cookieOf(await signUp(open, email, App.LAURA));
    const res = await post(open, JOIN_APP_PATH, {}, {
      cookie,
      [APP_HEADER]: App.BACK_OFFICE,
    });
    expect(res.status).toBe(200);
    expect(await membershipsOf(email)).toEqual([
      { app: App.LAURA, role: Role.VIEWER },
      { app: App.BACK_OFFICE, role: Role.USER },
    ]);
  });

  it("never changes the Role in an App the User already belongs to", async () => {
    const email = nextEmail();
    const cookie = cookieOf(await signUp(open, email, App.LAURA));
    await prisma.membership.updateMany({
      data: { role: Role.ADMIN },
      where: { app: App.LAURA, user: { email } },
    });
    const res = await post(open, JOIN_APP_PATH, {}, {
      cookie,
      [APP_HEADER]: App.LAURA,
    });
    expect(res.status).toBe(200);
    expect(await membershipsOf(email)).toEqual([
      { app: App.LAURA, role: Role.ADMIN },
    ]);
  });

  it("refuses a closed App with 403", async () => {
    const email = nextEmail();
    const cookie = cookieOf(await signUp(open, email, App.LAURA));
    const res = await post(closed, JOIN_APP_PATH, {}, {
      cookie,
      [APP_HEADER]: App.BACK_OFFICE,
    });
    expect(res.status).toBe(403);
    expect(await membershipsOf(email)).toHaveLength(1);
  });

  it("needs a Session", async () => {
    const res = await post(open, JOIN_APP_PATH, {}, {
      [APP_HEADER]: App.LAURA,
    });
    expect(res.status).toBe(401);
  });
});

describe("sign-in naming an App", () => {
  it("refuses a User the App does not let in, leaving no Session behind", async () => {
    const email = nextEmail();
    await signUp(open, email, App.LAURA);
    await prisma.session.deleteMany({ where: { user: { email } } });
    const res = await signIn(closed, email, App.BACK_OFFICE);
    expect(res.status).toBe(403);
    expect(errorBody.parse(await res.json()).code).toBe(
      AUTH_ERROR_CODE.APP_FORBIDDEN
    );
    expect(liveSessionCookies(res)).toEqual([]);
    expect(await prisma.session.count({ where: { user: { email } } })).toBe(0);
  });

  it.each([["an unknown App", "back-office"]])(
    "refuses %s with 403",
    async (_, app) => {
      const email = nextEmail();
      await signUp(open, email, App.LAURA);
      expect((await signIn(closed, email, app)).status).toBe(403);
    }
  );

  it("lets in a User the App admits, and anyone when no App is named", async () => {
    const email = nextEmail();
    await signUp(open, email, App.LAURA);
    expect((await signIn(closed, email, App.LAURA)).status).toBe(200);
    expect((await signIn(closed, email)).status).toBe(200);
  });

  it("hands the Session out with the User's Memberships", async () => {
    const email = nextEmail();
    const cookie = cookieOf(await signUp(open, email, App.LAURA));
    const res = await open.handler(
      new Request(`${BASE_URL}${BASE_PATH}/get-session`, { headers: { cookie } })
    );
    const body = z
      .object({ user: z.object({ memberships: z.array(z.looseObject({})) }) })
      .parse(await res.json());
    expect(body.user.memberships).toEqual([
      { app: App.LAURA, role: Role.VIEWER },
    ]);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/auth exec vitest run src/features/server/tests/registration.integration.test.ts`
Expected: FAIL — `createAuth` does not take `apps`, `AUTH_ERROR_CODE` and `APP_HEADER` do not exist.

- [x] **Step 3: Add the constants and types**

`paths.ts` additions (and the new `LIMITED_AUTH_PATHS`):

```ts
/** Names the App a request is for: its enum key (`BACK_OFFICE`), as `AUTH_APP`. */
export const APP_HEADER = "x-aof-app";

/** Better Auth's email and password Registration. */
export const SIGN_UP_EMAIL_PATH = "/sign-up/email";

/** Adds a Membership in an App open to Registration; needs a Session. */
export const JOIN_APP_PATH = "/join-app";

/**
 * Every route where Better Auth checks or hashes a password. Hosts rate-limit
 * these harder than anything else: each request is a guess or a hash.
 */
export const LIMITED_AUTH_PATHS = [
  SIGN_IN_EMAIL_PATH,
  SIGN_UP_EMAIL_PATH,
  CHANGE_PASSWORD_PATH,
] as const;
```

`shared/constants/errors.ts`:

```ts
import { z } from "zod";

/** The codes this module adds to Better Auth's own error bodies. */
export const AUTH_ERROR_CODE = {
  /** Sign-in named an App that does not let this User in. */
  APP_FORBIDDEN: "APP_FORBIDDEN",
  /** Registration or joining for an App that does not allow it, or no App named. */
  REGISTRATION_CLOSED: "REGISTRATION_CLOSED",
} as const;

export const authErrorCodeSchema = z.enum(AUTH_ERROR_CODE);
export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>;
```

`shared/types/auth.ts`: replace the `AllowedApp, Role` import with `import type { AccessMembership } from "@allonfire/database/features/auth/access/access";` and the user shape:

```ts
  user: {
    id: string;
    email: string;
    name: string;
    memberships: readonly AccessMembership[];
  };
```

`shared/tests/stub-auth.ts`:

```ts
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
// ...the AUTH_PATH and type imports stay...
/** The same Role in every App, for a test about one Role. */
export const membershipsIn = (role: Role) =>
  objectValues(App).map((app) => ({ app, role }));

/** A signed-in Session; override the user fields a test is about. */
export function sessionFor(
  user: Partial<AuthSession["user"]> = {}
): AuthSession {
  return {
    session: { expiresAt: new Date(Date.now() + SESSION_TTL_MS), id: "session-1" },
    user: {
      email: "user@allonfire.test",
      id: "user-1",
      memberships: membershipsIn(Role.USER),
      name: "Test User",
      ...user,
    },
  };
}
```

- [x] **Step 4: Implement the join plugin**

`features/server/join-app.ts`:

```ts
import { prisma } from "@allonfire/database";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { JOIN_APP_PATH } from "../../shared/constants/paths";
import { type Registration, registrationClosed } from "./registration";

/**
 * `POST /join-app`: a signed-in User joins the App named in `x-aof-app`, when
 * it is open to Registration. A Membership already there is left alone, so a
 * Role is never lowered.
 */
export const joinApp = (registrationFor: (headers?: Headers) => Registration | null) =>
  ({
    endpoints: {
      joinApp: createAuthEndpoint(
        JOIN_APP_PATH,
        { method: "POST", requireHeaders: true, use: [sessionMiddleware] },
        async (ctx) => {
          const registration = registrationFor(ctx.headers);
          if (!registration) {
            throw registrationClosed();
          }
          const userId = ctx.context.session.user.id;
          await prisma.membership.upsert({
            create: { ...registration, userId },
            update: {},
            where: { userId_app: { app: registration.app, userId } },
          });
          return ctx.json({ app: registration.app });
        }
      ),
    },
    id: "aof-join-app",
  }) satisfies BetterAuthPlugin;
```

Create `features/server/registration.ts`:

```ts
import type { App } from "@allonfire/database/enums";
import type {
  AppSettingsTable,
  RegistrationRole,
} from "@allonfire/database/features/auth/access/constants/app-settings";
import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import { APIError } from "better-auth/api";
import { AUTH_ERROR_CODE } from "../../shared/constants/errors";
import { APP_HEADER } from "../../shared/constants/paths";

/** The App a request registers in, and the Role Registration there gives. */
export type Registration = { app: App; role: RegistrationRole };

/** The App `x-aof-app` names, if it names one. */
export const namedApp = (headers?: Headers): App | null => {
  const parsed = appSchema.safeParse(headers?.get(APP_HEADER));
  return parsed.success ? parsed.data : null;
};

/** What Registration in the named App gives; null when it names no open App. */
export const registrationIn =
  (apps: AppSettingsTable) =>
  (headers?: Headers): Registration | null => {
    const app = namedApp(headers);
    const role = app && apps[app].registration;
    return app && role ? { app, role } : null;
  };

export const registrationClosed = () =>
  new APIError("FORBIDDEN", {
    code: AUTH_ERROR_CODE.REGISTRATION_CLOSED,
    message: "This App does not allow Registration",
  });
```

- [x] **Step 5: Wire `createAuth`**

`features/server/auth.ts` (imports added: `type AppSettingsTable` from `.../constants/app-settings`, `canEnterApp` from `.../access/access`, `APIError, createAuthMiddleware` from `better-auth/api`, `customSession` from `better-auth/plugins`, `deleteSessionCookie` from `better-auth/cookies`, `AUTH_ERROR_CODE`, `APP_HEADER`, `SIGN_IN_EMAIL_PATH`, `SIGN_UP_EMAIL_PATH`, `joinApp`, `namedApp`, `registrationClosed`, `registrationIn`; removed: `objectValues`, `AllowedApp, Role`, `accessUserFrom`):

```ts
export type CreateAuthOptions = {
  // ...existing fields...
  /** Every App's settings (`APP_SETTINGS`): who enters it, who may register. */
  apps: AppSettingsTable;
};

/** A User's Memberships, as the access rules read them. */
const membershipsOf = (userId: string) =>
  prisma.membership.findMany({
    select: { app: true, role: true },
    where: { userId },
  });

export function createAuth({ apps, cookieDomain, ...options }: CreateAuthOptions) {
  const registrationFor = registrationIn(apps);
  return betterAuth({
    ...options,
    ...(cookieDomain && {
      advanced: {
        crossSubDomainCookies: { domain: cookieDomain, enabled: true },
      },
    }),
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    databaseHooks: {
      user: {
        create: {
          // Every User a request creates goes through Registration: the one
          // place a row is written, so the one place that must refuse.
          before: async (user, ctx) => {
            if (!registrationFor(ctx?.headers)) {
              throw registrationClosed();
            }
            return { data: user };
          },
          after: async (user, ctx) => {
            const registration = registrationFor(ctx?.headers);
            if (registration) {
              await prisma.membership.create({
                data: { ...registration, userId: user.id },
              });
            }
          },
        },
      },
    },
    disabledPaths: [OPENAPI_SCHEMA_PATH],
    emailAndPassword: { enabled: true },
    hooks: {
      // Refused before Better Auth looks the email up: a closed App never
      // learns whether an account exists.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === SIGN_UP_EMAIL_PATH && !registrationFor(ctx.headers)) {
          throw registrationClosed();
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const session = ctx.context.newSession;
        if (
          ctx.path !== SIGN_IN_EMAIL_PATH ||
          !session ||
          !ctx.headers?.has(APP_HEADER)
        ) {
          return;
        }
        const app = namedApp(ctx.headers);
        const memberships = await membershipsOf(session.user.id);
        if (app && canEnterApp({ memberships }, app, apps)) {
          return;
        }
        // The Session just opened must not outlive the refusal, in the
        // database or in the cookie cache.
        await ctx.context.internalAdapter.deleteSession(session.session.token);
        deleteSessionCookie(ctx);
        throw new APIError("FORBIDDEN", {
          code: AUTH_ERROR_CODE.APP_FORBIDDEN,
          message: "This App does not let this User in",
        });
      }),
    },
    plugins: [
      openAPI({ disableDefaultReference: true }),
      customSession(async ({ session, user }) => ({
        session,
        user: { ...user, memberships: await membershipsOf(user.id) },
      })),
      joinApp(registrationFor),
    ],
    rateLimit: { enabled: false },
    session: {
      cookieCache: { enabled: true, maxAge: COOKIE_CACHE_MAX_AGE_S },
      expiresIn: SESSION_EXPIRES_IN_S,
      updateAge: SESSION_UPDATE_AGE_S,
    },
  });
}
```

Delete the old `user.additionalFields` block and the "Users are created by the seed" comment. `toAuthLike.getSession` returns the Session as Better Auth hands it, Memberships included:

```ts
  getSession: async (headers, setCookie) => {
    const { headers: set, response: found } = await auth.api.getSession({
      headers,
      returnHeaders: true,
    });
    for (const cookie of set.getSetCookie()) {
      setCookie?.(cookie);
    }
    return found && { session: found.session, user: found.user };
  },
```

`packages/auth/package.json` exports: add `"./shared/constants/errors": "./src/shared/constants/errors.ts",` after `limits`.

- [x] **Step 6: Update `auth.test.ts`**

Pass `apps: APP_SETTINGS` (import from `@allonfire/database/features/auth/access/constants/app-settings`) to its `createAuth`, and replace the Role type test:

```ts
  it("types the Session's Memberships from the database", () => {
    expectTypeOf<
      Auth["$Infer"]["Session"]["user"]["memberships"]
    >().toExtend<readonly AccessMembership[]>();
  });

  it("rate-limits Registration like sign-in: each attempt hashes a password", () => {
    expect(LIMITED_AUTH_PATHS).toContain(SIGN_UP_EMAIL_PATH);
  });
```

(import `type AccessMembership` from `@allonfire/database/features/auth/access/access`, `LIMITED_AUTH_PATHS`, `SIGN_UP_EMAIL_PATH` from paths; drop the `Role` import.)

- [x] **Step 7: Run to verify they pass**

Run: `pnpm --filter @allonfire/auth exec vitest run src/features/server`
Expected: PASS. If `"refuses a User the App does not let in, leaving no Session behind"` fails only on `liveSessionCookies`, Better Auth kept the sign-in's cookies on the error response: read `ctx.context.responseHeaders`, delete its `set-cookie` before `deleteSessionCookie(ctx)`, and ledger the ruling. Never weaken the assertion.

---

### Task 6: Hono guards — `requireApp(app)`, no `requireRole`

**Files:**
- Modify: `packages/auth/src/features/hono/guards/middleware/require-app.ts`
- Delete: `packages/auth/src/features/hono/guards/middleware/require-role.ts`
- Modify: `packages/auth/package.json` (drop the `require-role` export)
- Test: `packages/auth/src/features/hono/guards/tests/guards.test.ts`
- Test: `packages/auth/src/features/hono/guards/tests/guards.test-d.ts`

**Interfaces:**
- Consumes: `canEnterApp` (Task 2), `sessionFor`, `membershipsIn` (Task 5).
- Produces: `requireApp(app: App): MiddlewareHandler<SignedInEnv>`.

- [x] **Step 1: Write the failing tests**

In `guards.test.ts` delete the `requireRole` describe and its import; import `App, Role` from `@allonfire/database/enums`; replace `requireApp`'s describe:

```ts
describe("requireApp", () => {
  it("allows a User whose Role in the App reaches its floor", async () => {
    const guard = requireApp(App.LAURA);
    const laura = (role: Role) =>
      sessionFor({ memberships: [{ app: App.LAURA, role }] });
    expect(await status(laura(Role.VIEWER), guard)).toBe(200);
    expect(await status(laura(Role.ADMIN), guard)).toBe(200);
  });

  it("refuses a User of another App, and a Role under the floor", async () => {
    const guard = requireApp(App.BACK_OFFICE);
    expect(
      await status(
        sessionFor({ memberships: [{ app: App.LAURA, role: Role.ADMIN }] }),
        guard
      )
    ).toBe(403);
    expect(
      await status(
        sessionFor({ memberships: [{ app: App.BACK_OFFICE, role: Role.USER }] }),
        guard
      )
    ).toBe(403);
    expect(await status(null, guard)).toBe(401);
  });
});
```

In `guards.test-d.ts` drop `requireRole` (its import, the `/b` route and the `requireRole("OWNER")` line), import `App`, and change the rest:

```ts
new Hono<AuthEnv>()
  .use(requireApp(App.LAURA))
  .get("/", (c) => {
    expectTypeOf(c.get("session")).toEqualTypeOf<AuthSession>();
    return c.text("ok");
  });

// @ts-expect-error an App comes from the enum, not a free string
requireApp("back-office");
```

- [x] **Step 2: Run to verify they fail**

Run: `pnpm --filter @allonfire/auth exec vitest run src/features/hono/guards`
Expected: FAIL — `requireApp` still takes an `AppPolicy`.

- [x] **Step 3: Implement**

`require-app.ts`:

```ts
import type { App } from "@allonfire/database/enums";
import { canEnterApp } from "@allonfire/database/features/auth/access/access";
import { guard } from "../utils/guard";

/**
 * 403 unless the User is allowed into the App (`canEnterApp`): a Membership
 * there whose Role reaches the App's floor in `APP_SETTINGS`.
 * `requireApp(App.LAURA)`.
 */
export const requireApp = (app: App) =>
  guard(({ user }) => canEnterApp(user, app));
```

Delete `require-role.ts` and its line in `package.json` exports.

- [x] **Step 4: Run to verify they pass**

Run: `pnpm --filter @allonfire/auth exec vitest run src/features/hono`
Expected: PASS (typecheck of `guards.test-d.ts` included).

---

### Task 7: Next adapter and the Back office env

**Files:**
- Modify: `packages/auth/src/environment/next-environment.ts`
- Modify: `packages/auth/src/features/next/utils/access.ts`
- Modify: `packages/auth/src/features/next/utils/auth-client.ts`
- Modify: `packages/auth/src/features/next/utils/sign-in.ts`
- Modify: `packages/auth/src/features/next/constants/api.ts`
- Modify: `packages/auth/vitest.setup.ts`
- Modify: `apps/back-office/.env.example`
- Test: `packages/auth/src/environment/tests/next-environment.test.ts`
- Test: `packages/auth/src/features/next/tests/sign-in.test.ts`
- Test: `apps/back-office/src/environment/tests/environment.test.ts`

**Interfaces:**
- Consumes: `APP_HEADER` (Task 5), `canEnterApp`, `accessUserFrom` (Task 2), `Auth` type (Task 5).
- Produces: `nextAuthEnv = { API_AUTH_URL, API_URL, AUTH_APP }`; `canAccess(user: { memberships: readonly { app: string; role: string }[] })`; `signInWithEmail` sends `x-aof-app` and maps 403 to `SIGN_IN_ERROR.FORBIDDEN`.

- [x] **Step 1: Write the failing tests**

`sign-in.test.ts`: drop the `AllowedApp, Role` import; `signedInAs` takes no argument:

```ts
const signedIn = () =>
  new Response(
    stringifyJson({
      redirect: false,
      token: "fresh",
      user: { email: "a@b.test", id: "user-1", name: "A" },
    }),
    {
      headers: [
        ["content-type", "application/json"],
        ["set-cookie", NEW_SESSION],
      ],
    }
  );
```

Replace the first three tests with:

```ts
  it("names the App and adopts the Session cookies the API sends", async () => {
    fetchMock.mockResolvedValueOnce(signedIn());
    await expect(signInWithEmail(form())).resolves.toBeUndefined();
    expect(
      sentCookies().some((cookie) => cookie.startsWith(`${TOKEN}=fresh`))
    ).toBe(true);
    expect(call(0).headers.get("x-aof-app")).toBe(App.BACK_OFFICE);
    expect(call(0).headers.get("origin")).toBe("http://localhost:3400");
    expect(call(0).headers.get("x-forwarded-for")).toBe("1.2.3.4");
  });

  it("answers forbidden when the API refuses the App, and sets no cookie", async () => {
    fetchMock.mockResolvedValueOnce(refusedWith(403));
    await expect(signInWithEmail(form())).resolves.toBe(
      SIGN_IN_ERROR.FORBIDDEN
    );
    expect(sentCookies()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
```

(import `App` from `@allonfire/database/enums`; delete `SIGN_OUT_PATH`.)

`next-environment.test.ts`: remove every `AUTH_MIN_ROLE` stub and expectation, and add:

```ts
  it("no longer reads a floor from the env: APP_SETTINGS holds it", async () => {
    vi.stubEnv("AUTH_MIN_ROLE", undefined);
    const { nextAuthEnv } = await import("../next-environment");
    expect(nextAuthEnv).not.toHaveProperty("AUTH_MIN_ROLE");
  });
```

(match the file's existing stubs for the other variables; if its first test asserts the error names `nextAuthEnv.AUTH_MIN_ROLE`, drop that name from the expected list.)

`apps/back-office/src/environment/tests/environment.test.ts`: delete the `AUTH_MIN_ROLE` stub and the `Role` import.

- [x] **Step 2: Run to verify they fail**

Run: `pnpm --filter @allonfire/auth exec vitest run src/features/next src/environment`
Expected: FAIL — no `x-aof-app` sent; a 403 maps to `invalid`.

- [x] **Step 3: Implement**

`next-environment.ts`: delete the `AUTH_MIN_ROLE` entry and the `roleSchema` import.

`vitest.setup.ts`: delete the `AUTH_MIN_ROLE` line; import only `App`; `process.env.AUTH_APP ??= App.BACK_OFFICE;`.

`apps/back-office/.env.example`: delete `AUTH_MIN_ROLE="ADMIN"`.

`utils/access.ts`:

```ts
import {
  accessUserFrom,
  canEnterApp,
} from "@allonfire/database/features/auth/access/access";
import { nextAuthEnv } from "../../../environment/next-environment";

/** Whether a User, as the API sends it, is allowed into this App (`AUTH_APP`, its row in `APP_SETTINGS`). */
export const canAccess = (user: {
  memberships: readonly { app: string; role: string }[];
}) => canEnterApp(accessUserFrom(user), nextAuthEnv.AUTH_APP);
```

`utils/auth-client.ts`: replace `inferAdditionalFields` with `customSessionClient`:

```ts
import { customSessionClient } from "better-auth/client/plugins";
...
    plugins: [customSessionClient<Auth>()],
```

and its doc comment: `Typed from the server's config, Memberships included`.

`constants/api.ts`: `FORBIDDEN`'s comment becomes `/** The API refused: this User has no Membership in the App, or a Role under its floor. */`.

`utils/sign-in.ts`: delete `revoke`, `canAccess`, `setCookieToHeader`, `sessionHeaders`; import `APP_HEADER` from `../../../shared/constants/paths` and `nextAuthEnv`; `errorFor` gains the 403 arm; the body after parsing becomes:

```ts
/** Why the API refused, by its status. */
const errorFor = (status: number) => {
  if (status === HTTP_STATUS.FORBIDDEN) {
    return SIGN_IN_ERROR.FORBIDDEN;
  }
  if (status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return SIGN_IN_ERROR.RATE_LIMITED;
  }
  return status >= HTTP_STATUS.INTERNAL_SERVER_ERROR
    ? SIGN_IN_ERROR.UNAVAILABLE
    : SIGN_IN_ERROR.INVALID;
};

/**
 * Signs in through the API's Better Auth with the form's email and password,
 * naming this App: the API refuses anyone the App does not let in and opens
 * no Session for them. Someone let in gets the Session cookies on the App's
 * own response and no error back.
 */
export const signInWithEmail = async (
  formData: FormData
): Promise<SignInError | undefined> => {
  // ...the email/password checks stay as they are...
  const requestHeaders = new Headers(forwardedHeaders(await headers()));
  requestHeaders.set(APP_HEADER, nextAuthEnv.AUTH_APP);
  let setCookies: string[] = [];
  let signedIn: Awaited<ReturnType<ApiAuthClient["signIn"]["email"]>>;
  try {
    signedIn = await createApiAuthClient().signIn.email(credentials.data, {
      headers: requestHeaders,
      onResponse: (context) => {
        setCookies = context.response.headers.getSetCookie();
      },
    });
  } catch {
    return SIGN_IN_ERROR.UNAVAILABLE;
  }
  if (signedIn.error) {
    return errorFor(signedIn.error.status);
  }
  adoptSetCookies(await cookies(), setCookies);
  return undefined;
};
```

- [x] **Step 4: Run to verify they pass**

Run: `pnpm --filter @allonfire/auth test && pnpm --filter @allonfire/auth check-types && pnpm --filter @allonfire/back-office test`
Expected: PASS (`registration.integration.test.ts` needs Postgres up).

---

### Task 8: Image module — Admin in the Image's App

**Files:**
- Modify: `packages/storage/src/features/image/hono/routes/handlers.ts`
- Modify: `packages/storage/src/features/image/hono/utils/deps.ts`
- Modify: `packages/storage/src/features/image/hono/constants/schemas.ts`
- Modify: `packages/storage/src/features/image/constants/schemas.ts`
- Modify: `apps/api/src/index.ts`
- Test: `packages/storage/src/features/image/hono/tests/stub-image-deps.ts`
- Test: `packages/storage/src/features/image/hono/tests/write.test.ts`
- Test: `packages/storage/src/features/image/hono/tests/read.test.ts`
- Test: `apps/api/src/features/errors/tests/image-module.test.ts`

**Interfaces:**
- Consumes: `canEnterApp`, `canManageImage`, `AccessUser` (Task 2); `appsOfImages` (Task 4); `sessionFor`, `membershipsIn` (Task 5).
- Produces: `ImageDeps.appsOf: typeof appsOfImages`; write routes guarded by `requireSession()` plus per-App checks.

- [x] **Step 1: Write the failing tests**

`stub-image-deps.ts`: `App.LAURA` instead of `AllowedApp.LAURA` in `imageRecord`; add `appsOf: unexpected("appsOf"),` to `stubImageDeps`.

`write.test.ts`: import `App, Role` and `membershipsIn` from `@allonfire/auth/shared/tests/stub-auth`; replace the sessions:

```ts
const admin = sessionFor({ memberships: membershipsIn(Role.ADMIN) });
const user = sessionFor({ memberships: membershipsIn(Role.USER) });
/** An Admin of Laura only. */
const lauraAdmin = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.ADMIN }],
});
/** Every Image in these tests belongs to Laura unless a test says otherwise. */
const inLaura = (ids: readonly string[]) =>
  Promise.resolve(new Map(ids.map((id) => [id, App.LAURA])));
```

In `upload`, `app: App.LAURA`. Every existing PATCH/DELETE test passes `appsOf: inLaura` in its deps (the 404 tests pass `appsOf: () => Promise.reject(new ImageNotFoundError(["missing"]))` instead of stubbing `updateImages`/`deleteImages` to reject). `"updates a batch"` moves the Image to `App.BACK_OFFICE` with `admin`. Replace `"lets an ADMIN of any App write, not only the Back office's"` with:

```ts
  it("lets an Admin of the Image's App upload it", async () => {
    const res = await app(lauraAdmin, {
      createImages: async (images) => images.map((image) => imageRecord(image)),
      prepare: async () => PREPARED,
      putObject: async () => undefined,
    }).request(IMAGE_PATH, upload(1));
    expect(res.status).toBe(201);
  });

  it("refuses an upload for an App the User is no Admin of, preparing nothing", async () => {
    const prepare = vi.fn();
    const officeAdmin = sessionFor({
      memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
    });
    const res = await app(officeAdmin, { prepare }).request(IMAGE_PATH, upload(1));
    expect(res.status).toBe(403);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("refuses moving an Image into an App the User is no Admin of", async () => {
    const updateImages = vi.fn();
    const res = await app(lauraAdmin, { appsOf: inLaura, updateImages }).request(
      IMAGE_PATH,
      json("PATCH", [{ app: App.BACK_OFFICE, id: "image-1" }])
    );
    expect(res.status).toBe(403);
    expect(updateImages).not.toHaveBeenCalled();
  });

  it("writes nothing when one Image of the batch is outside the User's Apps", async () => {
    const deleteImages = vi.fn();
    const res = await app(lauraAdmin, {
      appsOf: async () =>
        new Map([
          ["image-1", App.LAURA],
          ["image-2", App.BACK_OFFICE],
        ]),
      deleteImages,
    }).request(IMAGE_PATH, json("DELETE", { ids: ["image-1", "image-2"] }));
    expect(res.status).toBe(403);
    expect(deleteImages).not.toHaveBeenCalled();
  });
```

(`"refuses a USER"` stays: a `USER` in every App is refused with 403.)

`read.test.ts`: `App` instead of `AllowedApp`; sessions:

```ts
const lauraUser = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.VIEWER }],
});
const otherAppUser = sessionFor({ memberships: [] });
```

`"lists the Back office's Images"` uses `sessionFor({ memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }] })`; `"refuses app=ALL with a validation problem"` keeps the literal `?app=ALL`; delete `"returns an ALL Image to any signed-in User"`; add:

```ts
  it("answers 403 to a Laura member under the Back office's floor", async () => {
    const res = await app(
      sessionFor({ memberships: [{ app: App.BACK_OFFICE, role: Role.USER }] }),
      {}
    ).request(`${IMAGE_PATH}?app=${App.BACK_OFFICE}`);
    expect(res.status).toBe(403);
  });
```

`apps/api/src/features/errors/tests/image-module.test.ts`: `App.LAURA` for `AllowedApp.LAURA`; `admin` becomes `sessionFor({ memberships: membershipsIn(Role.ADMIN) })`; add `appsOf` to its deps wherever it patches or deletes.

- [x] **Step 2: Run to verify they fail**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/image/hono`
Expected: FAIL — `appsOf` unknown; the Back office Admin's upload to Laura is accepted.

- [x] **Step 3: Implement**

`deps.ts`: import `appsOfImages` too and add `appsOf: typeof appsOfImages;` (doc: `/** Each Image's App, to check the caller manages it before writing. */`).

`constants/schemas.ts` (module root) and `hono/constants/schemas.ts`: `appSchema` everywhere `allowedAppSchema` was; `listQuerySchema`'s comment becomes `/** A caller lists one App's Images. */`.

`handlers.ts`: replace the `requireRole`/`Role`/`canSeeContent` imports with `import { type AccessUser, canEnterApp, canManageImage } from "@allonfire/database/features/auth/access/access";` and `import type { App } from "@allonfire/database/enums";`. Add beside `notFound`:

```ts
const forbidden = () =>
  new CodedError({
    code: IMAGE_ERROR_CODE.FORBIDDEN,
    status: HTTP_STATUS.FORBIDDEN,
  });

/** 403 unless the User is an Admin in every App named (ADR 0019). */
const assertManages = (user: AccessUser, apps: Iterable<App>) => {
  for (const app of apps) {
    if (!canManageImage(user, app)) {
      throw forbidden();
    }
  }
};
```

List: `if (!canEnterApp(c.get(AUTH_VAR.SESSION).user, query.app)) { throw forbidden(); }`. Get: `if (!(image && canEnterApp(c.get(AUTH_VAR.SESSION).user, image.app))) { throw notFound(); }`.

Upload: `requireSession()` instead of `requireRole(Role.ADMIN)`; right after `const items = parsed.data;`:

```ts
      assertManages(
        c.get(AUTH_VAR.SESSION).user,
        items.map(({ app }) => app)
      );
```

Patch:

```ts
export const patchHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    patchRoute,
    requireSession(),
    sValidator("json", patchBodySchema, throwOnInvalid),
    async (c) => {
      const changes = c.req.valid("json");
      const current = await deps
        .appsOf(changes.map(({ id }) => id))
        .catch(notFoundOnUnknownIds);
      // Moving an Image needs the Admin Role where it is and where it goes.
      assertManages(c.get(AUTH_VAR.SESSION).user, [
        ...current.values(),
        ...changes.flatMap(({ app }) => (app ? [app] : [])),
      ]);
      const images = await deps
        .updateImages(changes)
        .catch(notFoundOnUnknownIds);
      return c.json(images.map(toImageBody), HTTP_STATUS.OK);
    }
  );
```

Delete: `requireSession()`; first `const { ids } = c.req.valid("json"); const current = await deps.appsOf(ids).catch(notFoundOnUnknownIds); assertManages(c.get(AUTH_VAR.SESSION).user, current.values());`, then `deps.deleteImages(ids)` as before.

`apps/api/src/index.ts`: import `appsOfImages` with the other services and pass `appsOf: appsOfImages,` in the `images` deps.

- [x] **Step 4: Run to verify they pass**

Run: `pnpm --filter @allonfire/storage test && pnpm --filter @allonfire/storage check-types`
Expected: PASS.

---

### Task 9: API wiring and its integration test

**Files:**
- Modify: `apps/api/src/features/auth/auth.ts`
- Test: `apps/api/src/features/auth/tests/sign-in.integration.test.ts`
- Modify: `apps/api/README.md`

**Interfaces:**
- Consumes: `createAuth({ apps })` (Task 5), `requireApp` (Task 6), `APP_SETTINGS` (Task 2), `APP_HEADER` (Task 5).

- [x] **Step 1: Write the failing test**

In `sign-in.integration.test.ts`: import `requireApp` instead of `requireRole`, `App, Role` instead of `AllowedApp, Role`, and `APP_HEADER` from `@allonfire/auth/shared/constants/paths`. The probe route becomes:

```ts
const app = createApp(appDeps({ auth })).get(
  "/v1/back-office",
  requireApp(App.BACK_OFFICE),
  (c) => c.text("ok")
);
```

The seeded User:

```ts
  const user = await prisma.user.upsert({
    create: {
      email: EMAIL,
      emailVerified: true,
      memberships: { create: { app: App.LAURA, role: Role.VIEWER } },
      name: "Integration",
    },
    update: {},
    where: { email: EMAIL },
  });
```

`signIn(appName?: string)` adds `...(appName && { [APP_HEADER]: appName })` to its headers. Replace the tests after `signIn`:

```ts
describe("sign-in against Postgres", () => {
  it("returns a Session carrying the User's Memberships", async () => {
    const cookie = await signIn();
    const res = await app.request("/v1/auth/get-session", {
      headers: { cookie },
    });
    const body = z.object({ user: z.looseObject({}) }).parse(await res.json());
    expect(body.user).toMatchObject({
      email: EMAIL,
      memberships: [{ app: App.LAURA, role: Role.VIEWER }],
    });
  });

  it("refuses a Laura Viewer at requireApp(BACK_OFFICE)", async () => {
    const cookie = await signIn();
    const res = await app.request("/v1/back-office", { headers: { cookie } });
    expect(res.status).toBe(403);
  });

  it("refuses a sign-in naming the Back office, and opens no Session", async () => {
    await prisma.session.deleteMany({ where: { user: { email: EMAIL } } });
    const res = await app.request("/v1/auth/sign-in/email", {
      body: stringifyJson({ email: EMAIL, password: PASSWORD }),
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        [APP_HEADER]: App.BACK_OFFICE,
      },
      method: "POST",
    });
    expect(res.status).toBe(403);
    expect(await prisma.session.count({ where: { user: { email: EMAIL } } })).toBe(0);
  });

  it.each([
    ["for the Back office", { [APP_HEADER]: App.BACK_OFFICE }],
    ["naming no App", {}],
  ])("does not let a request create a User %s", async (_, appHeader) => {
    const res = await app.request("/v1/auth/sign-up/email", {
      body: stringifyJson({ email: SIGN_UP_EMAIL, name: "x", password: PASSWORD }),
      headers: { "content-type": "application/json", origin: ORIGIN, ...appHeader },
      method: "POST",
    });
    expect(res.status).toBe(403);
    expect(await prisma.user.count({ where: { email: SIGN_UP_EMAIL } })).toBe(0);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/api exec vitest run src/features/auth/tests/sign-in.integration.test.ts`
Expected: FAIL to compile — `createAuth` call in `auth.ts` lacks `apps`.

- [x] **Step 3: Implement**

`apps/api/src/features/auth/auth.ts`:

```ts
import { createAuth, toAuthLike } from "@allonfire/auth/features/server/auth";
import { APP_SETTINGS } from "@allonfire/database/features/auth/access/constants/app-settings";
...
  createAuth({
    apps: APP_SETTINGS,
    basePath: AUTH_BASE_PATH,
    ...
```

`apps/api/README.md`: line 48 `- **Sign-up is disabled.** Users come from the seed.` becomes `- **Registration is per App** (\`APP_SETTINGS\`, ADR 0019): \`/sign-up/email\` and \`/join-app\` need \`x-aof-app\` naming an App open to it, otherwise 403 \`REGISTRATION_CLOSED\`; every App is closed today. A sign-in with \`x-aof-app\` answers 403 \`APP_FORBIDDEN\` to a User that App does not let in.` Replace any `requireRole` example in the README with `requireApp(App.LAURA)`.

- [x] **Step 4: Run to verify it passes**

Run: `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types`
Expected: PASS (OpenAPI tests include Better Auth's new `/join-app` path; if a docs test lists paths exactly, add `/join-app` to it and ledger the ruling).

---

### Task 10: Docs and repo-wide gates

**Files:**
- Modify: `CLAUDE.md`
- Modify: `packages/auth/README.md`
- Modify: `packages/database/README.md`
- Modify: `packages/storage/README.md` (if it names `requireRole` or `ALL`)
- Modify: `.claude/skills/aof-design/SKILL.md`

- [x] **Step 1: Find every stale reference**

Run: `rg -n "AllowedApp|allowedApps|AUTH_MIN_ROLE|requireRole|AppPolicy|canSeeContent|Allowed apps|ALL\b" --glob '!**/node_modules/**' --glob '!apps/laura/**' --glob '!packages/*-old/**' --glob '!docs/superpowers/**' --glob '!docs/adr/000*' --glob '!docs/adr/001[0-8]*' --glob '!**/changesets/0000-*' --glob '!**/changesets/0001-*' .`
Expected: hits only in the files listed above and in code this plan already changed (fix any code hit as part of its owning task's area).

- [x] **Step 2: Rewrite the docs**

- `CLAUDE.md`, Database Schema Quick Reference:
  - `auth` bullet: ``User`, `Membership`, `Session`, `Account`, `Verification`, enums `Role`, `App``;
  - the access bullet: the schemas (`roleSchema`, `appSchema`, `App`), `ROLE_RANK`, `APP_SETTINGS` and `AppSettings` (`constants/app-settings`: each App's `minRole` and `registration`), `AccessUser`, and `hasRole`, `roleIn`, `canEnterApp(user, app)`, `canManageImage(user, app)`, `accessUserFrom`; "an App declares its floor and Registration only in `APP_SETTINGS`";
  - add: "Adding an App to `App`: its changeset also inserts an `ADMIN` Membership in it for every Back office Admin (`INSERT INTO auth."Membership" ("userId", app, role) SELECT "userId", '<new>', 'ADMIN' FROM auth."Membership" WHERE app = 'back-office' AND role = 'ADMIN'`), and the App gets its row in `APP_SETTINGS`."
  - Viewer Role System: "the API uses `requireApp(App.LAURA)`".
- `packages/auth/README.md`: an App sets `AUTH_APP`, `API_URL`, `API_AUTH_URL` (no `AUTH_MIN_ROLE`); `requireApp(app)` row; delete the `require-role` row; `canAccess` reads `APP_SETTINGS`; Registration, `/join-app`, `x-aof-app` and the two error codes; the mount example uses `requireApp(App.LAURA)`; "Sign-up is disabled" becomes the Registration sentence from Task 9.
- `packages/database/README.md`: the access row lists the new exports and `constants/app-settings`.
- `.claude/skills/aof-design/SKILL.md` (Auth is shared): "An App sets `AUTH_APP` in its env; its floor and Registration live in `APP_SETTINGS`".

- [x] **Step 3: Format and run every gate**

```bash
pnpm exec biome check --write <every file this plan touched>
pnpm check-types
pnpm lint
pnpm test
```

Expected: all green (Postgres up and migrated, Task 1). Run Biome per file if a multi-file call fails with "No such file or directory" (exFAT sidecars).

- [x] **Step 4: Check the Back office still signs in**

With the Local stack up, sign in to the Back office at `http://localhost:3400/en/sign-in` as the seeded admin (the user types the password; never type real credentials in an automated browser). Expected: home page. A Laura-only mock user (`laura-admin@allonfire.com`, dev seed) is refused with the "forbidden" message.

## Implementation Log
- Implemented: 2026-10-08T12:17:41Z
- Workspace: current-branch — feat/design-package
- Committed: no — awaiting user review
