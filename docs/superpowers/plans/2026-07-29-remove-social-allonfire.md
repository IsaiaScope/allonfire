# Remove Social from allonfire and the VPS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take `social.isaiariva.com` offline, exclude the Social source from the build, and drop Social's tables from the shared `allonfire` database — leaving Laura, MinIO, and n8n fully operational.

**Architecture:** Social is a service inside the `applications-allonfire-nrnhaj` Dokploy compose stack, sharing a database and a Prisma schema with Laura. The app and its two exclusive packages leave the pnpm workspace (source stays on disk); `packages/database` cannot leave — Laura depends on it — so its Social parts are cut out by hand. The production tables are dropped with raw SQL, because allonfire has no migration history and `dokploy-postgres` is not externally reachable.

**Tech Stack:** Next.js 16 + React 19, Prisma 7 + PostgreSQL, pnpm workspaces + Turborepo, Docker Compose via Dokploy, Traefik + Let's Encrypt, Cloudflare DNS.

**Companion plan:** `monorepoonfire` repo, `docs/superpowers/plans/2026-07-29-remove-social-portfolio.md`. **Run that one first** — otherwise the live portfolio spends this window linking to a dead domain.

**Spec:** `monorepoonfire` repo, `docs/superpowers/specs/2026-07-29-remove-social-design.md`

## Global Constraints

- **n8n stays entirely.** Do not touch the `applications-n8n-e65i3g` Dokploy app, the `n8n-data` volume, or `n8n/workflows/*.json`. It is being kept for future automations.
- **Do not touch** `packages/video-pipeline` or `packages/video-overlays`. They belong to active unrelated work on `feat/video-pipeline-foundation` and import nothing from Social.
- `apps/social`, `packages/social-publisher`, and `packages/content-generator` stay **on disk**. They are removed from the *workspace*, not deleted.
- Laura must remain green and deployable at every commit.
- Never paste VPS secrets into chat or write them to disk. Read `POSTGRES_USER` from the container at call time.
- Step ordering is **backup → redeploy → drop**. Dropping tables before the redeploy would leave a live Social container querying tables that no longer exist.

## Verified Starting State

- `docker ps` on `main` shows `applications-allonfire-nrnhaj-social-1`, `-laura-1`, `-minio-1` in one compose project, plus a separate `applications-n8n-e65i3g` swarm service.
- `DATABASE_URL` for both Laura and Social is `postgresql://…@dokploy-postgres:5432/allonfire`.
- There is **no** `packages/database/prisma/migrations` directory — allonfire uses `prisma db push`, and `docker/Dockerfile` never runs migrations (`CMD ["sh", "-c", "node apps/${APP_NAME}/server.js"]`).
- A sweep of `packages/auth`, `packages/ui`, `packages/hooks`, `packages/storage`, `packages/utils`, and `apps/laura` found **zero** references to Social's Prisma models or enums. Nothing outside `apps/social` breaks when they are removed.
- `packages/auth/src/guard.ts:19-23` reads `allowedApps` generically against an `appName` argument — no hardcoded `"social"`. It needs no change.

**Social-only database objects.** Models: `Topic`, `Prompt`, `Post`, `SocialAccount`, `AiProvider`, `Settings`, `WebhookLog`. Enums: `PromptRating`, `TopicCategory`, `TopicStatus`, `PostType`, `PostStatus`, `Platform`, `MediaType`, `ProviderType`.

**Keep:** Laura's `Photo`, `Favorite`, `GameScore`, `QuizQuestion`, `QuizAnswer`, enum `GameType`. Shared `User`, `Session`, `Account`, `Verification`, enum `Role`.

---

### Task 1: Back up the allonfire database

This gate exists for Task 7, which is the only irreversible step in this plan. Do it first — before any code change — so the dump reflects a coherent pre-change state.

**Files:** none. Operates on the production database over SSH.

**Interfaces:**
- Consumes: the live `allonfire` database on `dokploy-postgres`.
- Produces: `~/allonfire-2026-07-29.sql` on the local machine, verified to contain both Social and Laura tables.

- [ ] **Step 1: Confirm the right host**

Run: `ssh main-vps 'hostname'`
Expected: `main`. Anything else — stop, run nothing further.

- [ ] **Step 2: Dump the whole database**

