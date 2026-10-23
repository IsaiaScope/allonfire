# Back Office Users list Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Back Office's Users Section into a server-prefetched, URL-driven TanStack Table of every User with their Role per App, served by a new Admin-only User module on the API.

**Status:** implemented (uncommitted) @ 2026-10-22T08:06:32Z

**Architecture:**
- **One parser, three readers.** A generic `field:value` search parser in `@allonfire/core` is instantiated once in the User module. The API, the page's nuqs cache and the browser's nuqs parsers all read through that one instance.
- **The API.** It mounts the User module (`packages/auth`, `userRoutes(deps)`) at `/v1/users`. It is given a database `listUsers` service and a Back Office Admin check.
- **The page.** It sanitises its params with nuqs on the server, prefetches both queries through a server `hc` client at `API_URL`, and hydrates a small client table.
- **The table.** It is an AOF component built on TanStack Table v9 and shadcn's `table`.

**Tech Stack:** Hono + hono-openapi + zod 4, Prisma, Next 16 (Cache Components), next-intl, nuqs 2, TanStack Query 5, TanStack Table 9.3, shadcn base-nova (Base UI), Vitest (unit, integration, browser with MSW), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-21-back-office-users-list-design.md` (library survey: `docs/superpowers/specs/2026-10-21-users-table-library-survey.md`)

## Ruling made while planning (owner, read first)

DiceUI's data-table is not installed.
- **Why:** its only exported `DataTable` always renders its own `DataTablePagination`, with English written into the markup: "Rows per page", "Page {n} of {m}", the four `aria-label="Go to … page"`, "No results." and the skeleton's "Loading table…". `packages/shadcn` is never edited by hand, so the Italian Back Office could not translate them. It would also bring about 100 KB of filters (faceted, slider, date, parsers) this page never uses.
- **Instead:** Task 7 builds `AOFDataTable`, `AOFDataTablePagination` and `AOFDataTableSkeleton` in `packages/ui`.
  - They are built on `@tanstack/react-table` 9 (13.8M weekly downloads) and shadcn's `table`, `select`, `button` and `skeleton`.
  - They follow DiceUI's base-nova layout (`https://diceui.com/r/base-nova/data-table.json`) as the reference.
  - Every label is a prop.
- **Still the owner's choice:** TanStack Table, the URL state, 25/50/100 rows and the footer's shape.
- **Cost if wrong:** swap Task 7 for a DiceUI install and accept the English footer.

## Global Constraints

- Never commit: the commit steps below are `/iso-commit` checkpoints for the owner, never run by the executor.
- No `as` casts except `as const`; no `biome-ignore`; `objectKeys`/`objectValues`/`objectEntries`/`objectFromEntries` and the JSON helpers, never the raw globals.
- Constants: one nested object per owner; paths composed, never literals (tests included); error codes never string literals.
- A constant's type comes from zod (`z.enum`, `z.literal(TUPLE)`); lookup tables are `as const satisfies Record<K, V>`.
- A zod schema never crosses a package.
- Every test file starts with `// @module-tag unit` or `// @module-tag integration`. Vitest globals: no `from "vitest"`. Tests live beside their code in `tests/`.
- Package layout: `src/{environment,shared,features}`; export keys mirror file paths, one line per file.
- `"use client"` only on the smallest leaf that needs it. AOF components live in `packages/ui` with the `AOF` prefix; only `packages/ui` imports `@allonfire/shadcn`; `packages/shadcn` changes only through `npx shadcn@4.21.0 add <name>` run from `apps/back-office`, then `pnpm --filter @allonfire/shadcn canonicalize`.
- Classes come from `cva` variants or inline `cn`; corners from `--radius` (`rounded-sm..xl`); tokens from `theme.css`; WCAG AA in both themes; mobile-first.
- New dependencies must have at least 200k weekly downloads: `@tanstack/react-table` 9.3.1 (13.8M) and `hono-openapi` (already in the workspace).
- Strings go into the Back Office's `en.json` and `it.json` (`pnpm i18n:check`). App names come from `APP_ENTRY[app].name`, never a translation. Role names are translated.
- `perPage ∈ {25, 50, 100}`, 25 by default; newest first (`createdAt desc`); no sorting UI.
- Search grammar: parts separated by spaces; `app:<value>` and `role:<value>` are case-insensitive; anything else is free text matched as a case-insensitive part of the email. An unknown field or value is dropped, never an error.
- `app:` and `role:` together match the same Membership. `role:` alone means any App. `role:user` matches exactly that Role.
- Only a User with an Admin Membership in the Back Office lists Users. The check is explicit (`roleIn` + `hasRole`), never `canEnterApp`. 401 with no Session; 403 otherwise.
- End of every task: scoped `pnpm exec biome check --write <files>`, then that package's `check-types` and tests. End of the plan: repo-wide `pnpm check-types`, `pnpm lint`, `pnpm test`.

