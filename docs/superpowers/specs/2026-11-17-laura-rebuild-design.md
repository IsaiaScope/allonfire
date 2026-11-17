# Laura rebuild: design and roadmap

Date: 2026-11-17. Status: agreed in conversation, grilled in `/iso-plan`. Plans: one per phase (see "Phases").

## Intent and why

Laura (`apps/laura`) is the old Next app, paused: it still reads Postgres through Prisma and server actions, runs its own Better Auth, keeps a Viewer Role, three games and its own i18n, proxy and PWA wiring. Its gallery imports `@allonfire/database/features/laura/favorite.service`, which no longer exists, so it cannot run. The Back Office is now the standard: API-backed pages, TanStack over the private cache, one shared auth flow, PWA, link previews, special pages, skeletons, AOF components, AOF forms.

The owner wants Laura rebuilt on that standard, with every piece both Apps need extracted to a package instead of copied, so that Laura and the Back Office end on the same generic scaffold.

## Goals

- Laura is a new Next App built the way the Back Office is (everything in `docs/guides/next-apps.md`, `package-layout.md`, `forms.md`, `testing.md`): API data path, the data checklist per page, skeleton plus height test per waiting page, `signedInPage`, `useAOFForm`, no `as`, no raw JSON/Object helpers, constants per owner.
- The scaffold both Apps share lives in `packages/` (ui, core, auth). The Back Office is moved onto it in the same project, as proof; an App is thin: Sections, features, copy, Design, env.
- Same auth flow as the Back Office (Sign in, Forgot password, Reset password, Email verified, sign-in gate, proxy). No registration in Laura: an Admin adds Users.
- Roles are Admin and User only. Viewer disappears everywhere.
- Laura keeps only the Gallery (with Favorites) and the Memory game (with its leaderboard). Quiz is deleted completely.
- A new Design for Laura: polpo / octopus / sea, in `packages/design/src/designs/`, worn through `/aof-design`. The Japan Design stays for the Back Office.
- Everything standard from the Back Office: PWA (install hint, offline, Offline page, service worker), link previews and share card, metadata, icons, launch screens, robots, 404/403/error pages, instrumentation, safe-area guard, e2e.

## Non-goals

- A mobile (React Native) client.
- New games, a quiz replacement, new Roles.
- Rebuilding the Back Office's own look. Only its generic pieces move.
- A generator (`pnpm new:app`) or a template. Sharing is by package, not by stamping.
- Changing the Image module's rules (public/private, signed links, an Image in one or more Apps).

## Anti-goals (failure even if it works)

- A piece copied from the Back Office into Laura. `pnpm static:dupes` (jscpd) must stay green and any clone is merged into a package.
- Laura reaching the database from Next (no Prisma in the App).
- A package that names an App, or imports one.
- A Viewer branch left in a guard, a form, a test, an ADR or the glossary.

## Constraints (read from the repo)

- `docs/guides/next-apps.md` data checklist (ADR 0028, 0020): private-cache hydration, both copies refreshed, resource protection twice, Version on saves, lost-and-gone, skeleton with height test.
- ADR 0014/0022: pages are built in their App; `packages/design` holds no components. A second App wanting a Japan piece moves it to `@allonfire/ui` as an AOF component (ADR 0014); ADR 0022 keeps the Design package component-free, so a shared piece that two Designs dress differently takes its look as props/slots/cva from the App, never from the package.
- ADR 0019/0007: roles are per-App Memberships; one Postgres schema per App (`laura`). Database changes are Liquibase changesets (`pnpm db:changeset`).
- ADR 0020/0027: Images are in the shared `image` schema, in one or more Apps, public or private, served through signed links.
- `packages/shadcn` is written only by the shadcn CLI; AOF components are the only importers of it.
- Library survey rule of `/aof-design`: done, `docs/superpowers/specs/2026-11-17-app-shell-library-survey.md`.
- exFAT: new scanners ignore `**/._*`. Next 16 docs under `packages/core/node_modules/next/dist/docs/` first.
- New dependency needs 200,000 weekly downloads (`tooling.md`).

## Approaches considered

### Sharing the scaffold (picked: extract to packages first)

- **Extract first (picked):** Phase 1 moves every app-agnostic piece into ui/core/auth, parametrised by App constants and Design slots; the Back Office is refactored onto it; Laura is then built on the packages. No duplicate ever exists. Cost: Back Office regression risk, mitigated by its existing browser/e2e tests.
- Generator + copy: fast, but copies drift and fixes apply twice. Rejected.
- Copy now, extract later: double work, Laura built on code that then moves. Rejected.

