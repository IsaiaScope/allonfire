# Storage Overview (on Home) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home shows the Storage overview: one card for the `image` bucket (Images and Avatars) with total badges (objects, size, Images), and a bar chart of public vs private bytes per App.

**Status:** implemented (uncommitted) @ 2026-11-09T18:21:01+01:00

**Architecture:** A new Admin-only API route `GET /v1/storage/overview` answers the card and the chart in one body: the bucket listing (S3, kept 5 minutes in Redis) plus a database aggregate of Images (fresh). The Back Office reads it like Users: private-cache hydration, TanStack Query view, `updateTag` plus `invalidateQueries` on every Image change. The chart is a generic AOF bar chart in `packages/ui` over shadcn `chart` (Recharts).

**Tech Stack:** Hono + hono-openapi, ioredis, `@aws-sdk/client-s3`, Prisma raw SQL, Next 16 (Cache Components), TanStack Query, shadcn `chart`/Recharts 3, next-intl, Vitest (unit, integration, browser), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-storage-analytics-design.md` (survey: `…-storage-analytics-library-survey.md`). Builds on uncommitted work of `docs/superpowers/plans/2026-11-09-storage-images.md` (Images page, numbered `GET /images`).

## Documentation checked

`AGENTS.md`; `docs/guides/back-office.md` (**data checklist**, mapped below), `api.md`, `images.md`, `next-apps.md`, `design-system.md`, `testing.md`, `deployment.md`, `conventions.md`, `package-layout.md`; ADR 0028 (private cache, Version), 0020, 0027. Next docs: `packages/core/node_modules/next/dist/docs/` (`use cache: private`).

| Data checklist point | Where this plan does it |
|---|---|
| 1 TanStack Query over private cache | Task 5 (`storageOverviewHydration`, `storageOverviewQuery`, `StorageView` `useQuery`) |
| 2 Both copies refreshed | Task 5 (`updateTag(STORAGE.CACHE.TAG)` in Image actions, `invalidateQueries(QUERY.STORAGE.ALL)` in Image mutations) |
| 3 Resource protection twice | Task 3 (API guard, 401/403 tests), Task 6 (Home stays `signedInPage`; a 403 hides the block) |
| 4 Resource changed | Read-only page: no Version, no save. Staleness is bounded by the 5 min `stale` and the 5 min Redis listing; the body carries `asOf` and the card shows it (Task 6). Image saves keep their own Version (plan 1) |
| 5 Lost and gone | No single resource to lose; an unreadable bucket is the card's error state (Task 3, 6) |

## Global Constraints

- Words: the UI says "Images and Avatars" with `image` as a muted caption; never "bucket" as the concept (CONTEXT.md: Storage).
- Constants one nested object per owner; no string-literal paths or error codes (tests included); no `as` casts but `as const`; core helpers for object keys and JSON.
- Test file first line `// @module-tag unit` or `// @module-tag integration`; Vitest globals; tests before code.
- Server Components by default; the chart is the one small `"use client"` leaf (in `packages/ui`, named `AOF…`).
- Pages through `/aof-design`: one build, one screenshot round.
- Env vars start with their owner. This plan removes `TELEMETRY_URL`.
- Never commit (iso-write). exFAT: scanners ignore `**/._*`.

## Review Focus

1. The bucket cannot be listed (S3 down): the route still answers 200 with `bucket: null` and the database part; the card shows its error state and the chart draws. Pinned in Task 3 and Task 6.
2. Nothing stored (empty bucket, no Images): zeros, an empty state, no `NaN` or empty-axis chart. Task 4 and Task 6.
3. An Image in two Apps: counted in each App's bars, once in the totals (`byApp` sum may exceed `totalBytes`). Task 1.
4. Redis down: the listing is read without the cache, never a 500. A bucket over 1000 objects: the listing pages through continuation tokens. Task 2 and Task 3.
5. A Back Office member who is not an Admin: the API answers 403 and Home shows its heading and description without the block, no error toast. Task 6.

---

### Task 1: Image stats in the database

**Files:**
- Modify: `packages/database/src/features/image/image.service.ts`
- Test: `packages/database/src/features/image/tests/image.integration.test.ts`
- Modify: `packages/database/README.md` (one line)