```bash
ssh main-vps 'PG=$(docker ps --filter name=dokploy-postgres --format "{{.Names}}" | head -1); \
  docker exec $PG pg_dump -U $(docker exec $PG printenv POSTGRES_USER) -d allonfire' \
  > ~/allonfire-2026-07-29.sql
```

- [ ] **Step 3: Verify the dump concretely**

```bash
for t in Topic Prompt Post SocialAccount AiProvider Settings WebhookLog Photo GameScore; do
  grep -q "CREATE TABLE public.\"$t\"" ~/allonfire-2026-07-29.sql \
    && echo "ok   $t" || echo "MISS $t"
done
ls -lh ~/allonfire-2026-07-29.sql
```

Expected: `ok` for all nine tables and a non-zero file size. Any `MISS` line means the dump is unusable — stop and investigate before continuing. (If the tables exist under a different schema prefix, adjust the `grep` and re-verify; do not skip this check.)

---

### Task 2: Remove the Social service from the compose files

**Files:**
- Modify: `docker/docker-compose.prod.yml:4-35`
- Modify: `docker/docker-compose.test.yml:21-38`

`docker/docker-compose.dev.yml` contains no Social service — leave it alone.

**Interfaces:**
- Consumes: nothing.
- Produces: a prod compose file defining exactly two services, `laura` and `minio`; a test compose file with no Social service.

- [ ] **Step 1: Delete the `social:` service block**

Delete lines 4-35 — the entire `social:` entry, from `  social:` through the last Traefik label `- "traefik.http.services.allonfire-social.loadbalancer.server.port=3000"`. The file must now begin:

```yaml
name: allonfire

services:
  laura:
    build:
```

Leave `laura`, `minio`, the `volumes:` block (external `allonfire-minio-data`), and the `networks:` block untouched.

- [ ] **Step 2: Verify the compose file is valid and Social is gone**

```bash
docker compose -f docker/docker-compose.prod.yml config --services
```

Expected: exactly two lines — `laura` and `minio`. If Docker complains about unset environment variables, run it with a dummy env file; the point is the service list, not the interpolated values.

- [ ] **Step 3: Delete the Social service from the test compose file**

In `docker/docker-compose.test.yml`, delete the `social:` service block — from `  social:` through its `depends_on:` clause ending in `condition: service_healthy`, immediately before the `# When adding new app, copy this block:` comment. Leave the `postgres` service and the template comment intact.

- [ ] **Step 4: Confirm no Social references remain in either compose file**

Run: `grep -in social docker/docker-compose.prod.yml docker/docker-compose.test.yml`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add docker/docker-compose.prod.yml docker/docker-compose.test.yml
git commit -m "chore(docker): remove social service from prod and test compose"
```

---

### Task 3: Remove the Social packages from the pnpm workspace

**Files:**
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Consumes: nothing.
- Produces: a workspace excluding `apps/social`, `packages/social-publisher`, and `packages/content-generator`. Turborepo derives its task graph from the workspace, so no `turbo.json` change is needed.

All three leave together, so no surviving package holds a dangling `workspace:` reference — nothing outside `apps/social` imports the other two.

- [ ] **Step 1: Add the negation patterns**

Replace the contents of `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

with:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  # Social was retired on 2026-07-29. The source stays on disk for reference but is
  # excluded from the workspace so it is never installed, type-checked, or built.
  - "!apps/social"
  - "!packages/social-publisher"
  - "!packages/content-generator"
```

- [ ] **Step 2: Reinstall and confirm the three packages are gone from the workspace**

```bash
pnpm install
pnpm ls --recursive --depth -1 2>/dev/null | grep -E "social|content-generator" && echo "STILL PRESENT - FAIL" || echo "excluded OK"
```

Expected: `excluded OK`

- [ ] **Step 3: Confirm Laura still builds against the unchanged schema**

Run: `pnpm build`
Expected: success. Laura and the remaining packages build; Social is not attempted.

- [ ] **Step 4: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(workspace): exclude social app and its packages from the build"
```

---

### Task 4: Strip Social from `packages/database`

