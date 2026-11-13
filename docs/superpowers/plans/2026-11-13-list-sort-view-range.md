# Lists: Sort, View and a date range in one Filter panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **No commits:** `/iso-write` stops before any commit; every "Check" step is a test or static run, never `git commit`.

**Goal:** The Users and Images lists sort by up to three plain columns, hide columns, and filter Created by a date range, all from one Filter panel with Filter / Sort / View tabs, plus a tablecn-style Asc / Desc / Hide menu on each column header; Prisma moves from 6.19 to 7.10.1 first.

**Code state:** reconciled on 2026-11-13 with the working tree after the Storage > Images add/edit work (`2026-11-13-storage-images-add-edit.md`, implemented, uncommitted, same branch). Work alongside its uncommitted edits to `image-columns.tsx`, `images-table.browser.test.tsx`, `e2e/images.spec.ts`, `en.json`, `it.json` and `search-toolbar.tsx`; never revert them. The branch's iso-review pass (thread `f39c286b`, finished 2026-11-13) left the lists' columns, params and table state as described here; it added the shared `useToastThenList`, `altFor`/`isBaseLanguage` in `features/images/utils/image-alt.ts`, and made every test build texts with `enT(...)` (never `.replace("{x}", …)`) and every e2e selector from constants (`BACK_OFFICE.PAGE.STORAGE_IMAGES`, `IMAGES.PATH.NEW`), which the new tests and specs here follow too.

**Architecture:** Core owns the address grammar (`sort`, `hide`, a range field in `search`, ADR 0031). The database services order and range-filter in Prisma (plain columns only, `id` the last tiebreak); the API validates and passes them through. `packages/ui` gets generic parts (header menu, tabbed `AOFFilterPanel`, sort panel, view panel, date range filter) built on TanStack Table v9's sorting and visibility features; the Back Office lists supply column tables and wire them to nuqs params.

**Tech Stack:** Prisma 6.19 → 7.10.1 + `@prisma/adapter-pg`, Hono, zod 4, TanStack Table v9 (`rowSortingFeature`, `columnVisibilityFeature`) and Query, nuqs, shadcn (`tabs`, `dropdown-menu`, `popover`, `select`, `checkbox`, `calendar`: all already in `packages/shadcn`), Vitest (unit, integration, browser), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-list-sort-view-design.md`. Also `docs/adr/0031-a-lists-sort-and-view-are-params-of-their-own.md` (new), `docs/adr/0026-a-list-filters-in-one-search-param.md`, `CONTEXT.md` (**Filter panel**, **Sort**, **View**, already written).

**Guides read for this plan** (cite in code reviews): `docs/guides/conventions.md` (helpers, constants), `code-style.md`, `package-layout.md` (files under `src/{environment,shared,features}`, export keys), `next-apps.md` (data checklist), `back-office.md`, `api.md`, `database.md` (raw SQL names the schema; Prisma), `testing.md` (first-line `// @module-tag`, no Tailwind-class assertions, copy from translators), `design-system.md`, `writing.md`. Next: `packages/core/node_modules/next/dist/docs/` before touching Next code. TanStack Table v9 and Prisma 7 docs: Context7 (`/prisma/orm/7.10.1`).

## Global Constraints