**Interfaces:**
- Produces: `imageStats(): Promise<ImageStats>` with
  `ImageStats = { total: number; totalBytes: number; byApp: ImageAppStat[] }`,
  `ImageAppStat = { app: App; publicBytes: number; publicCount: number; privateBytes: number; privateCount: number }`. `byApp` lists every `App` that has an Image, in `App` enum order; `total`/`totalBytes` count each Image once.

- [x] **Step 1: Write failing tests** in `image.integration.test.ts` (new `describe("imageStats")`): `answers zeros and no Apps when there are no Images`; `counts an Image placed in two Apps once in the totals and in each App's bars`; `splits an App's bytes by access`; `lists Apps in enum order`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/database test image.integration`. Expected: FAIL, `imageStats` not exported.
- [x] **Step 3: Implement `imageStats`** in `image.service.ts`: totals from `prisma.image.aggregate({ _count, _sum: { bytes } })`; `byApp` from one `$queryRaw` grouping `image."ImageApp"` joined to `image."Image"` by `app` and `access` with `SUM(bytes)` and `COUNT(*)` cast to `int`/`Number`; fold the rows into one `ImageAppStat` per App (no `as`: narrow `App`/`ImageAccess` with the enum schemas).
- [x] **Step 4: Run** the same command. Expected: PASS.
- [x] **Step 5:** Add one line to `packages/database/README.md` naming `imageStats`; run `pnpm exec biome check --write packages/database/src/features/image`.

### Task 2: Bucket totals in the storage package

**Files:**
- Modify: `packages/storage/src/features/s3/utils/objects.ts`, `packages/storage/src/features/image/objects/utils/image-objects.ts`
- Test: `packages/storage/src/features/s3/tests/objects.test.ts` (create if absent, else extend), `packages/storage/src/features/image/objects/tests/` (the existing image-objects test file)
- Modify: `packages/storage/README.md` (one line)

**Interfaces:**
- Produces: `listBucketTotals(bucket: string): Promise<BucketTotals>` in `s3/utils/objects.ts`; `imageBucketTotals(): Promise<BucketTotals>` in `image-objects.ts` (the Images' bucket, `env.STORAGE_BUCKET`); `BucketTotals = { bytes: number; objects: number }`.

- [x] **Step 1: Write failing tests** (`// @module-tag unit`, mock `s3.send`): `sums Size and counts Contents over one page`; `follows NextContinuationToken until the listing is complete` (two pages); `answers zeros for an empty bucket`; `lets a refused listing throw`; `imageBucketTotals lists env.STORAGE_BUCKET`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/storage test objects`. Expected: FAIL, not defined.
- [x] **Step 3: Implement** with `ListObjectsV2Command`, one request per page (no `MaxKeys` override), looping on `NextContinuationToken`.
- [x] **Step 4: Run** the same command. Expected: PASS.
- [x] **Step 5:** README line; biome check on the touched files.

### Task 3: The Overview route in the API

