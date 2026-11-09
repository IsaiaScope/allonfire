# Storage overview page (analytics) — design

## Intent

Home in the Back Office is a placeholder (name and description). It becomes the
Admin's first look: the state of the `image` bucket. The Admin sees how much is
stored, how many bytes are public or private per App, and jumps to the Images
page to manage them. (Decided: on Home, not a Storage page.)

## Goals

1. **Home** (`/`) shows the Storage overview under its heading and
   description. `/storage` stays a redirect to Images and the Storage sub-menu
   stays Images only (no Overview entry, no `sectionEntry` change). A visitor
   the API refuses (403, a Back Office member who is not an Admin) sees Home
   without the block, not an error.
2. One card for the `image` bucket, named by what it holds, **Images and
   Avatars** (Avatars live in the same bucket; no split), the bucket id `image`
   as a muted caption. **Total badges** on the card: object count and size from
   the bucket's listing, and the Image count from the database. A link to the
   Images page.
3. One **bar chart**: public vs private **bytes per App** (the Images' sizes
   from the database, one bar group per App, two bars: Public, Private),
   drawn with the installed shadcn `chart` (Recharts 3) wrapped as an AOF
   component in `packages/ui` (a small client leaf; the page stays a Server
   Component). An Image placed in several Apps counts once in each (stated in
   the chart's caption).
4. A new Admin-only API route, `GET /v1/storage/overview`, answers the card
   and the chart in one body. The API keeps the bucket listing 5 minutes in
   Redis (listing is the expensive read); the database aggregate is read
   fresh.
5. The Back Office reads it like Users (data checklist,
   `docs/guides/back-office.md`): `storageOverviewHydration` in
   `"use cache: private"` under `STORAGE.CACHE.TAG`, dehydrated; the view
   `useQuery(storageOverviewQuery(api))` under `QUERY.STORAGE.OVERVIEW`,
   `staleTime: "static"`; `stale` 5 minutes.
6. **Resource protection, twice**: the page is `signedInPage`; the API route is
   guarded by a Back Office Admin check read fresh (401 without a Session, 403
   without the Role). The page pre-checks nothing about Roles.
7. **Resource changed / refresh**: the page has no save, so no Version. What
   moves its numbers are the Image actions (upload, edit, delete), which call
   `updateTag(IMAGES.CACHE.TAG)` today; the Overview's tag is cleared by the
   same actions, and the Images mutations invalidate `QUERY.STORAGE.ALL` in the
   browser. The API's 5-minute bucket listing may lag the bytes; the card says
   its numbers are from the last minutes (a "as of" time from the body).
8. A bucket the API cannot list answers the card its own error state; the
   chart (database) still draws. Never a blank page.
9. Pages built through `/aof-design`; one build and one screenshot round. The
   survey is `2026-11-09-storage-analytics-library-survey.md`.
10. **Cleanup of the telemetry link**: remove `TELEMETRY_URL` (environment,
    `.env.example`, prod compose, tests), `observe-link.ts` and its test, and
    the docs that mention them. OpenObserve is not shown on this page.

## Non-goals

- OpenObserve / `telemetry` bucket / log link / events (decided: dropped).
- Growth over time (needs stored snapshots), health checks, a breakdown inside
  the bucket by file kind, links to the MinIO console.
- Per-object browsing or deleting from the Overview, other buckets.
- A filter on the overview (the Images list has the Access filter).
- An Overview page or sub-menu entry under Storage (decided: Home only).

## Constraints

- Words: UI says "Images and Avatars" with `image` as a caption; never "bucket"
  as the concept (CONTEXT.md: **Storage**).
- The API's storage login is scoped to the `image` bucket (prod compose,
  `prod-compose.test.ts`); it lists that bucket only.
- Constants nested per owner (`STORAGE`, `QUERY.STORAGE`, `API`); no string
  paths or error codes; no `as` casts; core helpers for object keys.
- Guides: `back-office.md` (data checklist), `api.md`, `images.md`,
  `next-apps.md`, `design-system.md`, `testing.md`, `deployment.md`; ADR 0028,
  0027, 0020, 0006.

## Decisions (grill)

- Bucket scope: `image` only; Images and Avatars together.
- Chart: bytes (not counts), public vs private per App, from the database.
- Badges: per bucket object count, size (listing) and Image count (database).
- Freshness: API Redis 5 minutes for the listing; browser private cache
  `stale` 5 minutes; Image actions clear both.
- Telemetry/OpenObserve: dropped, with its env and util.
- Placement: Home only; `/storage` redirect and the sub-menu are unchanged.

## Left to the builder

- Exact route shape and field names (set in the plan), the Redis key, chart
  colours from the Design's chart tokens, empty state when nothing is stored.