`packages/database` cannot be excluded — every Laura query goes through it — so its Social parts are removed by hand while the package stays alive.

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Modify: `packages/database/src/seed.ts`
- Modify: `packages/database/src/seed-env.ts:11-13`
- Modify: `packages/database/package.json` (scripts)
- Delete: `packages/database/src/export-topics.ts`
- Delete: `packages/database/seed-data/topics.json`, `prompts.json`, `posts.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a Prisma schema with 9 models (`User`, `Session`, `Account`, `Verification`, `Photo`, `Favorite`, `GameScore`, `QuizQuestion`, `QuizAnswer`) and 2 enums (`Role`, `GameType`). `seed.ts` exports no new symbols; its `main()` seeds the admin, the Laura viewer, and — in `SEED_MODE=dev` — the test users from `users.json`.

- [ ] **Step 1: Remove the Social models and enums from the schema**

In `packages/database/prisma/schema.prisma`, delete these blocks entirely:

- models `Topic`, `Prompt`, `Post`, `SocialAccount`, `AiProvider`, `Settings`, `WebhookLog`
- enums `PromptRating`, `TopicCategory`, `TopicStatus`, `PostType`, `PostStatus`, `Platform`, `MediaType`, `ProviderType`
- the section comment headers left orphaned by the above (`// ============ Topics ============`, `// ============ Prompts ============`, `// ============ Posts ============`, `// ============ AI Providers ============`, `// ============ Settings ============`, `// ============ Webhook Logging ============`)

Then remove this single line from the `User` model:

```prisma
  socialAccounts SocialAccount[]
```

`User` keeps `sessions`, `accounts`, `photos`, `gameScores`, and `quizQuestions`. This is a relation field only — the foreign key lived on `SocialAccount`, so no column is dropped from the `User` table.

- [ ] **Step 2: Verify the schema is valid and contains only what it should**

```bash
pnpm --filter @allonfire/database exec prisma validate
grep -E "^model |^enum " packages/database/prisma/schema.prisma
```

Expected: `The schema at prisma/schema.prisma is valid`, followed by exactly these 11 lines:

```
enum Role {
model User {
model Session {
model Account {
model Verification {
model Photo {
model Favorite {
enum GameType {
model GameScore {
model QuizQuestion {
model QuizAnswer {
```

The package name `@allonfire/database` is verified against `packages/database/package.json`.

- [ ] **Step 3: Remove the mock-data seeding from `seed.ts`**

Three edits to `packages/database/src/seed.ts`:

**(a)** Replace the type import block at lines 4-12:

```ts
import type {
  Platform,
  PostStatus,
  PostType,
  PromptRating,
  Role,
  TopicCategory,
  TopicStatus,
} from "../generated/prisma/client";
```

with:

```ts
import type { Role } from "../generated/prisma/client";
```

**(b)** In `main()`, delete the Social viewer block at lines 82-91:

```ts
  const socialViewerHash = await hashPassword(seedEnv.SOCIAL_VIEWER_PASSWORD);
  await upsertUser(
    {
      email: seedEnv.SOCIAL_VIEWER_EMAIL,
      name: seedEnv.SOCIAL_VIEWER_EMAIL.split("@")[0] ?? "social-viewer",
      role: "VIEWER",
      allowedApps: ["social"],
    },
    socialViewerHash
  );
```

Also update the comment above it from `// Always seed viewer accounts (like admin, available in all modes)` to `// Always seed the Laura viewer account (like admin, available in all modes)`.

**(c)** Delete everything from the `await seedMockData();` call through the end of the `seedMockData` function — that is, line 117 plus lines 121-236 (the `TopicJson`, `PromptJson`, and `PostJson` types and the whole `seedMockData` function).

After the edit, the `SEED_MODE === "dev"` branch ends at:

```ts
    console.log(`\nSeeded ${testUsers.length} test users`);
  }
}
```

and `main().then(...)` follows directly. `readSeedFile` stays — `users.json` still uses it.

- [ ] **Step 4: Remove the now-unused Social env vars**

In `packages/database/src/seed-env.ts`, delete lines 12-13:

```ts
    SOCIAL_VIEWER_EMAIL: z.email(),
    SOCIAL_VIEWER_PASSWORD: z.string().min(8),
```

and change the comment on line 11 from `// Required: viewer accounts seeded alongside admin` to `// Required: Laura viewer account seeded alongside admin`. Leaving them in place would make the seed script demand credentials for an app that no longer exists.

- [ ] **Step 5: Delete the Social-only seed files and script**

```bash
git rm packages/database/src/export-topics.ts \
       packages/database/seed-data/topics.json \
       packages/database/seed-data/prompts.json \
       packages/database/seed-data/posts.json
```

Then remove this line from the `scripts` block of `packages/database/package.json`:

```json
    "db:export-topics": "tsx --env-file=.env src/export-topics.ts",
```