### Laura's frame (picked: floating sidebar, shadcn `sidebar-04`)

One `AppFrame` in `packages/ui` serves both Apps; the Design picks `variant` (`sidebar` | `floating` | `inset`) and `collapsible`. Back Office: `sidebar` + `icon` (sidebar-07). Laura: `floating` + `icon`. Phone is a drawer in both. Alternatives surveyed (inset 08, sticky header 16, React Bits Dock, Aceternity Floating Dock/Sidebar, Shadcn Studio shell): not picked. No free library ships a finished sidebar-on-desktop/tab-bar-on-phone shell; a phone tab bar was rejected for the Back Office already, and the owner picked the sidebar family. `AppFrame` must keep a seam (`variant`, `collapsible`) so that choice stays one prop.

### Photos in Laura (picked: Admin-only Upload section inside Laura)

Only an Admin changes Images (upload, edit, delete). Laura has its own Upload section, shown and allowed for Admins only. A User browses, favorites and plays. The Back Office keeps full Image management. Alternatives: Back Office only (rejected: owner wants upload inside Laura); User upload and own-photo delete (rejected: owner restricts changes to Admin).

### Plan shape (picked: roadmap + deep plan per phase)

This document is the roadmap. Each phase has its own plan file under `docs/superpowers/plans/`, reconciled against the code again by `/iso-write` before it starts.

## Decisions taken as the agent's calls (correctable)

1. Laura reads and writes through the API (Hono) like the Back Office. New `laura` routes/modules live in `apps/api` or a package (ADR 0015), guarded by `requireApp(App.LAURA)` plus a role check. Laura has no database dependency.
2. Laura registers nobody (Back Office rule). Users are added by an Admin in the Back Office. Laura's own Better Auth in `lib/auth.ts` is deleted; the Auth module in the API is the only auth.
3. Existing Viewer Memberships become User (changeset), then the enum value is dropped. `Viewer` leaves `CONTEXT.md`, ADR 0019 gets an amendment (new ADR, not an edit of the old one).
4. Gallery = list of Images that are in the Laura App. Favorites need a new `laura.Favorite` table (userId + imageId, unique), Liquibase changeset; the old Photo/Favorite models are already gone.
5. `GameType` drops `QUIZ`; existing QUIZ `GameScore` rows are deleted in the changeset. Only `MEMORY` stays (the enum may stay as a one-value enum for later games, or become implicit: decided in Phase 6).
6. Settings page is dropped: language and theme live in the account menu / frame like the Back Office. User info is the account menu.
7. "Sharing" means link previews and the share card (Open Graph, Twitter image, WhatsApp/iMessage-safe images, JSON-LD if kept) as in `next-apps.md`. A native Web Share button on a photo is optional and decided in Phase 4.
8. Framer Motion, lucide, react-hook-form, `heic2any`, sonner and next-intl wiring are re-evaluated against the standard: Tabler icons, `useAOFForm`, ui's toaster, core's i18n. Motion stays only where the Design needs it and a library the repo already uses covers it.
9. The old `apps/laura` source is deleted in Phase 7, but the rebuild starts in the same folder from an empty `src/` at Phase 3 (git history keeps the old code; `seed-photos` and `fix-photo-dimensions` scripts are judged in Phase 7, likely deleted since Images now come from Back Office and the Image module).
10. Hosting: Laura gets its Local port, Tailscale Service, Docker image, CI build and Dokploy entry like the Back Office (`deployment.md`); `LAURA_URL` already exists as optional in the Back Office switcher and becomes required to show the link.

## Phases

Order is a dependency chain; each plan file is `docs/superpowers/plans/2026-11-17-laura-p<N>-<slug>.md`.