## Review Focus

1. **A hand-edited address never breaks the page.** `?page=0`, `?page=-3`, `?page=abc`, `?page=99999999999`, `?perPage=7`, `?search=role:boss%20team:x` all render (defaults applied) and never answer 400 or 500. Tests: Task 1 (parser), Task 3 (module query), Task 8 (nuqs cache).
2. **Equal `createdAt` values give a stable page order.** Fixtures are seeded in one go, so their timestamps can tie. Without a tie-breaker, users repeat or vanish between pages. Order by `createdAt desc, id desc`. Test: Task 2.
3. **A page past the end** answers `users: []` with the real `total`. The table shows the empty state with the pagination still able to go back, not a crash. Tests: Task 2 and Task 9.
4. **`app:` + `role:` on the same Membership.** A Laura Admin who is a Back Office Viewer must not match `app:back-office role:admin`. Test: Task 2.
5. **A non-Admin never receives User data.** That covers a Laura Admin, a Back Office User, a signed-out visitor, and a Back Office Admin whose request comes from the server with forwarded cookies. Tests: Task 3 (module), Task 4 (API with real Sessions).

---

## File Structure

```
packages/core/src/features/search/search-query.ts          generic field:value parser (new)
packages/database/src/features/auth/user.service.ts        listUsers (new)
packages/auth/src/features/users/
  constants/users.ts                                       USER constants + USER_SEARCH (new)
  hono/constants/schemas.ts                                query + body schemas (new)
  hono/utils/deps.ts, hono/utils/errors.ts                 UserDeps, forbidden() (new)
  hono/routes/{index,routes,handlers}.ts                   userRoutes (new)
apps/api/src/features/users/user-deps.ts                   userDeps(), isBackOfficeAdmin (new)
apps/back-office/src/
  environment/environment.ts                               API_URL (modified)
  features/api/utils/server-api.ts                         serverApi() (new)
  shared/constants/apps.ts                                 APP_ENTRY moved here from navigation (moved)
  features/users/constants/users-params.ts                 nuqs parsers + cache (new)
  features/users/utils/users-queries.ts                    query options (new)
  features/users/components/users-table.tsx                client table + phone cards (new)
  features/users/components/users-toolbar.tsx              search box + App/Role selects (new)
  app/[locale]/(signed-in)/users/page.tsx                  prefetch + HydrationBoundary (modified)
  app/[locale]/(signed-in)/users/[id]/page.tsx             placeholder (new)
packages/ui/src/components/aof-data-table.tsx              table, pagination, skeleton (new)
packages/ui/src/components/aof-card.tsx, aof-select.tsx    wrappers (new)
```

---

### Task 1: A generic search parser in core

**Files:**
- Create: `packages/core/src/features/search/search-query.ts`
- Test: `packages/core/src/features/search/tests/search-query.test.ts`
- Modify: `packages/core/package.json` (export `./features/search/search-query`)

**Interfaces:**
- Produces:
  ```ts
  type SearchFields = Record<string, readonly string[]>;
  type SearchValue<F extends SearchFields> = { [K in keyof F]?: ElementOf<F[K]> } & { text: string };
  searchQuery<const F extends SearchFields>(fields: F): {
    parse(raw: string | null | undefined): SearchValue<F>;
    serialize(value: SearchValue<F>): string;
  };
  ```

- [x] **Step 1: Write the failing tests.** Use a local table `const FIELDS = { app: ["laura", "back-office"], role: ["ADMIN", "USER", "VIEWER"] } as const`.
  - `parse("app:laura role:admin isaia")` → `{ app: "laura", role: "ADMIN", text: "isaia" }` (canonical spelling of the allowed value).
  - `parse("APP:Laura")` → `{ app: "laura", text: "" }`.
  - `parse("role:boss team:x  isa  ia ")` → `{ text: "isa ia" }`: the unknown value and the unknown field are dropped, and whitespace collapses.
  - `parse("app: role:admin")` → `{ role: "ADMIN", text: "" }`: an empty value is dropped.
  - `parse("app:laura app:back-office")` → `{ app: "back-office", text: "" }`: the last wins.
  - `parse(null)` and `parse("")` → `{ text: "" }`.
  - `serialize({ app: "laura", role: "ADMIN", text: "isaia" })` → `"app:laura role:admin isaia"`: fields in table order, values lower-cased, text last.
  - `serialize({ text: "" })` → `""`.
  - Round trip: `serialize(parse(x))` is stable for the inputs above.
