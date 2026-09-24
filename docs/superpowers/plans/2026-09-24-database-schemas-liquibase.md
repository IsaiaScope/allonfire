# Database App Schemas + Liquibase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every table of the `allonfire` database out of `public` into the App schemas `auth` and `laura`, split `@allonfire/database` to match, and hand schema changes to a Liquibase changelog with per-release tags and rollback.

**Status:** implemented (uncommitted) @ 2026-09-24T10:07:48Z — Tasks 1-6 done; Task 7 (Production cutover) is manual and runs after merge

**Architecture:** Prisma keeps modelling the tables (multi-file schema, `multiSchema`, one client) and drafts SQL with `prisma migrate diff`; Liquibase formatted-SQL changesets own what reaches a database. One Docker image (`liquibase/liquibase:5.0` + PostgreSQL driver + changelog) runs everywhere: `scripts/liquibase.sh` locally and in CI, a one-shot `db-migrate` compose service in Production after a `db-backup` dump. The move itself is changeset `0001`, a set of `ALTER ... SET SCHEMA` renames, so no row is copied.

**Tech Stack:** Prisma 6.19 (`prisma-client` generator), Liquibase 5.0 (Docker only), PostgreSQL 16, Vitest 4, bash, docker compose, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-24-database-schemas-liquibase-design.md`. Decisions are recorded in `docs/adr/0007-one-postgres-schema-per-app.md` and `docs/adr/0008-liquibase-owns-the-changelog.md`.

## Global Constraints

- Schemas: `auth` (User, Session, Account, Verification, enum Role) and `laura` (Photo, Favorite, GameScore, QuizQuestion, QuizAnswer, enum GameType). `public` holds only Liquibase's two tables.
- Table, column, index and constraint names do not change. Models move unchanged.
- Liquibase runs only in Docker from `liquibase/liquibase:5.0`. No Java on the host, the Mac or the CI runner.
- Changeset author is `isaia`; changeset ids are `NNNN-<kebab-name>`, the file name without `.sql`.
- A changeset that has reached any shared database is never edited again (Liquibase checksums it). Fix forward with a new changeset.
- `prisma db push` and `prisma migrate` are not used anywhere after Task 1.
- No new npm dependencies.
- Never add a `biome-ignore` comment. Format with `pnpm exec biome format --write <files>`, never `biome check --write`.
- Never call `Object.keys` / `values` / `entries` / `fromEntries`; use `@allonfire/utils/object`.
- Do not commit. The user commits with `/iso-commit`. Each task ends with its verification, not a commit.
- Tests that touch a database need Docker and the dev Postgres running (`pnpm docker:up`).

## Review Focus

1. **A `DATABASE_URL` with a percent-encoded password or query parameters** (`?schema=public`, `sslmode=require`): Liquibase must connect with the same credentials Prisma uses, and `pg_dump` must not choke on Prisma's `schema=` parameter. Pinned by `tests/jdbc-url.test.ts` (Task 1) and the `db-backup` URL cut (Task 5).
2. **A database that already holds the tables and real rows** (Production, every existing local database): the baseline must be recorded as ran without executing, and every row must still be there after the move. Pinned by the "already has the tables" suite in `tests/changelog.test.ts` (Tasks 1 and 2).
3. **Raw SQL naming tables without a schema** (`FROM "Photo"`): typecheck cannot see it, and after the move it fails only at runtime. Pinned by `tests/raw-sql.test.ts` (Task 2).
4. **A deploy that applies no changeset**: `liquibase tag` rewrites the newest changelog row, so tagging it would erase the previous release's tag and break `rollback --tag`. Pinned by the "deploy" suite (Task 5).
5. **`pnpm db:changeset` when the schema has not changed**, or with a badly formed name: it must refuse instead of writing an empty or misnamed changeset. Pinned by `tests/changeset-file.test.ts` (Task 3) and the CLI guard.

## Deviations during implementation

Recorded as they happened; the tasks below keep their original text.

- **exFAT working copy.** The repo sits on an exFAT volume: no Unix owners, and macOS writes AppleDouble `._*` files BuildKit cannot read. The image copies with `COPY --chmod=0555`, and `scripts/liquibase.sh` builds from a staged copy without `._*` files.
- **Hardening (user request: follow Docker and Liquibase guidance).** Base image pinned by digest (`liquibase/liquibase:5.0.4@sha256:060f…`), driver pinned (`postgresql@42.7.8`, checksum-verified by lpm), OCI labels, `# check=error=true` build checks, explicit `USER`, exec-form `ENTRYPOINT` with a safe `CMD` (`status --verbose`), static settings as `ENV` (`LIQUIBASE_STRICT=true`, `LIQUIBASE_DUPLICATE_FILE_MODE=ERROR`, lock wait 5 min, analytics off). Every changeset sets `logicalFilePath`; the root changelog sets `endsWithFilter` and `errorIfMissingOrEmpty`. Sessions run with `lock_timeout=10s`. `deploy` relies on `update` validating first (a separate `validate` was dropped in review: one more JVM start for nothing).
- **Credentials out of URLs.** `liquibase/jdbc-url.sh` became `liquibase/database-url.sh` (`jdbc_url`, `libpq_url`, `url_user`, `url_password`): Liquibase gets `LIQUIBASE_COMMAND_USERNAME/PASSWORD`, pg_dump gets `PGPASSWORD`, and `scripts/liquibase.sh` passes `DATABASE_URL` to docker by name, never on a command line.
- **Backup inside the image.** `db-backup` no longer runs `postgres:16-alpine` with the URL in argv: the db-migrate image installs `postgresql-client-16` and its entrypoint gains `backup` (dump to `.partial`, verify with `pg_restore --list`, rename, keep newest `BACKUP_KEEP`, mode 0600 in a 0700 dir). Both compose services share one hardened block (`read_only`, `cap_drop: ALL`, `no-new-privileges`, `init`, tmpfs `/tmp`); `db-migrate` gets `stop_grace_period: 5m`.
- **Test layout follows `apps/api`.** No `tests/helpers/`: the helper is `tests/throwaway-db.ts`; tests that need Docker or Postgres are `*.integration.test.ts`. New `tests/backup.integration.test.ts`.
- **Turbo test inputs** now include `tests/`, `scripts/`, `changelog/`, `liquibase/` and `prisma/schema/**`; they pointed at the deleted `schema.prisma`, so a changeset alone replayed a cached pass.
- **CI** gains ShellCheck and `docker build --check`; `.github/dependabot.yml` bumps the pinned base image.
- **Biome pass on touched files (user request).** Safe fixes applied (sorted keys, `Boolean()` over `!!`). Hand fixes: `i++` to `i += 1`, `== null` to `=== null`, sequential seed loops as the `reduce` chain `apps/api/src/shutdown.ts` uses, a shadowed `seed` renamed. `NODE_ENV` is validated in `packages/database/src/env.ts` (with `tests/env.test.ts`), so `client.ts` no longer reads `process.env`. `apps/laura/.../actions/quiz.ts` (531 lines, limit 300) split into `quiz.ts` (play), `quiz-admin.ts` (question CRUD) and `quiz-form.ts` (plain helpers kept out of `"use server"`).
- **Package layout (user request).** Environment modules live in `src/environment/` (`environment.ts`, was `src/env.ts`; `seed-environment.ts`, was `src/seed-env.ts`) with `tests/`. Seed scripts live in `src/seed/`, their data in `src/seed/mock/` (`users.json`, was `seed-data/users.json`; `quiz-questions.ts`, split out of `seed-quiz.ts`). Tests sit beside what they test: `src/environment/tests/`, `src/laura/tests/`, `liquibase/tests/` (with `throwaway-db.ts`), `scripts/tests/`; the package-root `tests/` is gone. Biome's long-file override gains `**/mock/**`. The `@allonfire/database/env` export path is unchanged.
- **Shared `NODE_ENV` (user request).** `NODE_ENV`, `nodeEnvSchema` and `NodeEnv` live in `packages/utils/src/constants/node-env.ts` (export `@allonfire/utils/constants/node-env`); `@allonfire/utils` gains `zod` (^4.3.6, resolved 4.3.6 like the rest of the repo) and `@allonfire/database` depends on `@allonfire/utils`. The API's copy in `shared/constants/runtime.ts` is gone; its three users import from utils directly. `@allonfire/utils/environment` validates `NODE_ENV` once (default development): `@allonfire/database`'s env `extends` it (and Laura through `dbEnv`); the API's `parseEnv(raw)` spreads `runtimeEnvSchema` into `server`, since an extended env reads process.env rather than the record under test. Utils gains `@t3-oss/env-core` (^0.13.10) and `@types/node` with `"types": ["node"]`. `DATABASE_URL` is declared once, as `databaseEnvSchema` in `@allonfire/database/env`, which the API spreads. utils and database gain a `check-types` script, so turbo typechecks them.
- **Node types, repo-wide (user request).** New preset `packages/config/typescript/node.json` (base + `lib: ES2022`, `noEmit`, `types: ["node"]`); `nextjs.json` also lists `types: ["node"]`; `library.json`, whose `outDir`/`rootDir: "src"` resolved against the config folder and broke `packages/storage` (TS6059), is deleted: the packages that extended it (database, storage) now extend `node.json`, as does utils. `apps/api` extends `node.json`. Every package has `check-types` (8 in `pnpm check-types`, was 2). Includes now cover tooling files (`vitest.config.ts`, `vitest.setup.ts`, `next.config.ts`, Laura's `scripts/`). `@types/node` stays a root devDependency only.
- **TypeScript 6.0 and the strictest base (user request).** `typescript` ~5.8.2 to ~6.0.3 everywhere (7.0 waits: no JS API yet, which Next.js 16.1 and its editor plugin need). `base.json` adds `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `allowUnreachableCode: false`, `allowUnusedLabels: false`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUncheckedSideEffectImports`, `moduleDetection: force`, `noEmit`; drops `declaration`/`declarationMap`/`sourceMap`/`incremental` (nothing emits with tsc; `declaration` raised TS4094 on Prisma's generated code under 6.0). `noPropertyAccessFromIndexSignature` left out: it contradicts Biome's `useLiteralKeys`. Laura's deprecated `baseUrl` removed. 16 errors fixed: optional inputs that callers fill with `undefined` say `?: T | undefined`; nullable Prisma columns get `?? null`; `updateQuizQuestion` spreads only the fields present; `lib/blur-placeholder.ts` for `next/image`; `types/css.d.ts` for stylesheet imports; the API's `StandardIssue.path` now matches the Standard Schema spec.

---

### Task 1: Liquibase image, local wrapper and baseline changeset

Replaces `prisma db push` with `liquibase update` everywhere, while the tables still sit in `public`.

**Files:**
- Create: `packages/database/liquibase/Dockerfile`
- Create: `packages/database/liquibase/Dockerfile.dockerignore`
- Create: `packages/database/liquibase/jdbc-url.sh`
- Create: `packages/database/liquibase/entrypoint.sh`
- Create: `packages/database/changelog/db.changelog-master.yaml`
- Create: `packages/database/changelog/changesets/0000-baseline.sql`
- Create: `packages/database/scripts/liquibase.sh`
- Create: `packages/database/tests/jdbc-url.test.ts`
- Create: `packages/database/tests/helpers/throwaway-db.ts`
- Create: `packages/database/tests/changelog.test.ts`
- Modify: `packages/database/package.json` (scripts)
- Modify: `packages/database/tsconfig.json` (include `tests`, `scripts`)
- Modify: `package.json` (root scripts)
- Modify: `turbo.json:57-59` (drop the `db:push` task)
- Modify: `.github/workflows/ci.yml:84-85` (schema step)

**Interfaces:**
- Produces: `jdbc_url <postgres-url>` bash function in `liquibase/jdbc-url.sh`, printing `jdbc:postgresql://<host>[:port]/<db>?user=<u>[&password=<p>][&<other params>]`.
- Produces: `bash scripts/liquibase.sh <liquibase args...>`, run from `packages/database`, reading `DATABASE_URL` (or `packages/database/.env`).
- Produces: image entrypoint that turns `DATABASE_URL` into Liquibase settings and runs `liquibase "$@"`.
- Produces, in `tests/helpers/throwaway-db.ts`: `PACKAGE_DIR: string`, `throwawayUrl(database: string): string`, `recreateDatabase(database: string): Promise<void>`, `dropDatabase(database: string): Promise<void>`, `liquibase(url: string, ...args: string[]): string`, `clientFor(url: string): PrismaClient`, `tablesIn(client: PrismaClient, schema: string): Promise<string[]>`, `executeFile(url: string, file: string): void`.
- Produces: changeset id `0000-baseline`.

- [x] **Step 1: Write the failing `jdbc_url` test**

`packages/database/tests/jdbc-url.test.ts`:

```ts
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = resolve(import.meta.dirname, "../liquibase/jdbc-url.sh");
const CALL = `source "${SCRIPT}"; jdbc_url "$1"`;

function jdbcUrl(url: string): string {
  return execFileSync("bash", ["-c", CALL, "jdbc-url", url], {
    encoding: "utf8",
  }).trim();
}

describe("jdbc_url", () => {
  it("moves user and password into the query string", () => {
    expect(
      jdbcUrl("postgresql://allonfire:allonfire@localhost:5432/allonfire")
    ).toBe(
      "jdbc:postgresql://localhost:5432/allonfire?user=allonfire&password=allonfire"
    );
  });

  it("keeps a percent-encoded password encoded for pgJDBC to decode", () => {
    expect(jdbcUrl("postgresql://app:p%40ss%2Fw0rd@db:5432/allonfire")).toBe(
      "jdbc:postgresql://db:5432/allonfire?user=app&password=p%40ss%2Fw0rd"
    );
  });

  it("accepts the postgres scheme and a host without a port", () => {
    expect(jdbcUrl("postgres://app:secret@dokploy-postgres/allonfire")).toBe(
      "jdbc:postgresql://dokploy-postgres/allonfire?user=app&password=secret"
    );
  });

  it("drops Prisma's schema parameter and keeps the others", () => {
    expect(
      jdbcUrl(
        "postgresql://app:secret@db:5432/allonfire?schema=public&sslmode=require"
      )
    ).toBe(
      "jdbc:postgresql://db:5432/allonfire?user=app&password=secret&sslmode=require"
    );
  });

  it("omits the password when the URL has none", () => {
    expect(jdbcUrl("postgresql://app@db:5432/allonfire")).toBe(
      "jdbc:postgresql://db:5432/allonfire?user=app"
    );
  });

  it("fails on a URL it cannot parse without echoing it", () => {
    const result = spawnSync(
      "bash",
      ["-c", CALL, "jdbc-url", "mysql://app:hunter2@db/allonfire"],
      { encoding: "utf8" }
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).not.toContain("hunter2");
  });
});
```

- [x] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @allonfire/database exec vitest run tests/jdbc-url.test.ts`
Expected: FAIL, bash reports `jdbc-url.sh: No such file or directory`.

- [x] **Step 3: Write `jdbc-url.sh`**

`packages/database/liquibase/jdbc-url.sh` (sourced, not executed; must also run on macOS bash 3.2 for the test):

```bash
# jdbc_url <postgres-url>: prints the JDBC URL Liquibase needs for a
# postgres:// URL. User and password move into the query string still
# percent-encoded, which pgJDBC decodes. Prisma's `schema` parameter is dropped
# because pgJDBC does not know it. The URL is never echoed: it holds a password.
jdbc_url() {
  local re='^postgres(ql)?://([^:@/]+)(:([^@/]*))?@([^/?]+)/([^?]+)(\?(.*))?$'
  if [[ ! "$1" =~ $re ]]; then
    echo "jdbc_url: DATABASE_URL is not a postgres:// URL" >&2
    return 1
  fi
  local user="${BASH_REMATCH[2]}" password="${BASH_REMATCH[4]}"
  local host="${BASH_REMATCH[5]}" database="${BASH_REMATCH[6]}"
  local query="${BASH_REMATCH[8]}"
  local params="user=${user}" pair
  if [[ -n "$password" ]]; then
    params+="&password=${password}"
  fi
  for pair in ${query//&/ }; do
    if [[ "$pair" != schema=* ]]; then
      params+="&${pair}"
    fi
  done
  printf 'jdbc:postgresql://%s/%s?%s\n' "$host" "$database" "$params"
}
```

- [x] **Step 4: Run the test and watch it pass**

Run: `pnpm --filter @allonfire/database exec vitest run tests/jdbc-url.test.ts`
Expected: PASS, 6 tests.

- [x] **Step 5: Write the database test helpers**

`packages/database/tests/helpers/throwaway-db.ts`:

```ts
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient } from "../../generated/prisma/client";

export const PACKAGE_DIR = resolve(import.meta.dirname, "../..");

const LIQUIBASE_TABLE = /^databasechangelog/;

function baseUrl(): URL {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return new URL(url);
}

/** The dev/CI server's URL, pointed at another database on it. */
export function throwawayUrl(database: string): string {
  const url = baseUrl();
  url.pathname = `/${database}`;
  url.search = "";
  return url.toString();
}

async function onServer(sql: string): Promise<void> {
  const admin = new PrismaClient();
  try {
    await admin.$executeRawUnsafe(sql);
  } finally {
    await admin.$disconnect();
  }
}

export async function dropDatabase(database: string): Promise<void> {
  await onServer(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
}

export async function recreateDatabase(database: string): Promise<void> {
  await dropDatabase(database);
  await onServer(`CREATE DATABASE "${database}"`);
}

/** Runs the db-migrate image against `url`; returns its stdout. */
export function liquibase(url: string, ...args: string[]): string {
  return execFileSync("bash", ["scripts/liquibase.sh", ...args], {
    cwd: PACKAGE_DIR,
    env: { ...process.env, DATABASE_URL: url },
    encoding: "utf8",
  });
}

/** Runs a SQL file the way `prisma db push` would have left a database. */
export function executeFile(url: string, file: string): void {
  execFileSync(
    "pnpm",
    ["exec", "prisma", "db", "execute", "--file", file, "--url", url],
    { cwd: PACKAGE_DIR, encoding: "utf8" }
  );
}

export function clientFor(url: string): PrismaClient {
  return new PrismaClient({ datasourceUrl: url });
}

/** Tables in `schema`, sorted, without Liquibase's own two. */
export async function tablesIn(
  client: PrismaClient,
  schema: string
): Promise<string[]> {
  const rows = await client.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = ${schema}
  `;
  return rows
    .map((row) => row.table_name)
    .filter((name) => !LIQUIBASE_TABLE.test(name))
    .sort();
}
```

- [x] **Step 6: Write the failing changelog test**

`packages/database/tests/changelog.test.ts`:

```ts
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";
import {
  clientFor,
  dropDatabase,
  executeFile,
  liquibase,
  PACKAGE_DIR,
  recreateDatabase,
  tablesIn,
  throwawayUrl,
} from "./helpers/throwaway-db";

// Liquibase runs in Docker; the first build pulls the image.
const DOCKER_TIMEOUT = 300_000;

const AUTH_TABLES = ["Account", "Session", "User", "Verification"];
const LAURA_TABLES = [
  "Favorite",
  "GameScore",
  "Photo",
  "QuizAnswer",
  "QuizQuestion",
];
const ALL_TABLES = [...AUTH_TABLES, ...LAURA_TABLES].sort();

const BASELINE = resolve(PACKAGE_DIR, "changelog/changesets/0000-baseline.sql");
const EXISTING_USER = "existing-user";

describe("changelog on an empty database", () => {
  const database = "allonfire_changelog_fresh";
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    client = clientFor(url);
    liquibase(url, "update");
  }, DOCKER_TIMEOUT);

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  it("creates every table", async () => {
    expect(await tablesIn(client, "public")).toEqual(ALL_TABLES);
  });
});

describe("changelog on a database that already has the tables", () => {
  // Production and every existing local database: built by prisma db push.
  const database = "allonfire_changelog_existing";
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    executeFile(url, BASELINE);
    client = clientFor(url);
    await client.$executeRaw`
      INSERT INTO public."User" (id, email, "updatedAt")
      VALUES (${EXISTING_USER}, 'existing@allonfire.test', now())
    `;
    liquibase(url, "update");
  }, DOCKER_TIMEOUT);

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  it("records the baseline as ran without executing it", async () => {
    const rows = await client.$queryRaw<{ exectype: string }[]>`
      SELECT exectype FROM public.databasechangelog WHERE id = '0000-baseline'
    `;
    expect(rows).toEqual([{ exectype: "MARK_RAN" }]);
  });

  it("keeps existing rows", async () => {
    const rows = await client.$queryRaw<{ id: string }[]>`
      SELECT id FROM public."User"
    `;
    expect(rows).toEqual([{ id: EXISTING_USER }]);
  });
});
```

- [x] **Step 7: Run it and watch it fail**

Run: `pnpm docker:up && pnpm --filter @allonfire/database exec vitest run tests/changelog.test.ts`
Expected: FAIL in `beforeAll`, bash reports `scripts/liquibase.sh: No such file or directory`.

- [x] **Step 8: Check the base image and the binary path**

Run: `docker pull liquibase/liquibase:5.0 && docker run --rm --entrypoint bash liquibase/liquibase:5.0 -c 'command -v liquibase lpm && liquibase --version'`
Expected: two paths under `/liquibase` and a `Liquibase Version: 5.0.x` line. If `5.0` does not exist as a tag, use the newest `5.0.<n>` from `https://hub.docker.com/r/liquibase/liquibase/tags` in every place this plan names the image.

- [x] **Step 9: Write the image**

`packages/database/liquibase/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1
# The db-migrate image: Liquibase, the PostgreSQL driver and the changelog.
# Build context is the repo root, because the root package.json carries the
# release version the deploy tags. Dockerfile.dockerignore limits the context.
FROM liquibase/liquibase:5.0
# Liquibase 5 ships without JDBC drivers.
RUN lpm add postgresql --global
COPY package.json /liquibase/release/package.json
COPY packages/database/changelog/ /liquibase/changelog/
COPY packages/database/liquibase/jdbc-url.sh packages/database/liquibase/entrypoint.sh /liquibase/scripts/
ENTRYPOINT ["bash", "/liquibase/scripts/entrypoint.sh"]
```

`packages/database/liquibase/Dockerfile.dockerignore` (BuildKit reads it instead of the root `.dockerignore` for this Dockerfile, so the context stays a few kilobytes):

```
*
!package.json
!packages/database/changelog
!packages/database/liquibase
```

`packages/database/liquibase/entrypoint.sh`:

```bash
#!/usr/bin/env bash
# Runs Liquibase against DATABASE_URL. Every argument goes to liquibase.
set -euo pipefail

# shellcheck source=jdbc-url.sh
source /liquibase/scripts/jdbc-url.sh

: "${DATABASE_URL:?DATABASE_URL is not set}"
LIQUIBASE_COMMAND_URL="$(jdbc_url "$DATABASE_URL")"
export LIQUIBASE_COMMAND_URL
export LIQUIBASE_COMMAND_CHANGELOG_FILE=db.changelog-master.yaml
export LIQUIBASE_SEARCH_PATH=/liquibase/changelog
# ADR 0006 keeps usage data on our own machines; Liquibase reports by default.
export LIQUIBASE_ANALYTICS_ENABLED=false
export LIQUIBASE_SHOW_BANNER=false

exec liquibase "$@"
```

- [x] **Step 10: Write the local wrapper**

`packages/database/scripts/liquibase.sh`:

```bash
#!/usr/bin/env bash
# Builds the db-migrate image Production runs and runs it against the local
# DATABASE_URL, so Local, CI and Production share one Liquibase. Arguments go
# to liquibase: `bash scripts/liquibase.sh update`, `... status --verbose`.
set -euo pipefail

package_dir="$(cd "$(dirname "$0")/.." && pwd)"
repo_root="$(cd "$package_dir/../.." && pwd)"

if [[ -z "${DATABASE_URL:-}" && -f "$package_dir/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$package_dir/.env"
  set +a
fi
: "${DATABASE_URL:?DATABASE_URL is not set}"

# Inside the container, localhost is the container itself.
url="$(sed -E 's#@(localhost|127\.0\.0\.1)([:/])#@host.docker.internal\2#' <<<"$DATABASE_URL")"

docker build --quiet --tag allonfire-db-migrate \
  --file "$package_dir/liquibase/Dockerfile" "$repo_root" >/dev/null
exec docker run --rm --add-host=host.docker.internal:host-gateway \
  --env DATABASE_URL="$url" allonfire-db-migrate "$@"
```

- [x] **Step 11: Write the changelog root and the baseline**

`packages/database/changelog/db.changelog-master.yaml`:

```yaml
# Every changeset lives in changesets/ as Liquibase formatted SQL and runs in
# file-name order, so the four-digit prefix is the order.
databaseChangeLog:
  - includeAll:
      path: changesets/
      relativeToChangelogFile: true
```

Generate the baseline from the current single-file schema (run in `packages/database`):

```bash
{
  printf '%s\n' \
    '--liquibase formatted sql' \
    '' \
    '--changeset isaia:0000-baseline' \
    '--preconditions onFail:MARK_RAN' \
    "--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User'" \
    '--comment: The tables as prisma db push left them. Where they already exist (Production, older local databases) this is recorded as ran without executing. No rollback: rolling back past the baseline must fail, not drop every table.'
  pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
} > changelog/changesets/0000-baseline.sql
```

Open the file and check: 2 `CREATE TYPE` (Role, GameType), 9 `CREATE TABLE`, their indexes, and the foreign keys, all unqualified (so they land in `public`). No `--rollback` line.

- [x] **Step 12: Run the changelog test and watch it pass**

Run: `pnpm --filter @allonfire/database exec vitest run tests/changelog.test.ts`
Expected: PASS, 3 tests. The first run builds the image, which pulls `liquibase/liquibase:5.0` and downloads the driver.

- [x] **Step 13: Wire the scripts**

`packages/database/package.json`, `scripts` becomes:

```json
"scripts": {
  "db:generate": "prisma generate",
  "db:update": "bash scripts/liquibase.sh update",
  "db:status": "bash scripts/liquibase.sh status --verbose",
  "db:rollback": "bash scripts/liquibase.sh rollback",
  "db:seed": "tsx --env-file=.env src/seed.ts",
  "db:seed-quiz": "tsx --env-file=.env src/seed-quiz.ts",
  "db:studio": "prisma studio",
  "test": "vitest run"
}
```

(`db:migrate` and `db:push` are gone. `db:rollback` takes Liquibase's flag: `pnpm db:rollback --tag=v0.2.0`.)

`packages/database/tsconfig.json`: `"include": ["src", "generated", "scripts", "tests"]`.

Root `package.json` scripts: replace `"db:push"` with

```json
"db:update": "pnpm --filter @allonfire/database db:update",
"db:status": "pnpm --filter @allonfire/database db:status",
"db:rollback": "pnpm --filter @allonfire/database db:rollback",
```

and set `"dev:setup": "pnpm docker:up && pnpm db:generate && pnpm db:update && pnpm db:seed"`.

`turbo.json`: delete the `"db:push": { "cache": false }` entry (lines 57-59) and the comma before it.

`.github/workflows/ci.yml` lines 84-85 become:

```yaml
      - name: Apply the changelog
        run: pnpm db:update
```

- [x] **Step 14: Run the database tests and watch them pass**

Run: `pnpm --filter @allonfire/database test`
Expected: PASS, `jdbc_url` 6 tests and `changelog` 3 tests.

- [x] **Step 15: Adopt the local dev database**

Run: `pnpm db:update && pnpm db:status`
Expected: update logs `0000-baseline` marked ran (your local tables already exist); status reports the database up to date.

- [x] **Step 16: Typecheck, lint, format**

Run: `pnpm exec biome format --write packages/database/tests packages/database/package.json packages/database/tsconfig.json package.json turbo.json && pnpm check-types && pnpm check`
Expected: no errors.

---

### Task 2: Move the tables into `auth` and `laura`

**Files:**
- Delete: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/schema/schema.prisma`
- Create: `packages/database/prisma/schema/auth.prisma`
- Create: `packages/database/prisma/schema/laura.prisma`
- Create: `packages/database/changelog/changesets/0001-auth-laura-schemas.sql`
- Create: `packages/database/tests/raw-sql.test.ts`
- Modify: `packages/database/tests/changelog.test.ts`
- Modify: `packages/database/src/services/photo.service.ts:69,85,105`
- Modify: `packages/database/src/services/quiz.service.ts:61`
- Modify: `packages/database/package.json` (`prisma.schema`, `db:drift`)
- Modify: `package.json` (root `db:drift`)
- Modify: `.github/workflows/ci.yml` (drift step)

**Interfaces:**
- Consumes: every helper from Task 1's `tests/helpers/throwaway-db.ts`; `liquibase(url, ...args)`.
- Produces: changeset id `0001-auth-laura-schemas`; `pnpm db:drift` (exit 0 when the database matches `prisma/schema`, 2 when it does not).
- Produces: Prisma schema folder `packages/database/prisma/schema`, configured via `"prisma": { "schema": "prisma/schema" }` in `packages/database/package.json`.

- [x] **Step 1: Pin the raw SQL before touching it**

`packages/database/tests/raw-sql.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/index";
import {
  getAllRandomPhotos,
  getPhotoCount,
  getRandomPhotos,
  getUserPhotoCount,
} from "../src/services/photo.service";
import { getRandomQuizQuestions } from "../src/services/quiz.service";

// Runs against DATABASE_URL (the dev database locally, CI's fresh one there).
// Every row hangs off USER_ID and goes with it.
const USER_ID = "raw-sql-test-user";
// Random photos dedupe on the first 6 characters of the blurHash.
const BLUR_HASH = "Zq9rawSQLtest";

let photoId = "";
let questionId = "";

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.user.create({
    data: { id: USER_ID, email: "raw-sql-test@allonfire.test" },
  });
  const photo = await prisma.photo.create({
    data: {
      url: "raw-sql-test.jpg",
      thumbnailUrl: "raw-sql-test-thumb.jpg",
      width: 1,
      height: 1,
      blurHash: BLUR_HASH,
      uploadedBy: USER_ID,
    },
  });
  photoId = photo.id;
  const question = await prisma.quizQuestion.create({
    data: { text: "Does raw SQL find this?", createdBy: USER_ID },
  });
  questionId = question.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

describe("services that run raw SQL", () => {
  it("getRandomPhotos reads the user's photos", async () => {
    const photos = await getRandomPhotos(USER_ID, 5);
    expect(photos.map((photo) => photo.id)).toEqual([photoId]);
  });

  it("getAllRandomPhotos reads every user's photos", async () => {
    const photos = await getAllRandomPhotos(await getPhotoCount());
    expect(photos.map((photo) => photo.id)).toContain(photoId);
  });

  it("getUserPhotoCount counts the user's distinct photos", async () => {
    expect(await getUserPhotoCount(USER_ID)).toBe(1);
  });

  it("getRandomQuizQuestions reads the questions", async () => {
    const questions = await getRandomQuizQuestions(
      await prisma.quizQuestion.count()
    );
    expect(questions.map((question) => question.id)).toContain(questionId);
  });
});
```

Run: `pnpm --filter @allonfire/database exec vitest run tests/raw-sql.test.ts`
Expected: PASS (4 tests). This pins today's behaviour; it goes red in Step 6.

- [x] **Step 2: Make the changelog test expect the App schemas**

In `tests/changelog.test.ts`:

In "changelog on an empty database", replace the `creates every table` test with:

```ts
  it("puts the auth tables in auth", async () => {
    expect(await tablesIn(client, "auth")).toEqual(AUTH_TABLES);
  });

  it("puts the laura tables in laura", async () => {
    expect(await tablesIn(client, "laura")).toEqual(LAURA_TABLES);
  });

  it("leaves nothing of ours in public", async () => {
    expect(await tablesIn(client, "public")).toEqual([]);
  });
```

In "changelog on a database that already has the tables", change the `keeps existing rows` query to `SELECT id FROM auth."User"` and add:

```ts
  it("applies the schema move", async () => {
    const rows = await client.$queryRaw<{ exectype: string }[]>`
      SELECT exectype FROM public.databasechangelog
      WHERE id = '0001-auth-laura-schemas'
    `;
    expect(rows).toEqual([{ exectype: "EXECUTED" }]);
  });
```

Append a new suite:

```ts
describe("rolling back the schema move", () => {
  const database = "allonfire_changelog_rollback";
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    client = clientFor(url);
    liquibase(url, "update");
  }, DOCKER_TIMEOUT);

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  it(
    "puts every table back in public and drops the App schemas",
    async () => {
      liquibase(url, "rollback-count", "--count=1");
      expect(await tablesIn(client, "public")).toEqual(ALL_TABLES);
      const schemas = await client.$queryRaw<{ schema_name: string }[]>`
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name IN ('auth', 'laura')
      `;
      expect(schemas).toEqual([]);
    },
    DOCKER_TIMEOUT
  );

  it(
    "moves them again on the next update",
    async () => {
      liquibase(url, "update");
      expect(await tablesIn(client, "auth")).toEqual(AUTH_TABLES);
      expect(await tablesIn(client, "laura")).toEqual(LAURA_TABLES);
    },
    DOCKER_TIMEOUT
  );
});
```

- [x] **Step 3: Run it and watch it fail**

Run: `pnpm --filter @allonfire/database exec vitest run tests/changelog.test.ts`
Expected: FAIL. `puts the auth tables in auth` gets `[]`, and the rollback suite fails because there is no changeset to roll back past the baseline (`No inverse to liquibase.change.core.RawSQLChange`).

- [x] **Step 4: Write the schema move changeset**

`packages/database/changelog/changesets/0001-auth-laura-schemas.sql`:

```sql
--liquibase formatted sql

--changeset isaia:0001-auth-laura-schemas
--comment: Moves every table into its App schema (ADR 0007). SET SCHEMA renames in the catalogue: rows, indexes, constraints and foreign keys go with the table.
CREATE SCHEMA auth;
CREATE SCHEMA laura;
ALTER TABLE public."User" SET SCHEMA auth;
ALTER TABLE public."Session" SET SCHEMA auth;
ALTER TABLE public."Account" SET SCHEMA auth;
ALTER TABLE public."Verification" SET SCHEMA auth;
ALTER TYPE public."Role" SET SCHEMA auth;
ALTER TABLE public."Photo" SET SCHEMA laura;
ALTER TABLE public."Favorite" SET SCHEMA laura;
ALTER TABLE public."GameScore" SET SCHEMA laura;
ALTER TABLE public."QuizQuestion" SET SCHEMA laura;
ALTER TABLE public."QuizAnswer" SET SCHEMA laura;
ALTER TYPE public."GameType" SET SCHEMA laura;
--rollback ALTER TYPE laura."GameType" SET SCHEMA public;
--rollback ALTER TABLE laura."QuizAnswer" SET SCHEMA public;
--rollback ALTER TABLE laura."QuizQuestion" SET SCHEMA public;
--rollback ALTER TABLE laura."GameScore" SET SCHEMA public;
--rollback ALTER TABLE laura."Favorite" SET SCHEMA public;
--rollback ALTER TABLE laura."Photo" SET SCHEMA public;
--rollback ALTER TYPE auth."Role" SET SCHEMA public;
--rollback ALTER TABLE auth."Verification" SET SCHEMA public;
--rollback ALTER TABLE auth."Account" SET SCHEMA public;
--rollback ALTER TABLE auth."Session" SET SCHEMA public;
--rollback ALTER TABLE auth."User" SET SCHEMA public;
--rollback DROP SCHEMA laura;
--rollback DROP SCHEMA auth;
```

- [x] **Step 5: Run the changelog test and watch it pass**

Run: `pnpm --filter @allonfire/database exec vitest run tests/changelog.test.ts`
Expected: PASS, 8 tests.

- [x] **Step 6: Split the Prisma schema and switch on `multiSchema`**

Delete `packages/database/prisma/schema.prisma`. Create:

`packages/database/prisma/schema/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../../generated/prisma"
}

// One client for every App schema: Prisma resolves relations only inside a
// single client, and Laura's tables point at auth.User (ADR 0007).
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["auth", "laura"]
}
```

`packages/database/prisma/schema/auth.prisma`: the `Role` enum and the `User`, `Session`, `Account`, `Verification` models copied unchanged from the old file (lines 13-76), each followed by `@@schema("auth")` as its last line. `User`'s back-relations `photos`, `gameScores` and `quizQuestions` stay: Prisma requires both sides of a relation.

```prisma
// The user base every App shares (ADR 0007). Better Auth owns these tables.
// User lists Laura's models only because Prisma requires back-relations.

enum Role {
  ADMIN
  USER
  VIEWER

  @@schema("auth")
}

model User {
  id            String         @id @default(cuid(2))
  email         String         @unique
  name          String?
  emailVerified Boolean        @default(false)
  image         String?
  role          Role           @default(USER)
  allowedApps   String[]       @default(["all"])
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  sessions      Session[]
  accounts      Account[]
  photos        Photo[]
  gameScores    GameScore[]
  quizQuestions QuizQuestion[]

  @@schema("auth")
}

model Session {
  id        String   @id @default(cuid(2))
  expiresAt DateTime
  token     String   @unique
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@schema("auth")
}

model Account {
  id                    String    @id @default(cuid(2))
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@schema("auth")
}

model Verification {
  id         String    @id @default(cuid(2))
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime? @default(now())
  updatedAt  DateTime? @updatedAt

  @@schema("auth")
}
```

`packages/database/prisma/schema/laura.prisma`:

```prisma
// Laura's App schema (ADR 0007).

// ============ Photos ============

model Photo {
  id           String    @id @default(cuid(2))
  url          String
  thumbnailUrl String
  width        Int
  height       Int
  blurHash     String
  caption      String?
  uploadedBy   String
  user         User      @relation(fields: [uploadedBy], references: [id], onDelete: Cascade)
  favorite     Favorite?
  createdAt    DateTime  @default(now())

  @@index([createdAt])
  @@index([uploadedBy])
  @@schema("laura")
}

model Favorite {
  id        String   @id @default(cuid(2))
  photoId   String   @unique
  photo     Photo    @relation(fields: [photoId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@schema("laura")
}

// ============ Games ============

enum GameType {
  MEMORY
  QUIZ

  @@schema("laura")
}

model GameScore {
  id        String   @id @default(cuid(2))
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  gameType  GameType
  timeMs    Int?
  score     Int?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([gameType, timeMs])
  @@index([gameType, score])
  @@index([userId, gameType])
  @@schema("laura")
}

// ============ Quiz ============

model QuizQuestion {
  id                String       @id @default(cuid(2))
  text              String
  imageUrl          String?
  imageThumbnailUrl String?
  imageBlurHash     String?
  createdBy         String
  user              User         @relation(fields: [createdBy], references: [id], onDelete: Cascade)
  answers           QuizAnswer[]
  createdAt         DateTime     @default(now())

  @@index([createdBy])
  @@schema("laura")
}

model QuizAnswer {
  id                String       @id @default(cuid(2))
  questionId        String
  question          QuizQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  text              String
  imageUrl          String?
  imageThumbnailUrl String?
  imageBlurHash     String?
  isCorrect         Boolean      @default(false)
  sortOrder         Int

  @@schema("laura")
}
```

`packages/database/package.json`: add a top-level `"prisma": { "schema": "prisma/schema" }` and the script
`"db:drift": "prisma migrate diff --from-schema-datasource prisma/schema --to-schema-datamodel prisma/schema --exit-code"`.
Root `package.json`: `"db:drift": "pnpm --filter @allonfire/database db:drift"`.

`--from-schema-datasource` introspects only the `schemas` list, so Liquibase's tables in `public` never count as drift.

Run: `pnpm db:generate && pnpm db:update`
Expected: generate succeeds (a deprecation notice about `package.json#prisma` is fine); update applies `0001-auth-laura-schemas` to the dev database.

Run: `pnpm --filter @allonfire/database exec vitest run tests/raw-sql.test.ts`
Expected: FAIL, 4 tests, `relation "Photo" does not exist` / `relation "QuizQuestion" does not exist`.

- [x] **Step 7: Qualify the raw SQL**

`packages/database/src/services/photo.service.ts`: lines 69, 85 and 105 change `FROM "Photo"` to `FROM laura."Photo"`.
`packages/database/src/services/quiz.service.ts`: line 61 changes `FROM "QuizQuestion"` to `FROM laura."QuizQuestion"`.

Run: `pnpm --filter @allonfire/database exec vitest run tests/raw-sql.test.ts`
Expected: PASS, 4 tests.

- [x] **Step 8: Prove the changelog and the Prisma schema agree**

Run: `pnpm db:drift; echo "exit $?"`
Expected: `No difference detected.` and `exit 0`. Any difference means `0001` and the `.prisma` files disagree: fix the `.prisma` files (the changelog is what the database really has).

Add the CI step after "Apply the changelog" in `.github/workflows/ci.yml`:

```yaml
      - name: Changelog matches the Prisma schema
        run: pnpm db:drift
```

- [x] **Step 9: Full check**

Run: `pnpm exec biome format --write packages/database/tests packages/database/src/services packages/database/package.json package.json && pnpm check-types && pnpm check && pnpm test`
Expected: all green. The apps still import services from the package root, which still re-exports them.

---

### Task 3: `pnpm db:changeset <name>`

**Files:**
- Create: `packages/database/scripts/changeset-file.ts`
- Create: `packages/database/scripts/changeset.ts`
- Create: `packages/database/tests/changeset-file.test.ts`
- Modify: `packages/database/package.json` (`db:changeset`)
- Modify: `package.json` (root `db:changeset`)

**Interfaces:**
- Consumes: `bash scripts/liquibase.sh update` (Task 1); schema folder `prisma/schema` (Task 2).
- Produces, from `scripts/changeset-file.ts`: `CHANGESET_AUTHOR = "isaia"`, `CHANGESET_NAME: RegExp`, `isEmptySql(sql: string): boolean`, `nextChangesetNumber(fileNames: readonly string[]): string`, `buildChangeset(input: { id: string; forward: string; rollback: string }): string`.

- [x] **Step 1: Write the failing test**

`packages/database/tests/changeset-file.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildChangeset,
  CHANGESET_NAME,
  isEmptySql,
  nextChangesetNumber,
} from "../scripts/changeset-file";

describe("isEmptySql", () => {
  it("is true for Prisma's empty diff", () => {
    expect(isEmptySql("-- This is an empty migration.\n")).toBe(true);
  });

  it("is true for blank output", () => {
    expect(isEmptySql("\n  \n")).toBe(true);
  });

  it("is false once a statement appears", () => {
    expect(isEmptySql("-- CreateTable\nCREATE TABLE x ();\n")).toBe(false);
  });
});

describe("nextChangesetNumber", () => {
  it("starts at 0000", () => {
    expect(nextChangesetNumber([])).toBe("0000");
  });

  it("follows the highest number", () => {
    expect(
      nextChangesetNumber(["0000-baseline.sql", "0001-auth-laura-schemas.sql"])
    ).toBe("0002");
  });

  it("follows the highest number across gaps", () => {
    expect(nextChangesetNumber(["0000-a.sql", "0007-b.sql"])).toBe("0008");
  });

  it("ignores files that are not changesets", () => {
    expect(
      nextChangesetNumber([".DS_Store", "notes.md", "12-short.sql", "0003-x.sql"])
    ).toBe("0004");
  });
});

describe("CHANGESET_NAME", () => {
  it("accepts kebab case", () => {
    expect(CHANGESET_NAME.test("add-photo-alt")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const name of ["", "Add", "add_alt", "-add", "add-", "a b"]) {
      expect(CHANGESET_NAME.test(name)).toBe(false);
    }
  });
});

describe("buildChangeset", () => {
  it("writes a formatted SQL changeset with one rollback line per statement line", () => {
    expect(
      buildChangeset({
        id: "0002-add-photo-alt",
        forward:
          '-- AlterTable\nALTER TABLE "laura"."Photo" ADD COLUMN "alt" TEXT;\n',
        rollback:
          '-- AlterTable\nALTER TABLE "laura"."Photo" DROP COLUMN "alt";\n',
      })
    ).toBe(
      [
        "--liquibase formatted sql",
        "",
        "--changeset isaia:0002-add-photo-alt",
        "-- AlterTable",
        'ALTER TABLE "laura"."Photo" ADD COLUMN "alt" TEXT;',
        '--rollback ALTER TABLE "laura"."Photo" DROP COLUMN "alt";',
        "",
      ].join("\n")
    );
  });

  it("keeps a multi-line rollback statement as consecutive rollback lines", () => {
    const changeset = buildChangeset({
      id: "0003-add-tag",
      forward: 'CREATE TABLE "laura"."Tag" (\n  "id" TEXT NOT NULL\n);\n',
      rollback: '-- DropTable\nDROP TABLE\n  "laura"."Tag";\n',
    });
    expect(changeset).toContain('--rollback DROP TABLE\n--rollback   "laura"."Tag";');
  });
});
```

- [x] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @allonfire/database exec vitest run tests/changeset-file.test.ts`
Expected: FAIL, `Cannot find module '../scripts/changeset-file'`.

- [x] **Step 3: Write `changeset-file.ts`**

`packages/database/scripts/changeset-file.ts`:

```ts
export const CHANGESET_AUTHOR = "isaia";
export const CHANGESET_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const CHANGESET_FILE = /^(\d{4})-[a-z0-9-]+\.sql$/;
const SQL_COMMENT = "--";

function isStatementLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed !== "" && !trimmed.startsWith(SQL_COMMENT);
}

/** True when a `prisma migrate diff --script` output holds no statement. */
export function isEmptySql(sql: string): boolean {
  return !sql.split("\n").some(isStatementLine);
}

/** The four-digit prefix the next changeset file takes. */
export function nextChangesetNumber(fileNames: readonly string[]): string {
  const numbers = fileNames
    .map((name) => CHANGESET_FILE.exec(name)?.[1])
    .filter((prefix): prefix is string => prefix !== undefined)
    .map(Number);
  const next = numbers.length === 0 ? 0 : Math.max(...numbers) + 1;
  return String(next).padStart(4, "0");
}

/**
 * A Liquibase formatted-SQL changeset. Liquibase joins consecutive
 * `--rollback` lines into one rollback script, so every statement line of the
 * reverse diff becomes one.
 */
export function buildChangeset({
  id,
  forward,
  rollback,
}: {
  id: string;
  forward: string;
  rollback: string;
}): string {
  const rollbackLines = rollback
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(isStatementLine)
    .map((line) => `--rollback ${line}`);
  return [
    "--liquibase formatted sql",
    "",
    `--changeset ${CHANGESET_AUTHOR}:${id}`,
    forward.trim(),
    ...rollbackLines,
    "",
  ].join("\n");
}
```

- [x] **Step 4: Run the test and watch it pass**

Run: `pnpm --filter @allonfire/database exec vitest run tests/changeset-file.test.ts`
Expected: PASS, 11 tests.

- [x] **Step 5: Write the CLI**

`packages/database/scripts/changeset.ts`:

```ts
// pnpm db:changeset <kebab-name>: drafts a Liquibase changeset from the
// difference between the database (brought to changelog head first) and
// prisma/schema. Prisma drafts, a human reviews, Liquibase owns (ADR 0008).
import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildChangeset,
  CHANGESET_NAME,
  isEmptySql,
  nextChangesetNumber,
} from "./changeset-file";

const PACKAGE_DIR = resolve(import.meta.dirname, "..");
const CHANGESETS_DIR = resolve(PACKAGE_DIR, "changelog/changesets");
const SCHEMA = "prisma/schema";

function prismaDiff(from: string[], to: string[]): string {
  return execFileSync(
    "prisma",
    ["migrate", "diff", ...from, ...to, "--script"],
    { cwd: PACKAGE_DIR, encoding: "utf8" }
  );
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const name = process.argv[2] ?? "";
if (!CHANGESET_NAME.test(name)) {
  fail("Usage: pnpm db:changeset <kebab-case-name>");
}

execFileSync("bash", ["scripts/liquibase.sh", "update"], {
  cwd: PACKAGE_DIR,
  stdio: "inherit",
});

const forward = prismaDiff(
  ["--from-schema-datasource", SCHEMA],
  ["--to-schema-datamodel", SCHEMA]
);
if (isEmptySql(forward)) {
  fail("No schema change: the database already matches prisma/schema.");
}
const rollback = prismaDiff(
  ["--from-schema-datamodel", SCHEMA],
  ["--to-schema-datasource", SCHEMA]
);

const id = `${nextChangesetNumber(readdirSync(CHANGESETS_DIR))}-${name}`;
const file = resolve(CHANGESETS_DIR, `${id}.sql`);
writeFileSync(file, buildChangeset({ id, forward, rollback }));
process.stdout.write(
  `Wrote ${file}\nReview it (drops, renames, type changes), then run pnpm db:update.\n`
);
```

`packages/database/package.json`: `"db:changeset": "tsx --env-file=.env scripts/changeset.ts"`.
Root `package.json`: `"db:changeset": "pnpm --filter @allonfire/database db:changeset"`.

- [x] **Step 6: Exercise the whole loop on the dev database**

1. Run `pnpm db:changeset add-photo-alt`. Expected: fails with `No schema change: ...`, and no file is written.
2. Add `alt String?` to `model Photo` in `prisma/schema/laura.prisma`.
3. Run `pnpm db:changeset add-photo-alt`. Expected: `changelog/changesets/0002-add-photo-alt.sql` holds `ALTER TABLE "laura"."Photo" ADD COLUMN "alt" TEXT;` and `--rollback ALTER TABLE "laura"."Photo" DROP COLUMN "alt";`.
4. Run `pnpm db:update && pnpm db:drift`. Expected: applied, then `No difference detected.`
5. Undo: `pnpm --filter @allonfire/database exec bash scripts/liquibase.sh rollback-count --count=1`, delete `0002-add-photo-alt.sql`, remove the `alt` line. Then `pnpm db:drift` reports no difference.

- [x] **Step 7: Typecheck, lint, format**

Run: `pnpm exec biome format --write packages/database/scripts packages/database/tests packages/database/package.json package.json && pnpm check-types && pnpm check`
Expected: no errors.

---

### Task 4: Split the package code by App schema

**Files:**
- Create: `packages/database/src/client.ts`
- Modify: `packages/database/src/index.ts`
- Move: `src/services/user.service.ts` → `src/auth/user.service.ts`
- Move: `src/services/photo.service.ts`, `favorite.service.ts`, `game-score.service.ts`, `quiz.service.ts` → `src/laura/`
- Delete: `packages/database/src/services/index.ts` (and the `services/` folder)
- Modify: `packages/database/src/seed-quiz.ts`
- Modify: `packages/database/package.json` (`exports`)
- Modify: `packages/database/tests/raw-sql.test.ts` (imports)
- Modify: `apps/laura/src/app/[locale]/(auth)/login/page.tsx`, `apps/laura/src/features/gallery/actions/gallery.ts`, `apps/laura/src/features/games/actions/games.ts`, `apps/laura/src/features/games/actions/quiz.ts`, `apps/laura/src/features/games/actions/leaderboard-cache.ts`, `apps/laura/src/features/upload/actions/upload.ts`, `apps/laura/scripts/seed-photos.ts`, `packages/auth/src/actions/check-access.ts`
- Modify: `apps/laura/src/features/{gallery,games,upload}/CLAUDE.md` (dependency tables)

**Interfaces:**
- Produces, `packages/database/package.json` `exports`:

```json
"exports": {
  ".": "./src/index.ts",
  "./env": "./src/env.ts",
  "./auth/user": "./src/auth/user.service.ts",
  "./laura/photo": "./src/laura/photo.service.ts",
  "./laura/favorite": "./src/laura/favorite.service.ts",
  "./laura/game-score": "./src/laura/game-score.service.ts",
  "./laura/quiz": "./src/laura/quiz.service.ts",
  "./generated/prisma": "./generated/prisma/index.ts"
}
```

- Root `@allonfire/database` exports only `prisma`, `PrismaClient` and the generated types (`Role`, `GameType`, model types).

| Import | New path |
|---|---|
| `checkUserAppAccess`, `deleteUser`, `getUserById`, `getUsers`, `updateUserAllowedApps` | `@allonfire/database/auth/user` |
| `createPhoto`, `deletePhoto`, `getAllRandomPhotos`, `getPhotoCount`, `getPhotosPaginated`, `getRandomPhotos`, `getUserPhotoCount`, type `PhotoWithUser` | `@allonfire/database/laura/photo` |
| `getFavoritePhotoIds`, `getFavoritesPaginated`, `toggleFavorite` | `@allonfire/database/laura/favorite` |
| `getGameStats`, `getGlobalBestScore`, `getLeaderboard`, `getUserBestScore`, `getUserGameStats`, `submitGameScore`, type `LeaderboardEntry` | `@allonfire/database/laura/game-score` |
| `createQuizQuestion`, `deleteQuizQuestion`, `getAllQuizQuestions`, `getQuizQuestionById`, `getQuizQuestionCount`, `getRandomQuizQuestions`, `updateQuizQuestion`, type `QuizQuestionWithAnswers` | `@allonfire/database/laura/quiz` |
| `prisma`, types `Role`, `GameType` | `@allonfire/database` (unchanged) |

- [x] **Step 1: Cut the root re-exports and let typecheck list the breakage**

`packages/database/src/client.ts` (the singleton, moved out of `index.ts`):

```ts
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

`packages/database/src/index.ts`:

```ts
export type * from "../generated/prisma/client";
// biome-ignore lint/performance/noBarrelFile: package entry point — consumers import from @allonfire/database
export { PrismaClient } from "../generated/prisma/client";
export { prisma } from "./client";
```

(The `biome-ignore` line is the one already in the file, kept as is, not a new one.)

Run: `pnpm check-types`
Expected: FAIL. Every consumer in the Files list above reports `Module '"@allonfire/database"' has no exported member ...`.

- [x] **Step 2: Move the service files**

```bash
cd packages/database/src
mkdir -p auth laura
git mv services/user.service.ts auth/user.service.ts
git mv services/photo.service.ts services/favorite.service.ts services/game-score.service.ts services/quiz.service.ts laura/
git rm services/index.ts
```

In every moved file, `import { prisma } from "../index";` becomes `import { prisma } from "../client";`. Imports of `../../generated/prisma/client` keep the same depth and do not change. `favorite.service.ts` keeps `import { DEFAULT_PAGE_SIZE, type PhotoWithUser } from "./photo.service";`.

`src/seed-quiz.ts`: `import { createQuizQuestion } from "./services/quiz.service";` becomes `from "./laura/quiz.service"`.

`tests/raw-sql.test.ts`: `../src/services/photo.service` becomes `../src/laura/photo.service`, and `../src/services/quiz.service` becomes `../src/laura/quiz.service`.

Replace the `exports` block of `packages/database/package.json` with the one in **Interfaces**.

- [x] **Step 3: Point every consumer at its subpath**

Apply the table in **Interfaces** to each file in the Files list. A file that imported several services from the root gets one import per subpath. Type-only imports of `Role` and `GameType` stay on `@allonfire/database`. `packages/auth/src/server.ts`, `packages/auth/src/guard.ts`, `apps/laura/scripts/fix-photo-dimensions.ts` and `apps/api/src/index.ts` import only `prisma` and do not change.

In `apps/laura/src/features/gallery/CLAUDE.md`, `games/CLAUDE.md` and `upload/CLAUDE.md`, change each dependency-table row that names `@allonfire/database` for services to the subpath the table above gives it (for example `@allonfire/database/laura/photo` for `createPhoto`).

- [x] **Step 4: Typecheck and test**

Run: `pnpm exec biome format --write packages/database apps/laura/src apps/laura/scripts packages/auth/src && pnpm check-types && pnpm check && pnpm test`
Expected: all green. `grep -rn 'from "@allonfire/database"' apps packages --include='*.ts' --include='*.tsx' | grep -v node_modules` lists only imports of `prisma`, `Role`, `GameType` or `PrismaClient`.

- [x] **Step 5: Build the Laura image**

Run: `pnpm docker:build:laura`
Expected: the build succeeds. It runs `db:generate`, which must find the schema folder through `package.json#prisma`.

---

### Task 5: The deploy chain: backup, migrate, then the App

**Files:**
- Modify: `packages/database/liquibase/entrypoint.sh`
- Modify: `packages/database/tests/changelog.test.ts`
- Modify: `docker/docker-compose.prod.yml`

**Interfaces:**
- Consumes: the `db-migrate` image and `liquibase(url, ...args)` from Task 1; changeset ids from Tasks 1-2.
- Produces: `entrypoint.sh deploy` runs `liquibase update`, then, only when changesets were pending, `liquibase tag --tag=v<root package.json version>` (with `-<UTC yyyymmddThhmmssZ>` appended if that tag already exists).
- Produces: compose services `db-backup` and `db-migrate`; volume `allonfire-db-backups`.

- [x] **Step 1: Write the failing deploy test**

Append to `packages/database/tests/changelog.test.ts` (add `import { readFileSync } from "node:fs";` at the top):

```ts
const { version } = JSON.parse(
  readFileSync(resolve(PACKAGE_DIR, "../../package.json"), "utf8")
) as { version: string };
const RELEASE_TAG = `v${version}`;

async function tags(client: PrismaClient): Promise<string[]> {
  const rows = await client.$queryRaw<{ tag: string }[]>`
    SELECT tag FROM public.databasechangelog
    WHERE tag IS NOT NULL ORDER BY orderexecuted
  `;
  return rows.map((row) => row.tag);
}

describe("deploy", () => {
  const database = "allonfire_changelog_deploy";
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    client = clientFor(url);
  });

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  it(
    "tags the release after applying changesets",
    async () => {
      liquibase(url, "deploy");
      expect(await tags(client)).toEqual([RELEASE_TAG]);
    },
    DOCKER_TIMEOUT
  );

  it(
    "leaves the tag alone when nothing is pending",
    async () => {
      // Tagging again would rewrite the newest row and erase the release tag.
      liquibase(url, "deploy");
      expect(await tags(client)).toEqual([RELEASE_TAG]);
    },
    DOCKER_TIMEOUT
  );
});
```

Run: `pnpm --filter @allonfire/database exec vitest run tests/changelog.test.ts -t deploy`
Expected: FAIL, Liquibase rejects `deploy` as an unknown command.

- [x] **Step 2: Add `deploy` to the entrypoint**

In `packages/database/liquibase/entrypoint.sh`, replace the final `exec liquibase "$@"` with:

```bash
release_version() {
  sed -n 's/^  "version": "\(.*\)",$/\1/p' /liquibase/release/package.json
}

# update, then tag the release, but only when this deploy applied something:
# `liquibase tag` rewrites the newest changelog row, so tagging a deploy that
# applied nothing would erase the previous release's tag.
deploy() {
  local version pending tag
  version="$(release_version)"
  if [[ -z "$version" ]]; then
    echo "entrypoint: no version in the root package.json" >&2
    exit 1
  fi
  pending="$(liquibase status)"
  liquibase update
  if ! grep -q "have not been applied" <<<"$pending"; then
    return 0
  fi
  tag="v${version}"
  # ponytail: a same-version deploy with new changesets gets a timestamp
  # suffix; a release bump per production deploy keeps tags plain.
  if ! liquibase tag-exists --tag="$tag" | grep -q "does NOT exist"; then
    tag="${tag}-$(date -u +%Y%m%dT%H%M%SZ)"
  fi
  liquibase tag --tag="$tag"
}

if [[ "${1:-}" == "deploy" ]]; then
  deploy
  exit 0
fi

exec liquibase "$@"
```

- [x] **Step 3: Run the deploy test and watch it pass**

Run: `pnpm --filter @allonfire/database exec vitest run tests/changelog.test.ts -t deploy`
Expected: PASS, 2 tests.

If the first test fails with no tag, or a tag ending in a timestamp, Liquibase 5 words its output differently. Run `bash scripts/liquibase.sh status` and `bash scripts/liquibase.sh tag-exists --tag=v0.0.0` against a throwaway database (`DATABASE_URL=<throwawayUrl> ...`), read the real wording, and correct the two `grep` patterns.

- [x] **Step 4: Add the services to the Production compose file**

`docker/docker-compose.prod.yml`, before `laura:`:

```yaml
  # One-shot, first on every deploy: custom-format dump of allonfire, newest 14
  # kept. The query string is cut because libpq rejects Prisma's `schema=`.
  # Same disk as the database: this serves rollback, not disaster recovery.
  db-backup:
    image: postgres:16-alpine
    restart: "no"
    environment:
      - DATABASE_URL=${DATABASE_URL}
    command:
      - sh
      - -c
      - >-
        set -e;
        pg_dump "$${DATABASE_URL%%\?*}" -Fc -f "/backups/allonfire-$$(date -u +%Y%m%dT%H%M%SZ).dump";
        ls -1t /backups/allonfire-*.dump | tail -n +15 | xargs -r rm --
    volumes:
      - db_backups:/backups
    networks:
      - dokploy-network

  # One-shot, after the dump: applies the changelog and tags the release
  # (ADR 0008). The Apps start only if this exits 0.
  db-migrate:
    build:
      context: ..
      dockerfile: packages/database/liquibase/Dockerfile
    restart: "no"
    command: ["deploy"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      db-backup:
        condition: service_completed_successfully
    networks:
      - dokploy-network
```

In `laura:`, after `restart: unless-stopped`:

```yaml
    depends_on:
      db-migrate:
        condition: service_completed_successfully
```

Under `volumes:`:

```yaml
  db_backups:
    name: allonfire-db-backups
```

- [x] **Step 5: Check the compose file and the backup command**

Run: `DATABASE_URL=postgresql://u:p@db:5432/allonfire BETTER_AUTH_SECRET=x MINIO_ACCESS_KEY=x MINIO_SECRET_KEY=x MINIO_BUCKET=x docker compose -f docker/docker-compose.prod.yml config --quiet && echo ok`
Expected: `ok`.

Run the backup against the dev database, with a Prisma-style query string on the URL:

```bash
docker volume create allonfire-backup-check
for i in $(seq 16); do docker run --rm -v allonfire-backup-check:/backups alpine touch "/backups/allonfire-2000010${i}T000000Z.dump"; sleep 1; done
docker run --rm --add-host=host.docker.internal:host-gateway -v allonfire-backup-check:/backups \
  -e DATABASE_URL='postgresql://allonfire:allonfire@host.docker.internal:5432/allonfire?schema=public' \
  postgres:16-alpine sh -c 'set -e; pg_dump "${DATABASE_URL%%\?*}" -Fc -f "/backups/allonfire-$(date -u +%Y%m%dT%H%M%SZ).dump"; ls -1t /backups/allonfire-*.dump | tail -n +15 | xargs -r rm --; ls /backups | wc -l; pg_restore --list "$(ls -1t /backups/allonfire-*.dump | head -n 1)" | grep -c "TABLE DATA"'
docker volume rm allonfire-backup-check
```

(Use the dev database's real password from `packages/database/.env` if it isn't `allonfire`.)
Expected: `14` (files kept), then a table-data count of at least `9`.

- [x] **Step 6: Full check**

Run: `pnpm --filter @allonfire/database test && pnpm check`
Expected: all green.

---

### Task 6: Documentation

**Files:**
- Modify: `packages/database/README.md` (rewrite)
- Modify: `CLAUDE.md` (root: database quick reference)
- Modify: any other live doc naming `db:push` (found in Step 1)

**Interfaces:**
- Consumes: the scripts, exports and flows from Tasks 1-5.

- [x] **Step 1: Find stale references**

Run: `grep -rln 'db:push\|db push\|prisma migrate dev\|@allonfire/database/services' --include='*.md' . | grep -v node_modules | grep -v docs/superpowers`
Expected: a list of live docs. Every file listed gets its command or import path corrected. Historical plans and specs under `docs/superpowers/` stay as written.

- [x] **Step 2: Rewrite `packages/database/README.md`**

Keep the existing centered header and badge block, replace the BetterAuth badge line with `<img src="https://img.shields.io/badge/Liquibase-5-2962FF?style=flat" alt="Liquibase 5" />` added next to the Prisma badge, and keep the BetterAuth badge. Replace the tagline with: `Shared database layer for the AllOnFire monorepo: one Prisma client over the App schemas, typed services per App, and the Liquibase changelog that builds the database.` Then these sections, in this order and with this content:

- **App schemas**: table of schema, owner, tables: `auth` (shared user base, Better Auth): User, Session, Account, Verification, enum Role. `laura`: Photo, Favorite, GameScore, QuizQuestion, QuizAnswer, enum GameType. `public`: Liquibase's `databasechangelog` and `databasechangeloglock` only. One sentence: foreign keys cross schemas, one Prisma client spans them (ADR 0007).
- **Exports**: the table from Task 4 **Interfaces**, plus a note that raw SQL must name the schema (`laura."Photo"`).
- **Changing the schema**: the four-step authoring flow (edit `prisma/schema/*.prisma`, `pnpm db:changeset <name>`, review, `pnpm db:update`), the rule that an applied changeset is never edited, and the expand-then-contract rule: `A changeset must leave the previous release working: add, backfill, switch the code, and drop the old thing only in a later release. Rollback recreates structure, not data.`
- **Scripts**: table of `db:generate`, `db:update`, `db:status`, `db:rollback --tag=<tag>`, `db:changeset <name>`, `db:drift`, `db:seed`, `db:seed-quiz`, `db:studio`, `test` (needs Docker and `pnpm docker:up`).
- **Production**: the `db-backup` → `db-migrate` → `laura` chain, tags per release, the rollback command `docker compose -f docker/docker-compose.prod.yml run --rm db-migrate rollback --tag=v<x.y.z>` run from the Dokploy compose directory over SSH followed by redeploying the matching app image, and restoring a dump with `pg_restore --clean --if-exists -d <url> <file>` from the `allonfire-db-backups` volume as the last resort.
- **Directory Structure**: the tree from the spec's Package layout, updated with `liquibase/`, `scripts/` and `tests/`.
- **Dependencies**: unchanged table, with the `better-auth` row reading `Password hashing in the seed script`.

Diagrams in plain ASCII (`|`, `-`, `+`), no box-drawing characters.

- [x] **Step 3: Update the root `CLAUDE.md`**

Replace the `## Database Schema Quick Reference` section with:

```markdown
## Database Schema Quick Reference

Schema folder: `packages/database/prisma/schema/` (`schema.prisma`, `auth.prisma`, `laura.prisma`).
Changelog: `packages/database/changelog/changesets/` — Liquibase owns every change (ADR 0008).

- **`auth` schema (shared):** `User`, `Session`, `Account`, `Verification`, enum `Role`
- **`laura` schema:** `Photo`, `Favorite`, `GameScore`, `QuizQuestion`, `QuizAnswer`, enum `GameType`
- Change a model: edit the `.prisma` file, `pnpm db:changeset <name>`, review the SQL, `pnpm db:update`. Never `prisma db push` or `prisma migrate`. Never edit an applied changeset.
- Services import per file: `@allonfire/database/laura/photo`, `@allonfire/database/auth/user`; the root exports only `prisma` and generated types.
- Raw SQL names the schema: `laura."Photo"`.
```

- [x] **Step 4: Format and check links**

Run: `grep -n 'adr/0007\|adr/0008' packages/database/README.md CLAUDE.md && pnpm check`
Expected: both ADRs referenced, no lint errors.

---

### Task 7: Production cutover (manual, over SSH)

Runs once, after Tasks 1-6 are merged to `dev`. Nothing here changes code. Stop at any failed expectation and do not deploy.

**Files:** none.

- [ ] **Step 1: Take a manual backup and bring it home**

```bash
ssh main-vps 'docker ps --format "{{.Names}}" | grep dokploy-postgres'
ssh main-vps 'docker exec <container> sh -c "pg_dump -U \"\$POSTGRES_USER\" -Fc allonfire"' > ~/backups/allonfire-pre-schemas-$(date +%F).dump
pg_restore --list ~/backups/allonfire-pre-schemas-*.dump | grep -c "TABLE DATA"
```

Expected: a non-empty dump listing at least 9 table-data entries. It stays off the VPS.

- [ ] **Step 2: Restore it locally and check drift against the baseline**

```bash
docker exec allonfire-postgres psql -U allonfire -c 'DROP DATABASE IF EXISTS allonfire_rehearsal WITH (FORCE)' -c 'CREATE DATABASE allonfire_rehearsal'
docker exec -i allonfire-postgres pg_restore -U allonfire -d allonfire_rehearsal --no-owner --no-privileges < ~/backups/allonfire-pre-schemas-*.dump
cd packages/database
git show 85411ce:packages/database/prisma/schema.prisma > /tmp/pre-schemas.prisma
pnpm exec prisma migrate diff --from-url postgresql://allonfire:allonfire@localhost:5432/allonfire_rehearsal --to-schema-datamodel /tmp/pre-schemas.prisma --exit-code
```

(`85411ce` is the last commit before this work. Use the dev database password from `.env` if it is not `allonfire`.)
Expected: `No difference detected.` If Production differs (an extra index, a leftover type), stop: the baseline's precondition would mark it ran over a different shape. Add a changeset that brings Production to the baseline shape, placed before `0001`, and repeat.

- [ ] **Step 3: Rehearse the deploy on the copy**

```bash
q() { docker exec allonfire-postgres psql -U allonfire -d allonfire_rehearsal -Atc "$1"; }
q 'SELECT (SELECT count(*) FROM "User"), (SELECT count(*) FROM "Photo"), (SELECT count(*) FROM "GameScore"), (SELECT count(*) FROM "QuizQuestion")'
DATABASE_URL=postgresql://allonfire:allonfire@localhost:5432/allonfire_rehearsal bash scripts/liquibase.sh deploy
q 'SELECT (SELECT count(*) FROM auth."User"), (SELECT count(*) FROM laura."Photo"), (SELECT count(*) FROM laura."GameScore"), (SELECT count(*) FROM laura."QuizQuestion")'
q 'SELECT id, exectype, tag FROM databasechangelog ORDER BY orderexecuted'
```

(Still in `packages/database`, from Step 2.)
Expected: the two count lines are identical; the changelog shows `0000-baseline|MARK_RAN|` and `0001-auth-laura-schemas|EXECUTED|v<version>`.

Then point Laura at the copy and click through it: `DATABASE_URL=postgresql://allonfire:allonfire@localhost:5432/allonfire_rehearsal pnpm --filter @allonfire/laura dev`. Log in, scroll the gallery, open favorites, play one memory game, open the quiz and both leaderboards. Expected: real photos and scores, no errors in the terminal.

- [ ] **Step 4: Release and deploy**

Cut the release (version bump) and promote dev → test → prod through the usual cascade (`allonfire-deploy`). In Dokploy's deploy log for the compose app, expected in order: `db-backup` exits 0, `db-migrate` logs `0001-auth-laura-schemas` applied and exits 0, `laura` starts and turns healthy. The old Laura container errors for a few seconds between the move and the new container: accepted.

- [ ] **Step 5: Verify Production**

```bash
ssh main-vps 'docker exec <container> sh -c "psql -U \"\$POSTGRES_USER\" -d allonfire -Atc \"SELECT id, exectype, tag FROM databasechangelog ORDER BY orderexecuted\""'
ssh main-vps 'docker exec <container> sh -c "psql -U \"\$POSTGRES_USER\" -d allonfire -Atc \"SELECT (SELECT count(*) FROM auth.\\\"User\\\"), (SELECT count(*) FROM laura.\\\"Photo\\\"), (SELECT count(*) FROM laura.\\\"GameScore\\\"), (SELECT count(*) FROM laura.\\\"QuizQuestion\\\")\""'
ssh main-vps 'docker run --rm -v allonfire-db-backups:/b alpine ls -l /b'
```

Expected: the same changelog rows as the rehearsal, counts equal to the rehearsal's (plus anything created since the dump), one dump in the volume. Open `https://laura.isaiariva.com`, log in, check gallery, games and quiz.

If anything is wrong: from the Dokploy compose directory on the VPS run `docker compose -f docker/docker-compose.prod.yml run --rm db-migrate rollback-count --count=1` (tables return to `public`), then redeploy the previous commit. Rows written since the move stay; the rename carries them both ways.

## Implementation Log
- Implemented: 2026-09-24T10:07:48Z
- Workspace: fresh-branch — feat/database-schemas-liquibase
- Committed: no — awaiting user review
- Task 7 (Production cutover over SSH) not run: it needs this branch merged and released, and it touches Production.