**Files:**
- Create: `apps/api/src/features/storage-usage/constants/storage-usage.ts` (`STORAGE_USAGE`: `PATH: { BASE: "/storage", OVERVIEW: "/overview" }`, `CACHE: { KEY: "storage:bucket-totals", TTL_MS: 5 * UNIT.MS_PER_MINUTE }` using core's `UNIT`, `DOC` strings)
- Create: `apps/api/src/features/storage-usage/constants/schemas.ts` (`overviewBodySchema`, type `OverviewBody`)
- Create: `apps/api/src/features/storage-usage/utils/deps.ts` (`StorageUsageDeps`), `utils/bucket-reader.ts` (`createBucketReader`)
- Create: `apps/api/src/features/storage-usage/routes/{routes.ts,handlers.ts,index.ts}` (`storageUsageRoutes(deps)`, same shape as `services/routes`)
- Create: `apps/api/src/features/storage-usage/storage-usage-deps.ts` (the real deps)
- Modify: `apps/api/src/shared/constants/api.ts` (`API.PATH.STORAGE_USAGE`), `apps/api/src/app.ts` (`AppDeps.storageUsage`, `.route(API.PATH.STORAGE_USAGE, …)`), `apps/api/src/index.ts`, `apps/api/README.md`
- Test: `apps/api/src/features/storage-usage/tests/{routes.test.ts,bucket-reader.test.ts,stub-storage-usage-deps.ts}`; update every existing test app builder that constructs `AppDeps` (found by `tsc`), `docs/tests/spec.test.ts`

**Interfaces:**
- Consumes: `imageStats` (Task 1), `imageBucketTotals` (Task 2), `canManageUsers` from `features/users/user-deps` (a Back Office Admin read now, as `servicesDeps.canManage`), `mailRedis`-style shared Redis accessor (reuse `mailRedis` from `features/mail/mail-deps`, as Services does).
- Produces: `GET /v1/storage/overview` → `{ asOf: string (ISO), bucket: { id: "image", objects, bytes } | null, images: ImageStats }`; `StorageUsageDeps = { canManage(ids: { sessionId: string; userId: string }): Promise<boolean>; imageStats: typeof imageStats; bucketTotals(): Promise<{ asOf: Date; totals: BucketTotals } | null> }`.

- [x] **Step 1: Write failing tests.** `routes.test.ts`: `answers 401 without a Session`; `answers 403 to a signed-in User who is not a Back Office Admin`; `answers the bucket and the Image stats to an Admin`; `answers 200 with bucket null when the listing fails` (`bucketTotals` resolves null); `asks the Session fresh (canManage gets session and user ids)`. `bucket-reader.test.ts`: `reads the listing once and keeps it for five minutes`; `lists again after the TTL`; `lists every time when Redis is down`; `answers null and keeps nothing when the listing throws`; `answers the kept asOf for a cache hit`. `spec.test.ts`: the OpenAPI document lists the route and model `StorageOverview`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/api test storage-usage spec`. Expected: FAIL, modules missing.
- [x] **Step 3: Implement** `createBucketReader({ list, redis, now, logger })` modelled on `services/utils/usage-reader.ts` (JSON via core helpers + a zod schema, `redis().set(key, value, "PX", ttl)`, failures logged `warn` and read as a miss; a null result is never kept). Handlers use `guard` like `services/routes/handlers.ts`; the OpenAPI route uses the DOC strings and `overviewBodySchema`.
- [x] **Step 4: Mount** in `app.ts`; wire the real deps in `storage-usage-deps.ts` and `index.ts`; add the stub to every test app; fix compile errors from `pnpm --filter @allonfire/api exec tsc --noEmit`.
- [x] **Step 5: Run** `pnpm --filter @allonfire/api test`. Expected: PASS (full API suite).
- [x] **Step 6:** `apps/api/README.md` route row; `docs/guides/api.md` one bullet (route, Admin only, 5 min Redis); biome check.

### Task 4: AOF bar chart in `packages/ui`

**Files:**
- Create: `packages/ui/src/features/chart/components/aof-bar-chart.tsx`
- Test: `packages/ui/src/features/chart/tests/aof-bar-chart.browser.test.tsx` (mirror the radial meter's test style)

**Interfaces:**
- Produces: `AOFBarChart` (client) — props extend `Omit<ComponentProps<typeof ChartContainer>, "children" | "config">`; adds `"aria-label": string`, `data: readonly Record<string, string | number>[]`, `category: string` (the row key on the X axis), `series: readonly { color: string; key: string; label: string }[]`, `valueFormat?: (value: number) => string`, `emptyLabel: string`. Renders grouped bars (`BarChart`, `Bar` per series, `CartesianGrid`, `XAxis`, `ChartTooltip`, `ChartLegend`); when `data` is empty or every value is 0 renders `emptyLabel` instead of axes. Colors are CSS colours from the Design (`var(--chart-1)`), corners from `--radius`.

- [x] **Step 1: Write failing tests**: `names the chart with its aria-label`; `draws one bar group per row and a legend entry per series`; `shows emptyLabel and no axes when every value is 0`; `formats the tooltip value with valueFormat`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/ui test:browser aof-bar-chart`. Expected: FAIL.
- [x] **Step 3: Implement** over `@allonfire/shadcn/components/chart` and `recharts` as `aof-radial-meter.tsx` does; no `rounded-full`; classes via `cva`/`cn`.
- [x] **Step 4: Run** the same command. Expected: PASS. Biome check.

### Task 5: Back Office data layer

**Files:**
- Create: `apps/back-office/src/features/storage/constants/storage.ts` (`STORAGE`: `CACHE: { TAG: "storage", LIFE: { stale: 300, revalidate: 1800, expire: 3600 } }`)
- Create: `apps/back-office/src/features/storage/utils/{storage-queries.ts,storage-hydration.ts}`, `hooks/use-refresh-storage.ts`
- Modify: `apps/back-office/src/shared/constants/query.ts` (`QUERY.STORAGE: { ALL, OVERVIEW }`), `shared/tests/msw/handlers.ts` (`STORAGE_OVERVIEW_URL`, a default `OVERVIEW` body), `features/images/actions/delete-images.ts` (`updateTag(STORAGE.CACHE.TAG)` beside the Images tag, in every branch that clears it), `features/images/utils/images-mutations.ts` (also `invalidateQueries({ queryKey: QUERY.STORAGE.ALL })`)
- Test: `features/storage/utils/tests/storage-queries.test.ts`, `features/images/actions/tests/delete-images.test.ts` (extend)

**Interfaces:**
- Produces: `fetchStorageOverview(client: ApiClient)` (`parseResponse` of `client[API.VERSION.CURRENT].storage.overview.$get()`, typed from the API's route), `storageOverviewKey`, `storageOverviewQuery(client)` (`staleTime: "static"`), `storageOverviewHydration(): Promise<DehydratedState>` (`"use cache: private"`, `cacheTag(STORAGE.CACHE.TAG)`, `cacheLife(STORAGE.CACHE.LIFE)`, dehydrate inside), `useRefreshStorage(): () => Promise<void>`.
- Plan 1 Task 8 (`addImage`/`editImage` actions) must also call `updateTag(STORAGE.CACHE.TAG)` and use the invalidating mutations; this task leaves that line in the Images feature README note.

- [x] **Step 1: Write failing tests**: `storageOverviewQuery is never stale on a clock` (staleTime `"static"`, key equals `QUERY.STORAGE.OVERVIEW`); `delete-images clears the Storage tag with the Images tag when deleted and when gone`; `images mutations invalidate QUERY.STORAGE.ALL`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test storage-queries delete-images images-mutations`. Expected: FAIL.
- [x] **Step 3: Implement** the files above, patterned on `features/services/utils/services-queries.ts` and `services-hydration.ts` and `use-refresh-services.ts`.
- [x] **Step 4: Run** the same command, then `pnpm --filter @allonfire/back-office exec tsc --noEmit`. Expected: PASS, no type errors.

### Task 6: The overview on Home

**Files:**
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/page.tsx` (keep `generateMetadata`, heading and description; add the overview in its own `Suspense` with `StorageSkeleton`, fed by `storageOverviewHydration()`); layout stays `centered`-friendly or becomes `stack` as the design needs
- Create: `features/storage/components/{storage-view.tsx,storage-card.tsx,storage-skeleton.tsx}` and tests in `components/tests/`
- Modify: `features/i18n/translations/{en,it}.json` (a `Storage` block: `card.title` "Images and Avatars", `card.caption` "image", badges `objects`/`size`/`images`, `asOf`, `error`, `empty`, `chart.title`/`chart.caption` (an Image in several Apps counts in each), `chart.public`/`chart.private`, `open`)
- Move: `features/images/utils/format-bytes.ts` (+ test) to `shared/utils/` (Overview uses it); update importers
- Unchanged: `sections.ts`, `storage/page.tsx` (still the redirect to Images)

**Interfaces:**
- Consumes: Task 5 (`storageOverviewQuery`, hydration), Task 4 (`AOFBarChart`), `formatBytes`.
- Produces: `StorageView` (client; `useQuery(storageOverviewQuery(api))`; renders nothing for a 403, the card's error state for any other failure), `StorageCard` props `{ bucket: Bucket | null; images: ImageStats; asOf: string }`.

- [x] **Step 1: Write failing tests** (`storage-view.browser.test.tsx`, MSW): `shows the objects, size and Images badges`; `shows the card's error state and still draws the chart when bucket is null`; `shows the empty state when nothing is stored`; `shows asOf`; `draws one bar group per App with Public and Private series` (bytes from `byApp`); `draws nothing for the block when the API answers 403`; `links to the Images page`. Plus a page test that Home still renders its heading and description.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:browser storage-view`. Expected: FAIL.
- [x] **Step 3: Build through `/aof-design`** (`--app back-office`): Home keeps its Server Components shell; `StorageView` is the one client component; `AOFPage`, `AOFBadge` for the totals; Japan Design restraint (no large decoration). One build, one screenshot round (phone 390 and desktop, light and dark) through `/iso-browser` on the owner's `localhost:3400` tab.
- [x] **Step 4: Run** the browser command, `pnpm --filter @allonfire/back-office test` and `pnpm --filter @allonfire/back-office exec tsc --noEmit`. Expected: PASS (includes the static check that every page under `(signed-in)` is in `SECTIONS` and gates itself).
- [x] **Step 5:** biome check on touched files.

### Task 7: Remove the telemetry link

**Files:**
- Modify: `apps/back-office/src/environment/environment.ts`, `environment/tests/environment.test.ts`, `apps/back-office/.env.example`, `docker/docker-compose.prod.yml`, `packages/config/local/tests/prod-compose.test.ts`
- Delete: `apps/back-office/src/features/images/utils/observe-link.ts`, `utils/tests/observe-link.test.ts`
- Modify: `docs/superpowers/specs/2026-11-09-storage-images-design.md` and `plans/2026-11-09-storage-images.md` (strike the OpenObserve link goal: one line pointing here)

- [x] **Step 1: Update tests first**: drop the `TELEMETRY_URL` cases from `environment.test.ts` and `prod-compose.test.ts`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test environment` and `pnpm --filter @allonfire/config test prod-compose`. Expected: PASS (fewer cases).
- [x] **Step 3: Remove** the variable from the four files and delete the util and its test.
- [x] **Step 4: Verify** `grep -rIl "TELEMETRY_URL\|observeLink\|observe-link" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git` prints only docs under `docs/superpowers`. Re-run both test commands. Expected: PASS.

### Task 8: End-to-end, docs, final checks

**Files:**
- Create: `apps/back-office/e2e/storage-overview.spec.ts`; modify `e2e/smoke.spec.ts` if it asserts Home's content
- Modify: `docs/guides/back-office.md` (Home paragraph: the overview block, hydration tag, refresh from Image actions), `docs/guides/images.md` (Overview note), `docs/guides/deployment.md` (no `TELEMETRY_URL`), `docs/guides/api.md` (done in Task 3), `CONTEXT.md` only if a new term appeared (it did not)
- Modify: this plan (tick boxes, `**Status:**`, Implementation Log)

- [x] **Step 1: Write the e2e** (`// @module-tag integration` style of the existing specs): `an Admin opening Home sees the Images and Avatars card with its badges`; `a signed-out visit goes to Sign in`; a `@next/playwright` `instant()` check that the page's static shell commits (follow `instant.spec.ts` from plan 1 if present).
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:e2e storage-overview`. Expected: PASS.
- [x] **Step 3: Docs** as listed; run the doc-review pass of iso-write (guides against the code).
- [x] **Step 4: Full checks**: `pnpm --filter @allonfire/database test`, `@allonfire/storage test`, `@allonfire/api test`, `@allonfire/ui test:browser`, `@allonfire/back-office test` and `test:browser`, `tsc --noEmit` in each, `pnpm exec biome check` on touched paths. Expected: all green.

## Implementation Log
- Implemented: 2026-11-09T18:21:01+01:00
- Workspace: current-branch — feat/instant-users-navigation
- Committed: no — awaiting user review
- Rulings: `imageStats` lives in `image-stats.ts` (the service file hit the 300-line lint) and folds placements in memory; its tests read deltas (the shared database holds Fixtures); the Home block replaced the planned Overview page (user, 2026-11-09); the Images list now keeps its filters in one `search` param (ADR 0026) with `IMAGE.SEARCH`, the API's `access` query was dropped and `app` kept; the screenshot round (`/aof-design`) is not done yet.