- [x] **Step 2: Run, expect FAIL.** Run `pnpm --filter @allonfire/core exec vitest run src/features/search` and expect "Cannot find module".
- [x] **Step 3: Implement.** Build one `Map<lowercased value, canonical>` per field at `searchQuery()` time. Split on `/\s+/`. A token whose prefix before the first `:` is a known field is either applied or dropped; any other token is text. No zod: a lookup is enough, and no schema crosses a package.
- [x] **Step 4: Run, expect PASS.**
- [x] **Step 5: Checkpoint:** `feat(core): add field:value search parser`.

### Task 2: The `listUsers` database service

**Files:**
- Create: `packages/database/src/features/auth/user.service.ts`
- Test: `packages/database/src/features/auth/tests/user.integration.test.ts`
- Modify: `packages/database/package.json` (export `./features/auth/user.service`)

**Interfaces:**
- Produces:
  ```ts
  type UserRecord = { id: string; email: string; createdAt: Date; memberships: AccessMembership[] };
  type UserListQuery = { app?: App; role?: Role; text: string; page: number; perPage: number };
  listUsers(query: UserListQuery): Promise<{ users: UserRecord[]; total: number }>;
  ```

- [x] **Step 1: Write the failing integration test** against the Test database's Fixtures (`FIXTURE.USER`, `FIXTURE.USERS`), filtering with `text: "allonfire.test"` so only Fixtures count.
  - `total` with no filter equals `FIXTURE.USERS.length`, and `FIXTURE.USER.NO_MEMBERSHIP.email` is among the users.
  - `{ app: App.LAURA, role: Role.ADMIN }`:
    - includes `USER.LAURA.ADMIN` and `USER.ADMIN_EVERYWHERE`;
    - excludes `USER.BACK_OFFICE.ADMIN` and `USER.LAURA.VIEWER`.
  - **Same-Membership check** (Review Focus 4): create one User with `[{ LAURA, ADMIN }, { BACK_OFFICE, VIEWER }]` and remove them after. `{ app: BACK_OFFICE, role: ADMIN }` excludes them; `{ role: ADMIN }` includes them.
  - `{ role: Role.USER }` returns only Users holding exactly `USER` somewhere.
  - `{ app: App.LAURA }` excludes `NO_MEMBERSHIP`.
  - `text: "NO-MEMBERSHIP@"` finds it (case-insensitive contains).
  - **Order** (Review Focus 2): pages 1..n at `perPage: 25` concatenated equal one unpaged list, with no duplicates, ordered by `createdAt desc, id desc`.
  - **Past the end** (Review Focus 3): `page: 999` gives `users: []` and the real `total`.
  - Each User's `memberships` are ordered by `app`.
- [x] **Step 2: Run, expect FAIL.** Run `pnpm --filter @allonfire/database exec vitest run src/features/auth/tests/user.integration.test.ts` (Docker up).
- [x] **Step 3: Implement.**
  - One `prisma.$transaction([count, findMany])` sharing a `where`.
  - `email: { contains: text, mode: "insensitive" }` only when `text` is set.
  - `memberships: { some: { app?, role? } }` only when either is set.
  - `skip: (page - 1) * perPage`, `take: perPage`.
  - `select` memberships `{ app, role }` ordered by `app`.
- [x] **Step 4: Run, expect PASS.**
- [x] **Step 5: Checkpoint:** `feat(database): add listUsers service`.

### Task 3: The User module in `packages/auth`

**Files:**
- Create: `packages/auth/src/features/users/constants/users.ts`
- Create: `packages/auth/src/features/users/hono/constants/schemas.ts`
- Create: `packages/auth/src/features/users/hono/utils/deps.ts`, `.../hono/utils/errors.ts`
- Create: `packages/auth/src/features/users/hono/routes/{index,routes,handlers}.ts`
- Test: `packages/auth/src/features/users/hono/tests/routes.test.ts`, `.../hono/tests/test-host.ts`
- Modify: `packages/auth/package.json`
  - add `"hono-openapi": "^1.1.0"`;
  - add exports for `./features/users/constants/users`, `./features/users/hono/routes`, `./features/users/hono/utils/deps`.

