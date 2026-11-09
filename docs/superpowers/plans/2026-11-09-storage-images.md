# Storage > Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Storage becomes a sidebar Section with an Images sub-page where a Back Office Admin browses, uploads, edits and deletes Images, sees the count and total size, and can open the Image failure logs in OpenObserve.

**Architecture:** The Image API gains an optional numbered list mode (`total`, `totalBytes`, `pageCount`) beside its cursor mode; the Back Office gets a `features/images` mirroring `features/users` (private-cache hydration, TanStack table, server actions, own `new` and `[id]` pages); the Image module's real-failure log lines gain a stable `event` field the OpenObserve link filters on.

**Tech Stack:** Hono + hono-openapi, Prisma, Better Auth sessions, Next 16 (Cache Components, `"use cache: private"`), TanStack Query/Table, nuqs, `useAOFForm`, Vitest (unit, browser), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-storage-images-design.md`

## Global Constraints

- Tests first; first line of a test file is `// @module-tag unit` or `// @module-tag integration`; Vitest globals; browser tests are `*.browser.test.tsx`.
- No `as` casts except `as const`; constants in one nested object per owner (`IMAGE`, `IMAGES`, `BACK_OFFICE`, `QUERY`); a path or error code is never a string literal, tests included.
- Env var starts with its owner: `TELEMETRY_URL`.
- Every form is an AOF form (`useAOFForm`); pages are built through `/aof-design`, never plain `/impeccable`; one build plus one screenshot round per page.
- Server Components by default; the UI never says "bucket" (CONTEXT.md: Storage).
- Read first: `docs/guides/{back-office,images,next-apps,forms,api,testing,code-style,conventions}.md`, `packages/core/node_modules/next/dist/docs/` (Next), ADR 0020, 0027, 0028.
- Do not commit (the user commits); do not touch `apps/laura`.

## Review Focus

- `page` together with `cursor` on `GET /images`: 400, nothing read.
- `page` past the last page: `images: []`, real `total` and `pageCount` (the table shows the past-the-end notice as Users does).
- `totalBytes` with zero Images: `0`, not null.
- An Image visible to the Admin only through one App: counted, summed and listed under the same visibility rule as the cursor list.
- `TELEMETRY_URL` unset or empty: no link, no crash.
- Deleting every row of the last page: the table steps back a page (Users does this).
- A save on an Image another Admin changed: 409 `RESOURCE_CHANGED`/`IMAGE_CHANGED` shown as `Common.Request.changed`.

---

## Task 1: Numbered list in the database service

**Files:**
- Modify: `packages/database/src/features/image/image.service.ts`
- Test: `packages/database/src/features/image/tests/image.integration.test.ts`

**Interfaces:**
- Produces: `listImagesPage(args: { app?: App | undefined; enterable: readonly App[]; page: number; perPage: number }): Promise<{ images: ImageRecord[]; total: number; totalBytes: number }>`. Same visibility `where` as `listImages` (extract one shared `visibleWhere({ app, enterable })`), newest first (`createdAt desc, id desc`), `skip: (page - 1) * perPage`.

- [ ] **Step 1: Failing integration tests** in `image.integration.test.ts`: `lists the second page with the real total`, `sums bytes over every visible Image, not just the page`, `counts only Images the caller may see` (a private Image in an App outside `enterable` is absent from `total` and `totalBytes`), `answers totalBytes 0 and no images for nobody's Images`.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/database test -- image.integration` — expect FAIL (`listImagesPage` undefined).
- [ ] **Step 3: Implement** `listImagesPage`: `Promise.all([prisma.image.count({ where }), prisma.image.aggregate({ _sum: { bytes: true }, where }), prisma.image.findMany(...)])` as `listUsers` does; `totalBytes: aggregate._sum.bytes ?? 0`; refactor `listImages` to use `visibleWhere` (its tests must stay green).
- [ ] **Step 4: Run** the same command — expect PASS.

## Task 2: Numbered mode on `GET /images`

**Files:**
- Modify: `packages/storage/src/features/image/constants/image.ts` (`LIMIT.MAX_PAGE: 1000`, my call), `.../hono/constants/schemas.ts`, `.../hono/routes/read-handlers.ts`, `.../hono/routes/routes.ts` (200 documents both shapes), `.../hono/utils/deps.ts`, `apps/api/src/features/image/image-deps.ts`
- Test: `.../hono/tests/read.test.ts`, `.../hono/tests/schemas.test.ts`, `.../hono/tests/stub-image-deps.ts`

**Interfaces:**
- Consumes: `listImagesPage` (Task 1).
- Produces: `ImageDeps.listImagesPage: typeof listImagesPage`; `listQuerySchema` gains `page` (coerce int, `1..IMAGE.LIMIT.MAX_PAGE`, optional) and `perPage` (coerce int, `1..IMAGE.LIMIT.LIST.MAX`, default `IMAGE.LIMIT.LIST.DEFAULT`), refined so `page` and `cursor` together fail; `imagePageBodySchema = { images: ImageBody[]; page: number; pageCount: number; total: number; totalBytes: number }` (`meta({ ref: "ImagePage" })`); `GET /images` answers `ImageListBody | ImagePageBody`.

- [ ] **Step 1: Failing tests** in `read.test.ts`: `answers a numbered page with total, totalBytes and pageCount when page is given`; `keeps the cursor answer when page is left out`; `refuses page with cursor with 400`; `pageCount is ceil(total / perPage), 0 images past the end`. In `schemas.test.ts`: `page 0 and page above MAX_PAGE are refused`.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/storage test -- hono/tests` — expect FAIL.
- [ ] **Step 3: Implement** schema, route doc, handler branch (page mode calls `deps.listImagesPage` with `enterable: enterableApps(session user)`; else unchanged), add `listImagesPage` to `ImageDeps`, the stub and `apps/api/src/features/image/image-deps.ts`. Update the `GET /images` description in `IMAGE.DOC` (numbered mode) and `apps/api/README.md`'s Image endpoint line.
- [ ] **Step 4: Run** storage tests and `pnpm --filter @allonfire/api test -- spec` (OpenAPI snapshot/spec test) — expect PASS.