- Sort and View are params of their own: `sort=created.desc,size.asc`, `hide=size,apps`; the range is one more `search` field: `created:2026-11-26..2026-11-28`, one day `created:2026-11-26`, whole UTC days, both ends included (ADR 0031).
- At most **3** sorts; no `sort` means Created desc, `id` last tiebreak always. A `sort` column, `hide` column, direction or date the list does not know is dropped, never an error.
- Column ids are the grammar's names. Today both lists' date column is `createdAt` (an accessor); it gets `id: "created"` so `sort=created.desc`, `hide=created` and `created:…` agree (the lists' `FILL` arrays follow). Users' App columns keep their ids, the `App` enum values (`LAURA`, `BACK_OFFICE`): `hide=LAURA`.
- Sortable: Images `created`, `size`, `access`; Users `email`, `created`. No sort on Role columns, Apps, alt, name, Dimensions. No raw SQL, no in-memory sort.
- Hideable: every column except those that identify a row or open it. **Never hidden** (builder's call, the owner's "first column never hides" widened to what the columns now hold): Images `image` (first) and `alt` (its cell is the link to the Image, `OpenImage`); Users `email` (first) and `created` (its cell is the link to the User, `OpenUser`). So Images hides `name`, `dimensions`, `size`, `access`, `apps`, `created`; Users hides each App's Role column. The selection box (`select`) never hides or sorts.
- A change to search, range or sort writes page 1 and clears the selection; a change to View does neither. `hide` is not part of what the API is asked: each list splits its params into the **query** (`page`, `perPage`, `search`, `sort`: the API call, the TanStack key, `imagesHydration`/`usersHydration`, the selection's view) and the **view** (`hide`), so a View change never refetches, never re-keys the private cache and never clears the selection.
- A phone's cards ignore View; Sort and Filter apply there through the panel.
- Code rules: no `as` except `as const`; constants from zod (`z.enum`); lookup tables `as const satisfies Record<K, V>`; never `Object.*`, `JSON.*`, `localStorage`; paths and error codes never literals, tests included; Tailwind class lists inline in `cn` or `cva`; a test file's first line `// @module-tag unit|integration`; Vitest globals; `packages/shadcn` is written only by the shadcn CLI; shared components are `AOF…`; Pages through `/aof-design`.
- Env vars start with their owner; a package never imports an App.
- Copy: ui parts take every word as a `labels` prop (ui speaks no language); the Back Office adds keys to both `en.json` and `it.json` (the translations test pins parity).

## Review Focus

1. **Hand-edited address:** `sort=bogus.asc,size.up,size.asc,created.desc,email.asc` and `hide=image,alt,nope` still open the list: unknown dropped, a duplicate column keeps its first direction, the fourth valid sort is cut, `hide=image` and `hide=alt` are dropped (Images' identity and link columns never hide; Users: `email`, `created`). Pinned in Tasks 3, 11 and 12.
2. **Range edges:** `created:2026-11-28..2026-11-26` reads as 26..28; `created:2026-02-30` and `created:yesterday` are dropped; a row at `2026-11-28T23:59:59.999Z` is in, `2026-11-29T00:00:00.000Z` is out. Pinned in Tasks 3, 4 and 5.
3. **Stable pages:** 30 Images of equal size sorted by `size.desc` over pages of 25 and 5 never repeat or skip a row. Pinned in Tasks 4 and 5.
4. **Narrowing past the last page:** a range that leaves one page while the address says `page=3`: Images steps back in place (the existing `useStepBackPastEnd`); Users shows its existing past-end notice with its button to the last page (`pastEnd`, `toPage`). Pinned in Tasks 11 and 12.
5. **Hidden but sorted:** `hide=size&sort=size.desc` keeps sorting by Size, the Sort tab still lists Size, the header menu is simply not drawn. A hidden column's cells are not drawn either: the table draws `getVisibleCells()`, not `getAllCells()` (Task 7). Pinned in Tasks 7 and 11.
6. **Sort/range change with rows selected:** selection clears, View change keeps it. Pinned in Tasks 11 and 12.

## File Structure

| Area | Create | Modify |
|---|---|---|
| core `packages/core/src/features/search/` | `sort-query.ts`, `columns-query.ts`, `utc-day-range.ts`, tests in `tests/` | `search-query.ts` (range fields), `constants/search.ts`; `shared/constants/separators.ts` |
| storage `packages/storage/src/features/image/` | | `constants/image.ts` (`SORT`, `SEARCH` ranges), `hono/constants/schemas.ts` (`sort`), `hono/routes/read-handlers.ts`, `hono/utils/deps.ts`, stub deps |
| auth `packages/auth/src/features/users/` | | `constants/users.ts`, `hono/routes/handlers.ts`, `hono/utils/deps.ts`, stub deps, schema |
| database `packages/database/src/features/` | | `image/image.service.ts`, `image/utils/image-filter.ts`, `auth/user.service.ts` + tests; Prisma 7 files (Phase 0) |
| ui `packages/ui/src/features/data-table/components/` | `aof-column-header.tsx`, `aof-sort-panel.tsx`, `aof-view-panel.tsx`, `aof-date-range-filter.tsx` + tests (in `../tests/`) | `aof-data-table.tsx`, `aof-data-table-select.tsx`, `aof-filter-panel.tsx` |
| Back Office | `shared/utils/list-params.ts`, `shared/components/list-panels.tsx`, `shared/hooks/use-list-view.ts`, tests | `features/images/*`, `features/users/*` (constants, params, table state, columns, filters, toolbar, table, queries, hydration, pages), translations, e2e specs |
| docs | | `docs/guides/{back-office,api,database,deployment,testing,design-system}.md`, `apps/api/README.md`, ADR 0026 pointer |

---

## Phase 0 — Prisma 7

### Task 1: Audit Prisma 6 → 7 against the repo, bump, config and client

**Audit result (verified against the repo and the Prisma 7 upgrade guide):**

| Prisma 7 change | Repo today | Action |
|---|---|---|
| Node ≥ 20.19, TS ≥ 5.4, ESM | Node 24.12, TS ~6.0.3, `"type": "module"` | none |
| generator `prisma-client` with `output` | already (`prisma/schema/schema.prisma`) | none |
| `prisma.config.ts`, `.env` not auto-loaded | exists, loads `.env` itself | none |
| datasource `url` moves to `prisma.config.ts` | `url = env("DATABASE_URL")` in schema | change |
| driver adapter required, `datasourceUrl` removed | 3 `new PrismaClient`: `features/prisma/client.ts`, `test-database/utils/server.ts` (`datasourceUrl`), `liquibase/tests/throwaway-db.ts` (`datasourceUrl`) | change |
| adapter pool: `pg` has no connect timeout (v6: 5 s) | none set | set 5 s |
| `migrate diff --from-schema-datasource` → `--from-config-datasource`; `db execute --url` removed | `db:drift` script; `scripts/changeset.ts` line 42; `executeFile` in `throwaway-db.ts` | change |
| `migrate dev`/`db push` stop running `generate` and seeds | repo uses Liquibase, `db:generate` explicit in `dev:setup` and `.github/actions/prepare` | check only |
| middleware `$use`, metrics removed | none used (grep) | none |
| stricter TLS validation | VPS Postgres; no SSL in `DATABASE_URL`? verify | check |
| `$queryRaw`, enums, Json | unchanged API | none |

**Files:**
- Modify: `packages/database/package.json` (`@prisma/client`, `prisma` → `^7.10.1`; add `@prisma/adapter-pg`), `packages/database/prisma.config.ts`, `packages/database/prisma/schema/schema.prisma`, `packages/database/src/features/prisma/client.ts`
- Check: `docker/Dockerfile`, `.github/actions/prepare/action.yml`, `turbo.json` `db:generate`, root `pnpm-workspace.yaml` (pnpm build-script approvals), `packages/database/liquibase/Dockerfile`
- Test: the whole database package suite (integration)

**Interfaces:**
- Produces: `prisma` (unchanged export of `features/prisma/client.ts`), and `createPrismaClient(url: string): PrismaClient` exported from the same file, used by Task 2's helpers. It builds `new PrismaClient({ adapter: new PrismaPg({ connectionString: url, connectionTimeoutMillis: DATABASE.CONNECT_TIMEOUT_MS }) })`; `DATABASE.CONNECT_TIMEOUT_MS = 5000` in the package's constants (a nested `DATABASE` object).

- [ ] **Step 1: Write the failing test** `packages/database/src/features/prisma/tests/client.integration.test.ts`: `createPrismaClient(testDatabaseUrl)` answers `$queryRaw\`SELECT 1 AS one\`` with `[{ one: 1 }]`, and a client for an unreachable host rejects within `DATABASE.CONNECT_TIMEOUT_MS` plus a margin (pins v6's 5 s behaviour).
- [ ] **Step 2:** Run `pnpm --filter @allonfire/database test client.integration` → FAIL (`createPrismaClient` missing).
- [ ] **Step 3:** Bump packages; read the Prisma 7 config reference (Context7) and move `url` into `prisma.config.ts` (`datasource`), keeping `schemas` where Prisma 7 expects it; implement `createPrismaClient` and make `prisma` use it with `DATABASE_URL`; run `pnpm db:generate`.
- [ ] **Step 4:** Run the test → PASS; then `pnpm --filter @allonfire/database check-types test` → PASS (the whole package, Liquibase integration included).
- [ ] **Step 5:** Confirm the "check only" rows: `docker/Dockerfile` and CI generate the client (add `pnpm db:generate` where an install no longer does); `pnpm-workspace.yaml` approves the new build scripts; write the outcome of each row of the table above in the PR notes section of this plan (a short "Audit result" list under this task).

### Task 2: Test helpers, drift script, studio, repo-wide check

**Files:**
- Modify: `packages/database/src/features/test-database/utils/server.ts` (line 11), `packages/database/liquibase/tests/throwaway-db.ts` (`clientFor`, line 51, and `executeFile`), `packages/database/package.json` (`db:drift`, `dev`), `packages/database/scripts/changeset.ts` (line 42, `--from-schema-datasource`), `packages/database/liquibase/tests/changelog.integration.test.ts` if it names removed flags
- Test: `packages/database/liquibase/tests/changelog.integration.test.ts`

**Interfaces:**
- Consumes: `createPrismaClient(url: string): PrismaClient` (Task 1).
- Produces: `clientFor(url)` and `onServer` use it; `executeFile(url, file)` passes `DATABASE_URL` through the child's env to `prisma db execute --file` (no `--url`).

- [ ] **Step 1:** Run `pnpm --filter @allonfire/database test` → FAIL where helpers still pass `datasourceUrl` or `--url`.
- [ ] **Step 2:** Replace both `datasourceUrl` uses with `createPrismaClient(url)`; `executeFile` runs `prisma db execute --file <file>` with `env: { ...process.env, DATABASE_URL: url }`; `db:drift` and `scripts/changeset.ts` use `--from-config-datasource --to-schema prisma/schema` (confirm exact flags with `pnpm exec prisma migrate diff --help`; run `pnpm db:changeset` once on a no-op to see it still diffs).
- [ ] **Step 3:** Run `pnpm --filter @allonfire/database db:drift` against the local database → exit 0; `pnpm --filter @allonfire/database dev` starts Studio (stop it after).
- [ ] **Step 4:** Run `pnpm check` (static, test, e2e) → PASS. Fix any other package that typed against Prisma 6 (`apps/api`, `packages/auth`, `packages/storage`) in place, test first.
- [ ] **Step 5:** Update `docs/guides/database.md` (Prisma 7, adapter, `prisma.config.ts` owns the URL, `createPrismaClient`, the 5 s timeout), `docs/guides/deployment.md` and `docs/guides/testing.md` where they name `datasourceUrl`, `--url` or `db:drift` flags.

---

## Phase 1 — Core grammar

### Task 3: `sortQuery`, `columnsQuery`, range fields and `utcDayRange`

**Files:**
- Create: `packages/core/src/features/search/sort-query.ts`, `columns-query.ts`, `utc-day-range.ts`, and `tests/sort-query.test.ts`, `columns-query.test.ts`, `utc-day-range.test.ts`
- Modify: `search-query.ts`, `constants/search.ts` (`SEARCH.SORT = { MAX: 3 }`, `SEARCH.DIRECTION = ["asc", "desc"] as const` with `directionSchema = z.enum(SEARCH.DIRECTION)`), `packages/core/src/shared/constants/separators.ts` (`DIRECTION: "."`, `RANGE: ".."`), `tests/search-query.test.ts`, `packages/core/package.json` exports for the three new files

**Interfaces:**
- Produces:
  - `type DayRange = { from: string; to: string }` (`YYYY-MM-DD`, `from <= to`).
  - `searchQuery(fields, options?: { ranges?: readonly string[] })`: `SearchValue` gains `[R]?: DayRange` for each range name; parse accepts `name:2026-11-26..2026-11-28` and `name:2026-11-26`; serialize writes the single-day form when `from === to`; ranges serialize after fields, before `input:`.
  - `sortQuery<const C extends readonly string[]>(columns: C): { parse(raw: string | null | undefined): SortItem<C[number]>[]; serialize(items: readonly SortItem<C[number]>[]): string }` with `type SortItem<C> = { column: C; direction: "asc" | "desc" }`; text `created.desc,size.asc`.
  - `columnsQuery<const C extends readonly string[]>(columns: C, options?: { never?: readonly C[number][] }): { parse(raw): C[number][]; serialize(list): string }`.
  - `utcDayRange(range: DayRange): { gte: Date; lt: Date }`.

- [ ] **Step 1: Write the failing tests**, all with the spec's values:
  - `search-query.test.ts`: `created:2026-11-26..2026-11-28` parses to `{ created: { from: "2026-11-26", to: "2026-11-28" } }` and serializes back; one day round-trips as `created:2026-11-26`; `2026-11-28..2026-11-26` reads as 26..28; `created:2026-02-30`, `created:yesterday`, `created:2026-11-26..x` are dropped; a range next to `app:laura input:sea` keeps the documented order; existing tests untouched.
  - `sort-query.test.ts`: round-trip `created.desc,size.asc`; unknown column, `size.up`, `size` (no direction) dropped; a duplicate column keeps its first; four valid columns keep the first three (`SEARCH.SORT.MAX`); empty string, `null` and `undefined` read `[]`; `serialize([])` is `""`.
  - `columns-query.test.ts`: `size,apps` → `["size","apps"]` in the table's order, unknown and repeated dropped; a `never` column (`image`) dropped.
  - `utc-day-range.test.ts`: `{from:"2026-11-26",to:"2026-11-28"}` → `gte` `2026-11-26T00:00:00.000Z`, `lt` `2026-11-29T00:00:00.000Z`; a leap day (`2028-02-29`) and a month end work.
- [ ] **Step 2:** `pnpm --filter @allonfire/core test search` → FAIL.
- [ ] **Step 3:** Implement the four signatures. Date validity: a `PATTERN.ISO_DAY` constant plus a round-trip through `Date.UTC` (reject `02-30`). Sort/columns parsers are pure string functions like `searchQuery` (no JSON, no `Object.*`).
- [ ] **Step 4:** Tests → PASS; `pnpm --filter @allonfire/core check-types` → PASS.

---

## Phase 2 — Data and API

### Task 4: Images service: sort and range

**Files:**
- Modify: `packages/database/src/features/image/image.service.ts` (`listImagesPage`), `utils/image-filter.ts` (`visibleImages`), `packages/database/src/features/image/tests/image.integration.test.ts`
- Modify: `packages/storage/src/features/image/constants/image.ts`: `const SEARCH = searchQuery({ access, app }, { ranges: ["created"] })` and `SORT = sortQuery(["created", "size", "access"] as const)`, exported on `IMAGE`

**Interfaces:**
- Consumes: `sortQuery`, `searchQuery` ranges, `utcDayRange`, `DayRange`, `SortItem` (Task 3).
- Produces: `listImagesPage({ …existing, sort?: readonly SortItem<"created" | "size" | "access">[], created?: DayRange })`; `visibleImages` gains `created?: DayRange` and adds `{ createdAt: utcDayRange(created) }` to its `AND`. `IMAGE.SORT`, `IMAGE.SEARCH` (now with `created`).

- [ ] **Step 1: Write failing integration tests** (Test database, Image Fixtures; set `createdAt`/`bytes` by direct Prisma update where needed):
  - sort `size.asc` and `size.desc` order by bytes; `access.asc`; `created.asc`; empty sort stays Created desc.
  - two sorts: `access.asc,size.desc` orders by access then bytes.
  - stability: 30 Images with equal `bytes`, `sort=size.desc`, `perPage=25` page 1 and `perPage=5` pages: the ids across pages are all distinct and equal the full ordered list.
  - range: a row at `2026-11-28T23:59:59.999Z` is in `{from:"2026-11-26",to:"2026-11-28"}`, one at `2026-11-29T00:00:00.000Z` is out, one at `2026-11-26T00:00:00.000Z` is in; the range composes with `accesses`, `apps`, `text`, and with the visibility `OR`; `totalBytes` and `total` follow the range.
- [ ] **Step 2:** `pnpm --filter @allonfire/database test image.integration` → FAIL.
- [ ] **Step 3:** In the service, one lookup `IMAGE_ORDER = { access: "access", created: "createdAt", size: "bytes" } as const satisfies Record<SortColumn, keyof Prisma.ImageOrderByWithRelationInput>` and `imageOrderBy(sort)`: each item to `{ [IMAGE_ORDER[column]]: direction }`, then `{ id: "desc" }`; no items → `[{ createdAt: "desc" }, { id: "desc" }]`.
- [ ] **Step 4:** Tests → PASS.

### Task 5: Users service: sort and range

**Files:**
- Modify: `packages/auth/src/features/users/constants/users.ts` (`SEARCH` ranges `["created"]`, `SORT = sortQuery(["email", "created"] as const)`, `PARAM.SORT: "sort"`), `packages/database/src/features/auth/user.service.ts` (`listUsers`, `UserListQuery`), `packages/database/src/features/auth/tests/user.integration.test.ts`

**Interfaces:**
- Consumes: Task 3 exports. Produces: `listUsers({ …existing, sort?: readonly SortItem<"email" | "created">[], created?: DayRange })`; `USER.SORT`, `USER.SEARCH` with `created`, `USER.PARAM.SORT`.

- [ ] **Step 1: Failing tests** (integration): `email.asc` and `email.desc` order by email; `created.asc`; empty sort is today's order; `email.asc` with equal-email impossible, so stability is tested with `created.asc` over Users created in one transaction (equal `createdAt`), pages of 2 never repeat or skip; range edges as Task 4; the range composes with `app`/`role`/`text`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** same `USER_ORDER … satisfies Record<…>` pattern, `id: "desc"` last; `where` gains `createdAt: utcDayRange(created)`. **Step 4:** PASS.

### Task 6: API passes `sort` and the range through

**Files:**
- Modify: `packages/storage/src/features/image/hono/constants/schemas.ts` (`listQuerySchema.sort: z.string().trim().max(IMAGE.LIMIT.SEARCH_MAX).catch("")`), `hono/routes/read-handlers.ts`, `hono/utils/deps.ts` (`listImagesPage` type), `hono/tests/stub-image-deps.ts`, `hono/tests/read.test.ts`; `packages/auth/src/features/users/hono/{constants/schemas.ts or routes/handlers.ts,utils/deps.ts,tests/stub-user-deps.ts,tests/routes.test.ts}`; `apps/api/src/features/{image/image-deps.ts,users/user-deps.ts}`; `apps/api/src/features/users/tests/users.integration.test.ts`; `apps/api/README.md`

**Interfaces:**
- Consumes: `IMAGE.SORT`, `IMAGE.SEARCH`, `USER.SORT`, `USER.SEARCH`, `USER.PARAM.SORT`, the services of Tasks 4–5.
- Produces: `GET /v1/images` and `GET /v1/users` accept `?sort=created.desc,size.asc` and `search=… created:2026-11-26..2026-11-28`; the handlers call the deps with `sort` (parsed) and `created` (only when present, `exactOptionalPropertyTypes`).

- [ ] **Step 1: Failing tests:** `read.test.ts` (stub deps record their arguments): `?sort=size.desc,access.asc` reaches `listImagesPage` as `[{column:"size",direction:"desc"},{column:"access",direction:"asc"}]`; `?search=created:2026-11-26..2026-11-28` as `created: { from, to }`; `?sort=bogus.up` as `[]` and still 200; a 300-character `sort` reads as none, never 400. Same for the Users routes (`routes.test.ts`). Users integration: sorted and ranged list through the real app and Test database returns the expected order and `total`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** `pnpm --filter @allonfire/storage --filter @allonfire/auth --filter @allonfire/api test check-types` → PASS. Update `apps/api/README.md` with the two query params and the grammar.

---

## Phase 3 — `packages/ui` parts

Every part below is generic, language-free (`labels` prop), a client component, wraps shadcn through the AOF layer, has a unit test (`*.test.tsx`, jsdom) for logic and a `*.browser.test.tsx` for the look/keyboard, and an export key in `packages/ui/package.json`. Read `docs/guides/design-system.md` first; build the visuals through `/aof-design`.

### Task 7: Table features and the column header menu

**Files:**
- Modify: `packages/ui/src/features/data-table/components/aof-data-table.tsx` (`AOF_TABLE_FEATURES` gains `rowSortingFeature`, `columnVisibilityFeature`; `useAOFTable` defaults `manualSorting: true`, `enableMultiSort: true`; the default skeleton counts `getVisibleLeafColumns().length`; the rows draw `row.getVisibleCells()` instead of `row.getAllCells()` (line ~314), or a hidden column's cells would stay while its header goes)
- Modify: `aof-data-table-select.tsx`: `aofSelectColumn` gets `enableSorting: false, enableHiding: false`
- Create: `aof-column-header.tsx`, `tests/aof-column-header.test.tsx`, `tests/aof-column-header.browser.test.tsx`

**Interfaces:**
- Produces: `AOFColumnHeader<TData>({ column: Column<AOFTableFeatures, TData>; label: string; labels: { asc: string; desc: string; hide: string } } & ComponentProps<"div">)` (the rest spreads onto the root, so a list can centre a header: Users' App columns). A column that can neither sort nor hide renders its label alone; otherwise a button with the label and a sort icon (up, down, or up-down when unsorted) opens a menu of three checkable items: Asc, Desc (only when `column.getCanSort()`), Hide (only when `column.getCanHide()`). Choosing the active direction clears the sort; choosing another puts this column **first** and keeps the others (`table.setSorting` prepend, cut to `maxMultiSortColCount`); Hide calls `column.toggleVisibility(false)`. The lists' columns use it as `header: ({ column }) => <AOFColumnHeader … />` (today their headers are plain strings). Model: tablecn's `data-table-column-header.tsx` (`sadmann7/tablecn`, `src/registry/bases/radix/components/data-table`).

- [ ] **Step 1: Write failing tests:** in `aof-column-header.test.tsx` with a table of `email` (sortable, not hideable), `size` (both), `apps` (hideable only), `select` (neither): `email` menu shows Asc and Desc only; `apps` shows Hide only; `select` renders no button; clicking Desc then Desc again calls `onSortingChange` with `[]`; with sorting `[{id:"size",desc:false}]` choosing Asc on `email` yields `[{id:"email",desc:false},{id:"size",desc:false}]`; with `maxMultiSortColCount: 1` the second is cut; Hide hides the column. Browser test: Enter/Arrow keys open and choose; the menu is `role="menu"` with `menuitemcheckbox` items whose `aria-checked` follows the sort.
- [ ] **Step 2:** Run `pnpm --filter @allonfire/ui test aof-column-header` → FAIL. **Step 3:** Implement with shadcn `dropdown-menu` checkbox items, tabler icons; `useAOFTable`'s new defaults. **Step 4:** unit and browser (`pnpm --filter @allonfire/ui test:browser`, Chromium and WebKit) → PASS; existing `aof-data-table` tests still PASS; a new `aof-data-table.test.tsx` case: with `columnVisibility: { size: false }` neither the `size` header nor its cells render, and the default skeleton counts the visible columns.

### Task 8: `AOFFilterPanel` with tabs, `AOFSortPanel`, `AOFViewPanel`

**Files:**
- Modify: `aof-filter-panel.tsx` (+ `tests/aof-filter-panel.test.tsx`)
- Create: `aof-sort-panel.tsx`, `aof-view-panel.tsx`, `tests/aof-sort-panel.test.tsx`, `tests/aof-view-panel.test.tsx`, a browser test for the panel

**Interfaces:**
- `AOFFilterPanel` props gain `sort?: ReactNode`, `view?: ReactNode`, `counts?: { sort: number; view: number }`, `tabLabels?: { filter: string; sort: string; view: string }`. `count` stays the Filter tab's count; the button badge shows `count + counts.sort + counts.view`. With neither `sort` nor `view`, the panel is exactly today's (no tabs). With them: shadcn `tabs` (Filter | Sort | View), each tab label carrying its own count when > 0; `action` stays at the bottom right under all tabs.
- `AOFSortPanel({ columns: readonly { id: string; label: string }[]; sorting: SortingState; onSortingChange: (next: SortingState) => void; max: number; labels: { add; reset; asc; desc; moveUp; moveDown; remove; column; direction; empty } })`: one row per sort (column select, direction select, up/down buttons, remove), `Add sort` (adds the first column not yet used, ascending; disabled at `max` or when no column is left), `Reset sorting` (disabled when empty). Columns already used by another row are not offered in a row's select. Up/Down reorder (spec's call; drag is later).
- `AOFViewPanel({ columns: readonly { id: string; label: string }[]; hidden: readonly string[]; onHiddenChange: (next: string[]) => void; labels: { showAll: string } })`: a checkbox per column (checked = shown) and `Show all`.

- [ ] **Step 1: Failing tests:** Filter panel: without `sort`/`view` no `tablist` exists; with them three tabs named by `tabLabels`, the trigger badge shows the sum (`count 1 + sort 2 + view 1` → `4`), Sort and View tab labels show their counts, `Reset all` (`action`) is reachable from every tab. Sort panel: Add sort appends the first unused column as asc and is disabled at `max`; a row's select omits columns other rows use; Up/Down swap neighbours and disable at the ends; remove drops the row; Reset sorting calls `onSortingChange([])`. View panel: unchecking `size` calls `onHiddenChange(["size"])`; checking it back calls `onHiddenChange([])`; `Show all` clears. Browser test: tab keys and arrows move between tabs, the popover fits `min(100vw − gutters, 26rem)`, sort rows stack on a 360 px width without horizontal overflow (`getComputedStyle`/`scrollWidth`, no class strings).
- [ ] **Step 2:** Run the ui tests → FAIL. **Step 3:** Implement. **Step 4:** PASS (unit and browser).

### Task 9: `AOFDateRangeFilter`

**Files:**
- Create: `packages/ui/src/features/data-table/components/aof-date-range-filter.tsx`, `tests/aof-date-range-filter.test.tsx`, `tests/aof-date-range-filter.browser.test.tsx`

**Interfaces:**
- Produces: `AOFDateRangeFilter({ label: string; value: DayRange | null; onValueChange: (next: DayRange | null) => void; format: (day: string) => string; labels: { clear: string } })`. Like tablecn's `DataTableDateFilter` (`data-table-date-filter.tsx`): an outline button with a calendar icon and `label`; with a value the icon becomes a ⓧ that resets and the button shows `label | from – to` (one day shows once); the popover holds shadcn `calendar` in range mode with a dropdown caption, and a full-width `Clear` button while a value exists. The calendar's local `Date`s convert to `YYYY-MM-DD` from their **local parts** (the day clicked is the day stored, read by the API as a UTC day); a click on one day alone stores `from === to`; `DayRange` type is declared in ui as a structural `{ from: string; to: string }` (no core import).

- [ ] **Step 1: Failing tests:** picking 26 then 28 calls `onValueChange({from:"2026-11-26",to:"2026-11-28"})`; picking only 26 calls it with `from === to === "2026-11-26"`; ⓧ and Clear call it with `null`; the chip text uses `format` (`"Nov 26, 2026"`) and shows once for a one-day range; with `value` set the calendar opens on `from`'s month and highlights the range. Browser test: keyboard reaches the chip, Enter opens the calendar, Escape closes it; the popover stays inside the viewport at 360 px.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.

---

## Phase 4 — Back Office

### Task 10: Shared list params and panels

**Files:**
- Create: `apps/back-office/src/shared/utils/list-params.ts`, `shared/components/list-panels.tsx`, `shared/hooks/use-list-view.ts`, `shared/utils/tests/list-params.test.ts`, `shared/components/tests/list-panels.browser.test.tsx`, `shared/hooks/tests/use-list-view.browser.test.tsx`
- Modify: `apps/back-office/src/features/i18n/translations/en.json`, `it.json` (a `List` namespace: `tab.filter|sort|view`, `sort.add|reset|asc|desc|moveUp|moveDown|remove|column|direction|empty`, `view.showAll`, `column.asc|desc|hide`, `range.clear`; `Images.column.created`/`Users.column.created` reused as the chip label), `features/i18n/tests/translations.test.ts` if it enumerates namespaces

**Interfaces:**
- `codecParser<T>(codec: { parse(raw: string): T; serialize(value: T): string }, options: HistoryOptions)`: a nuqs `createParser` whose `parse` is `codec.serialize(codec.parse(v)) || null`, `serialize: String`, `.withDefault("")` (the same shape as the lists' `searchParser`).
- `sortingOf<C extends string>(items: readonly SortItem<C>[]): SortingState` and `sortOf(sorting: SortingState): SortItem<string>[]` (the table's `{ id, desc }` ⇄ the grammar's `{ column, direction }`; `sortOf` keeps only items whose `id` the codec knows, since the codec re-parses anyway). `visibilityOf(hidden: readonly string[]): VisibilityState` (`{ size: false }`) and `hiddenOf(state: VisibilityState): string[]` invert each other. A TanStack updater (value or function of the current value) resolves like `resolvePagination` in `shared/utils/table-pagination.ts`: one generic `resolveUpdater` here, beside it, not a second copy.
- `ListSortPanel`/`ListViewPanel({ columns: readonly { id: string; label: string }[], sorting | hidden, onSortingChange | onHiddenChange })`: build `AOFSortPanel`/`AOFViewPanel` from the list's own column lists (Sort lists the sortable ones regardless of what View hides; View lists the hideable ones), words from `useTranslations("List")`. They take **no `table`**: `SearchToolbar` renders the Filter button beside the table (a child of `ListTable`, outside the scope where `useAOFTable` ran) and hands its `Filters` only `search` and `write`, so the panels read and write the address, not the table.
- `useListView({ params, setParams, keys: { hide, page, sort }, codecs: { hide, sort } })` returns `{ hidden, onHiddenChange, onSortingChange, sorting, columnVisibility, onColumnVisibilityChange }`: reads `sort`/`hide` from a list's `useQueryStates`, writes `sort` with `page: null` and `hide` alone. The exact generic shape is the builder's call (nuqs types); the rule is one hook for both lists, called by the list's table state (TanStack gets `columnVisibility`/`sorting`) and by its Filters (the panels), both writing the same address.

- [ ] **Step 1: Failing tests:** `list-params.test.ts`: `sortingOf(sortQuery(["size"]).parse("size.desc"))` → `[{id:"size",desc:true}]` and `sortOf` inverts it; `hiddenOf(visibilityOf(["size","apps"]))` → `["size","apps"]`; `codecParser(IMAGE.SORT).parse("size.up,created.desc")` reads `created.desc`; a value the codec empties reads `null`. `use-list-view.browser.test.tsx` (nuqs test adapter): `onSortingChange` writes `sort` and `page` null; `onHiddenChange` writes `hide` and leaves `page` as it is. Browser test renders `ListSortPanel` over two columns and asserts roles and texts through `enT`/`itT`; translations test passes with both files.
- [ ] **Step 2:** FAIL. **Step 3:** Implement and add the keys in both languages. **Step 4:** PASS.

### Task 11: Images list wiring

**Files:**
- Modify: `features/images/constants/images.ts` (`PARAM.SORT: "sort"`, `PARAM.HIDE: "hide"`, `HIDE = columnsQuery(["name","dimensions","size","access","apps","created"] as const)`, `SORTABLE = ["created","size","access"]` for the panel), `constants/images-params.ts` (`imagesParams` gains `sort`, `hide`; a new `type ImagesQuery = Omit<ImagesParams, "hide">` and `queryOf(params): ImagesQuery`, an explicit pick), `hooks/use-images-table-state.ts`, `components/image-columns.tsx`, `components/images-table.tsx`, `components/images-toolbar.tsx`, `components/images-filters.tsx`, `utils/images-queries.ts`, `utils/images-hydration.ts`, `app/[locale]/(signed-in)/storage/images/page.tsx` (hydrates with `queryOf(params)`), and the matching tests: `constants/tests` or `tests/images-params.test.ts`, `utils/tests/images-queries.test.ts`, `utils/tests/images-hydration.test.ts`, `components/tests/images-table.browser.test.tsx`
- Leave: `use-selectable-images.tsx` and `images-list-skeleton.tsx`. Data checklist 6 (`next-apps.md`, a skeleton kept in step with its page): the list's skeleton is the Suspense fallback and reads no address, so it keeps the full column set and the toolbar it draws today (the Filter button's size does not change with its count badge). Its test (`image-skeletons.browser.test.tsx`: heights at a wide and a phone width, column count against the real table) renders the real page with nothing hidden and must stay green; no skeleton change is needed unless the toolbar's layout changes.

**Interfaces:**
- Consumes: Tasks 7-10 and `IMAGE.SORT`, `IMAGE.SEARCH`.
- Produces: `imagesParams` gains `[IMAGES.PARAM.SORT]: codecParser(IMAGE.SORT, replace)` and `[IMAGES.PARAM.HIDE]: codecParser(IMAGES.HIDE, replace)`. The API call, the key and the hydration take `ImagesQuery`: `fetchImages(client, query)` sends `sort`; `imagesListKey`/`imagesQuery`/`imagesHydration` are keyed by `{ page, perPage, search, sort }` through `QUERY.IMAGES.LIST` (**not** `hide`, which today would ride along because `QUERY.IMAGES.LIST(params)` keys whatever it is given). `useImagesTableState()` returns what it does today plus `sorting`, `onSortingChange`, `columnVisibility`, `onColumnVisibilityChange` (from `useListView`) and `range`/`onRangeChange` (writes the `created` field of `search`, page `null`); its `useRowSelection` view is `queryOf(params)`, so a `hide` change keeps the selection. `ImagesTable` passes `state: { pagination, rowSelection, sorting, columnVisibility }` and `onSortingChange`, `onColumnVisibilityChange` to `useAOFTable`, and `queryOf(params)` to `imagesQuery`. Columns (`useImageColumns`): `image` `enableSorting: false, enableHiding: false`; `name` and `dimensions` hide only; `size` and `access` sort and hide; `alt` neither (its cell is `OpenImage`, the row's link); `apps` hide only; the date accessor gets `id: "created"` and sorts and hides; every sortable or hideable header becomes `AOFColumnHeader` with the existing `Images.column.*` words and `List.column.*`; `FILL` keeps `image`, `apps`. `ImagesToolbar` and `ImagesFilters` (which `SearchToolbar` renders as `Filters`, given only `search` and `write`) call `useListView` themselves: `ImagesFilters` passes `sort={<ListSortPanel …/>}`, `view={<ListViewPanel …/>}`, the counts, and a date range row (`AOFDateRangeFilter`, label `Images.column.created`) inside the Filter tab; its `Reset all` clears the typed filters and the range through `write({ text })`, plus `sort` and `hide`, and keeps the words; the button count adds the range as one. `SearchToolbar` itself needs no change.

- [ ] **Step 1: Failing tests (tests first):**
  - `images-params.test.ts`: the loader reads `?sort=size.desc,created.asc&hide=apps` to `{ sort: "size.desc,created.asc", hide: "apps" }`; the Review Focus 1 address (`sort=bogus.asc,size.up,size.asc,created.desc,email.asc`, `hide=image,alt,nope`) reads `"size.asc,created.desc"` and `""`; `queryOf` drops `hide` and keeps the rest.
  - `images-queries.test.ts`: `fetchImages` asks `?sort=size.desc`; `imagesListKey` is the same for `hide=apps` and none. `images-hydration.test.ts`: hydrates under the key the table reads, with a `sort`.
  - `images-table.browser.test.tsx` (MSW answers the API; extend the existing file, keep its cases): header menu Desc on Size writes `sort=size.desc` and asks the API with it; a second header choice on Created puts Created first (`sort=created.desc,size.desc`); Hide on Apps removes the column (header and cells) and writes `hide=apps` **without** a new API request; `alt` and `image` headers have no Hide, `alt` has no Sort either; hiding `size` while `sort=size.desc` keeps the request and the Sort tab lists Size (Review Focus 5); the Sort tab Add/Reset; the range chip writes `search` `created:…` and page 1; rows selected then a sort change leaves none selected, then a View change keeps them (Review Focus 6); `page=3` plus a range that leaves one page steps back (Review Focus 4).
  - `images-filters` browser test (same file or its own): `Reset all` clears sort, hide and range but keeps the typed words; the button badge counts filters + range + sorts + hidden.
- [ ] **Step 2:** `pnpm --filter @allonfire/back-office test` and `test:browser` -> FAIL.
- [ ] **Step 3:** Implement. Phone: the card list ignores `columnVisibility`. Data checklist (`next-apps.md`), point by point for this page: (1) `imagesHydration` reads the query including `sort` and the range and dehydrates under `QUERY.IMAGES.LIST` as before; (2) no new write, so no new `updateTag`; (3) page and API gate as before; (4) nothing is saved; (5) a 404 cannot happen on a list.
- [ ] **Step 4:** `pnpm --filter @allonfire/back-office check-types test test:browser` -> PASS.

### Task 12: Users list wiring

**Files:** the Users counterparts of Task 11: `features/users/constants/users.ts` (`PARAM.SORT`/`PARAM.HIDE` live on core's `USER.PARAM`; here `HIDE = columnsQuery(objectValues(App))`, `SORTABLE = ["email","created"]`), `constants/users-params.ts` (`ImagesQuery` counterpart `UsersQuery`, `queryOf`), `hooks/use-users-table-state.ts`, `components/user-columns.tsx`, `users-table.tsx` (`FILL`'s `"createdAt"` becomes `"created"`), `users-toolbar.tsx`, `users-filters.tsx`, `utils/users-queries.ts`, `utils/users-hydration.ts`, `app/[locale]/(signed-in)/users/page.tsx`, and their tests (`constants/tests` or `tests/users-params.test.ts`, `utils/tests/users-queries.test.ts`, `utils/tests/users-hydration.test.ts`, `hooks/tests/use-users-table-state.browser.test.tsx`, `components/tests/users-table.browser.test.tsx`: extend the existing files, keep their cases).

**Interfaces:** same as Task 11 (skeleton: `users-list-skeleton.tsx` and its `users-list-skeleton.browser.test.tsx` / `.test.tsx` stay as they are, same reasoning), with `UsersQuery`/`queryOf`, and these columns (`useUserColumns`): `email` (sort; never hides: it is the first column), one column per App (hide only; ids are the `App` values; header `AOFColumnHeader` centred, as today's centred heading), `created` (the accessor gets `id: "created"`; sort; **never hides**: its cell is `OpenUser`, the link covering the row). `USER.SORT` for sorting. The past-end case is Users' own notice (`pastEnd`, `toPage`), not a step-back.

- [ ] **Step 1: Failing tests:** the same cases as Task 11 on the Users table: header Asc on Email writes `sort=email.asc`; Created first when chosen after Email; Hide on an App column writes `hide=LAURA` with no new request and removes the column's cells; the `email` and `created` headers have no Hide; the range chip; selection clears on sort and keeps on View; `Reset all`; the address from Review Focus 1 (with `hide=email,created` dropped); `page=3` plus a range that leaves one page shows the past-end notice and its button goes to the last page.
- [ ] **Step 2:** FAIL. **Step 3:** Implement, reusing `list-params`, `list-panels` and `use-list-view` (no copy of Task 11's code). **Step 4:** PASS.

### Task 13: e2e and the whole check

**Files:** `apps/back-office/e2e/images.spec.ts` (has uncommitted add/edit specs: append, keep them), `e2e/users.spec.ts`, `e2e/pages.ts` if the address builders live there; `e2e/instant.spec.ts` untouched (must stay green).

- [ ] **Step 1: Write failing e2e specs** (texts through `enT`, paths and selectors from constants, never literals; Playwright, each in `chromium`, `webkit`, `mobile-chrome`, `mobile-safari`; the Fixtures' Images and Users): sort by Size through the header menu, the order of the first rows changes and the address holds `sort=size.desc`; a reload keeps it; Hide Apps via the View tab removes the column (`hide=apps`; the Alt cell, the row's link, stays) and Show all brings it back; the range chip with the calendar narrows the list and `Clear` restores it; on the mobile projects the Filter panel's Sort tab sorts the cards and View is absent from the effect (cards unchanged). Same for Users with Email and an App column.
- [ ] **Step 2:** `pnpm --filter @allonfire/back-office e2e` → FAIL where the UI is missing, then PASS after Tasks 10–12.
- [ ] **Step 3:** `pnpm check` (static, test, e2e) → PASS, including the existing `safe-area.spec.ts` and `instant.spec.ts`.

---

## Phase 5 — Docs

### Task 14: Guides, ADR pointer, glossary check

**Files:** `docs/guides/back-office.md` (Images/Users sections: the Filter panel, Sort, View, the range, the new params and what resets), `docs/guides/next-apps.md` (checklist 6: one sentence that a list's skeleton shows every column because a View applies only once rows are drawn), `docs/guides/api.md` (`sort` query and the `created` range field), `docs/guides/design-system.md` (the new `AOF…` parts and tablecn as their model), `docs/guides/database.md` (service signatures, the plain-column limit and why: Prisma 7 orders by no computed or filtered relation), `docs/adr/0026-a-list-filters-in-one-search-param.md` (a "Superseded in part / see ADR 0031" line: display state and range value), `CONTEXT.md` (read once more: **Filter panel**, **Sort**, **View** must match the shipped behaviour).

- [ ] **Step 1:** Write the doc changes in plain, current-state prose (`writing.md`: no history, no "now"). **Step 2:** `pnpm static` (Biome, knip for the new exports, docs guard tests) → PASS; run `pnpm check` once more before handing over.

## Self-review

- **Spec coverage:** tabs popup (T8), header menu (T7), date range chip (T9), URL split (T3, T10), plain-column sort for both lists and the API (T4–T6), View with the identity and link columns never hidden (T11–T12), selection/page rules (T11–T12), Prisma 7 first (T1–T2), docs/ADR/CONTEXT (T14), e2e incl. mobile (T13). Spec "builder's calls" (Up/Down reorder, 5 s timeout, latest 7.x, `hide` out of the key) are each in a task.
- **Naming:** `SortItem`, `DayRange`, `sortQuery`, `columnsQuery`, `utcDayRange`, `createPrismaClient`, `codecParser`, `sortingOf`/`sortOf`, `AOFColumnHeader`, `AOFSortPanel`, `AOFViewPanel`, `AOFDateRangeFilter`, `ListSortPanel`/`ListViewPanel` are used with one spelling throughout.
- **Open for the builder:** exact Prisma 7 config keys for `schemas` and the `datasource` block (Context7), exact `migrate diff` flags, and TanStack Table v9's feature option names (read the installed version's types before Task 7), and the exact generic shape of `useListView` over nuqs' `useQueryStates` (Task 10).
