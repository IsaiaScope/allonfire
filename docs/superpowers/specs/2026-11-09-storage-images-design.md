# Storage section: Images bucket page — design

> **Superseded (2026-11-09):** the OpenObserve link, `TELEMETRY_URL`, `observeLink` and the Images header (count and size) were dropped; the count and size live in the Storage overview on Home (`2026-11-09-storage-overview.md`). The Image failure `event` log fields stay.

## Intent

Storage is an empty placeholder in the Back Office sidebar today. It becomes a
Section with a sub-menu like Services: one sub-page per bucket, today only
**Images** (the closed `image` bucket). The Admin manages Images from there
(browse, upload, edit, delete) instead of through the API by hand, and can
reach the Image failure and cleanup log lines later.

## Goals

1. `SECTION.STORAGE` gets `pages` (like `SECTION.SERVICES`): one sub-page,
   Images, at `/storage/images`. The Storage row opens the first page
   (`sectionEntry`), so `/storage` redirects to `/storage/images`. A new bucket
   is later one more row in `pages` plus its page.
2. Images page (`/storage/images`), a table like Users: thumbnail, key or alt,
   size (bytes and dimensions), access (public/private), the Apps it is in, who
   uploaded it, created date; search/filters and bulk delete following the
   Users pattern where the Image API supports them.
3. A bucket header above the table: count of Images, total bytes, and a link to
   OpenObserve filtered to the Image events.
4. Upload, edit and delete as their own pages, following Users:
   `/storage/images/new` (upload) and `/storage/images/[id]` (edit alt in the
   Base languages, public/private, the Apps it is in, delete). Same
   instant-navigation rules as Users: private-cache reads, `updateTag` on every
   change, Version carried on saves (`Image.version`, ADR 0028).
5. Failures and cleanup of the Image lifecycle are logged as structured API log
   lines (pino, shipped to OpenObserve, 14 days): an upload rolled back,
   leftovers removed by `deleteLeftovers`, 409 `IMAGE_CHANGED` /
   `RESOURCE_CHANGED`, rejected uploads (too large, unsupported). Read later in
   OpenObserve. No new table.

## Non-goals

- A database table or a Back Office list of events (decided: OpenObserve only).
- Recording successful uploads/edits/deletes (who did what), consistency scans
  (rows without files, orphan files) and usage-over-time numbers (decided: not
  now).
- Other buckets (`telemetry`, `avatar` files): only `image` is listed.
- Avatars: they live in the `image` bucket but are not Images; this page shows
  Images only.

## Constraints

- Reuse the Image API (`GET/POST/PATCH/DELETE /images`, `GET /images/:id`), the
  Image module in `packages/storage`, `packages/ui` (`data-table`, `image`) and
  the Users page patterns. No new endpoint unless a goal needs one (see open
  questions).
- Guides to follow: `back-office.md` (Sections, sub-menu pages, signed-in
  pages, private caching, Version), `images.md`, `next-apps.md`, `forms.md`
  (AOF forms), `design-system.md` (pages via `/aof-design`), `testing.md`,
  `code-style.md`, `conventions.md` (constants, error codes). ADR 0027, 0028,
  0020.
- Pages are built through `/aof-design`, never plain `/impeccable`.

## Decisions (grill)

- **Naming**: the sub-menu entry is named by what it holds, "Images"; the UI
  never says "bucket" (CONTEXT.md: Storage, _Avoid_ bucket). No glossary change.
- **Pagination**: numbered pages like Users. `GET /images` gets an optional
  numbered mode: `page` + `perPage` switch the answer to `images`, `total`,
  `totalBytes`, `pageCount` (a `count`, an aggregate `_sum(bytes)` and a
  `findMany` side by side with the same visibility filter, as `listUsers`
  does). Without `page` the cursor mode Apps use is unchanged. `page` and
  `cursor` together answer 400.
- **Table controls**: App filter (the API's `app` query) and select-and-delete
  (the delete route takes a list). No search, no sort (the API has neither).
- **Header**: count and total bytes from the numbered answer (filter
  included), and a link to OpenObserve.
- **OpenObserve link**: optional `TELEMETRY_URL` in the Back Office
  environment (a plain value, unset Locally and in tests: the link is then
  hidden). The link carries a query filtering the Image events by their
  `event` field.
- **Log events**: structured `event` field, `image.*`, on the real failures:
  the failed leftover delete (`deleteLeftovers` already warns with `keys` and
  `reason`) and the upload/edit rollback paths. 4xx refusals (409
  `IMAGE_CHANGED`, `RESOURCE_CHANGED`, too large, unsupported) stay as the
  request logger's lines. Exact names are set in the plan from the code.
- **Refusals**: the page pre-checks nothing about Roles; the API is the judge
  and its refusal shows as a toast, as in Users.