## Task 3: Stable `event` on the Image failure logs

**Files:**
- Modify: `packages/storage/src/features/image/constants/image.ts` (`LOG_EVENT`), `.../objects/utils/delete-leftovers.ts`, `.../hono/routes/write-handlers.ts`, `packages/storage/src/features/avatar/objects/avatar-objects.ts` (only if it calls `deleteLeftovers`: give it an `event` too)
- Test: `.../objects/tests/delete-leftovers.test.ts`

**Interfaces:**
- Produces: `IMAGE.LOG_EVENT = { CLEANUP_FAILED: "image.cleanup_failed", OBJECT_DELETE_FAILED: "image.object_delete_failed", PUBLIC_FILE_LEFT: "image.public_file_left" } as const`; `deleteLeftovers({ event, keys, log, reason, remove, retry? })` logs `warn({ err, event, keys }, reason)`.

- [ ] **Step 1: Failing test** `logs the event beside the keys and the error when the delete fails` (stub `log.warn` called with `{ err, event: IMAGE.LOG_EVENT.CLEANUP_FAILED, keys }, reason`).
- [ ] **Step 2: Run** `pnpm --filter @allonfire/storage test -- delete-leftovers` — expect FAIL.
- [ ] **Step 3: Implement**; each call site passes the event matching its existing `reason` (`CLEANUP_FAILED`, `PUBLIC_FILE_LEFT`, `OBJECT_DELETE_FAILED`). Record the three names in `docs/guides/images.md` (log events, searched in OpenObserve).
- [ ] **Step 4: Run** `pnpm --filter @allonfire/storage test` — expect PASS.

## Task 4: Storage > Images in the sidebar

**Files:**
- Modify: `apps/back-office/src/features/navigation/constants/sections.ts` (`SectionPageLabel` adds `"images"`; `STORAGE.pages = [{ icon: IconPhoto, label: "images", path: BACK_OFFICE.PAGE.STORAGE_IMAGES }]`), `apps/back-office/src/shared/constants/back-office.ts` (`PAGE.STORAGE_IMAGES: "/storage/images"`), `apps/back-office/src/features/i18n/translations/{en,it}.json` (`Navigation.images`, drop `Storage.empty`)
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/storage/page.tsx` → redirects to `sectionEntry(SECTION.STORAGE)` like `services/page.tsx`
- Create: `apps/back-office/src/app/[locale]/(signed-in)/storage/images/page.tsx` (temporary: `SectionPage` with the h1; Task 7 fills it)
- Test: `apps/back-office/src/features/navigation/utils/tests/sections.test.ts`, `.../navigation/tests/sections.test.ts`, `apps/back-office/e2e/frame.spec.ts`

- [ ] **Step 1: Failing tests**: `sectionEntry(SECTION.STORAGE)` is `BACK_OFFICE.PAGE.STORAGE_IMAGES`; the guard test (every page under `(signed-in)` is a Section row and gates itself) passes for `/storage/images`; `frame.spec.ts`: opening Storage in the sidebar lands on Images with its row marked.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/back-office test -- sections` — expect FAIL.
- [ ] **Step 3: Implement** the rows, pages and translations (both languages).
- [ ] **Step 4: Run** the same — expect PASS.