Keep `seed-data/users.json` — the dev seed still reads it.

- [ ] **Step 6: Regenerate the client and verify everything is green**

```bash
pnpm install
pnpm db:generate
pnpm check-types
pnpm test
pnpm build
```

Expected: all pass. If `check-types` reports an error inside `apps/social`, `packages/social-publisher`, or `packages/content-generator`, then Task 3 did not exclude them — go back and fix the workspace file rather than editing those packages.

- [ ] **Step 7: Confirm no Social model reference survives in active packages**

```bash
grep -rn "SocialAccount\|AiProvider\|WebhookLog\|TopicCategory\|PromptRating\|ProviderType" \
  packages/database/src packages/database/prisma packages/auth/src apps/laura/src 2>/dev/null \
  && echo "FOUND - FIX" || echo "clean OK"
```

Expected: `clean OK`

- [ ] **Step 8: Commit**

```bash
git add packages/database pnpm-lock.yaml
git commit -m "refactor(database): remove social models, seeding, and env from shared schema"
```

---

### Task 5: Retire Social from root scripts and documentation

Two of these are not cosmetic: `dev:mobile` and `dev:tunnel` shell out to `pnpm --filter @allonfire/social`, which **fails outright** once Task 3 removes that package from the workspace.

**Files:**
- Modify: `package.json` (root — `description` and `scripts`)
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the workspace exclusion from Task 3.
- Produces: a root `package.json` whose every script targets a package that still exists.

- [ ] **Step 1: Remove the Social scripts from the root `package.json`**

Delete these four entries from the `scripts` block:

```json
    "dev:mobile": "pnpm --filter @allonfire/social dev:mobile",
    "dev:tunnel": "pnpm --filter @allonfire/social dev:tunnel",
    "db:export-topics": "pnpm --filter @allonfire/database db:export-topics",
    "docker:build:social": "docker build --build-arg APP_NAME=social -f docker/Dockerfile -t allonfire-social .",
    "docker:deploy:social": "pnpm docker:build:social && docker compose -f docker/docker-compose.prod.yml up -d social",
```

Then change `docker:build:all` from:

```json
    "docker:build:all": "pnpm docker:build:social && pnpm docker:build:laura",
```

to:

```json
    "docker:build:all": "pnpm docker:build:laura",
```

Keep `n8n:import` — n8n is staying. Keep `db:seed`, `docker:build:laura`, `docker:deploy:laura`, and `video`.

- [ ] **Step 2: Update the root package description**

Change the `description` field from:

```json
  "description": "Turborepo monorepo powering AI-driven social content automation and an interactive Laura site with photos and games",
```

to:

```json
  "description": "Turborepo monorepo powering an interactive Laura site with photos and games",
```

- [ ] **Step 3: Verify no root script targets a removed package**

```bash
grep -n "filter @allonfire/social\|APP_NAME=social\|up -d social\|db:export-topics" package.json \
  && echo "STILL REFERENCED - FIX" || echo "root scripts clean OK"
```

Expected: `root scripts clean OK`

- [ ] **Step 4: Remove the Social section from `README.md`**

Delete the Social app block under `## 📱 Apps` — the commented-out screenshot line, the `<p align="center">` logo block referencing `docs/assets/allonfire-social-horizontal.svg`, the `<h3 align="center">Social Media Dashboard</h3>` heading, and its badge/description/link content, up to where the Laura app section begins. The README is public-facing and currently advertises a URL that will stop resolving.

Leave the Laura section, the intro paragraph, and every other section untouched.

- [ ] **Step 5: Mark Social as retired in `CLAUDE.md`**

`CLAUDE.md` documents Social's models, dashboard routes, and app structure. The source is staying on disk, so that documentation is not wrong — it is just no longer live. Rather than deleting it, add this note directly beneath the top-level heading:

```markdown
> **Social is retired (2026-07-29).** `apps/social` and its packages remain on disk for
> reference but are excluded from the pnpm workspace — they are never installed, type-checked,
> built, or deployed. Its database tables have been dropped. Sections below describing Social
> models, routes, and structure are historical. n8n is still running and available for future
> automations.
```

Then, in the database models list, change the `**Social:**` line to read:

```markdown
- **Social (retired, tables dropped 2026-07-29):** `Topic`, `Prompt`, `Post`, `AiProvider`, `SocialAccount`, `Settings`, `WebhookLog`
```