| # | Phase | Delivers | Depends on |
|---|---|---|---|
| 0 | Drop Viewer | Changeset (Viewer to User, enum value gone), API guards and `roleIn`/`hasRole` rework, Back Office Users form/Role picker, tests, `CONTEXT.md`, new ADR | none |
| 1 | Extract the scaffold | Generic pieces of the Back Office moved to packages (see below), Back Office refactored onto them, dupes/knip green | 0 |
| 2 | Octopus/sea Design | `packages/design/src/designs/<name>/` (DESIGN.md/json, theme.css, fonts, image fonts, image colours, share-card look), Laura `PRODUCT.md`/`styles.css`, logo variants, chosen through `/aof-design new` with previews | 1 (slots) |
| 3 | Laura shell | Empty-`src/` Laura: env, i18n, proxy, instrumentation, auth pages (4), floating frame with Sections (Gallery, Favorites, Memory, Upload), account menu, PWA, offline page, metadata routes, special pages, launch screens, manifest, safe-area e2e, turbo/lint-staged/CI wiring, `laura.md` rewrite | 1, 2 |
| 4 | Gallery and Favorites | API: list Laura Images (cursor/infinite), favorite toggle, favorites list; `laura.Favorite` changeset; pages with hydration, masonry grid, photo preview, optimistic favorite, share, skeletons + height tests | 3 |
| 5 | Admin Upload | Upload section (Admin only): shared HEIC convert util, dropzone, preview grid, all-or-nothing `POST /images` into the Laura App, cache clears; Back Office's Add Images page reuses the same ui pieces | 3 (4 for the grid) |
| 6 | Memory game | API scores (submit, leaderboard), `QUIZ` removal changeset, game board, hub, leaderboard, cache tags, skeletons | 3 |
| 7 | Cutover | Delete `auth-old`, `ui-old`, old Laura leftovers and scripts, docs (`laura.md`, `next-apps.md`, `package-layout.md` Laura notes, ADRs), knip/dupes, Docker/CI/Dokploy deploy, `design:sync` and `lint-staged` lines, version/release | all |

### Phase 1: what is generic (moves) vs App-specific (stays)

Moves to packages (candidate list, finalised by a survey task at the start of the Phase 1 plan):

- `features/api` (api client, server api, refusal handling) to core's next/api or a thin `features/next/api` factory taking the API address.
- `features/navigation`: `AppFrame` (with `variant`/`collapsible`), `AppSwitcher`, `AccountMenu`, breadcrumb, `SectionPage`, `SectionLink`, sections utils, `signedInPage`, `switcherApps`; the Sections tuple type and guards test helper.
- `features/pwa`: install hint, offline banner/notice, reload button (dressed through slots).
- `features/metadata/utils` (`baseMetadata`, `pageMetadata`, `pageOpenGraph`, share image, icon image, image fonts) taking an App descriptor.
- `features/errors` (not-found/error notices), `features/auth` frame-agnostic parts (forms, schemas, constants, language switch, verified-landing) with the Design-specific frame (`TicketGate`, station signage) passed as a slot or kept per App.
- `shared`: list kit (`useListView`, `useListTable`, list params, filter panel, skeletons, bulk delete, optimistic mutation/update), `FormSkeleton`, `ListSkeleton`, `ResourceView`, password rules, retry, `skeleton-ink`.
- `environment`: shared parts of the env schema (API URLs, telemetry), `proxy` wrappers.

Stays in the Back Office: Japan-dressed pieces (torii, hanko, kanji, departure board, station signage) unless a generic component with a Design slot replaces them; Users, Storage, Services, Home cards, Sections content.

Rule for every move: the package logic never names an App; per-App values come from one descriptor object (`BACK_OFFICE`, `LAURA`), per-Design look from slots/cva/theme tokens.

## Cross-cutting rules every phase plan must carry

- Tests first; test file first line `// @module-tag unit|integration`; Vitest globals.
- Data checklist (6 points) named task by task for each page that reads/writes the API; skeleton + test named.
- Library survey result already recorded; shadcn items installed only through the CLI then `pnpm --filter @allonfire/shadcn canonicalize`.
- i18n: `en.json` and `it.json` for Laura; `pnpm static:i18n`.
- `pnpm static:fix`, `static:dupes`, `static:knip`, `check-types`, app tests green at the end of each phase.

## Left to the builder

File-by-file moves in Phase 1 (survey first), exact API route shapes and cache lives, the Design's name and palette (decided with previews in Phase 2), game board visuals, whether `GameType` stays an enum.

## Open points sent to the grill

- Whether Phase 0 and Phase 1 can ship as separate PRs to `dev` (assumed yes, one branch per phase).
- Whether Laura's Memory game keeps its card-back images and sounds (assets in `apps/laura/public`) or the new Design supplies them.
- Whether Gallery needs search/sort/filter (ADR 0026/0031 list kit) or only a masonry feed.