## Task 5: OpenObserve link

> **Superseded (2026-11-09):** the OpenObserve link, `TELEMETRY_URL`, `observeLink` and the Images header (count and size) were dropped; the count and size live in the Storage overview on Home (`2026-11-09-storage-overview.md`). The Image failure `event` log fields stay.


**Files:**
- Modify: `apps/back-office/src/environment/environment.ts` (`TELEMETRY_URL`, optional, unset or empty allowed, as `LAURA_URL`), `apps/back-office/.env.example`, `docker/docker-compose*.yml` (Production: plain value `https://observe.isaiariva.com`, Local: `http://localhost:5080`), `docs/guides/deployment.md`
- Create: `apps/back-office/src/features/images/utils/observe-link.ts`
- Test: `apps/back-office/src/features/images/utils/tests/observe-link.test.ts`

**Interfaces:**
- Produces: `observeLink(base: string | undefined): string | null` — `null` when `base` is unset or empty; else the OpenObserve logs-search URL filtering `event` starting with `image.` (built from `IMAGE.LOG_EVENT` prefix, never a literal).

- [ ] **Step 1: Failing tests**: `returns null when the base is unset or empty`; `starts with the base address and filters on the image. event prefix`; `does not double a trailing slash`.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/back-office test -- observe-link` — expect FAIL.
- [ ] **Step 3: Implement.** Open OpenObserve once, run the filtered search, and copy that URL's shape (query encoding) into the function and its test; this is the one fact the plan cannot know.
- [ ] **Step 4: Run** — expect PASS.

## Task 6: Images data layer (Back Office)

**Files:**
- Create under `apps/back-office/src/features/images/`: `constants/images.ts` (`IMAGES`: `CACHE.TAG: "images"`, `CACHE.LIFE` like `USERS.CACHE.LIFE`, `RETRIES`, `PATH.NEW: "/new"`, error/notice codes as Users has), `constants/images-params.ts` (nuqs loader: `page`, `perPage`, `app`), `utils/images-queries.ts` (`fetchImages`, `imagesListKey`, `imagesQuery`, `fetchImage`), `utils/images-hydration.ts` (`imagesHydration(params)`, `"use cache: private"`, `cacheTag(IMAGES.CACHE.TAG)`), `utils/read-image.ts`
- Modify: `apps/back-office/src/shared/constants/query.ts` (`QUERY.IMAGES.ALL`, `QUERY.IMAGES.LIST(params)`)
- Test: `.../images/utils/tests/{images-queries,images-hydration,read-image}.test.ts`, `.../images/tests/images-params.test.ts`

**Interfaces:**
- Consumes: the numbered `GET /images` (Task 2). `fetchImages(client: ApiClient, params: ImagesParams)` sends `page`, `perPage`, `app` and returns the `ImagePageBody`; it throws if the API answers the cursor shape (narrowed by `"pageCount" in body`, no cast).
- Produces: `ImagesParams = { app: App | null; page: number; perPage: number }`.

- [ ] **Step 1: Failing tests** mirroring `users-queries.test.ts`, `users-hydration.test.ts`, `read-user.test.ts`, `users-params.test.ts` (use `features/api/tests/fake-api.ts`): the request carries `page`/`perPage`/`app`; a refusal throws and is not kept; params clean a bad page to the default.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/back-office test -- features/images` — expect FAIL.
- [ ] **Step 3: Implement**, copying the Users files' structure and doc comments (swap names); `CACHE.LIFE.stale` stays at least 5 minutes.
- [ ] **Step 4: Run** — expect PASS.

## Task 7: Images list page

