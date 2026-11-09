# Instant Users navigation (Partial Prefetching) — design

## Intent

Build the Back Office the way Next 16 is designed to work, not hide a symptom.
In production, a link click between `/users` and `/users/[id]` paints the
prefetched frame at once and then shows `UsersListSkeleton` (about 100 ms) or
`SectionLoading` (about 400 ms) while the request-time part comes from the
server. Dev never shows it because dev does not prefetch and the server is
local. Browser Back/Forward already reuses the page (React `<Activity>`).

The goal: the data behind those links is ready before the click, through the
model the installed docs teach (`node_modules/next/dist/docs/01-app/02-guides/`
`instant-navigation.md`, `optimizing-prefetching.md`,
`adopting-partial-prefetching.md`, `authentication-with-cache-components.md`)
and the repo skills `next-partial-prefetching-adoption` and
`next-partial-prefetching-optimizer`.

## Goals

1. `partialPrefetching: true` for every App built on core's
   `AOFCreateNextConfig` (today: the Back Office; the old Laura has its own
   config and is out of scope).
2. The list's read (`usersHydration`, which took in the old `readUsers`) and
   `readUser` become `"use cache: private"`: they read the
   session cookie inside the cache scope, so the session token is no longer a
   server cache key (the auth guide: cache keys are stored in plain text, keep
   tokens out). Results live only in the visitor's browser and join the App
   Shell and per-link prefetches. `cacheLife` keeps `stale` at least 5 minutes
   (`USERS.CACHE.LIFE`), so the content is included in prefetches.
3. Tags: the list and one User both under `users` (`USERS.CACHE.TAG`, never
   a literal); Add, Edit and Delete each call `updateTag(users)`. (Refined in
   implementation: a per-User `user:<id>` tag was dropped, since every change
   already clears `users`.)
4. A save that cannot destroy what it did not see: the edit form sends the
   version of the User it showed; the API refuses with 409 when the User
   changed since, and the form shows a message (changed elsewhere, reload).
   Nothing more: reloading discards what was typed (decided). This is what
   makes caching `readUser` safe; today's comment in `read-user.ts` ("read
   afresh… never kept") is replaced by this guarantee.
   - The version (my call, after the builder check): `Membership` has no
     `updatedAt`, and a Membership deleted elsewhere leaves no row, so a
     timestamp would miss both and a save could restore revoked access. The
     version is a hash of `User.updatedAt` plus the User's sorted
     (App, Role) pairs, computed by the API when it reads the User, sent in
     the User body, and compared by the API inside the same transaction as
     the write. No schema change.
   - Generic from day one (decided): the hash function (`versionOf`), the
     `version` field's schema, the standard error code `RESOURCE_CHANGED`
     (409) and its one shared message live in `packages/core`, so every
     future resource reuses them; only what a resource's version covers
     stays in its own service.
   - How old a shown copy can be: one's own saves clear the browser's copy
     at once (`updateTag` from a Server Action clears the client cache);
     another Admin's change shows up to `stale` late. `readUser` uses the
     same 5-minute `stale` as the list (decided), the save stays guarded by
     the 409.
5. Links:
   - every link to `/users` (sidebar Section link, breadcrumb, the edit and
     new forms' Cancel) gets `prefetch={true}`: the list for that address is
     ready before the click;
   - the row link to a User (`OpenUser` in `user-columns.tsx`) prefetches on
     intent: hover, keyboard focus, or the finger landing (`pointerdown`),
     never in the viewport. A list page holds up to 100 rows
     (`USER.PAGE_SIZES`), so per-link prefetch is spent only on the row the
     Admin reaches for. Before intent the link prefetches nothing of its own
     (`prefetch={false}`), after it `prefetch={true}`. Through ui's
     `useAOFIntentPrefetch`, props spread onto the `<Link>` (the docs' hover
     pattern, `prefetching.md`), never an app-wide Link wrapper.
     On a phone the tap starts the read about 100 ms early; a short loading
     screen can remain there, accepted.
6. Production `instant()` tests (`@next/playwright`, same release line as
   `next`) on the existing e2e stack, which already runs the standalone
   production build: one test per source link and destination, plus a
   freshness test per cache (save, then the list and the User show the new
   value).

## Non-goals

- Replacing TanStack Query. The list keeps its two layers (decided): the
  server reads page 1 and hydrates TanStack; paging and search stay
  TanStack fetches through the browser API client. Only the first page
  benefits from prefetch. Both invalidations stay (`updateTag` and
  `invalidateQueries`).
- `experimental.staleTimes` (the repeat-visit knob): not used.
- Other Sections (Storage, Home) beyond what enabling the flag changes;
  their insights are fixed only if the flag breaks them.
- The Permissions-Policy console warnings: not ours (our header lists eight
  other features).

## Anti-goals

- A list or a User showing old data after one's own save.
- One visitor's cached data reaching another.
- A save silently removing a Membership the form never showed.
- `exposeTestingApiInProductionBuild` reaching the image that serves real
  traffic.
- `prefetch={false}` added to fake a failing test; a `<Suspense>` around a
  whole page body to pass validation.

## Constraints

- Repo rules: no `as` casts, constants per owner, env vars prefixed by owner,
  tests first with `// @module-tag`, Liquibase for any schema change.
- `User.updatedAt` exists; a Membership change (a Role gained in another App)
  lives on its own row and does not bump it. The version token must cover
  the User and their Memberships.
- The API reads every request with the visitor's session; the Back Office
  never reads the database directly.
- `"use cache: private"` cannot use a custom cache handler; `stale` under
  30 s drops a scope from prefetching, under 5 min from the App Shell.

## Grilled (decided)

- The version check guards only the PATCH (name, Roles, password); the
  avatar upload that follows is not checked.
- Any change to the User since the form was read refuses the save (the hash
  covers `User.updatedAt` and every (App, Role) pair), a rename the User
  made themself included.
- Delete is not version-checked.
- Recorded as ADR 0028
  (`docs/adr/0028-pages-prefetch-their-data-and-a-user-save-is-version-checked.md`).

## Decided by the owner

- Prefetch model (B), not `staleTimes`.
- Version-checked save with 409; on a 409, a message only.
- Prefetch on the links to `/users`; intent prefetch (hover, focus,
  pointerdown) on User rows.
- `readUser` keeps a 5-minute `stale`, like the list.
- Keep TanStack Query.
- `"use cache: private"` for both the list's read (`usersHydration`) and `readUser`.
- `partialPrefetching` in core's config, every App.

## Left to the builder (my calls, marked)

- How the test-only flag is gated (my call: an env var owned by config's
  e2e stack, read by `AOFCreateNextConfig`, set only by the e2e build).
- Where the intent-prefetch link lives (first my call: next to `OpenUser`;
  built as ui's `useAOFIntentPrefetch` hook instead, so any long list reuses
  it).
- Which projects run the row-link `instant()` test (my call: Chromium
  desktop for hover; the phone projects check only that the tap reaches
  the User).
- Whether `/users/[id]` keeps one Suspense around the form or splits the
  frame (title, Cancel) out of it, as long as `SectionLoading` remains the
  fallback for the data part.