- [ ] **Step 6: Verify the workspace still builds**

```bash
pnpm check-types && pnpm test && pnpm build
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add package.json README.md CLAUDE.md
git commit -m "docs(social): retire social from root scripts and documentation"
```

---

### Task 6: Deploy the stack without Social

**Files:** none. Operates on Dokploy and the VPS.

**Interfaces:**
- Consumes: the commits from Tasks 2-5.
- Produces: a running stack with `laura` and `minio` containers and no `social` container.

- [ ] **Step 1: Determine which branch Dokploy actually deploys**

The local checkout is on `feat/video-pipeline-foundation`, which is **active unrelated work**. Open the Dokploy UI for the `applications-allonfire-nrnhaj` application and read its configured branch. Do not assume, and do not merge the video-pipeline branch as a side effect of this plan.

- [ ] **Step 2: Merge and push to that branch**

Merge only the four commits from Tasks 2-5 into the deploying branch, then push.

- [ ] **Step 3: Redeploy in Dokploy**

Trigger a redeploy of `applications-allonfire-nrnhaj`.

**Expect brief Laura downtime.** Laura, Social, and MinIO are one compose stack, so a redeploy restarts Laura too. This is known and accepted.

- [ ] **Step 4: Verify the container list**

```bash
ssh main-vps 'docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "allonfire|n8n"'
```

Expected: `applications-allonfire-nrnhaj-laura-1` and `-minio-1` are `Up`, `applications-n8n-e65i3g…` is `Up`, and **no** `-social-1` line appears.

- [ ] **Step 5: Verify Laura and MinIO still serve**

```bash
curl -s -o /dev/null -w "laura=%{http_code}\n" https://laura.isaiariva.com
curl -s -o /dev/null -w "minio=%{http_code}\n" https://minio.isaiariva.com
```

Expected: `laura=200`. For MinIO, any non-5xx code is fine — it sits behind the `admin-gate@file` middleware, so a 401/403 is a healthy answer.

---

### Task 7: Drop the Social tables from production

**Irreversible.** Do not start until Task 1 Step 3 printed `ok` for all nine tables, and Task 6 confirmed the Social container is gone.

**Files:** none. Operates on the production database over SSH.

**Interfaces:**
- Consumes: the verified dump at `~/allonfire-2026-07-29.sql`.
- Produces: an `allonfire` database with Social's 7 tables and 8 enum types removed and Laura's intact.

- [ ] **Step 1: List the real table and type names before assuming any**

```bash
ssh main-vps 'PG=$(docker ps --filter name=dokploy-postgres --format "{{.Names}}" | head -1); \
  docker exec $PG psql -U $(docker exec $PG printenv POSTGRES_USER) -d allonfire -c "\dt" -c "\dT"'
```

Prisma applies no `@@map`, so table names should match the model names verbatim and be case-sensitive. Confirm that against this output. If the real names differ, adjust the SQL in Step 2 to match what is printed — do not run it blind.

- [ ] **Step 2: Drop the tables and types in one transaction**

```bash
ssh main-vps 'PG=$(docker ps --filter name=dokploy-postgres --format "{{.Names}}" | head -1); \
  docker exec -i $PG psql -U $(docker exec $PG printenv POSTGRES_USER) -d allonfire' <<"SQL"
BEGIN;
DROP TABLE IF EXISTS "Post" CASCADE;
DROP TABLE IF EXISTS "Prompt" CASCADE;
DROP TABLE IF EXISTS "Topic" CASCADE;
DROP TABLE IF EXISTS "SocialAccount" CASCADE;
DROP TABLE IF EXISTS "Settings" CASCADE;
DROP TABLE IF EXISTS "AiProvider" CASCADE;
DROP TABLE IF EXISTS "WebhookLog" CASCADE;
DROP TYPE IF EXISTS "PromptRating" CASCADE;
DROP TYPE IF EXISTS "TopicCategory" CASCADE;
DROP TYPE IF EXISTS "TopicStatus" CASCADE;
DROP TYPE IF EXISTS "PostType" CASCADE;
DROP TYPE IF EXISTS "PostStatus" CASCADE;
DROP TYPE IF EXISTS "Platform" CASCADE;
DROP TYPE IF EXISTS "MediaType" CASCADE;
DROP TYPE IF EXISTS "ProviderType" CASCADE;
COMMIT;
SQL
```