**Files (built through `/aof-design`):**
- Create under `apps/back-office/src/features/images/components/`: `images-table.tsx`, `image-columns.tsx`, `images-filters.tsx` (App filter), `images-toolbar.tsx` (Add, Delete), `images-header.tsx` (count, `formatBytes(totalBytes)`, observe link), `images-list-skeleton.tsx`; `hooks/use-images-table-state.ts`, `hooks/use-delete-images-flow.ts`; `actions/delete-images.ts`; `utils/format-bytes.ts`
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/storage/images/page.tsx` (hydrates through `imagesHydration` inside its own `<Suspense fallback={<ImagesListSkeleton />}>`, like `users/page.tsx`), translations `Images.*` (en, it)
- Test: `.../images/utils/tests/format-bytes.test.ts`, `.../images/actions/tests/delete-images.test.ts`, `.../images/components/tests/{images-table,images-header,images-list-skeleton}.browser.test.tsx`, `.../images/hooks/tests/*.browser.test.tsx`

**Interfaces:**
- Produces: `deleteImages(ids: readonly string[]): Promise<{ error?: DeleteImagesError }>` server action (calls `DELETE /images` with `{ ids }`, then `updateTag(IMAGES.CACHE.TAG)`; a refusal is a value, never a throw).

- [ ] **Step 1: Failing tests**: `formatBytes(0)`, `formatBytes(1536)` reads `1.5 KB`; action: `clears the images tag after deleting` and `answers the API refusal as a value`; table: rows show thumbnail, size, dimensions, access, Apps, date; selecting rows enables Delete; the header shows `total` and `formatBytes(totalBytes)`, and the observe link only when `observeLink` is non-null; past-the-last-page shows the Users-style notice.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/back-office test -- features/images` (unit) and `pnpm --filter @allonfire/back-office test:browser -- features/images` — expect FAIL.
- [ ] **Step 3: Implement** with `AOFDataTable` as `users-table.tsx` does; the thumbnail is `srcSetLoader` over the Image's `srcSet` (`images.md`). Pick the Design with `/aof-design`: one build, one screenshot round.
- [ ] **Step 4: Run** both commands — expect PASS.

## Task 8: Upload and edit pages

> **Also (Storage overview, `2026-11-09-storage-overview.md` Task 5):** `addImage` and `editImage` call `updateTag(STORAGE.CACHE.TAG)` (from `@/features/storage/constants/storage`) beside `updateTag(IMAGES.CACHE.TAG)`, and their mutations invalidate `QUERY.STORAGE.ALL` as `deleteImagesMutation` does.

**Files (built through `/aof-design`):**
- Create: `apps/back-office/src/app/[locale]/(signed-in)/storage/images/new/page.tsx`, `.../images/[id]/page.tsx`; under `features/images/`: `components/{add-image,edit-image,image-form-fields}.tsx`, `actions/{add-image,edit-image}.ts`, `utils/{add-image-schema,edit-image-schema,image-form-data}.ts`
- Test: `.../images/actions/tests/{add-image,edit-image}.test.ts`, `.../images/utils/tests/*schema.test.ts`, `.../images/components/tests/{add-image,edit-image}.browser.test.tsx`

**Interfaces:**
- Produces: `addImage(prev: AddImageState, form: FormData): Promise<AddImageState>` (one file per upload, my call; the API takes many, a later change; builds the multipart `file` + `meta` of `uploadFormSchema`); `editImage(prev: EditImageState, form: FormData): Promise<EditImageState>` (sends one `PATCH /images` item with `version`; 409 → `IMAGES.EDIT_ERROR.CHANGED`, 404 → `GONE`). Both `updateTag(IMAGES.CACHE.TAG)` on success then `redirect` to `BACK_OFFICE.PAGE.STORAGE_IMAGES`. Forms use `useAOFForm`, alt in every Base language, access choice, Apps choice; the edit page also hosts the single-Image delete (reuses `deleteImages`).

- [ ] **Step 1: Failing tests**: schemas require an alt in every Base language and at least one App; `addImage` posts the multipart parts in the shape `uploadFormSchema` parses and clears the tag; `editImage` carries `version` and maps 409/404 to the codes; browser: the add form opens empty on each visit (`AOFFreshOnReturn`), the edit form keeps nothing typed after a 409 notice.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/back-office test -- features/images` and `... test:browser -- features/images` — expect FAIL.
- [ ] **Step 3: Implement** after `add-user.ts`/`edit-user.ts` and their components; an unsupported or too-large file shows the API's problem code as a form notice. Run `/aof-design` once per page.
- [ ] **Step 4: Run** both — expect PASS.

## Task 9: End to end and docs

**Files:**
- Create: `apps/back-office/e2e/images.spec.ts`
- Modify: `apps/back-office/e2e/instant.spec.ts` (instant navigation Storage > Images, as Users), `docs/guides/back-office.md` (Storage Section: Images, numbered list, cache tag, observe link), `docs/guides/images.md` (numbered list mode, `LOG_EVENT`), `apps/api/README.md`, `CONTEXT.md` only if a term changed (none expected)

- [ ] **Step 1: Failing e2e** `images.spec.ts`: sign in as the seed Admin, open Storage > Images, upload a fixture photo (`packages/storage/src/features/image/fixtures/files/photo.jpg`), see it in the table with the header count up by one, edit its alt, delete it, see the count back. `instant.spec.ts`: Images list is in the static shell.
- [ ] **Step 2: Run** `pnpm --filter @allonfire/back-office e2e -- images instant` — expect FAIL before Tasks 4-8 are done, PASS after.
- [ ] **Step 3: Write the docs** edits above, each as a bullet in its guide.
- [ ] **Step 4: Run** the full gate: `pnpm turbo lint check-types test` and the browser/e2e suites — expect green.