**Interfaces:**
- Consumes: `searchQuery` (Task 1); `listUsers`, `UserRecord` (Task 2); `requireSession` (`features/hono/guards/middleware/require-session`); `AuthEnv`.
- Produces:
  ```ts
  USER = {
    PATH: { BASE: "/users", LIST: "/", FILTERS: "/filters" },
    PARAM: { SEARCH: "search", PAGE: "page", PER_PAGE: "perPage" },
    PAGE_SIZES: [25, 50, 100], DEFAULT_PAGE_SIZE: 25, DEFAULT_PAGE: 1, MAX_PAGE: 100_000,
    OPENAPI_TAG, DOC: { … },
  } as const;
  USER_SEARCH = searchQuery({ app: objectValues(App), role: objectValues(Role) });
  type UserDeps = { listUsers: typeof listUsers; canListUsers: (user: AccessUser) => boolean };
  userRoutes(deps: UserDeps): Hono<AuthEnv>   // chained: .get(USER.PATH.LIST, …).get(USER.PATH.FILTERS, …)
  // GET /        → 200 UserListBody = { users: { id, email, createdAt: string (ISO), memberships: { app, role }[] }[], total: number, pageCount: number }
  // GET /filters → 200 UserFiltersBody = { apps: App[], roles: Role[] }  (enum declaration order)
  ```

- [x] **Step 1: Write the failing tests** with a `testHost(session, deps)` modelled on `packages/storage/src/features/image/hono/tests/test-host.ts`, mounting at `USER.PATH.BASE`, with `listUsers` stubbed to record its argument.
  - No Session: 401 on both routes, and `listUsers` is never called.
  - `canListUsers` returning false: 403 with `ERROR.CODE.FORBIDDEN` on both routes.
  - `?search=APP:Laura%20role:admin%20isa&page=2&perPage=50` calls `listUsers({ app: App.LAURA, role: Role.ADMIN, text: "isa", page: 2, perPage: 50 })`.
  - **Hand-edited query** (Review Focus 1): `?page=0`, `?page=-3`, `?page=abc` and `?page=100001` each call with `page: 1`. `?perPage=7` and `?perPage=abc` call with `perPage: 25`. `?search=role:boss` calls with `{ text: "" }`. All answer 200.
  - The body is `{ users, total, pageCount }`:
    - `pageCount` is `Math.ceil(total / perPage)`;
    - `createdAt` is ISO text;
    - the body parses with `userListBodySchema`.
  - `/filters` answers `{ apps: objectValues(App), roles: objectValues(Role) }`.
- [x] **Step 2: Run, expect FAIL.** Run `pnpm --filter @allonfire/auth exec vitest run src/features/users`.
- [x] **Step 3: Implement.**
  - **Query schema.** `listQuerySchema` uses `.catch()` on every field, never a 400:
    - `search: z.string().catch("")`;
    - `page: z.coerce.number().int().min(1).max(USER.MAX_PAGE).catch(USER.DEFAULT_PAGE)`;
    - `perPage: z.coerce.number().pipe(z.literal(USER.PAGE_SIZES)).catch(USER.DEFAULT_PAGE_SIZE)`.
  - **Guards.** Each route runs `requireSession()`, then throws `forbidden()` (`CodedError`, `ERROR.CODE.FORBIDDEN`, 403) unless `deps.canListUsers(session.user)`.
  - **Docs.** `describeRoute` specs follow the Image module's `routes.ts`: bodies from `resolver(schema)`, errors as `problemResponseRef(401 | 403)`.
- [x] **Step 4: Run, expect PASS**, plus `pnpm --filter @allonfire/auth check-types`.
- [x] **Step 5: Checkpoint:** `feat(auth): add User module listing Users`.

### Task 4: Mount the User module on the API

**Files:**
- Create: `apps/api/src/features/users/user-deps.ts`
- Test: `apps/api/src/features/users/tests/users.integration.test.ts`, `apps/api/src/features/users/tests/user-deps.test.ts`
- Modify:
  - `apps/api/src/shared/constants/api.ts`: `API.PATH.USERS = \`${VERSION_PATH}${USER.PATH.BASE}\``;
  - `apps/api/src/app.ts`: `AppDeps.users: UserDeps`, and `.route(API.PATH.USERS, userRoutes(deps.users))` after `.route(API.PATH.IMAGES, …)`;
  - `apps/api/src/index.ts`: `users: userDeps()`;
  - `apps/api/src/shared/tests/app-deps.ts`: a stub `users`;
  - `packages/config/local/addresses.ts`: `API_PATH.USERS: "/v1/users"`;
  - the API test that checks config's `API_PATH` copy.

**Interfaces:**
- Consumes: `userRoutes`, `UserDeps`, `USER` (Task 3).
- Produces: `isBackOfficeAdmin(user: AccessUser): boolean`; `userDeps(): UserDeps`; `GET ${API.PATH.USERS}` and `GET ${API.PATH.USERS}${USER.PATH.FILTERS}` on `ApiType`, typed for `hc`.

