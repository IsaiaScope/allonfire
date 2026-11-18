# Laura Phase 4: Gallery and Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Laura's Gallery (`/`) and Favorites (`/favorites`) Sections show the Images placed in Laura as an infinite masonry feed with a fullscreen preview; every Member sees them and which are Favorites, only a Laura Admin sets or clears a Favorite or removes a photo from Laura.

**Architecture:** A `laura.Favorite` table (primary key the Image id, a composite foreign key to `image."ImageApp"(imageId, app)` with `ON DELETE CASCADE` and a `CHECK app = 'laura'`) is read and written by `packages/database` services; the API gains a `laura` feature (`GET /v1/laura/gallery`, `GET /v1/laura/favorites`, `PUT`/`DELETE /v1/laura/favorites/:imageId`) over keyset cursors. Laura's pages hydrate the first page of each feed inside one `"use cache: private"` read and read it back with `useInfiniteQuery`; Admin changes are server actions (`updateTag`) plus `optimisticMutation`s (`invalidateQueries`); the reusable pieces (infinite sentinel, link refresh, lightbox, swipe) land in `packages/ui`.

**Tech Stack:** Prisma 7 + Liquibase (formatted SQL), Hono + `hono-openapi` + zod 4, Next 16 (Cache Components, `"use cache: private"`), TanStack Query 5 (`useInfiniteQuery`), next-intl, Base UI over shadcn (`AOFDialog`, `AOFAlertDialog`), Tabler icons, Vitest (unit, integration, browser), Playwright. No new dependency.

**Spec:** docs/superpowers/specs/2026-11-17-laura-rebuild-design.md (Phase 4, "Grill outcomes": Favorite, Who sees the heart, Gallery scope, Admin section; "Parity rule")

## Global Constraints