Expected: a `DROP TABLE` / `DROP TYPE` line per statement and a final `COMMIT`. A single error rolls the whole transaction back — nothing is half-dropped.

- [ ] **Step 3: Verify Laura's tables survived and Social's are gone**

```bash
ssh main-vps 'PG=$(docker ps --filter name=dokploy-postgres --format "{{.Names}}" | head -1); \
  docker exec $PG psql -U $(docker exec $PG printenv POSTGRES_USER) -d allonfire -t -c \
  "SELECT tablename FROM pg_tables WHERE schemaname = '"'"'public'"'"' ORDER BY tablename;"'
```

Expected exactly: `Account`, `Favorite`, `GameScore`, `Photo`, `QuizAnswer`, `QuizQuestion`, `Session`, `User`, `Verification`. No `Topic`, `Prompt`, `Post`, `SocialAccount`, `AiProvider`, `Settings`, or `WebhookLog`.

- [ ] **Step 4: Confirm Laura still works against the reduced schema**

```bash
curl -s -o /dev/null -w "laura=%{http_code}\n" https://laura.isaiariva.com
```

Expected: `laura=200`. Then open the site, log in, and load the gallery and the games leaderboard — the paths that actually exercise `Photo` and `GameScore` queries.

---

### Task 8: Remove DNS and run final verification

**Files:** none.

**Interfaces:**
- Consumes: a deployed stack with no Social service.
- Produces: `social.isaiariva.com` no longer resolving.

- [ ] **Step 1: Delete the DNS record (manual — the user does this)**

In Cloudflare, open zone `isaiariva.com` → **DNS** → find the `social` record pointing to `188.245.174.30` → delete it.

It is a DNS-only record (not proxied — `dig` returns the origin IP directly), so deletion takes effect as soon as the TTL expires. Leave `laura`, `minio`, `www`, and the apex records alone.

- [ ] **Step 2: Verify DNS is gone**

Run: `dig +short social.isaiariva.com`
Expected: no output. If the old IP still appears, the TTL has not expired yet — wait and retry rather than re-deleting.

- [ ] **Step 3: Full end-state verification**

```bash
echo "--- DNS ---"
dig +short social.isaiariva.com | grep . && echo "social STILL RESOLVES" || echo "social gone OK"
dig +short laura.isaiariva.com | grep -q . && echo "laura DNS OK" || echo "laura DNS MISSING"

echo "--- HTTP ---"
curl -s -o /dev/null -w "laura=%{http_code}\n" https://laura.isaiariva.com
curl -s -o /dev/null -w "portfolio=%{http_code}\n" https://www.isaiariva.com

echo "--- containers ---"
ssh main-vps 'docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "allonfire|n8n"'

echo "--- n8n volume intact ---"
ssh main-vps 'docker volume ls | grep n8n-data'
```

Expected: `social gone OK`, `laura DNS OK`, `laura=200`, `portfolio=200`, Laura + MinIO + n8n containers `Up` with no Social container, and `n8n-data` still listed.

- [ ] **Step 4: Confirm n8n was left untouched**

```bash
git status --short n8n/
ssh main-vps 'docker service ls | grep n8n'
```

Expected: no output from `git status` (workflows unmodified) and the n8n service showing `1/1`.

---

## Rollback

| Failure point | Response |
|---|---|
| Tasks 2-5 | Local commits — `git revert` the offending commit and re-run `pnpm build` |
| Task 6 redeploy breaks Laura | Revert the Task 2-5 commits and redeploy. The schema is still intact at this point, so Laura returns to a fully working state |
| Task 7 drops something needed | `ssh main-vps 'PG=$(docker ps --filter name=dokploy-postgres --format "{{.Names}}" \| head -1); docker exec -i $PG psql -U $(docker exec $PG printenv POSTGRES_USER) -d allonfire' < ~/allonfire-2026-07-29.sql` |
| Task 8 DNS deleted by mistake | Recreate an A record `social` → `188.245.174.30`, DNS-only (grey cloud) |

## Done When

- `social.isaiariva.com` does not resolve.
- No `-social-1` container is running; Laura and MinIO are `Up` and serving.
- `allonfire` contains exactly 9 tables, all Laura or auth.
- n8n's app, volume, and workflow files are byte-for-byte untouched.
- `pnpm check-types && pnpm test && pnpm build` pass on the deploying branch.
- No root `package.json` script references a package outside the workspace.
- `packages/video-pipeline` and `packages/video-overlays` are unmodified.