- [x] **Step 1: Write the failing tests.**
  - **`user-deps.test.ts`:** `isBackOfficeAdmin` is true only for a Back Office `ADMIN` Membership. It is false for a Back Office `USER`, a Laura `ADMIN` and no Memberships.
  - **`users.integration.test.ts`** (Review Focus 5), signing in through `shared/tests/sign-in`:
    - `FIXTURE.USER.BACK_OFFICE.ADMIN` gets 200 with `total >= FIXTURE.USERS.length`;
    - `FIXTURE.USER.LAURA.ADMIN` and `FIXTURE.USER.BACK_OFFICE.USER` get a 403 problem document (`code` = `API.ERROR.CODE.FORBIDDEN`);
    - a request with no cookie gets 401;
    - `/filters` answers both enums;
    - the OpenAPI document lists both paths under `USER.OPENAPI_TAG`.
- [x] **Step 2: Run, expect FAIL.** Run `pnpm --filter @allonfire/api exec vitest run src/features/users`.
- [x] **Step 3: Implement.** `isBackOfficeAdmin` is `roleIn(user, App.BACK_OFFICE)` checked with `hasRole(…, Role.ADMIN)`, never `canEnterApp`. `userDeps()` wires the real `listUsers`.
- [x] **Step 4: Run, expect PASS.** Then run the API's whole suite (`pnpm --filter @allonfire/api test`): the docs, `client.test-d.ts` and route-path guards must stay green.
- [x] **Step 5: Checkpoint:** `feat(api): mount User module at /v1/users`.

### Task 5: The Back Office reaches the API from its server