- Tests first; a test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`; a constant's type comes from zod (`xSchema = z.enum(X)`, `type X = z.infer<typeof xSchema>`); a lookup table is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`, `localStorage`/`sessionStorage`: use core's helpers (`objectKeys`, `objectValues`, `parseJsonWith`, `stringifyJson`).
- Constants are one nested object per owner (`API`, `AUTH`, `IMAGE`, ...); a path or an error code is never a string literal, tests included (statuses and methods through core's `HTTP`); a Tailwind class list is never a constant: `cva`, or inline in `cn`.
- An env var starts with its owner (no new env var in this phase).
- A package never imports an App; a package's logic never names an App (ADR 0033). Files go in `src/{environment,shared,features}`.
- Server Components by default; `"use client"` only for hooks, event handlers, browser APIs or client libraries.
- Next.js: read `packages/core/node_modules/next/dist/docs/` first (it matches the installed `next`), then Context7; check the Framework skills (`docs/guides/tooling.md`).
- Every form with fields is an AOF form (`useAOFForm`); this phase adds no form (the heart, the preview and the removal are controls, not forms).
- Components shared by Apps live in `packages/ui`, named `AOF...`; `packages/shadcn` is written only by the shadcn CLI. Pages are built through `/aof-design`, never plain `/impeccable`: Tasks 12, 13 and 14 are built through it (one build and one screenshot round, `feedback_design_budget`).
- A page of any Next App that reads or writes the API follows the data checklist in `docs/guides/next-apps.md` (TanStack Query over the private cache, both copies refreshed, resource protection, resource changed); every task for a page names each point.
- A page that waits has a skeleton at the loaded page's sizes with a browser test that compares heights at a wide and a phone width: change the page, change its skeleton in the same edit (`next-apps.md`, checklist 6).
- A stored picture in a Next App shows its blur while it loads (`AOFStorageImage`, `placeholder="blur"`), except under 40 px (`images.md`).
- Database changes are Liquibase changesets (`pnpm db:changeset`), never `prisma db push` or `prisma migrate`; never edit an applied changeset.
- exFAT drive: macOS writes `._*` sidecars; a new tool that scans folders ignores `**/._*`.
- Do not commit (the owner commits by hand). Docs are plain English prose, no emoji, never the word "may" (use can / is allowed to / might).
- Names fixed by earlier phases are cited, never renamed: Phase 0 (`Role` is `ADMIN`/`USER`; `requireApp(app, min?)`, `canEnterApp(user, app, min?)`), Phase 1 (`AppDescriptor`, `AOFSectionPage`, `aofCreateApi`, `optimisticMutation`, `optimisticUpdate`, `invalidateAll`, `retryUnlessRefused`, `hasSectionRole`, `AOFUserAvatar`, `renderInUi`), Phase 2 (`--coral` is the Favorite's colour, class `text-coral`), Phase 3 (`LAURA` in `apps/laura/src/shared/constants/laura.ts`, `signedInPage`, `pageMetadata`, `apps/laura/src/features/api/utils/{api,server-api}.ts`).

## Review Focus

1. **A Favorite that outlives its photo or is written for a stranger.** Removing the Laura placement or deleting the Image must remove the Favorite in the database (no cleanup code); the `CHECK` must refuse any App but Laura; marking twice must keep one row and the first `createdAt`; marking an Image not in Laura answers 404 (Tasks 2, 4, 7, integration tests).
2. **A feed that repeats or skips a photo.** Keyset pages must stay exact when an Image is added, removed or marked between two page loads; a malformed cursor is a 400, never a 500; every item carries `favorite: boolean` (Tasks 3, 5, 6).
3. **A User who can change anything.** The heart and Remove are hidden from a User (convenience), the API refuses a User with 403 before any database write and asks the Session fresh (`requireApp(App.LAURA, Role.ADMIN)` then `manageGuard`); a User sees a static mark, never a button (Tasks 7, 14, 16).
4. **Only one copy refreshed, a refresh that never refetches, or a refresh that shrinks the feed.** Each action calls `updateTag(GALLERY.CACHE.TAG)` and each mutation `invalidateAll` on `QUERY.GALLERY.ALL`; the installed TanStack never refetches an active `staleTime: "static"` query on `invalidateQueries`, so core's `invalidateStatic` does (Tasks 0, 1, 10, 11); and the page re-render an action causes must not replace a feed's loaded pages with its first page (`AOFHydratedBoundary onlyMissing`, Tasks 1, 12, 13).
5. **A feed left open for hours, and a skeleton that drifts.** Private links expire at the end of the hour after the next: stale links must heal through the refresh hook plus `AOFPictureGuard` without a flash, and the skeleton must be as tall as the loaded first page at a wide and a phone width, with no layout shift from tiles (Tasks 8, 12).

---

## Decisions this plan takes (correctable)

- **The Gallery feed is a small Laura endpoint, not the Image module's list.** Evidence from `packages/database/src/features/image/image.service.ts` and `packages/storage/src/features/image/hono/routes/read-handlers.ts`: `GET /v1/images?app=laura` pages by number (`skip: (page - 1) * perPage`), so an upload or a removal between two page loads repeats or skips a photo; every page also runs `aggregate` (count and bytes) in parallel with `findMany`, numbers an infinite feed never reads; its body (`imageBodySchema`) has `version`, `bytes`, `key`, `access` and every App the Image is in, none of which a Laura Member needs, and has no `favorite`. `GET /v1/laura/gallery` is keyset-paged, answers only what a tile needs (`id`, `alt`, `blurDataUrl`, `width`, `height`, `srcSet`, `favorite`), is member-only (`requireApp(App.LAURA)`: the Image list would also hand a visitor Laura's public Images), and reuses the Image module's signer (`pictureSrcSet`, `privateLinkExpiry`). Writes that change an Image (removal) still go through the Image module.
- **Keyset paging with one opaque cursor.** `<epoch ms>.<id>` of the last row, built by core's `keysetCursor` (Task 3); Gallery orders by `Image.createdAt desc, id desc`, Favorites by `Favorite.createdAt desc, imageId desc` (most recently marked first: my call, the spec says only "the Favorites Section").
- **`PUT`/`DELETE /v1/laura/favorites/:imageId` answer 200 with `{ imageId, favorite }`**, never 204: the typed `hc` client keeps a JSON body easy to read and the Back Office's actions already read `response.status === OK`. `PUT` for an Image not in Laura is 404; `DELETE` is idempotent (200 even for an unknown id, like the Image module's bulk delete). Neither carries a Version: the spec says "no Version (no form)", and idempotent writes cannot overwrite each other.
- **"Remove from Laura" is `DELETE /v1/images` with `{ app: "laura", ids: [id] }`**, not `PATCH`: `PATCH` needs the Image's Version and an `apps` list that would leave a Laura-only Image in no App (409 `RESOURCE_CHANGED`), while `DELETE` with `app` removes the Laura placement and deletes the Image when no App is left (`removeImagesFromApp`, `CONTEXT.md` Image), needs only Admin in Laura (`authoriseDelete`), and is idempotent. So the brief's "Version, 409 handled" does not apply to it (the checklist point says so below); an answer `deleted: 0` (another Admin got there first) is success.
- **The Favorite row carries `app` (always `laura`).** Prisma and SQL need the column to name the `ImageApp` primary key in a foreign key; the `CHECK` makes it a constant. The Prisma relation is a list (`ImageApp.favorites Favorite[]`), because Prisma asks a one-to-one relation for a unique `(imageId, app)` while the real guarantee is the primary key on `imageId` (pinned by Task 2's test).
- **Gallery guards.** Reads: `requireApp(App.LAURA)`. Writes: `requireApp(App.LAURA, Role.ADMIN)` first (cheap, from the Session already loaded: a User never costs a database read), then `manageGuard(deps.canManage)` (`api.md`: an App's own Admin-only routes take it; `canManage` reads the Laura Admin and the live Session now, since the Session's cookie copy can outlive a deleted Session).
- **Masonry is CSS columns, one block per loaded page.** A single `columns` container reflows every earlier tile when a page is appended (a layout shift); one block per page never moves a tile already drawn, needs no JS column count (so server rendering and the skeleton match), and keeps tab order equal to visual order. Cost: a page's last tiles end a little ragged at each seam (columns balance inside a block).
- **The feeds keep `staleTime: "static"`, and core's `invalidateStatic` makes an invalidation really refetch** (settled by Task 0's spike, table and Back Office audit there). TanStack 5.103.2's `refetchQueries` skips a query with an active `static` observer, and neither `resetQueries` nor `removeQueries` refetches one, while a numeric `staleTime` reads the clock at render (the reason `next-apps.md` mandates `static`). `invalidateStatic` (Task 1) refetches active static queries through their observers (all loaded pages of a feed, in order) and removes inactive static ones so the page's hydration refills them; `invalidateAll`, which `optimisticMutation` and `invalidateGallery` use, calls it, so Laura's mutations follow the existing pattern unchanged. It also repairs the Back Office, whose mounted `servicesQuery` and `imageQuery` invalidations were no-ops, so Task 1 runs the Back Office suites and lists the behaviour change for the owner; numeric `staleTime` (candidate a) is the fallback and is not used by default. **Open point for the owner:** confirm that Back Office change is welcome.
- **A page re-render after an action must not shrink a feed.** An action's `updateTag` makes the route read again, and `HydrationBoundary` replaces a query whose `dataUpdatedAt` is older, which would put a feed with N loaded pages back to its first page. The feed pages use `AOFHydratedBoundary onlyMissing` (Task 1): once the browser holds the feed, only a mutation's `invalidateAll` and the link refresh change it; a feed the browser does not hold yet is hydrated from the private copy. (The Back Office's lists have one page in cache, so the replacement is harmless there.)
- **A fresh read of links, stale first.** A private Image's link lives until the end of the hour after the next (1 to 2 hours; `images.md`). The private copy expires within the hour (`IMAGE_SERVER.LINK_CACHE_LIFE`, Task 8), and an open feed asks again through `useAOFLinkRefresh` once its data is `IMAGE_SERVER.LINK_REFRESH_MS` old (50 minutes) and the tab is visible: the old tiles keep painting while the pages are read again; a link that dies first shows its blur through `AOFPictureGuard` and is tried again when the new links arrive. Cost: a feed of N loaded pages makes N requests once an hour (each a small keyset read).
- **No native Web Share on a photo in v1** (the spec calls it optional). A private Image's signed link works for whoever holds it until it expires (ADR 0027), so sharing the link hands a private photo to non-members; sharing the file needs a cross-origin `fetch` of the picture (the cdn's nginx config, inline in `docker/docker-compose.{dev,prod}.yml`, sets no `Access-Control-*` header) and `navigator.canShare({ files })` support is uneven. Not low cost, with a privacy cost: left out, and written in `laura.md`.
- **The lightbox is ours, in `packages/ui`**, over `AOFDialog` (focus trap, Escape, labelling, safe-area), with arrow keys and a small pointer-swipe hook. Embla (already behind shadcn's `carousel`) would mount a slide per photo and bring its own drag physics for a one-photo view.
- **One cache tag and one query prefix for both feeds.** `GALLERY.CACHE.TAG` covers the Gallery and the Favorites reads (every Favorite change and every Image added or removed moves both); `QUERY.GALLERY.ALL = ["gallery"]` is the prefix of both feeds (`QUERY.FAVORITES.FEED` sits under it), like `QUERY.USERS.OVERVIEW` under `QUERY.USERS.ALL`. Phase 5's upload action calls `updateTag(GALLERY.CACHE.TAG)` and its mutation `invalidateGallery(queryClient)` (Task 11).
- **Back Office changes reach Laura late.** The private cache is per browser and per origin, so the Back Office cannot `updateTag` Laura's copies: an Image added, removed or made public there shows in Laura after the kept copy's `stale` (5 minutes), on a reload or a navigation, not live (`next-apps.md`, as another Admin's change).
- **Alt in the page's language through a ui helper.** `aofAltFor(alt, language)` keeps a stored `""` (decorative, no caption) as `AOFStorageImage` already does; the Back Office's `altFor` stays as it is (a list label needs a name, so it falls back on `||`).

## Parity: which Back Office mechanism each piece reuses

| Laura piece | Back Office mechanism it reuses | New package piece for the next App |
|---|---|---|
| First page read | `usersHydration`/`imagesHydration` shape: `"use cache: private"`, `readSessionCookie`, `sessionApi`, `AOFGetQueryClient`, `dehydrate`, `cacheTag`/`cacheLife` from the feature's constant; `AOFHydratedBoundary` (+ `onlyMissing`) | none (not factorable: the directive is literal) |
| Reading it back | `useQuery(xQuery(api))` under a `QUERY.X` key, `retryUnlessRefused`, `AOFQueryProvider`/`aofErrorMeta` | `useInfiniteQuery` options with a cursor (`gallery-queries.ts`) |
| Both copies refreshed | action then `updateTag`; mutation then `invalidateAll` (now static-aware: core `invalidateStatic`, Task 1) | `invalidateGallery` for Phase 5; `AOFHydratedBoundary onlyMissing` |
| Heart, Remove | `optimisticMutation` + `optimisticUpdate` (`serviceEnabledMutation`, `bulkDeleteMutation` shape), the action answers `null` on a refusal, `meta: aofErrorMeta` | none |
| Pictures | `AOFStorageImage`, `srcSetLoader`, `AOFPictureGuard`, blur, explicit dimensions (`ImageThumb` shape) | `aofAltFor`, `useAOFLinkRefresh`, `IMAGE_SERVER.LINK_CACHE_LIFE`/`LINK_REFRESH_MS` |
| Page gate | `signedInPage`, `hasSectionRole` (Phase 1) in the page, the API as judge | none |
| Waiting | `Suspense` boundary at the data, skeleton at loaded sizes + browser height test (`image-skeletons.browser.test.tsx` shape), `ink` | none |
| States | `AOFEmpty`, `AOFQueryView`-style first-load error with a retry that never toasts, `AOFQueryProvider` toast for a failed later page | `AOFInfiniteSentinel` |
| Confirm | `AOFAlertDialog` (as the Back Office's delete) | none |
| Preview | `AOFDialog` | `AOFLightbox`, `useAOFSwipe` |
| Page information | `pageMetadata(path, "Navigation.<key>")` (Phase 3 binding) | none |
| Copy, tests, e2e | `enT`-style translators, MSW handlers, `signInAs` e2e helpers, keyboard and safe-area specs | none |

## File structure

Created:

- `packages/database/changelog/changesets/0009-laura-favorite.sql` (reconcile: `nextChangesetNumber` names it; 0008 is Phase 0's).
- `packages/core/src/features/search/keyset-cursor.ts` (+ `tests/keyset-cursor.test.ts`): `keysetCursor`.
- `packages/core/src/features/next/query/tests/static-stale-time.test.ts`: pins TanStack's `static` + `invalidateQueries` behaviour. `.../utils/invalidate-static.ts`, `.../components/aof-hydrate-missing.tsx` (+ tests): `invalidateStatic`, `AOFHydrateMissing`.
- `packages/database/src/features/apps/laura/favorite.service.ts`, `gallery.service.ts` (+ `tests/favorite.integration.test.ts`, `gallery.integration.test.ts`); `packages/database/src/features/seed/fixtures/favorites.ts`.
- `apps/api/src/features/laura/`: `constants/{laura,schemas}.ts`, `utils/{deps,gallery-body}.ts`, `routes/index.ts`, `laura-deps.ts`, `gallery/{constants/gallery.ts,routes/{index,routes,handlers}.ts}`, `favorites/{constants/favorites.ts,routes/{index,routes,handlers}.ts}`, `tests/{gallery,favorites}.test.ts`, `tests/laura.integration.test.ts`, `tests/stub-laura-deps.ts`.
- `packages/ui/src/features/image/utils/alt-for.ts`, `features/image/components/aof-lightbox.tsx`, `shared/hooks/use-aof-swipe.ts`, `shared/constants/swipe.ts`, `features/query/components/aof-infinite-sentinel.tsx`, `features/query/hooks/use-aof-link-refresh.ts` (+ tests).
- `apps/laura/src/features/gallery/`: `constants/gallery.ts`; `utils/{gallery-queries,gallery-hydration,favorites-hydration,feed-patch,gallery-mutations}.ts`; `actions/{favorite,remove-photo}.ts`; `components/{gallery-feed,photo-grid,photo-tile,favorite-control,photo-preview,gallery-notice,gallery-skeleton}.tsx`; `hooks/use-gallery-feed.ts`; `tests/` beside each.
- `apps/laura/src/shared/constants/{query,mutation}.ts` (reconcile: Phase 3 might have created them empty).
- `apps/laura/src/app/[locale]/(signed-in)/page.tsx` and `.../favorites/page.tsx` (reconcile: Phase 3 might hold placeholders to replace).
- `apps/laura/e2e/{gallery,favorites}.spec.ts`, `apps/laura/e2e/photos.ts`.

Modified: `packages/database/prisma/schema/{apps/laura,image,auth}.prisma`, `packages/database/liquibase/tests/changelog.integration.test.ts`, `packages/database/src/features/seed/fixtures/{fixtures,seed-fixtures}.ts` and its integration test, `packages/storage/src/features/image-server/constants/image-server.ts` (+ test), `packages/ui/src/shared/components/aof-image.tsx` (uses `aofAltFor`), `packages/ui/package.json` (export keys), `apps/api/src/{app,client}.ts`-adjacent files: `app.ts`, `shared/constants/api.ts` (`API.PATH.LAURA`), `shared/tests/app-deps.ts`, `features/docs/tests/spec.test.ts`, `client.test-d.ts`, `index.ts` or wherever `createApp` is given its real deps (reconcile: `git grep -n "storageUsage:" apps/api/src`), `apps/api/README.md`, Back Office `features/images/constants/images.ts` (`CACHE.LIFE` reads the shared constant), Laura translations `en.json`/`it.json`, Laura MSW handlers, docs (Task 17).

## Which tests need what

- **Unit**: `pnpm --filter <pkg> exec vitest run <path> --tags-filter=unit` (no Docker).
- **Integration** (database, API): `pnpm test:services` first, then `pnpm --filter @allonfire/database exec vitest run <path>` or `pnpm --filter @allonfire/api exec vitest run <path>`. The Test template is rebuilt on the first run after Task 2 (changelog and Fixtures are hashed).
- **Browser** (ui, Laura): `pnpm --filter @allonfire/ui exec vitest run --config vitest.browser.config.ts <path>`; Laura's equivalent is the config Phase 3 created (reconcile: `ls apps/laura/vitest*.ts`).
- **e2e**: `pnpm test:services`, then `pnpm e2e:run --filter=@allonfire/laura` (production build plus the API; four projects).
- Package names: `@allonfire/{database,core,storage,ui,api,laura,back-office}`.

---

### Task 0: Baseline, reconciliation and the TanStack spike (settles how a static read refreshes)

**Question.** The repo mandates `staleTime: "static"` for a read asked again only by an action (`next-apps.md`: a numeric `staleTime` makes TanStack read the clock while a page prerenders, which blocks a soft navigation), yet the installed TanStack never refetches an active `static` query on `invalidateQueries`. The spike runs the candidates on this repo's installed versions (`@tanstack/query-core` 5.103.2, the Next in `packages/core/node_modules/next`); the plan adopts (c). Results already measured with a throwaway script (an observer subscribed, an action then run, fetches counted):

| Candidate | Active `static` query (one) | Active `static` infinite query, 2 pages loaded | `static` query with no observer (its page hidden), then remounted |
|---|---|---|---|
| `invalidateQueries` (today's `invalidateAll`) | 1 fetch, none after: **no refetch** | same | invalidated, still **no refetch on remount** (`static` is never stale) |
| (b) `resetQueries` | **no refetch, and the data is wiped** (`data` undefined) | n/a | n/a |
| (b) `removeQueries` | **no refetch**: the observer keeps the old data | n/a | the next mount fetches (nothing cached) |
| (b) `setQueryData` from the action's answer | works only for what the answer holds: a heart flag, never a Favorites list gaining a photo or a Phase 5 upload | n/a | n/a |
| (a) numeric `staleTime` | refetches (2 fetches) | refetches every loaded page | invalidated, so stale: refetches on remount |
| **(c) `invalidateStatic`**: `invalidateQueries`, then `observer.refetch()` for each observer of an active static query, then `removeQueries` for an inactive query whose last options were `static` | refetches | refetches every loaded page in order (`['3@null','4@c1']`) | removed, so the page's hydration fills it (the server's copy is newer: `updateTag` ran) |

(a) is viable here: the Back Office's Users list has a numeric `staleTime` (`users-queries.ts`) and `e2e/instant.spec.ts` ("Cancel on a User opens the list with its rows already there") asserts its rows under `instant()`, because the read sits behind its own `Suspense` in the request-time hole. **Adopted: (c).** It keeps the one documented rule (every read asked again only by an action is `static`, no per-query exception, no clock read at render) and repairs a latent no-op in the Back Office (below). (a) stays the fallback if Task 1's Back Office regression run turns red.

**What this implies for the Back Office (audit, nothing is changed by Task 0).** Static queries: `userQuery` (User edit form), `imageQuery` (Image edit form), `servicesQuery` (Email page), `usersOverviewQuery` and `storageOverviewQuery` (Home). The `invalidateQueries` calls are `invalidateAll` (`optimisticMutation` and `invalidateImages`) and `useRefreshServices`. Active while an action runs, so today's invalidation is a no-op for them: `servicesQuery` (`serviceEnabledMutation`, `useRefreshServices` after a test send and a provider save: `ServiceProviders` is mounted), `imageQuery` (`invalidateImages` after an edit, the form still mounted). Inactive (their page is hidden in `<Activity>`) when an action on another page runs: the two overviews (`QUERY.USERS.ALL`, `QUERY.STORAGE.ALL` invalidated by the Users and Images deletions) and the other resource queries; an invalidated static query is not refetched on remount either. What saves each flow today is the server copy, not the invalidation: the action's `updateTag` makes the page read again and `HydrationBoundary` replaces a query whose `dataUpdatedAt` is older. **No Back Office test proves a refetch of a static query:** `service-switch.browser.test.tsx` ("keeps the choice once the Service is saved and read again") passes without one, because the optimistic patch already equals what the stub server answers; `services-mutations.test.ts` and `optimistic-mutation.test.ts` only spy that `invalidateQueries` was called. So this is a Back Office weakness masked by hydration (a stale Home overview is possible when an action does not re-render the page it sits on), not a proven bug; Task 1 repairs it in the shared `invalidateAll`.

**Files:**
- Test (create): `packages/core/src/features/next/query/tests/static-stale-time.test.ts` (unit)
- Read only: Phases 0, 1, 3 plans and the code they changed.

**Interfaces:** Consumes the names in Global Constraints. Produces the pinned library facts that Task 1 and Tasks 10 and 11 rely on (the table's first rows).

- [ ] Step 1: reconcile. Re-read `git log -8 --stat`, the Phase 1 and Phase 3 plans, `apps/laura/src` (does `shared/constants/laura.ts`, the translators, the MSW handlers, `e2e/pages.ts`, `signedInPage`, `pageMetadata`, `AOFSectionPage` exist and under which path?), `ls apps/api/src/features`, `packages/database/changelog/changesets`. Run `pnpm --filter @allonfire/laura check-types` and the Phase 0 to 3 suites that exist: every red is reported before the work starts. Write each path that differs from this plan at the top of your notes; this plan's names win only when the code has none.
- [ ] Step 2: write the characterization test (it documents the installed library, so it is expected to pass at once; a TanStack upgrade that changes a row turns it red and the table is revisited):

```ts
// @module-tag unit
import { QueryClient, QueryObserver } from "@tanstack/react-query";

const KEY = ["probe"] as const;

/** One active observer, then `act`; answers how many fetches ran in all. */
const fetchesAfter = async (
  staleTime: number | "static",
  act: (queryClient: QueryClient) => Promise<unknown> | unknown
) => {
  const queryClient = new QueryClient();
  const queryFn = vi.fn(() => Promise.resolve("data"));
  const observer = new QueryObserver(queryClient, { queryFn, queryKey: KEY, staleTime });
  const stop = observer.subscribe(() => undefined);
  await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
  await act(queryClient);
  stop();
  return { fetches: queryFn.mock.calls.length, data: queryClient.getQueryData(KEY) };
};

describe("an active query observed with staleTime 'static'", () => {
  it("is not refetched by invalidateQueries", async () => {
    expect((await fetchesAfter("static", (qc) => qc.invalidateQueries({ queryKey: KEY }))).fetches).toBe(1);
  });
  it("is wiped, not refetched, by resetQueries", async () => {
    const { data, fetches } = await fetchesAfter("static", (qc) => qc.resetQueries({ queryKey: KEY }));
    expect({ data, fetches }).toEqual({ data: undefined, fetches: 1 });
  });
  it("is not refetched by removeQueries", async () => {
    expect((await fetchesAfter("static", (qc) => qc.removeQueries({ queryKey: KEY }))).fetches).toBe(1);
  });
});

describe("an active query with a numeric staleTime", () => {
  it("is refetched by invalidateQueries", async () => {
    expect((await fetchesAfter(300_000, (qc) => qc.invalidateQueries({ queryKey: KEY }))).fetches).toBe(2);
  });
});

describe("a static query whose observer is gone", () => {
  it("is invalidated but not refetched when a new observer mounts", async () => {
    const queryClient = new QueryClient();
    const queryFn = vi.fn(() => Promise.resolve("data"));
    const options = { queryFn, queryKey: KEY, staleTime: "static" } as const;
    const stop = new QueryObserver(queryClient, options).subscribe(() => undefined);
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    stop();
    await queryClient.invalidateQueries({ queryKey: KEY });
    const again = new QueryObserver(queryClient, options).subscribe(() => undefined);
    await Promise.resolve();
    expect(queryFn).toHaveBeenCalledTimes(1);
    again();
  });
});
```

- [ ] Step 3: run `pnpm --filter @allonfire/core exec vitest run src/features/next/query/tests/static-stale-time.test.ts --tags-filter=unit`: expected PASS.
- [ ] Step 4: run the spike's one browser-side check of (a), recorded for the owner, changing nothing: `pnpm test:services && pnpm --filter @allonfire/back-office exec playwright test e2e/instant.spec.ts --project=chromium` (the Users list, numeric, passes `instant()`); then `pnpm --filter @allonfire/core test` for the baseline.

### Task 1: Core: `invalidateStatic`, a static-aware `invalidateAll`, and a hydration that keeps loaded pages

**Files:**
- Create: `packages/core/src/features/next/query/utils/invalidate-static.ts`, `packages/core/src/features/next/query/components/aof-hydrate-missing.tsx`, tests `.../tests/invalidate-static.test.ts` (unit), `.../tests/aof-hydrate-missing.test.tsx` (unit)
- Modify: `packages/core/src/features/next/query/utils/optimistic-mutation.ts` (`invalidateAll` calls `invalidateStatic`; reconcile: Phase 1 moved it here), `packages/core/src/features/next/query/components/aof-hydrated-boundary.tsx` (prop `onlyMissing`), their tests, `packages/core/package.json` (keys for the two new files)
- Test (Back Office, unchanged files, run only): `apps/back-office/src/shared/utils/tests` equivalents now in core, `service-switch.browser.test.tsx`, `provider-form.browser.test.tsx`, `images-mutations.test.ts`, `users-mutations.test.ts`

**Interfaces:** Produces `invalidateStatic(queryClient: QueryClient, queryKey: QueryKey): Promise<void>`: (1) `invalidateQueries({ queryKey })` (refetches the active non-static queries and marks the rest, so every existing spy on it still holds); (2) for each active query that `isStatic()`, every observer's `refetch()` (an infinite query refetches every loaded page in order); (3) every inactive query under the key whose `options.staleTime === "static"` is removed from the cache, so the page's next hydration fills it (the server copy is newer after the action's `updateTag`). `invalidateAll(queryClient, keys)` is now `Promise.all(keys.map((key) => invalidateStatic(queryClient, key)))`. `AOFHydratedBoundary` gains `onlyMissing?: boolean`; with it the server component renders `AOFHydrateMissing({ state, children })` (client) in place of `HydrationBoundary`: it drops from `state.queries` every query the client cache already holds, so a page that re-renders after an action (`updateTag` refreshes the route) never replaces a feed's loaded pages with the first page again.

- [ ] Step 1: write the failing tests. `invalidate-static.test.ts`: an active `static` query is refetched once; an active `static` `InfiniteQueryObserver` with two pages loaded (`fetchNextPage`) ends with both pages read again, in order (cursors `null` then the first page's `nextCursor`); an active numeric query is refetched once and not twice; an inactive `static` query is removed and an inactive numeric one is kept (invalidated); a key matching nothing resolves; the call also invokes `queryClient.invalidateQueries` with `{ queryKey }` (spy). `optimistic-mutation.test.ts` (moved by Phase 1): `invalidateAll` over two keys refetches an active static query under each, and `optimisticMutation`'s `onSettled` waits for it. `aof-hydrate-missing.test.tsx`: with the client cache holding a two-page feed under `K` and a `state` holding a newer one-page `K` plus an absent `L`, the cache keeps both pages of `K` and gains `L`; with an empty cache both hydrate; `AOFHydratedBoundary onlyMissing` renders the client component and a refusal is still left to the view.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/core exec vitest run src/features/next/query --tags-filter=unit`
- [ ] Step 3: implement (`invalidateStatic` as above, ten lines; `AOFHydrateMissing` filters `state.queries` by `useQueryClient().getQueryCache().get(queryHash)` and hands the rest to `HydrationBoundary`, no `as`: build the filtered `DehydratedState` object).
- [ ] Step 4: run: PASS; then the Back Office regression, which proves the shared change breaks nothing: `pnpm --filter @allonfire/back-office test`, `pnpm --filter @allonfire/back-office test:browser`, `pnpm test:services && pnpm e2e:run --filter=@allonfire/back-office` (the Services, Users, Images and storage-overview specs). Expected behaviour change, listed for the owner: after an action, the mounted Email page's `servicesQuery` and an open Image form's `imageQuery` are now read again (as `next-apps.md` always said); any Back Office test that turns red because of this is reported and the one query is excluded by key, or (a) is used for Laura (Task 0), never a silent edit of that test.

### Task 2: The `laura.Favorite` model and changeset

**Files:**
- Modify: `packages/database/prisma/schema/apps/laura.prisma` (model `Favorite`), `.../image.prisma` (`ImageApp.favorites Favorite[]`), `.../auth.prisma` (`User.favorites Favorite[]`)
- Create: `packages/database/changelog/changesets/0009-laura-favorite.sql` (via `pnpm db:changeset laura-favorite`, then hand-edited)
- Test: `packages/database/liquibase/tests/changelog.integration.test.ts` (integration; reconcile: re-read it, Phase 0 changed it)

**Interfaces:** Consumes `liquibase(url, "update" | "rollback-count", ...)`, `throwawayName`, `throwawayUrl`, `recreateDatabase`, `clientFor`, `dropDatabase`, `tablesIn`. Produces table `laura."Favorite"(imageId PK, app, markedBy, createdAt)`, constraints `Favorite_imageId_app_fkey` (cascade), `Favorite_markedBy_fkey` (set null), `Favorite_app_check`, index `Favorite_createdAt_imageId_idx`; Prisma model `Favorite` (client `prisma.favorite`).

- [ ] Step 1: write the failing tests in `changelog.integration.test.ts`: (a) "creates `laura.Favorite` with imageId, app, markedBy and createdAt, keyed on imageId alone": `information_schema.columns` for the table equals `["app", "createdAt", "imageId", "markedBy"]` (sorted) and `pg_index` primary key columns equal `["imageId"]`; (b) "rolling back the changeset drops the table": `liquibase(url, "rollback-count", "--count=1")` after `update` on a throwaway database, `tablesIn` no longer lists `Favorite` (give each step `TEST_DATABASE.DOCKER_TIMEOUT_MS`, as its neighbours). The constraints' behaviour is pinned by Task 4's integration test, which runs on the same changelog.
- [ ] Step 2: run, expected FAIL: `pnpm test:services && pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`
- [ ] Step 3: implement. The model:

```prisma
/// An Image of the Laura App that a Laura Admin marked: one shared selection,
/// never one per User. It exists only while the Image is placed in Laura.
model Favorite {
  imageId   String   @id
  /// Always LAURA (a CHECK in the changeset): the column lets the foreign key
  /// name the `ImageApp` primary key, so removing the placement removes the row.
  app       App      @default(LAURA)
  /// Who marked it; the row stays when that User is deleted.
  markedBy  String?
  createdAt DateTime @default(now())
  imageApp  ImageApp @relation(fields: [imageId, app], references: [imageId, app], onDelete: Cascade)
  user      User?    @relation(fields: [markedBy], references: [id], onDelete: SetNull)

  @@index([createdAt, imageId])
  @@schema("laura")
}
```

  `ImageApp` gains `favorites Favorite[]` (a list: see Decisions), `User` gains `favorites Favorite[]`. Then `pnpm db:changeset laura-favorite` (reconcile: `pnpm db:update` first if Local is stale), keep Prisma's `CREATE TABLE`, `CREATE INDEX` and the two `ADD FOREIGN KEY` statements (`ON DELETE CASCADE` on `("imageId","app") REFERENCES "image"."ImageApp"("imageId","app")`, `ON DELETE SET NULL` on `markedBy`), add what Prisma cannot express, and the rollback:

```sql
--liquibase formatted sql logicalFilePath:changesets/0009-laura-favorite.sql

--changeset isaia:0009-laura-favorite
--comment: A Favorite is an Image of Laura a Laura Admin marked, shared by every Member. It references the Image's placement in Laura, so removing the placement or deleting the Image removes it with no code.
-- (Prisma's CREATE TABLE, CREATE INDEX and ADD FOREIGN KEY statements here)
ALTER TABLE "laura"."Favorite" ADD CONSTRAINT "Favorite_app_check" CHECK ("app" = 'laura');
--rollback DROP TABLE "laura"."Favorite";
```

  Then `pnpm db:update`, `pnpm db:generate`.
- [ ] Step 4: run, expected PASS: the Step 2 command, then `pnpm test:drift` (expected `No difference detected.`).

### Task 3: Core's keyset cursor

**Files:**
- Create: `packages/core/src/features/search/keyset-cursor.ts`, `packages/core/src/features/search/tests/keyset-cursor.test.ts` (unit; reconcile: where `sort-query.test.ts` lives)
- Modify: `packages/core/package.json` (export key `./features/search/keyset-cursor`)

**Interfaces:** Produces `type KeysetPosition = { at: Date; id: string }`; `keysetCursor = { encode(position: KeysetPosition): string, schema: z.ZodType<KeysetPosition, string>, MAX_LENGTH: number }` where `encode` is `${at.getTime()}.${id}`, `schema` reads a string back (rejecting anything else), and the text is URL-safe as written.

- [ ] Step 1: tests: `schema.parse(encode({ at: new Date("2026-11-17T10:00:00.123Z"), id: "clx9a" }))` equals the same position (millisecond precision kept); rejected by `schema.safeParse`: `""`, `"123"`, `"abc.clx9a"`, `"-1.clx9a"`, `"123."`, `"123.a b"`, `"123.a.b"`, a string over `MAX_LENGTH`, a number, `undefined`; `encodeURIComponent(encode(position)) === encode(position)`.
- [ ] Step 2: run `pnpm --filter @allonfire/core exec vitest run src/features/search/tests/keyset-cursor.test.ts --tags-filter=unit`: FAIL (module missing).
- [ ] Step 3: implement with one top-level regex `^(\d{1,16})\.([A-Za-z0-9_-]{1,64})$` and `z.string().max(MAX_LENGTH).transform(...)` with `ctx.addIssue` on mismatch (zod 4, no `as`).
- [ ] Step 4: run: PASS.

### Task 4: The Favorite service and the Fixture Favorite

**Files:**
- Create: `packages/database/src/features/apps/laura/favorite.service.ts`, `.../tests/favorite.integration.test.ts` (integration), `packages/database/src/features/seed/fixtures/favorites.ts`
- Modify: `packages/database/src/features/seed/fixtures/fixtures.ts` (`FIXTURE.FAVORITE`), `.../seed-fixtures.ts`, `.../tests/seed-fixtures.integration.test.ts`, `packages/database/package.json` (export key `./features/apps/laura/favorite.service`)

**Interfaces:** Consumes `prisma` (`@allonfire/database/features/prisma/client`), `removeImagesFromApp`, `deleteImages`, `createImages`. Produces `markFavorite(imageId: string, userId: string): Promise<boolean>` (true once it is a Favorite, false when the Image is not placed in Laura; idempotent: the first `createdAt` and `markedBy` stay), `unmarkFavorite(imageId: string): Promise<void>` (idempotent); `FIXTURE.FAVORITE = { IMAGE: FIXTURE.IMAGE.IN_BOTH_APPS, MARKED_BY: FIXTURE.USER.LAURA.ADMIN }` (seeded after the Images, since `upsertImage` replaces placements and cascades).

- [ ] Step 1: write `favorite.integration.test.ts` (keyed rows with a prefix and removed after, like `image.integration.test.ts`; Images made with `createImages`): "marks an Image of Laura and answers true"; "marking again answers true and keeps one row with the first `createdAt` and `markedBy`" (two Users); "answers false and writes nothing for an Image not placed in Laura" (`FIXTURE.IMAGE.PRIVATE_IN_BACK_OFFICE`); "unmarking removes it and a second unmark is no error"; "removing the Laura placement (`removeImagesFromApp([id], App.LAURA, LET_THROUGH)`) removes the Favorite, and so does deleting the Image (`deleteImages`)"; "taking the Image out of the Back Office only keeps the Favorite" (an Image in both Apps); "deleting the marker (`prisma.user.delete`) keeps the Favorite with `markedBy` null"; "the database refuses a row whose app is not Laura": `prisma.$executeRaw` insert with `app = 'back-office'` rejects naming `Favorite_app_check`, and one for an Image with no `ImageApp` row rejects naming `Favorite_imageId_app_fkey`. `seed-fixtures.integration.test.ts`: "marks the Favorite Fixture's Image, by the Laura Admin Fixture, and seeding twice keeps it".
- [ ] Step 2: run, expected FAIL: `pnpm test:services && pnpm --filter @allonfire/database exec vitest run src/features/apps/laura/tests/favorite.integration.test.ts src/features/seed`
- [ ] Step 3: implement. `markFavorite` in one transaction: `imageApp.findUnique({ where: { imageId_app: { app: App.LAURA, imageId } } })` null gives `false`; else `favorite.upsert({ create: { imageId, markedBy: userId }, update: {}, where: { imageId } })` (an empty `update` writes nothing, so no `updatedAt` exists to move); catch Prisma's `P2003` (the placement went between the read and the write) and answer `false`. `unmarkFavorite` is `favorite.deleteMany({ where: { imageId } })`. `seedFixtures` runs the Favorite step after `Promise.all` of the Images (look the ids up by key and email).
- [ ] Step 4: run: PASS; then `pnpm --filter @allonfire/database test`.

### Task 5: Keyset reads of the Gallery and the Favorites

**Files:**
- Create: `packages/database/src/features/apps/laura/gallery.service.ts`, `.../tests/gallery.integration.test.ts` (integration)
- Modify: `packages/database/package.json` (export key `./features/apps/laura/gallery.service`)

**Interfaces:** Consumes `KeysetPosition` (Task 3), `readAlt`, `prisma`. Produces:

```ts
export type GalleryRecord = {
  access: ImageAccess; alt: ImageAlt; blurDataUrl: string; favorite: boolean;
  height: number; id: string; key: string; width: number;
};
export type GalleryPage = { images: GalleryRecord[]; next: KeysetPosition | null };
export function listGalleryPage(args: { after?: KeysetPosition | undefined; limit: number }): Promise<GalleryPage>;
export function listFavoritesPage(args: { after?: KeysetPosition | undefined; limit: number }): Promise<GalleryPage>;
```

`listGalleryPage`: Images placed in Laura, `createdAt desc, id desc`, `next` is the last returned row's position (`at` its `createdAt`) when a further row exists, else null. `listFavoritesPage`: Favorites, `Favorite.createdAt desc, imageId desc`, `at` the Favorite's `createdAt`, every `favorite: true`.

- [ ] Step 1: tests (prefix-keyed Images; ties made with `prisma.image.update({ data: { createdAt } })`): "lists only Images placed in Laura, newest first, `favorite` true only for a marked one"; "pages of `limit` cover every Image once and the last `next` is null"; "an Image added after page 1 never repeats or skips on page 2, and tops a fresh read"; "an Image removed from Laura at the page boundary changes nothing about the next page"; "two Images with the same `createdAt` keep a stable order by id and never straddle pages twice"; "the Favorites list is the marked ones, most recently marked first, paged the same way, and an Image removed from Laura leaves it".
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/database exec vitest run src/features/apps/laura/tests/gallery.integration.test.ts`
- [ ] Step 3: implement with plain Prisma (no raw SQL): `where: { OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: id } }] }`, `orderBy: [{ createdAt: "desc" }, { id: "desc" }]`, `take: limit + 1`, the Laura placement through `apps: { some: { app: App.LAURA } }` and the flag through `include: { apps: { where: { app: App.LAURA }, select: { favorites: { select: { imageId: true } } } } }`; `readAlt` for `alt`.
- [ ] Step 4: run: PASS.

### Task 6: The API's Laura feature: Gallery and Favorites lists

**Files:**
- Create: everything under `apps/api/src/features/laura/` named in the File structure except the favorites write routes (Task 7); tests `gallery.test.ts` (unit), `laura.integration.test.ts` (integration), `stub-laura-deps.ts`
- Modify: `apps/api/src/app.ts` (`laura: LauraDeps` in `AppDeps`, `.route(API.PATH.LAURA, lauraRoutes(deps.laura))`), `apps/api/src/shared/constants/api.ts` (`API.PATH.LAURA`), `apps/api/src/shared/tests/app-deps.ts`, the file that builds the real deps (reconcile: `git grep -n "storageUsage:" apps/api/src`), `apps/api/src/features/docs/tests/spec.test.ts`, `apps/api/src/client.test-d.ts`

**Interfaces:** Consumes `requireApp(app, min?)` (Phase 0), `listGalleryPage`, `listFavoritesPage`, `keysetCursor`, `pictureSrcSet`, `privateLinkExpiry`, `imageBodySchema`, `invalidHook`, `createFactory<AuthEnv>()`. Produces:

- `LAURA_API = { OPENAPI_TAG: "Laura", PATH: { BASE: "/laura" } }`, `LAURA_GALLERY = { PATH: { BASE: "/gallery" }, LIMIT: { DEFAULT: 24, MAX: 48 }, DOC }`, `LAURA_FAVORITES = { PATH: { BASE: "/favorites", ONE: "/:imageId" }, DOC }`; `API.PATH.LAURA = "/v1/laura"`.
- Schemas (`laura/constants/schemas.ts`): `galleryItemBodySchema = imageBodySchema.pick({ alt, blurDataUrl, height, id, srcSet, width }).extend({ favorite: z.boolean() }).meta({ ref: "GalleryItem" })`; `galleryPageBodySchema = z.object({ items: z.array(galleryItemBodySchema), nextCursor: z.string().nullable() }).meta({ ref: "GalleryPage" })`; `pageQuerySchema = z.object({ cursor: keysetCursor.schema.optional(), limit: z.coerce.number().int().min(1).max(LAURA_GALLERY.LIMIT.MAX).default(LAURA_GALLERY.LIMIT.DEFAULT) })`.
- `GET /v1/laura/gallery?cursor=&limit=` and `GET /v1/laura/favorites?cursor=&limit=`: `requireApp(App.LAURA)`; 200 `GalleryPage`; 400 on a bad query; 401, 403.
- `LauraDeps = { canManage: CanManage; listFavoritesPage: typeof listFavoritesPage; listGalleryPage: typeof listGalleryPage; markFavorite: typeof markFavorite; unmarkFavorite: typeof unmarkFavorite }` (`laura/utils/deps.ts`); `lauraDeps` (real, `laura/laura-deps.ts`, `canManage` is `canManageLaura`: Laura Admin by `hasRoleIn(user, App.LAURA, Role.ADMIN)` on `accessUserById` and `sessionAlive`, read now); `stubLauraDeps(overrides)`.
- `toGalleryItem(record: GalleryRecord, now: Date)` (`laura/utils/gallery-body.ts`: `srcSet: pictureSrcSet(key, access === ImageAccess.PRIVATE ? privateLinkExpiry(now) : undefined)`).

- [ ] Step 1: write `gallery.test.ts` (unit, `createApp(appDeps({ auth, laura: stubLauraDeps(...) }))`, Session from `sessionFor({ memberships: [{ app: App.LAURA, role: Role.USER }] })`; paths from `API.PATH.LAURA`, `LAURA_GALLERY.PATH.BASE`, statuses through `HTTP.STATUS`): 401 without a Session; 403 for a Back Office Admin who is no Laura Member and for no Membership; 200 for a Laura User and for a Laura Admin; the body parses with `galleryPageBodySchema` and each item has a boolean `favorite`; a private record's `srcSet` equals `pictureSrcSet(key, privateLinkExpiry(now))` and a public one's equals `pictureSrcSet(key, undefined)` (fake timers); `nextCursor` is `keysetCursor.encode(next)` when the dep answers `next` and `null` when not, and `limit`/`after` reach the dep (`after` the parsed position, `limit` default `LAURA_GALLERY.LIMIT.DEFAULT`); `cursor=garbage`, `limit=0` and `limit=MAX+1` answer 400 with code `ERROR.CODE.VALIDATION_FAILED` (through the problem document helper `problemOf`); the same table for `/favorites` (parametrised with `it.each`). `laura.integration.test.ts` (real stack as `users.integration.test.ts`): a Laura User (`FIXTURE.USER.LAURA.USER`) lists the Fixture Laura Images, the Fixture Favorite's item has `favorite: true` and the other `false`, `limit=1` pages through every Image once via `nextCursor`, `FIXTURE.USER.BACK_OFFICE.ADMIN` is refused 403, and the Favorites list holds exactly `FIXTURE.FAVORITE.IMAGE`'s item. `spec.test.ts`: `/openapi.json` lists both paths under tag `Laura`, `GalleryItem.required` contains `favorite`, and each route documents `Problem400`, `Problem401`, `Problem403` responses. `client.test-d.ts`: `client.v1.laura.gallery.$get` answers `items[number]["favorite"]` as `boolean` and `nextCursor` as `string | null`.
- [ ] Step 2: run, expected FAIL: `pnpm test:services && pnpm --filter @allonfire/api exec vitest run src/features/laura src/features/docs`
- [ ] Step 3: implement per the Interfaces (layout of `api.md`: `routes/{index,routes,handlers}.ts`, named exports, chained routes; `describeRoute` bodies from the same zod schemas; `problemResponses`; `lauraRoutes(deps)` chains `.route(LAURA_GALLERY.PATH.BASE, galleryRoutes(deps))` and `.route(LAURA_FAVORITES.PATH.BASE, favoritesRoutes(deps))`; the favorites router has only its `GET` until Task 7). The handlers `throw` nothing of their own: the guards and `invalidHook` do.
- [ ] Step 4: run: PASS, then `pnpm --filter @allonfire/api run check-types`.

### Task 7: The API's Favorite writes (Admin only)

**Files:**
- Modify: `apps/api/src/features/laura/favorites/{constants/favorites.ts,routes/index.ts,routes/routes.ts,routes/handlers.ts}`
- Test: create `apps/api/src/features/laura/tests/favorites.test.ts` (unit); extend `laura.integration.test.ts`, `spec.test.ts`, `client.test-d.ts`

**Interfaces:** Consumes `requireApp(App.LAURA, Role.ADMIN)` (Phase 0), `manageGuard(deps.canManage)`, `notFound()` from core's `coded-error`. Produces `PUT /v1/laura/favorites/:imageId` and `DELETE /v1/laura/favorites/:imageId`: 200 `{ imageId: string; favorite: boolean }` (`favoriteBodySchema`, `ref: "Favorite"`); `PUT` 404 `ERROR.CODE.NOT_FOUND` when `deps.markFavorite` answers false; `DELETE` always 200 `favorite: false`; 401, 403.

- [ ] Step 1: write `favorites.test.ts`: with an Admin Session (`memberships: [{ app: App.LAURA, role: Role.ADMIN }]`, `canManage: () => Promise.resolve(true)`): `PUT` answers 200 `{ favorite: true, imageId }` and calls `markFavorite(imageId, session user id)`; a second `PUT` answers 200 again; a `false` from the dep answers 404 `NOT_FOUND`; `DELETE` answers 200 `{ favorite: false }` for a known and an unknown id and calls `unmarkFavorite(imageId)`. A Laura User answers 403 on both and neither dep nor `canManage` was called (`expect(...).not.toHaveBeenCalled()`); no Session 401; a Back Office Admin 403; an Admin whose `canManage` answers false (Session gone) 403 and nothing written; `canManage` is called with `{ sessionId: expect.any(String), userId: expect.any(String) }`. Integration: as `FIXTURE.USER.LAURA.ADMIN`, `PUT` an Image only in the Back Office answers 404 with the row absent from `prisma.favorite`, `PUT` then `GET /favorites` lists it, `DELETE` twice leaves none; `FIXTURE.USER.LAURA.USER` is refused on both with the table unchanged. `spec.test.ts`: the two write routes document 401, 403 (and 404 for `PUT`); `client.test-d.ts`: `$put({ param: { imageId: "x" } })` compiles and `$put({ param: {} })` carries `// @ts-expect-error`.
- [ ] Step 2: run, expected FAIL: `pnpm test:services && pnpm --filter @allonfire/api exec vitest run src/features/laura`
- [ ] Step 3: implement: both handlers `factory.createHandlers(route, requireApp(App.LAURA, Role.ADMIN), manageGuard(deps.canManage), validator("param", paramSchema, invalidHook), handler)`; the order is the contract (cheap role door, then the fresh read, then the parse and the write).
- [ ] Step 4: run: PASS; then `pnpm --filter @allonfire/api test`.

### Task 8: Shared pieces: link life, alt helper, link refresh, infinite sentinel

**Files:**
- Modify: `packages/storage/src/features/image-server/constants/image-server.ts` (+ its test), `packages/ui/src/shared/components/aof-image.tsx`, `packages/ui/package.json` (keys), `apps/back-office/src/features/images/constants/images.ts` (`CACHE.LIFE` reads the shared constant; reconcile: `images-constants.test.ts` keeps its values)
- Create: `packages/ui/src/features/image/utils/alt-for.ts`, `features/query/hooks/use-aof-link-refresh.ts`, `features/query/components/aof-infinite-sentinel.tsx`, and tests `features/image/tests/alt-for.test.ts` (unit), `features/query/tests/use-aof-link-refresh.browser.test.tsx`, `features/query/tests/aof-infinite-sentinel.browser.test.tsx` (browser)

**Interfaces:** Produces:

- `IMAGE_SERVER.LINK_CACHE_LIFE = { expire, revalidate, stale }` in seconds = `{ PRIVATE_LINK_HOURS * 3600, half of it, 300 }` (what a cache of signed private links is kept for, never past the links' minimum life), `IMAGE_SERVER.LINK_REFRESH_MS` = the minimum link life minus 10 minutes.
- `aofAltFor(alt: { en: string } & Partial<Record<string, string | undefined>>, language: string): string` = `alt[language] ?? alt[I18N.DEFAULT_LANGUAGE] ?? ""` (a stored `""` stays `""`).
- `useAOFLinkRefresh({ queryKey, refreshMs }: { queryKey: QueryKey; refreshMs: number }): void` (client): while the tab is visible, once a minute and on `visibilitychange` and `online`, if the oldest `dataUpdatedAt` among the active queries under `queryKey` is at least `refreshMs` old, core's `invalidateStatic(queryClient, queryKey)` (not `refetchQueries`, which skips a `static` query); stale data keeps showing meanwhile.
- `AOFInfiniteSentinel({ disabled, onReach, rootMargin? }: { disabled: boolean; onReach: () => void; rootMargin?: string })` (client): an `aria-hidden` `h-px` block with an `IntersectionObserver`; calls `onReach` when it intersects and is not `disabled`; the observer is made again whenever `disabled` changes, so a sentinel still in view after a page lands asks for the next one.

- [ ] Step 1: tests. `alt-for.test.ts`: the stored language, the English fallback for a missing language, `""` stays `""`. Storage test: `LINK_CACHE_LIFE.expire` equals `PRIVATE_LINK_HOURS * UNIT.SECONDS_PER_HOUR`, `stale` is at least 300, `LINK_REFRESH_MS` is under `expire * 1000`. Link refresh (fake timers, `vi.setSystemTime`, a real `QueryClient` with an active observer): data older than `refreshMs` and visible refetches once (the observed query has `staleTime: "static"`, as the feeds do); younger does not; `document.visibilityState` hidden does not until `visibilitychange` makes it visible; an unmounted hook stops its timer. Sentinel (real browser): in view calls `onReach` once; `disabled` calls none; flipping `disabled` to false with the sentinel still in view calls it (a tall screen); scrolled out then in calls again only when enabled.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/ui exec vitest run src/features/image/tests/alt-for.test.ts --tags-filter=unit`, `pnpm --filter @allonfire/storage exec vitest run src/features/image-server --tags-filter=unit`, and the two ui browser files with `--config vitest.browser.config.ts`.
- [ ] Step 3: implement (the constants first; `AOFStorageImage` takes its alt from `aofAltFor`, its tests unchanged).
- [ ] Step 4: run: PASS; `pnpm --filter @allonfire/ui test`, `pnpm --filter @allonfire/back-office exec vitest run src/features/images --tags-filter=unit`.

### Task 9: `useAOFSwipe` and `AOFLightbox`

**Files:**
- Create: `packages/ui/src/shared/constants/swipe.ts`, `packages/ui/src/shared/hooks/use-aof-swipe.ts`, `packages/ui/src/features/image/components/aof-lightbox.tsx`; tests `shared/tests/use-aof-swipe.test.ts` (unit, the pure `swipeOf`), `features/image/tests/aof-lightbox.browser.test.tsx` (browser)
- Modify: `packages/ui/package.json` (keys for the hook and the component; `AOF_SWIPE` and `aof-dialog` stay internal unless a reader needs a key)

**Interfaces:** Produces `AOF_SWIPE = { AXIS_RATIO: 2, MAX_MS: 800, MIN_PX: 48 }`; `swipeOf(move: { dx: number; dy: number; ms: number }): "next" | "previous" | null` (finger moving left past `MIN_PX` within `MAX_MS`, mostly horizontal, is `"next"`); `useAOFSwipe(onSwipe: (direction: "next" | "previous") => void)` returns `{ onPointerCancel, onPointerDown, onPointerUp }` for the slide; and

```ts
export type AOFLightboxProps = {
  /** Controls beside the picture (an App's heart, its remove button). */
  actions?: ReactNode;
  caption?: ReactNode;
  /** The current slide: the App draws the picture. */
  children: ReactNode;
  count: number;
  index: number;
  labels: { close: string; next: string; position: string; previous: string; title: string };
  onIndexChange: (index: number) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};
```

  A client component over `AOFDialog`/`AOFDialogContent` (focus trap, Escape, safe-area edges come with it): full-viewport, a close button, previous and next buttons (disabled at the ends), `ArrowLeft`/`ArrowRight`, the swipe on the slide, `labels.position` as a polite status, the dialog named by `labels.title`; nothing in it names an App or a Design (classes inline in `cn`).

- [ ] Step 1: tests. `swipeOf`: left 120 px in 200 ms is `"next"`, right is `"previous"`, 30 px is `null`, 120 px in 900 ms is `null`, a mostly vertical drag (`dy` over half `dx`) is `null`. Browser: opens at `index` and shows `children`; `ArrowRight` calls `onIndexChange(index + 1)` and `ArrowLeft` at 0 calls nothing; the previous button is disabled at 0 and the next at `count - 1`; a pointer drag left across the slide calls `onIndexChange(index + 1)`, a vertical drag calls nothing; `Escape` calls `onOpenChange(false)` and focus returns to the button that opened it; `Tab` and `Shift+Tab` stay inside the dialog; the status reads `labels.position`; the controls sit inside the safe edges (`emulated-media` notch helper, Chromium only, as `aof-dialog.browser.test.tsx` does).
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/ui exec vitest run src/shared/tests/use-aof-swipe.test.ts --tags-filter=unit` and `... --config vitest.browser.config.ts src/features/image/tests/aof-lightbox.browser.test.tsx`
- [ ] Step 3: implement. Built through `/aof-design` for the look only where an App dresses it (the layout here is neutral: tokens, no Design classes).
- [ ] Step 4: run: PASS; `pnpm --filter @allonfire/ui test`, `pnpm --filter @allonfire/ui exec vitest run --config vitest.browser.config.ts`.

### Task 10: Laura's data layer: constants, queries, hydration, feed patches

**Files:**
- Create: `apps/laura/src/features/gallery/constants/gallery.ts`, `apps/laura/src/shared/constants/{query,mutation}.ts`, `features/gallery/utils/{gallery-queries,gallery-hydration,favorites-hydration,feed-patch}.ts`, tests `utils/tests/{gallery-queries,gallery-hydration,favorites-hydration,feed-patch}.test.ts` (unit)
- Modify: `apps/laura/src/shared/tests/msw/handlers.ts` (`GALLERY_PAGE`, `FAVORITES_PAGE`, handlers for `GET /v1/laura/gallery` and `/favorites`)

**Interfaces:** Consumes `ApiClient`, `api`, `sessionApi` (Phase 3 files, made with `aofCreateApi` and `aofCreateServerApi`), `readSessionCookie`, `AOFGetQueryClient`, `retryUnlessRefused` (core, Phase 1), `IMAGE_SERVER.LINK_CACHE_LIFE`. Produces:

- `GALLERY` (`@/features/gallery/constants/gallery`): `{ CACHE: { LIFE: IMAGE_SERVER.LINK_CACHE_LIFE, TAG: "gallery" }, FIRST_PAGE: null, LINK_REFRESH_MS, PAGE_SIZE: 24, PREFETCH_AHEAD: 3, RETRIES: 1, ROOT_MARGIN: "800px", SKELETON: { RATIOS: readonly number[] (a cycle, e.g. 0.75, 1, 1.333, 0.667), TILES: 24 }, SOURCE: { FAVORITES: "favorites", GALLERY: "gallery" }, TILE_SIZES: string }` and `gallerySourceSchema = z.enum(GALLERY.SOURCE)`, `type GallerySource`. **`GALLERY.CACHE.TAG` is the tag Phase 5 clears.**
- `QUERY` (`@/shared/constants/query`): `{ FAVORITES: { ALL: ["gallery", "favorites"], FEED: ["gallery", "favorites", "feed"] }, GALLERY: { ALL: ["gallery"], FEED: ["gallery", "feed"] } }` (as const; strings via a file-level `GALLERY = "gallery"`; **`QUERY.GALLERY.ALL` is the prefix Phase 5 invalidates**). `MUTATION` (`@/shared/constants/mutation`): `{ GALLERY: { FAVORITE: (id: string) => [...QUERY.GALLERY.ALL, "favorite", id], REMOVE: [...QUERY.GALLERY.ALL, "remove"] } }`.
- `gallery-queries.ts`: `type GalleryPage = Awaited<ReturnType<typeof fetchGalleryPage>>`, `type GalleryCursor = string | null`, `type GalleryFeed = InfiniteData<GalleryPage, GalleryCursor>`; `fetchGalleryPage(client: ApiClient, cursor: GalleryCursor)`, `fetchFavoritesPage(client, cursor)` (`parseResponse` of `client[API.VERSION.CURRENT].laura.gallery.$get` / `.favorites.$get` with `query: { limit: String(GALLERY.PAGE_SIZE), ...(cursor && { cursor }) }`); `galleryFeedQuery(client)` and `favoritesFeedQuery(client)` (`infiniteQueryOptions`: `queryKey` `QUERY.GALLERY.FEED` / `QUERY.FAVORITES.FEED`, `initialPageParam: GALLERY.FIRST_PAGE`, `getNextPageParam: (last) => last.nextCursor ?? undefined`, `retry: retryUnlessRefused(GALLERY.RETRIES)`, `staleTime: "static"` (asked again only by `invalidateAll`'s `invalidateStatic`, Task 1, or the link refresh), `meta: aofErrorMeta(false)` on the first load is not needed: a first load that fails has no data, so the provider never toasts it, and a failed later page toasts by itself); `feedQueryFor(source, client)`.
- `gallery-hydration.ts`: `galleryHydration()`, `favorites-hydration.ts`: `favoritesHydration()`: each `"use cache: private"`, `cacheTag(GALLERY.CACHE.TAG)`, `cacheLife(GALLERY.CACHE.LIFE)`, reads page one as the Session's cookie (`sessionApi(await readSessionCookie())`), `setQueryData(<feed key>, { pageParams: [GALLERY.FIRST_PAGE], pages: [first] })`, returns `dehydrate(queryClient)`; a refusal throws, never kept.
- `feed-patch.ts`: `withFavorite(feed: GalleryFeed, id: string, favorite: boolean): GalleryFeed`, `withoutPhoto(feed: GalleryFeed, id: string): GalleryFeed` (pure: every page's items, other fields and `pageParams` kept; a page left empty keeps its `nextCursor` so a later page is still asked for), `photosOf(feed: GalleryFeed | undefined): GalleryItem[]` (the flat list the preview steps through).

- [ ] Step 1: tests. Queries: the options' `queryKey` equal `QUERY.GALLERY.FEED` / `QUERY.FAVORITES.FEED`; `initialPageParam` is `null`; `getNextPageParam` answers the cursor and `undefined` for `null`; `staleTime` is `"static"` (comment: Tasks 0 and 1: it never reads the clock at render, and `invalidateStatic` is what refetches it); `fetchGalleryPage(fakeApi, null)` sends no `cursor` and `limit` as `String(GALLERY.PAGE_SIZE)`, `fetchGalleryPage(fakeApi, "c1")` sends `cursor: "c1"` (core's `fake-api`, Phase 1); a 401 is not retried and a 500 is retried once. Hydration (mirror `images-hydration.test.ts`: `next-cache-mock`, `session-cookie-mock`, `stubFetchJson`, `dehydratedData`): `galleryHydration()` sends the Session's cookie and no other, tags `GALLERY.CACHE.TAG`, lives `GALLERY.CACHE.LIFE` with `stale` of at least 300 and `expire` at most one hour, dehydrates `{ pageParams: [null], pages: [GALLERY_PAGE] }` under `QUERY.GALLERY.FEED`; same for Favorites under its key; a refusal rejects. Patches: `withFavorite` sets the flag on the item across pages and touches no other; `withoutPhoto` removes it, keeps `pageParams` and an emptied page's `nextCursor`; an id not present returns an equal feed; `photosOf(undefined)` is `[]`.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run src/features/gallery --tags-filter=unit`
- [ ] Step 3: implement as above (a body only where the tests do not fix it: the two hydration functions are written out, never shared, because the directive must be literal in each).
- [ ] Step 4: run: PASS; `pnpm --filter @allonfire/laura run check-types`.

### Task 11: Server actions and mutations (both copies)

**Files:**
- Create: `apps/laura/src/features/gallery/actions/{favorite,remove-photo}.ts`, `features/gallery/utils/gallery-mutations.ts`; tests `actions/tests/{favorite,remove-photo}.test.ts`, `utils/tests/gallery-mutations.test.ts` (unit)

**Interfaces:** Consumes `serverApi()`, `optimisticMutation`, `optimisticUpdate`, `invalidateAll` (core, Phase 1), `QUERY`, `MUTATION`, `GALLERY`, `withFavorite`, `withoutPhoto`, `LAURA.app`. Produces:

- `setFavorite(imageId: string, favorite: boolean): Promise<{ favorite: boolean } | null>` (`"use server"`): `PUT` or `DELETE /v1/laura/favorites/:imageId` as the visitor; on 200 `updateTag(GALLERY.CACHE.TAG)` and answer `{ favorite }`; on 404 drops the server copy too (`updateTag`) and answers `null`; on any other refusal `null` (a thrown error reaches the browser without its message in production).
- `removePhoto(imageId: string): Promise<number | null>` (`"use server"`): `DELETE /v1/images` with `json: { app: LAURA.app, ids: [imageId] }`; on 200 `updateTag(GALLERY.CACHE.TAG)` and answer `deleted` (0 when another Admin got there first: success); a refusal `null`.
- `favoriteMutation(imageId: string)` = `optimisticMutation({ action: (favorite: boolean) => setFavorite(imageId, favorite), invalidates: [QUERY.GALLERY.ALL], mutationKey: MUTATION.GALLERY.FAVORITE(imageId), patchCache, scope: MUTATION.GALLERY.FAVORITE(imageId).join(".") })`: the patch runs `optimisticUpdate` on `QUERY.GALLERY.FEED` with `withFavorite(feed, imageId, favorite)` and on `QUERY.FAVORITES.FEED` with `favorite ? (feed) => feed : withoutPhoto(feed, imageId)`, and answers one rollback calling both. `removePhotoMutation = optimisticMutation({ action: removePhoto, invalidates: [QUERY.GALLERY.ALL], mutationKey: MUTATION.GALLERY.REMOVE, patchCache: both feeds `withoutPhoto` })`. `invalidateGallery(queryClient: QueryClient): Promise<void>` = `invalidateAll(queryClient, [QUERY.GALLERY.ALL])` (**Phase 5 calls it after an upload**).

- [ ] Step 1: tests (actions mirror `delete-images.test.ts`: `stubFetchJson`, mocked `next/cache` and `@/features/api/utils/server-api`): `setFavorite(id, true)` sends `PUT` to the Image's favorite path with the Session cookie and calls `updateTag` with `GALLERY.CACHE.TAG`; `(id, false)` sends `DELETE`; a 403 answers `null` and calls no `updateTag`; a 404 answers `null` and calls `updateTag`; `removePhoto` sends the Image module's `DELETE` body `{ app: LAURA.app, ids: [id] }`, answers `deleted`, and a `deleted: 0` answer is still a number. Mutations (a real `QueryClient` seeded with both feeds): marking sets the flag in the Gallery feed before the action settles; unmarking sets it and drops the tile from the Favorites feed; an action answering `null` restores both and rejects; settling invalidates `QUERY.GALLERY.ALL` through `invalidateStatic` (a spy on it): an active static feed with two pages loaded ends with both read again; two quick toggles of one Image run in order (the same `scope`); `removePhotoMutation` takes the photo out of both feeds and puts it back on `null`; `invalidateGallery` refetches an active feed (an observer with the options of Task 10, `static`) once, and removes a feed with no observer.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run src/features/gallery --tags-filter=unit`
- [ ] Step 3: implement (one line each: the two actions as `deleteImages` in the Back Office is; the mutations by composition).
- [ ] Step 4: run: PASS.

### Task 12: The feed UI, its states and its skeleton

**Data checklist (read-only parts; the page task, 12, names the six points):** points 1, 2 (the refresh hook), 5 and 6 live here.

**Files:**
- Create: `apps/laura/src/features/gallery/components/{gallery-feed,photo-grid,photo-tile,gallery-notice,gallery-skeleton}.tsx`, `hooks/use-gallery-feed.ts`; tests `components/tests/{gallery-feed,photo-tile,gallery-skeleton}.browser.test.tsx` (browser)

**Interfaces:** Consumes `AOFStorageImage`, `AOFEmpty`, `AOFInfiniteSentinel`, `useAOFLinkRefresh`, `aofAltFor`, `ink`, `GALLERY`, `feedQueryFor`, `photosOf`. Produces `GalleryFeed({ canMark, source }: { canMark: boolean; source: GallerySource })` (client; renders `PhotoGrid`, the sentinel, the states, mounts `PhotoPreview` of Task 14 through its slot until then a stub), `PhotoGrid`, `PhotoTile({ canMark, image, language, onOpen })`, `GalleryNotice({ kind: "empty" | "error"; source; onRetry })`, `GalleryFeedSkeleton()`, `useGalleryFeed(source): { photos; query }` (`useInfiniteQuery(feedQueryFor(source, api))` plus `useAOFLinkRefresh({ queryKey: QUERY.GALLERY.ALL, refreshMs: GALLERY.LINK_REFRESH_MS })`).

Behaviour (tests are the contract; look through `/aof-design`, one build and one screenshot round):

- **Layout.** One block per loaded page (`columns-2 @2xl:columns-3 @5xl:columns-4` inside the Section's `@container`, `gap` and `break-inside-avoid`), each tile a `<li>` whose button has `style={{ aspectRatio: \`${width} / ${height}\` }}` from the stored dimensions and the blur under the picture (`AOFStorageImage`, `placeholder="blur"`, `sizes` from `GALLERY.TILE_SIZES`, `lcp` on the first tile only). Each block is a labelled list (`Gallery.list`/`Favorites.list`); the tile's button is named by the alt, or `Gallery.photo.open` when the alt is `""`.
- **Loading more.** `AOFInfiniteSentinel` (`disabled` while fetching or when no next page, `rootMargin: GALLERY.ROOT_MARGIN`); a status line for assistive tech while a page loads; a failed later page keeps the photos, shows `Gallery.more.failed` with a Retry button (`fetchNextPage`) and the provider toasts it once.
- **States.** First load with no data: `GalleryFeedSkeleton`; a failed first load: `GalleryNotice kind="error"` with a Retry (`refetch`), never a toast; no photos: `GalleryNotice kind="empty"` (`AOFEmpty`: words by source; an Admin's words point to Upload); a photo gone while a tile is on screen: the guard keeps its blur (never the broken-picture icon) and the next refetch drops it.
- **Skeleton.** `GalleryFeedSkeleton` draws `GALLERY.SKELETON.TILES` tiles in the same column block, each `aspect-ratio` from `GALLERY.SKELETON.RATIOS` (cycled), `ink({ tone: "faint" })`, the same sentinel-sized end element, `aria-busy`, a `role="status"` line (`Gallery.loading`), parts hidden from assistive tech (as `ListSkeleton`).

- [ ] Step 1: tests. `photo-tile`: the tile box keeps the stored ratio before the picture loads (`getBoundingClientRect` width/height equals `width/height` within a pixel at two widths: no shift); the button has the alt as its name, `Gallery.photo.open` for `""`; `onOpen(image.id)` on click and on Enter and Space; the stored blur is the placeholder (`AOFStorageImage` mock records `placeholder="blur"`, as `image-skeletons.browser.test.tsx` mocks it). `gallery-feed` (hydrated `QueryClient` with `{ pageParams: [null], pages: [firstPage] }`; MSW answers the second page): renders the first page's tiles at once with no request; reaching the sentinel fetches page two with `cursor` equal to the first page's `nextCursor` and appends a second block while the first block's tiles keep their positions (assert the first tile's `getBoundingClientRect` is unchanged); `hasNextPage` false removes the sentinel; empty feed shows the empty notice with the words from `enT` (Laura's translators), error shows the error notice with Retry and no toast, a failing second page keeps page one and shows its retry; an invalidation (`invalidateGallery`) refetches every loaded page in order (MSW request log) while the tiles stay on screen (stale-first); a page re-render after an action (the same hydrated state, newer, handed to `AOFHydratedBoundary onlyMissing` again) keeps the two loaded pages; `useAOFLinkRefresh` is mounted with `QUERY.GALLERY.ALL` and `GALLERY.LINK_REFRESH_MS`. **`gallery-skeleton`** (the height test, `next-apps.md` point 6): render the real `GalleryFeed` with a first page of `GALLERY.SKELETON.TILES` fixture items whose width and height follow `GALLERY.SKELETON.RATIOS`, and `GalleryFeedSkeleton`, each inside `<div className="@container" style={{ width }}>` at a wide width (900 px) and a phone width (360 px), `it.each` as `image-skeletons.browser.test.tsx` does; assert `skeleton` height `toBeCloseTo(real, 0)`; a second test asserts both draw the same number of columns (distinct `offsetLeft` of the tiles) at each width; a third that the skeleton says it is loading without its parts being read (`role="status"`, `aria-busy`, parts `aria-hidden`). The skeleton is kept in step by this test: change the grid and it turns red until the skeleton follows.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run --config vitest.browser.config.ts src/features/gallery/components/tests`
- [ ] Step 3: implement through `/aof-design` (Laura's polpo Design from Phase 2; tokens only, no raw colours; the tile's focus ring, tap target and `prefers-reduced-motion` per the Design).
- [ ] Step 4: run: PASS (Chromium and WebKit).

### Task 13: The Gallery and Favorites pages

**Data checklist (`docs/guides/next-apps.md`, point by point):**
1. **Hydration + TanStack.** `galleryHydration()` / `favoritesHydration()` (Task 10: `"use cache: private"`, tag and life from `GALLERY.CACHE`, `stale` 5 minutes, first page only) through core's `AOFHydratedBoundary`; `GalleryFeed` reads it back with `useInfiniteQuery` under `QUERY.GALLERY.FEED` / `QUERY.FAVORITES.FEED`; later pages are fetched by the client with the cursor through `api` (the typed Hono client), never a `fetch` in a component. `staleTime: "static"`, so no clock is read at render (Decisions, Task 0); the page wraps the feed in `AOFHydratedBoundary onlyMissing` (Task 1), so a re-render after an action never replaces loaded pages.
2. **Both copies.** `setFavorite` and `removePhoto` call the API then `updateTag(GALLERY.CACHE.TAG)` (server copy); `favoriteMutation` and `removePhotoMutation` end in `invalidateAll` on `QUERY.GALLERY.ALL`, which is core's `invalidateStatic` (Task 1: it really refetches the mounted static feed, and drops an unmounted one so the next visit hydrates a fresh first page) (this browser's copy); an Image added or removed by Phase 5 does the same through `invalidateGallery`; the Back Office's changes reach Laura after `stale` (Decisions).
3. **Protection twice.** The page is `signedInPage(Page)` (Sections floor: User); the API judges: `requireApp(App.LAURA)` on reads, `requireApp(App.LAURA, Role.ADMIN)` + `manageGuard` on writes (Tasks 6, 7); the page reads `canMark = hasSectionRole(await requireAppSession(), Role.ADMIN)` only to draw the heart and Remove; a refusal shows as the mutation's toast, never a pre-check.
4. **Resource changed.** Read-only feeds have no Version; the heart (`PUT`/`DELETE`) and Remove (`DELETE` with `app`) are idempotent and carry none (Decisions); staleness is the cache's `stale`, the link refresh and the actions' refresh.
5. **Lost and gone.** A photo deleted or removed elsewhere: its link dies (blur tile), the heart on it answers 404 (rolled back, toast `Gallery.favorite.failed`, server copy dropped), the next refetch drops it; an open preview on it closes with a toast (Task 14).
6. **Skeleton.** `GalleryFeedSkeleton` (Task 12) is the `Suspense` fallback around the data read, its height test `gallery-skeleton.browser.test.tsx` (measured with ui's `heightAtIn`, fixed by Phase 1, Task 6, the helper the Back Office's skeleton tests already use); the page's `h1` and Section width are in the static shell, only the feed waits (the Back Office's Images page shape).

**Files:**
- Create/replace: `apps/laura/src/app/[locale]/(signed-in)/page.tsx`, `.../favorites/page.tsx` (reconcile: Phase 3 placeholders), tests `apps/laura/src/app/[locale]/(signed-in)/tests/pages.test.tsx` (unit, `renderToStaticMarkup`-style like the Back Office's page tests; reconcile if it has none: then the e2e of Task 16 carries it)

**Interfaces:** Consumes `AOFSectionPage`, `signedInPage`, `pageMetadata`, `LAURA`, `hasSectionRole`, `requireAppSession`, `AOFHydratedBoundary`. Produces the two default exports `signedInPage(GalleryPage)` and `signedInPage(FavoritesPage)`, each `generateMetadata = () => pageMetadata(LAURA.PAGE.<GALLERY|FAVORITES>, "Navigation.<gallery|favorites>")` (reconcile: Phase 3's names for the paths and keys); each page: `<AOFSectionPage>` + sr-only `h1` + `<Suspense fallback={<GalleryFeedSkeleton />}>` around an async part that reads `canMark`, then `<AOFHydratedBoundary hydration={galleryHydration} onlyMissing><GalleryFeed canMark={canMark} source={GALLERY.SOURCE.GALLERY} /></AOFHydratedBoundary>`.

- [ ] Step 1: tests: each page's `generateMetadata` returns the translated title and `openGraph.url` for its path (as the Back Office's `head` unit test does); the Gallery page renders the feed with `source="gallery"` and the Favorites page with `source="favorites"`; `canMark` is true for an Admin Session and false for a User (mock `requireAppSession`); the `Suspense` fallback is the skeleton.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run "src/app" --tags-filter=unit`
- [ ] Step 3: implement (a page is thin: no data logic of its own).
- [ ] Step 4: run: PASS; `pnpm --filter @allonfire/laura run check-types`.

### Task 14: The preview, the heart and Remove from Laura

**Data checklist:** points 2, 3, 4, 5 as in Task 13 (the heart's and Remove's mutations); no point 1 or 6 of its own (the preview reads the feed's data and draws no waiting state: its picture has the tile's blur).

**Files:**
- Create: `apps/laura/src/features/gallery/components/{favorite-control,photo-preview}.tsx`; tests `components/tests/{favorite-control,photo-preview}.browser.test.tsx` (browser)
- Modify: `gallery-feed.tsx` and `photo-tile.tsx` (mount the preview and the control)

**Interfaces:** Consumes `AOFLightbox`, `AOFAlertDialog`, `AOFButton`, `AOFStorageImage`, `favoriteMutation`, `removePhotoMutation`, `aofErrorMeta`, `photosOf`, `GALLERY.PREFETCH_AHEAD`. Produces `FavoriteControl({ canMark, className?, favorite, imageId })`: for an Admin a toggle `<button aria-pressed>` (`Gallery.favorite.add` / `Gallery.favorite.remove`, `IconHeart`/`IconHeartFilled`, `text-coral` when marked) running `useMutation(favoriteMutation(imageId))` with `meta: aofErrorMeta(t("favorite.failed"))`; for a User, when marked, a static `<span role="img" aria-label={t("favorite.is")}>` with the filled icon, and nothing when not marked; never a button for a User. `PhotoPreview({ canMark, language, onClose, openId, photos, source, fetchNextPage, hasNextPage })`: `AOFLightbox` with the current photo large (`AOFStorageImage`, `sizes="100vw"`, `object-contain`, `lcp`), the caption `aofAltFor(alt, language)` (none when `""`), `actions` = the `FavoriteControl` and, for an Admin only, a Remove from Laura button opening `AOFAlertDialog` (`Gallery.remove.title/description/confirm/cancel`, `pending` while the mutation runs); stepping calls `fetchNextPage` once the current index is within `GALLERY.PREFETCH_AHEAD` of the end; the preview tracks the photo by `id`: after Remove it moves to the next (else the previous) photo, closes when none is left, and closes with a toast (`Gallery.preview.gone`) when the photo disappears from the data (refetch).

- [ ] Step 1: tests. `favorite-control`: an Admin sees a pressed/unpressed button named by the labels from `enT`, a click flips `aria-pressed` at once (optimistic, the action mocked and held open) and the action is called with the new state; an action answering `null` restores it and the failure toast shows `Gallery.favorite.failed`; a User with a marked photo sees the static mark (`getByRole("img")`, no button) and with an unmarked one nothing; two quick clicks end in the last state. `photo-preview` (hydrated feed of three photos; actions mocked): opens on the tile click with the clicked photo, caption in the page language (an Italian render reads `alt.it`; a decorative `""` draws no caption); `ArrowRight`, `ArrowLeft` and a swipe step; `Escape` closes and focus returns to the clicked tile; Tab stays inside; a User sees no Remove button and an Admin does; Remove opens the confirm dialog naming the effect (`Gallery.remove.description`), Cancel changes nothing, Confirm calls `removePhoto(id)` with the Image's id and the tile leaves the feed at once, the preview shows the next photo, and a failure (`null`) puts the photo back with the `Gallery.remove.failed` toast; removing the last photo closes the preview; a refetch that no longer holds the open photo closes the preview with the gone toast; reaching the third photo of a three-photo loaded feed with a next page calls `fetchNextPage`.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run --config vitest.browser.config.ts src/features/gallery/components/tests`
- [ ] Step 3: implement through `/aof-design` (the same single build and screenshot round as Task 12, now with the preview and the confirm dialog).
- [ ] Step 4: run: PASS (Chromium and WebKit).

### Task 15: Copy in English and Italian

**Files:**
- Modify: `apps/laura/src/features/i18n/translations/{en,it}.json` (reconcile: Phase 3's path), `apps/laura/src/features/i18n/tests/translations.test.ts` (unit)

**Interfaces:** Produces the namespaces `Gallery` and `Favorites` (the `Navigation.gallery`/`favorites` labels are Phase 3's):

- `Gallery`: `list`, `loading`, `photo.open`, `more.loading`, `more.failed`, `more.retry`, `empty.title`, `empty.description` (User), `empty.admin` (Admin: points to Upload), `error.title`, `error.description`, `error.retry`, `favorite.add`, `favorite.remove`, `favorite.is`, `favorite.failed`, `preview.title`, `preview.close`, `preview.previous`, `preview.next`, `preview.position` (`{current}`, `{total}`), `preview.gone`, `remove.action`, `remove.title`, `remove.description`, `remove.confirm`, `remove.cancel`, `remove.failed`.
- `Favorites`: `list`, `loading`, `empty.title`, `empty.description`, `empty.admin`.

- [ ] Step 1: test: both languages hold exactly the same keys in `Gallery` and `Favorites` (`objectKeys` walk), `preview.position` carries `{current}` and `{total}` in both, no value is empty, and `pnpm static:i18n` passes; words avoid the glossary's `_Avoid_` terms for the Favorite in running copy ("like", "starred", "bookmark"; the control's icon is a heart, its words say "favorite").
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run src/features/i18n --tags-filter=unit`
- [ ] Step 3: write the copy (`remove.description`: the photo leaves the Gallery and the Favorites for everyone in Laura, and is deleted for good when no other App holds it).
- [ ] Step 4: run: PASS; `pnpm static:i18n`.

### Task 16: End-to-end

**Data checklist:** the e2e proves points 2 (a change shows without a reload), 3 (a User cannot change), 5 (a removed photo is gone) in a real build; skeleton shape (point 6) is Task 12's browser test; the static shell is pinned by the instant spec below.

**Files:**
- Create: `apps/laura/e2e/gallery.spec.ts`, `apps/laura/e2e/favorites.spec.ts`, `apps/laura/e2e/photos.ts`
- Modify: `apps/laura/e2e/{keyboard,instant,safe-area}.spec.ts` and `pages.ts` where Phase 3 made them (reconcile)

**Interfaces:** Consumes Laura's `signInAs(page, user)` helper (Phase 3; reconcile its name), `FIXTURE.USER.LAURA.{ADMIN,USER}`, `FIXTURE.FAVORITE`, `FIXTURE.IMAGE`. Produces `uploadPhoto(admin cookie): Promise<string>` in `photos.ts` (posts one Fixture picture through `POST /v1/images` into Laura as the Admin, as `apps/back-office/e2e/images-flow.ts` does; reconcile whether Phase 3 moved the helper to a shared kit and import that).

- [ ] Step 1: write the specs (copy from `enT`, paths from `LAURA`, never retyped): **smoke** (`gallery.spec.ts`): a Laura User signs in, `/` shows the Fixture Laura photos as tiles with their alt as the name, the Fixture Favorite carries the static mark and no `aria-pressed` button exists, `/favorites` lists exactly `FIXTURE.FAVORITE.IMAGE`; **an Admin's changes** (`favorites.spec.ts`): marks a photo (the button flips to pressed at once), `/favorites` lists it without a reload (the `invalidateQueries` copy) and after a reload (the `updateTag` copy), clears it and it leaves Favorites; **Remove**: the Admin uploads a photo (`uploadPhoto`), removes it from the preview after confirming, it leaves the Gallery, a User session no longer lists it, and a User never sees the Remove button; **a User cannot** call the writes: the API answers 403 to a request with the User's cookie (through the page's `request` fixture) and the table is unchanged; **keyboard** (`keyboard.spec.ts`): Tab reaches a tile, Enter opens the preview, `ArrowRight`/`ArrowLeft` step, Escape closes and the tile is focused again, Tab stays inside the open preview; **instant** (`instant.spec.ts`, `@next/playwright instant()`): Gallery's static shell (frame, `h1`) commits immediately and the skeleton fills the page area while the first page reads; **safe-area**: `/` and `/favorites` are covered by Phase 3's per-Section loop (reconcile: if its page list is hand-written, add `/favorites`), and the preview's controls sit inside the insets (Chromium notch helper).
- [ ] Step 2: run, expected FAIL until Tasks 6 to 14 are in: `pnpm test:services && pnpm e2e:run --filter=@allonfire/laura`
- [ ] Step 3: fix what the specs find (no new feature code is expected; a failing spec points at the task that owns it).
- [ ] Step 4: run: PASS on `chromium`, `webkit`, `mobile-chrome` and `mobile-safari`.

### Task 17: Docs

**Files:**
- Modify: `apps/api/README.md` (a "Laura" section: the four routes, guards, bodies, limits, the keyset cursor, why not `GET /v1/images`), `docs/guides/api.md` (the `laura/` feature in the structure map and a bullet on its guards and the keyset feed), `docs/guides/database.md` (`laura` schema lists `Favorite`; services `favorite.service`, `gallery.service`; the CHECK and cascade), `packages/database/README.md` (exports, the Fixture Favorite), `docs/guides/next-apps.md` (a bullet under "Reading and changing data": an infinite feed: first page in the private cache as `{ pageParams: [null], pages: [first] }`, later pages `useInfiniteQuery` with a cursor, `AOFHydratedBoundary onlyMissing`; and, in checklist point 2 and the `staleTime` bullet, that TanStack 5.103 never refetches an active `static` query on `invalidateQueries`, so `invalidateAll` is core's `invalidateStatic` (`static-stale-time.test.ts`, `invalidate-static.test.ts`); the link refresh hook), `docs/guides/images.md` (`useAOFLinkRefresh`, `IMAGE_SERVER.LINK_CACHE_LIFE`/`LINK_REFRESH_MS`, no Web Share and why), `docs/guides/laura.md` (Gallery and Favorites: where the pieces are; Phase 3 rewrites the guide, keep the edit small), `packages/core/README.md` (`keysetCursor`), ui's export keys are listed in `package.json` only.
- Test: none (docs); `pnpm static:design` and the changelog and spec tests cover the rest.

**Interfaces:** none produced. Each doc line points to the file that holds the detail, never a copy of code (`writing.md`).

- [ ] Step 1: list what each edit must make true (the sentence above for each file) and grep for the stale statements: `git grep -n "Favorite" docs/guides packages/*/README.md apps/api/README.md` and `git grep -n "laura" docs/guides/api.md docs/guides/database.md`.
- [ ] Step 2: write the edits (plain English, no emoji, never "may").
- [ ] Step 3: run `pnpm static:design`, `pnpm static:i18n`; expected exit 0.

### Task 18: Review checkpoint

**Files:** none new.

- [ ] Step 1: `pnpm db:generate`, `pnpm static:fix` (Ultracite, Tailwind canonical classes), then `pnpm static:lint`.
- [ ] Step 2: `pnpm static:dupes` (a Laura file that clones a Back Office one means the piece belongs in a package: merge it), `pnpm static:knip`, `pnpm static:knip-production` (each new export key has a reader: `invalidateStatic` (read by `invalidateAll`'s file only: no key unless a package reads it), `AOFHydrateMissing` (read by `AOFHydratedBoundary`), `keysetCursor`, `aofAltFor`, `AOFLightbox`, `useAOFSwipe`, `AOFInfiniteSentinel`, `useAOFLinkRefresh`, the database services; `invalidateGallery`, `GALLERY.CACHE.TAG`, `QUERY.GALLERY.ALL` are read by Phase 5 and are tagged `@internal` or kept out of production mode only until it lands, with the reason, never a folder glob), `pnpm static:i18n`, `pnpm static:types`, `pnpm static:tailwind`.
- [ ] Step 3: `pnpm test:services`, then `pnpm turbo run check-types test --filter=@allonfire/database --filter=@allonfire/core --filter=@allonfire/storage --filter=@allonfire/api --filter=@allonfire/ui --filter=@allonfire/laura --filter=@allonfire/back-office`, then `pnpm turbo run test:browser --filter=@allonfire/ui --filter=@allonfire/laura --filter=@allonfire/back-office`, then `pnpm test:drift`.
- [ ] Step 4: `pnpm e2e:run --filter=@allonfire/laura` and `pnpm e2e:run --filter=@allonfire/back-office` (the Back Office's Images specs prove `IMAGES.CACHE.LIFE` and `AOFStorageImage` still behave).
- [ ] Step 5: boundary proof: `git grep -n "BACK_OFFICE\|App.LAURA" packages/ui packages/core` prints nothing outside tests; `git grep -n "fetch(" apps/laura/src/features/gallery` prints nothing (no fetch in a component); `git grep -n "Object\.\(keys\|values\|entries\)\|JSON\.\(parse\|stringify\)" apps/laura/src/features/gallery apps/api/src/features/laura` prints nothing.
- [ ] Step 6: docs touched are listed in Task 17; `git status` shows only intended files (the owner's uncommitted edits to `CONTEXT.md`, the ADRs and the earlier phases' plans stay); stamp this plan done (`/iso-write` does it) and stop: the owner reviews every change and commits by hand, one branch and PR to `dev` for the phase (spec: branches).

## Left to later phases (named so no one re-derives it)

- Phase 5: the upload action calls `updateTag(GALLERY.CACHE.TAG)` and its mutation `invalidateGallery(queryClient)`; the Upload page's Image grid can reuse `PhotoGrid` if it needs one.
- Phase 6: the Memory game's six random Laura Images can reuse `IMAGE_SERVER.LINK_CACHE_LIFE`, `useAOFLinkRefresh` and `aofAltFor`.
- Back Office: its `"static"` queries and `invalidateQueries` (Decisions, open point); its Images list could adopt `useAOFLinkRefresh` for a long-open page.
