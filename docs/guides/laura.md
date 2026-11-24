# Laura

Laura (`apps/laura`, `@allonfire/laura`) is the couple's private photo gallery and Memory game: a Next App built on the same shared scaffold as the Back Office (ADR 0033) and wearing the Ocean Design. It reads the API only (no Prisma client, no service import) and signs in through the API's Auth module. Its description, in both languages' `Metadata`, is "Our private place, just for the two of us."

## Sections and routes

The Sections are `SECTION` in `src/shared/constants/laura.ts`, an explicit list (`SECTIONS`) that the sidebar, the proxy's sign-in gate and `sections.test.ts` all read:

- `/` Gallery (Home), `/favorites`, `/memory` (Play) and `/memory/leaderboard` (Memory's second page, in its sub-menu), `/upload` (Admin only).
- Every page but Upload and Memory is built: the Gallery and Favorites are Phase 4's (below); Phase 5 builds Upload, Phase 6 Memory and its leaderboard. Each phase replaces the page body and adds that page's skeleton and height test with its data; `generateMetadata`, `signedInPage(...)` and the `minRole` option stay (plan: `docs/superpowers/plans/2026-11-17-laura-p3-laura-shell.md`, "Page data checklist").

## The frame and Ocean

- The signed-in frame is `(signed-in)/layout.tsx` over ui's `AOFAppFrame` with `variant="floating"` and `collapsible="icon"` (ADR 0033); the account menu holds language, theme and sign out, and the App switcher lists the Back Office for a Back Office Admin. Back Office specifics are in `back-office.md`; the frame, signed-in pages and special pages are in `next-apps.md`.
- Laura's Ocean dressing is bound once, in thin files, to the shared pieces through slots: `features/auth/constants/dressing.tsx` (the sign-in pages), `features/errors/components` and `features/pwa/components` (notices and PWA cards), `shared/components` and `shared/constants/action-dressing.tsx`. The Design itself is `packages/design/src/designs/ocean` and `src/apps/laura` (`design-system.md`).

- Laura's mascot is a pool of emoji art (`OCEAN_ART`, `OCEAN_MASCOT_POOL`: `packages/design/src/designs/ocean/mascot-art.ts`, licences in `SOURCES.md`), never a drawing. `src/shared/constants/mascots.ts` (`MASCOT`) assigns one picture to each moment (gate, error, 404, offline, loading, toasts, Install card) and the server component `OceanArt` draws it; the frame's breadcrumb wears one beside each crumb, fixed: the favourite (`MASCOT.APP`) for the App, then `MASCOT.CRUMB` by `Navigation` label for each Section and page (`crumbArt`), never one whose fill all but vanishes on the light ground (the Noto jellyfish, lighthouse, shark, whale, the Fluent wave).

## Favorites

- The Laura Admins edit one list, `laura."Favorite"`; each Laura User also holds their own copy of it, `laura."ProfileFavorite"`, under their Profile (`laura."Profile"`, ADR 0034). Marking or clearing writes the master and every existing Profile's copy in one transaction; a User's Profile is made, with the copies, the first time they read the Gallery or the Favorites. Users cannot change their copies yet.
- The pieces: `profile.service`, `favorite.service` and `gallery.service` (`packages/database/src/features/apps/laura`), the routes in `apps/api/src/features/laura` (`GET /v1/laura/gallery`, `GET /v1/laura/favorites`, Admin-only `PUT` and `DELETE /v1/laura/favorites/:imageId`). The Gallery's `favorite` flag and the Favorites page read the caller's own copies.

## Gallery and Favorites

- One feed component draws both lists: `GalleryFeed` (`features/gallery/components`) over `useGalleryFeed`, the grid of `PhotoTile`s, the preview (`PhotoPreview` over ui's `AOFLightbox`) and the next page asked for by `AOFInfiniteSentinel` and a compact "Show more photos" button. The data follows `next-apps.md`: the first page in the private cache (`galleryHydration`, `favoritesHydration`, tag `GALLERY.CACHE.TAG`), later pages by `useInfiniteQuery` with a keyset cursor.
- Changes are `favoriteMutation` and `removePhotoMutation` (`utils/gallery-mutations.ts`) over core's `optimisticMutation`: the feeds are patched first, a feed the patch made exact is not read again (`keeps`), and a burst of heart taps is one write (`useAOFQuietToggle`).
- The heart is `FavoriteControl`: for an Admin a button in the theme's blue (coral once marked), for a User a static mark. Remove sits in the preview's capsule behind `OceanAlert` (`shared/components`), the Ocean dressing of ui's `AOFAlertDialog`; Remove deletes the photo from Laura for everyone, and from the system when no other App holds it.
- A small action, like the load-more button, is `COMPACT_ACTION` (`shared/constants/action-dressing.tsx`), the Back Office's compact button in the Ocean dressing.
- Spec and plans: `docs/superpowers/plans/2026-11-17-laura-p4-gallery-favorites.md`.

## Roles and the Upload gate

- Laura admits two Roles, Admin and User, and no Viewer (ADR 0032): its floor in `ACCESS.APP_SETTINGS[App.LAURA]` is User. A User browses and plays; an Admin also adds Images.
- Upload's `minRole` is read in four places that must agree: the proxy sends a User Home (`withSignInGate({ sections })`), the page does the same (`signedInPage(Page, { minRole: Role.ADMIN })`), the sidebar hides the row (`AOFRoleGatedSection`), and the API refuses with 403 (`requireApp(App.LAURA, Role.ADMIN)`, a route from Phase 5). Pinned by `upload-gate.test.ts`, `sections.test.ts` and `e2e/upload-gate.spec.ts`.

## Auth

- No registration (`registration: null`): an Admin adds Users in the Back Office (`back-office.md`).
- One Session across the Apps: on the parent domain in Production (`AUTH_COOKIE_DOMAIN`), on `localhost` Locally. Sign-in actions and the proxy wrappers are `@allonfire/auth` (`packages/auth/README.md`).

## Environment and ports

- Names are in `apps/laura/.env.example` and `src/environment/environment.ts` (`API_*`, `AUTH_*`, `LAURA_URL`, `TELEMETRY_*`); Laura reads only its own address, at build and at runtime, and never `BACK_OFFICE_URL` (`deployment.md`).
- Ports are `LOCAL.PORT` in `packages/config/local/addresses.ts`: 3200 Local, 3210 e2e, 3220 preview (`pnpm --filter @allonfire/laura preview`).

## Where each shared piece lives

- The scaffold (providers, request config, page information, manifest, proxy matcher suite): core, `packages/core/README.md`.
- The session pieces (`requireAppSession`, `withSignInGate`, `hasSectionRole`): auth, `packages/auth/README.md`.
- The frame, account, switcher, signed-out pages (`AOFGateFrame`), `AOFLanguageSwitch`, notices (`AOFNoticeStage`), PWA cards, share card and the e2e and translation suites: ui, `package-layout.md` ("shared scaffold") and `testing.md`.
- The Vitest presets and `environmentSuite`: `packages/config/README.md`.

## Parity audit

What became of every file and library of the old Laura: `docs/superpowers/specs/2026-11-17-laura-parity-audit.md`, checked by `packages/config/local/tests/laura-parity-audit.test.ts`.

## History and gotchas

- 2026-11-19: the sidebar marked Play and Leaderboard both on `/memory/leaderboard`. Cause: `currentSubPage` took the first page whose path prefixes the address. Fix: ui's `currentSubPage` takes the longest match (`packages/ui/src/features/navigation/utils/sections.ts`).