**Files:**
- Create: `apps/back-office/src/features/api/utils/server-api.ts`
- Modify:
  - `apps/back-office/src/environment/environment.ts` (server `API_URL: z.url()`);
  - `apps/back-office/src/environment/tests/environment.test.ts`;
  - `apps/back-office/.env.example` (`API_URL="http://localhost:3300"`, with a comment that production uses the internal Docker address);
  - `packages/config/local/tests/local-files.test.ts` (`` `API_URL="${LOCAL.URL.API}"` ``);
  - `packages/config/tests/e2e/playwright.config.ts` (the App's `API_URL` is the e2e API, beside `API_AUTH_URL`);
  - `docker/docker-compose.prod.yml` (back-office `- API_URL=http://api:3000`);
  - `docker/Dockerfile` (build placeholder `API_URL="http://build.placeholder"` beside `AUTH_URL`);
  - `.github/workflows/ci.yml` (build job env `API_URL: http://build.placeholder`).
- `deploy.yml` is untouched: the build never calls the API (the Users page is dynamic). This is a ruling against the spec's list.

**Interfaces:**
- Produces: `serverApi(): Promise<ReturnType<typeof hc<ApiType>>>`, an `hc<ApiType>(env.API_URL, { headers: await readVisitorHeaders() })`. It is server-only (`import "server-only"` if the App already uses it, else a file comment).

- [x] **Step 1: Write the failing tests.**
  - `environment.test.ts`: a missing or invalid `API_URL` fails, a valid one passes (same shape as the existing cases).
  - `local-files.test.ts`: the new `.env.example` line.
- [x] **Step 2: Run, expect FAIL.** Run `pnpm --filter @allonfire/back-office exec vitest run src/environment` and `pnpm --filter @allonfire/config test`.
- [x] **Step 3: Implement** the env var, the files above and `serverApi`.
- [x] **Step 4: Run, expect PASS.** Copy the new line into the owner's `.env.development` only if they ask (it is gitignored); otherwise say it is needed.
- [x] **Step 5: Checkpoint:** `feat(back-office): add server API_URL`.

### Task 6: A Section owns the pages under it

**Files:**
- Modify: `packages/auth/src/features/next/utils/with-sign-in-gate.ts`; test `packages/auth/src/features/next/tests/with-sign-in-gate.test.ts`.
- Modify: `apps/back-office/src/features/navigation/constants/sections.ts` (`isCurrentSection`, and its ponytail note goes); test `apps/back-office/src/features/navigation/tests/sections.test.ts`.
- Create: `apps/back-office/src/app/[locale]/(signed-in)/users/[id]/page.tsx`.
- Modify: `en.json`/`it.json` (`Users.detail.title`, `Users.detail.description`).

**Interfaces:**
- Produces:
  - `isCurrentSection(pathname, path)`: true for `sectionHref(path)` and, when `path` is not Home's `""`, for anything under `${path}/`.
  - `withSignInGate` redirects any path under a non-empty page (`/users/abc`, `/it/users/abc`) to that form's Sign in.

- [x] **Step 1: Write the failing tests.**
  - **Gate** (no cookie):
    - redirects `/users/abc` to `/sign-in` and `/it/users/abc` to `/it/sign-in`;
    - still passes `/usersx` and `/unknown/abc`, which go to a 404, not Sign in;
    - Home (`""`) never gates `/anything` by prefix.
  - **`sections.test.ts`:**
    - `isCurrentSection("/users/abc", SECTION.USERS.path)` is true;
    - `currentSection("/users/abc")` is `SECTION.USERS`;
    - `isCurrentSection("/users/abc", SECTION.HOME.path)` is false.
    - Replace `"lists every signed-in page, and nothing else"`: every page path equals a Section's path or starts with `${section.path}/`, every Section has its page, and every page gates itself.
    - The existing `/users/storage` → Home case changes to `SECTION.USERS`, since it is now under Users.
- [x] **Step 2: Run, expect FAIL** in both packages.
- [x] **Step 3: Implement.**
  - The gate keeps its exact-match map and adds a prefix check over the non-empty pages, per locale form.
  - The placeholder page is `export default signedInPage(UserPage)`, built with `SectionPage`:
    - an `AOFBreadcrumb` back to Users (`sectionHref(SECTION.USERS.path)`);
    - an `AOFEmpty` with `Users.detail.*`;
    - `generateMetadata` reuses `sectionMetadata(SECTION.USERS)`.
- [x] **Step 4: Run, expect PASS**, plus `pnpm i18n:check`.
- [x] **Step 5: Checkpoint:** `feat(back-office): let a Section own its sub-pages`.

### Task 7: AOF data table, select and card in `packages/ui`

**Files:**
- Create: `packages/ui/src/components/aof-data-table.tsx`, `aof-select.tsx`, `aof-card.tsx`
- Test: `packages/ui/src/components/tests/aof-data-table.test.tsx`, `aof-select.test.tsx`, `aof-card.test.tsx`
- Modify: `packages/ui/package.json` (`"@tanstack/react-table": "^9.3.1"`)

**Interfaces:**
- Produces (TanStack Table v9: read its docs through Context7 and DiceUI's base-nova `data-table.tsx`/`data-table-pagination.tsx` for the v9 calls: `useTable`, `tableFeatures({ rowPaginationFeature })`, `FlexRender`, `table.Subscribe`):
  ```ts
  type AOFDataTableLabels = { rowsPerPage: string; page: (page: number, pageCount: number) => string;
    first: string; previous: string; next: string; last: string; loading: string };
  AOFDataTable<TData>(props: ComponentProps<"div"> & { table: AOFTable<TData>; label: string;
    card?: (row: Row<TData>) => ReactNode; children?: ReactNode /* toolbar */; footer?: ReactNode })
  AOFDataTablePagination<TData>(props: { table: AOFTable<TData>; pageSizes: readonly number[]; labels: AOFDataTableLabels })
  AOFDataTableSkeleton(props: { columns: number; rows: number; label: string })
  AOFSelect / AOFSelectTrigger / AOFSelectValue / AOFSelectContent / AOFSelectItem   // thin shadcn select wrappers
  AOFCard / AOFCardHeader / AOFCardTitle / AOFCardContent                           // thin shadcn card wrappers
  ```
- **Layout.** `AOFDataTable` is a `flex min-h-0 flex-1 flex-col`. The table's wrapper scrolls (`min-h-0 flex-1 overflow-auto`) with a sticky header. The footer stays below it.
- **Phone cards.** When `card` is given, the table is `hidden md:block` and a `md:hidden` list renders `card(row)` for each `table.getRowModel().rows`.

- [x] **Step 1: Write the failing tests** (Testing Library, unit), using a tiny 3-column table with `manualPagination`, `pageCount: 3`, `pageIndex: 1`.
  - The header and cells render, and the table carries `aria-label`.
  - Pagination shows `labels.page(2, 3)`. The four buttons carry the given aria-labels; first and previous are enabled; next fires `onPaginationChange` to `pageIndex: 2`; first and previous are disabled at `pageIndex: 0`.
  - The page-size select lists exactly `[25, 50, 100]`.
  - `card` renders one card per row.
  - The skeleton renders `rows × columns` cells and an `sr-only` `label`.
  - `AOFCard` and `AOFSelect` merge a caller's `className` via `cn`.
- [x] **Step 2: Run, expect FAIL.** Run `pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-data-table.test.tsx`.
- [x] **Step 3: Implement** on shadcn's `table`, `select`, `button` (`AOFButton`) and `skeleton`. If a primitive is missing, run `npx shadcn@4.21.0 add <name>` from `apps/back-office`, then canonicalize. Corners use `rounded-lg` on the frame and `rounded-md` inside.
- [x] **Step 4: Run, expect PASS**, plus `pnpm --filter @allonfire/ui check-types`.
- [x] **Step 5: Checkpoint:** `feat(ui): add AOF data table, select and card`.

### Task 8: Users params and queries in the Back Office

**Files:**
- Move: `apps/back-office/src/features/navigation/constants/apps.ts` to `apps/back-office/src/shared/constants/apps.ts`, updating its imports. Two top-level features now read `APP_ENTRY`.
- Create: `apps/back-office/src/features/users/constants/users-params.ts`
- Create: `apps/back-office/src/features/users/utils/users-queries.ts`
- Test: `apps/back-office/src/features/users/tests/users-params.test.ts`

**Interfaces:**
- Consumes: `USER`, `USER_SEARCH` (Task 3); `api` (browser) and `serverApi()` (Task 5).
- Produces:
  ```ts
  usersParams = {
    [USER.PARAM.SEARCH]: createParser({ parse: (v) => USER_SEARCH.serialize(USER_SEARCH.parse(v)) || null, serialize: String }).withDefault(""),
    [USER.PARAM.PAGE]:   page parser: integer in 1..USER.MAX_PAGE else null, default USER.DEFAULT_PAGE,
    [USER.PARAM.PER_PAGE]: parseAsNumberLiteral(USER.PAGE_SIZES).withDefault(USER.DEFAULT_PAGE_SIZE),
  }  // from "nuqs/server", options { clearOnDefault: true, history: "push" }
  usersParamsCache = createSearchParamsCache(usersParams);
  type UsersParams = { search: string; page: number; perPage: 25 | 50 | 100 };
  usersQuery(client: ApiClient, params: UsersParams): queryOptions  // key ["users", "list", params]
  userFiltersQuery(client: ApiClient): queryOptions                 // key ["users", "filters"]
  ```
  `ApiClient` is `typeof api`. Each `queryFn` calls `parseResponse(client.v1.users.$get({ query }))`, so an error throws `DetailedError`.

- [x] **Step 1: Write the failing tests** (Review Focus 1). `usersParamsCache.parse({...})`:
  - `{ page: "0" }`, `{ page: "-3" }`, `{ page: "abc" }` and `{ page: "100001" }` → `page: 1`;
  - `{ perPage: "7" }` → `25`; `{ perPage: "50" }` → `50`;
  - `{ search: "role:boss APP:Laura isa" }` → `search: "app:laura isa"`;
  - `{}` → `{ search: "", page: 1, perPage: 25 }`.
  - `usersQuery(client, p).queryKey` equals `["users", "list", p]`.
- [x] **Step 2: Run, expect FAIL.** Run `pnpm --filter @allonfire/back-office exec vitest run src/features/users`.
- [x] **Step 3: Implement.**
- [x] **Step 4: Run, expect PASS**, plus the navigation tests after the move.
- [x] **Step 5: Checkpoint:** `feat(back-office): add Users params and queries`.

### Task 9: The Users table, toolbar and page

**Files:**
- Create: `apps/back-office/src/features/users/components/users-table.tsx` (`"use client"`)
- Create: `apps/back-office/src/features/users/components/users-toolbar.tsx` (`"use client"`)
- Test: `apps/back-office/src/features/users/components/tests/users-table.browser.test.tsx`
- Modify: `apps/back-office/src/shared/tests/msw/handlers.ts` (default handlers for `${TEST_API_URL}${API_PATH.USERS}` and `/filters`)
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/users/page.tsx`
- Modify: `en.json`, `it.json`: replace `Users.empty.*` and add the keys below.
- Test (e2e): `apps/back-office/e2e/users.spec.ts`

**Interfaces:**
- Consumes: Tasks 3, 5, 7 and 8.
- Produces: `UsersTable` (no props; reads `useQueryStates(usersParams)`) and `UsersToolbar`.

**Translations (English; Italian by the builder, checked by `pnpm i18n:check`):**
- `Users.search.label`: "Search by email"
- `Users.filter.app`: "App"
- `Users.filter.role`: "Role"
- `Users.filter.any`: "Any"
- `Users.column.email`: "Email"
- `Users.column.created`: "Created"
- `Users.role.{ADMIN,USER,VIEWER}`: "Admin" / "User" / "Viewer"
- `Users.noMembership`: "Not a member", the `sr-only` text beside the visible "—"
- `Users.pagination.{rowsPerPage,page,first,previous,next,last}`:
  - "Rows per page";
  - "Page {page} of {pageCount}";
  - "Go to first page", "Go to previous page", "Go to next page", "Go to last page".
- `Users.loading`: "Loading Users"
- `Users.empty.title`: "No Users match"
- `Users.empty.description`: "Try another email, App or Role."
- `Users.error.title`: "The Users could not be loaded"
- `Users.error.retry`: "Try again"

- [x] **Step 1: Write the failing browser test** (MSW; Chromium and WebKit; wrapped in `NextIntlClientProvider` with `en.json`, the App's `QueryClientProvider` and nuqs's testing adapter at `?page=1`).
  - **Columns.** Email, one column per App from `/filters` (header `APP_ENTRY[app].name`) and Created. A User with no Membership shows "—" in each App column, with `Users.noMembership` for screen readers.
  - **Link.** The email cell is a link to `/users/<id>`.
  - **Search.** Typing `isa` writes `?search=isa` after about 300ms and resets `page` to 1. The MSW request carries `search=isa`.
  - **Selects.** Picking Laura then Admin writes `search=app:laura role:admin isa`. Choosing "Any" removes the field.
  - **Pagination.** "Next" requests `page=2`. The previous rows stay visible until the answer arrives (`placeholderData: keepPreviousData`).
  - **Empty.** `users: []` with `total: 0` shows `Users.empty.title`.
  - **Past the end** (Review Focus 3): `page=5` with `total: 30` shows the empty state, and "Go to first page" is enabled.
  - **Error.** A 500 problem document shows `Users.error.title`; "Try again" refetches.
- [x] **Step 2: Run, expect FAIL.** Run `pnpm --filter @allonfire/back-office test:browser -- users-table`.
- [x] **Step 3: Implement.**
  - **Toolbar.** An `AOFInput` search box, debounced 300ms (a small `useEffect` timer; no new dependency), and two `AOFSelect`s fed by `userFiltersQuery`. Each writes through `USER_SEARCH.serialize` and sets `page: null`.
  - **Table.**
    - `useQuery(usersQuery(api, params))` with `placeholderData: keepPreviousData`;
    - TanStack `manualPagination`, `pageCount` from the body, `state.pagination` from the params, and `onPaginationChange` writing `page` and `perPage`;
    - the skeleton while `isPending`, `AOFEmpty` for no rows, and the error state with retry;
    - phone cards through `card` (email link, the Role per App the User holds, Created), with dates through next-intl's `useFormatter().dateTime`.
  - **Page.** `UsersPage` stays a Server Component under `signedInPage`:
    - `const params = usersParamsCache.parse(await searchParams)`;
    - `const client = await serverApi()`;
    - `const queryClient = AOFGetQueryClient()`;
    - `await Promise.all([queryClient.prefetchQuery(usersQuery(client, params)), queryClient.prefetchQuery(userFiltersQuery(client))])`;
    - render `<HydrationBoundary state={dehydrate(queryClient)}>`, then `UsersToolbar` and `UsersTable` inside a `flex min-h-0 flex-1 flex-col` `SectionPage`.
    - Read Next's bundled docs (`packages/core/node_modules/next/dist/docs/`) on `searchParams` under Cache Components before writing it.
- [x] **Step 4: Run, expect PASS.**
- [x] **Step 5: Write the e2e spec** (`users.spec.ts`, every project), signed in as `FIXTURE.USER.BACK_OFFICE.ADMIN` with `FIXTURE.PASSWORD`.
  - `/users` lists `FIXTURE.USER.NO_MEMBERSHIP.email` in the server-rendered HTML (prefetch; no loading skeleton on first paint).
  - `/users?search=app:laura%20role:admin` shows `USER.LAURA.ADMIN.email` and not `USER.BACK_OFFICE.ADMIN.email`.
  - `/users?page=abc&perPage=7` renders 25 rows per page.
  - Clicking an email lands on `/users/<id>` with Users marked current in the sidebar.
  - Signed in as `FIXTURE.USER.LAURA.ADMIN`, the page does not render (the App's own gate).
  - Signed out, `/users/abc` redirects to Sign in.
  - Run `pnpm --filter @allonfire/back-office test:e2e -- users` and expect PASS.
- [x] **Step 6: One screenshot round** through `/iso-browser` on the owner's tab (`localhost:3400/users`): phone 390 and desktop, light and dark. Fix what it shows, then stop (aof-design budget). Reset emulation.
- [x] **Step 7: Final checks.** Run scoped `pnpm exec biome check --write` on every touched file, then `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm i18n:check` and `pnpm --filter @allonfire/back-office tailwind:check`, all green.
- [x] **Step 8: Checkpoint:** `feat(back-office): list Users in a server-prefetched table`.

## Implementation Log
- Implemented: 2026-10-22T08:06:32Z
- Workspace: current-branch — feat/back-office-frame
- Committed: no — awaiting user review
