# Laura

Laura (`apps/laura`, `@allonfire/laura`) is the couple's private photo gallery and Memory game: a Next App built on the same shared scaffold as the Back Office (ADR 0033) and wearing the Ocean Design. It reads the API only (no Prisma client, no service import) and signs in through the API's Auth module. Its description, in both languages' `Metadata`, is "Our private place, just for the two of us."

## Sections and routes

The Sections are `SECTION` in `src/features/navigation/constants/sections.ts`, as in the Back Office (`SECTION.LIST` is their explicit list, in menu order, that the sidebar, the proxy's sign-in gate and `sections.test.ts` all read), built from Laura's page paths in `src/shared/constants/laura-base.ts` (`LAURA_BASE.PAGE`); `LAURA` (`src/shared/constants/laura.ts`) is the App's descriptor and holds `LAURA.PAGE` and `LAURA.sections` (`SECTION.LIST`). `LAURA.entries` is `APP.ENTRY` (`@allonfire/design/apps/app`), the one definition of how each App is drawn that the Back Office reads too; the API's own `LAURA` (`@allonfire/api/features/laura/constants/laura`) is another object, imported as `API_LAURA` where both are needed:

- `/` Gallery (Home), `/favorites`, `/memory` (Play) and `/memory/leaderboard` (Memory's second page, in its sub-menu), `/upload` (Admin only).
- Every page but Memory is built: the Gallery and Favorites are Phase 4's (below), Upload Phase 5's (below); Phase 6 builds Memory and its leaderboard. Each phase replaces the page body and adds that page's skeleton and height test with its data; `generateMetadata`, `signedInPage(...)` and the `minRole` option stay (plan: `docs/superpowers/plans/2026-11-17-laura-p3-laura-shell.md`, "Page data checklist").

## The frame and Ocean

- The signed-in frame is `(signed-in)/layout.tsx` over ui's `AOFAppFrame` with `variant="floating"` and `collapsible="icon"` (ADR 0033); the account menu holds language, theme and sign out, and the App switcher lists the Back Office for a Back Office Admin. Back Office specifics are in `back-office.md`; the frame, signed-in pages and special pages are in `next-apps.md`.
- Laura's Ocean dressing is bound once, in thin files, to the shared pieces through slots: `features/auth/components/dressing.tsx` (the sign-in pages), `features/errors/components` and `features/pwa/components` (notices and PWA cards), and `shared/components` (with `action-dressing.tsx`); the Section row's look is `sectionRow` in `features/navigation/utils/section-row.ts`. A `constants/` folder holds constants only. The Design itself is `packages/design/src/designs/ocean` and `src/apps/laura` (`design-system.md`).

- Laura's mascot is a pool of emoji art (`OCEAN_ART`, `OCEAN_MASCOT_POOL`: `packages/design/src/designs/ocean/mascot-art.ts`, licences in `SOURCES.md`), never a drawing. `src/shared/constants/mascots.ts` (`MASCOT`) assigns one picture to each moment (gate, error, 404, offline, loading, toasts, Install card) and the server component `OceanArt` draws it; the frame's breadcrumb wears one beside each crumb, fixed: the favourite (`MASCOT.APP`) for the App, then `MASCOT.CRUMB` by `Navigation` label for each Section and page (`crumbArt`), never one whose fill all but vanishes on the light ground (the Noto jellyfish, lighthouse, shark, whale, the Fluent wave).

## Favorites

- The Laura Admins edit one list, `laura."Favorite"`; each Laura User also holds their own copy of it, `laura."ProfileFavorite"`, under their Profile (`laura."Profile"`, ADR 0034). Marking or clearing writes the master and every existing Profile's copy in one transaction; a User's Profile is made, with the copies, the first time they read the Gallery or the Favorites. Users cannot change their copies yet.
- The pieces: `profile.service`, `favorite.service` and `gallery.service` (`packages/database/src/features/apps/laura`), the routes in `apps/api/src/features/laura` (`GET /v1/laura/gallery`, `GET /v1/laura/favorites`, Admin-only `PUT` and `DELETE /v1/laura/favorites/:imageId`). The Gallery's `favorite` flag and the Favorites page read the caller's own copies.

## Gallery and Favorites

- One feed component draws both lists: `GalleryFeed` (`features/gallery/components`) over `useGalleryFeed`, the grid of `PhotoTile`s, the preview (`PhotoPreview` over ui's `AOFLightbox`) and the next page asked for by `AOFInfiniteSentinel` and a compact "Show more photos" button. The data follows `next-apps.md`: the first page in the private cache (`galleryHydration`, `favoritesHydration`, tag `GALLERY.CACHE.TAG`), later pages by `useInfiniteQuery` with a keyset cursor.
- Changes are `favoriteMutation` and `removePhotoMutation` (`utils/gallery-mutations.ts`) over core's `optimisticMutation`: the feeds are patched first, a feed the patch made exact is not read again (`keeps`), and a burst of heart taps is one write (`useAOFQuietToggle`).
- The heart is `FavoriteControl`: for an Admin a button in the theme's blue (coral once marked), for a User a static mark. Remove sits in the preview's capsule behind `OceanAlert` (`shared/components`), the Ocean dressing of ui's `AOFAlertDialog`; Remove deletes the photo from Laura for everyone, and from the system when no other App holds it.
- A small action, like the load-more button, is `COMPACT_ACTION` (`shared/components/action-dressing.tsx`), the Back Office's compact button in the Ocean dressing.
- Spec and plans: `docs/superpowers/plans/2026-11-17-laura-p4-gallery-favorites.md`.

## Memory game

- `/memory` plays, `/memory/leaderboard` ranks. The deck is drawn by the browser (`deckQuery`, one key per round), the leaderboard is hydrated from the private cache (`leaderboardHydration`, tag `GAMES.CACHE.TAG`) and read again after a score (`submitMemoryScore` clears the tag, `submitScoreMutation` runs `invalidateStatic` on `QUERY.GAMES.LEADERBOARD`).
- The pieces: `memory-score.service`, `MEMORY_RULE` and `isPlausibleScore` (`packages/database/src/features/apps/laura`), the routes in `apps/api/src/features/laura/games`, `useMemoryGame` (the state machine), `MemoryBoard` and its skeleton, `LeaderboardView` (`apps/laura/src/features/games`).
- The end of a game is `GameCompleteDialog` over `OceanDialog` (the delete alert's dressing, with no corner close button): the time and moves as `BoardStat` badges (`labelled`), what saving earned as a grid of badges (`GameResult`), a link to the leaderboard under them, and every failure or refusal in one `AOFFormAlert` inside the dialog, never a toast. Try again is a compact themed button in the band's far end (`OceanDialog`'s `end`), only when saving failed; Close and Play again are the footer, a column on a phone and one line from `sm`, as the alert's; while the score is saving, Play again is the status (a spinner and "Saving the game", busy and disabled; a screen reader hears it in the results region). The leaderboard link is underlined and flush with the badges' left edge.
- A time is `m:ss.cc` everywhere (core's `formatTime`: hundredths cut down, never rounded up). The board's clock is `GameClock` over `useElapsed`, read every `GAMES.MEMORY.DELAY.CLOCK_MS` (10 ms; a pair rests `GAMES.MEMORY.DELAY.HOLD_MS` face up) in its own leaf, so a tick redraws the time and never the cards; the score's time is the game's own, in ms.
- The leaderboard lists the top ten (`LAURA.GAMES.LIMIT.LEADERBOARD_TOP`; the caller's own place is in their tiles, past ten too). `LeaderboardView` is: two columns of `LeaderboardStats` tiles (the caller's, everyone's; colour emoji and Tabler icons), a "Top 10" heading, `LeaderboardPodium` (the first three, second left, first middle, third right, with the Noto gold, silver and bronze medals and trophies: `PODIUM` in `utils/podium.ts`, its sizes in `leaderboard-podium-styles.ts`; a picture of the table, hidden from a screen reader, its height fixed so the skeleton matches) and the table of everyone, whose first three ranks wear the medals (`RankBadge`); each player's email is shown under their name, to every Member (Laura is private; the API sends it, `schemas.ts`). The podium's shape comes from Trophy UI (MIT, `ui.trophy.so`), rewritten with Ocean's tokens; the survey is `docs/superpowers/specs/2026-11-25-laura-leaderboard-library-survey.md`.
- **Adding a game**: a typed `<Game>Score` table under `LauraProfile` (one changeset, its CHECKs and indexes), `<game>-score.service.ts`, routes under `/v1/laura/games/<game>/`, its own leaderboard query and its own Section page; never a shared score table with a `gameType` or a JSON score (ADR 0034).
- Plan: `docs/superpowers/plans/2026-11-17-laura-p6-memory-game.md`.

## Roles and the Upload gate

- Laura admits two Roles, Admin and User, and no Viewer (ADR 0032): its floor in `ACCESS.APP_SETTINGS[App.LAURA]` is User. A User browses and plays; an Admin also adds Images.
- Upload's `minRole` is read in four places that must agree: the proxy sends a User Home (`withSignInGate({ sections })`), the page does the same (`signedInPage(Page, { minRole: Role.ADMIN })`), the sidebar hides the row (`AOFRoleGatedSection`), and the API refuses with 403 (`requireApp(App.LAURA, Role.ADMIN)`, a route from Phase 5). Pinned by `upload-gate.test.ts`, `sections.test.ts` and `e2e/upload-gate.spec.ts`.

## Upload

- `/upload` is Admin only (Section `minRole`, API `authoriseUpload`). Its form is ui's `AOFAddImages` (`features/image/upload`), bound in `features/upload`: `Upload` and `UploadSkeleton` over `UPLOAD_DRESSING` (the dropzone as picker, the Ocean action buttons), the `addImage` action and, after a saved add, `invalidateGallery`.
- Every Laura upload is private, with no Access to choose, and goes to Laura only: the form has no Access or Apps, and `addImage` forces both server side (`images.md` says why). A saved add updates `GALLERY.CACHE.TAG` and reads the Gallery and Favorites again in the browser, then opens Home (`LAURA.PAGE.GALLERY`, with its slash: `AUTH.PAGE.HOME` is empty and `replace("")` stays on the page).
- `next.config.ts` wraps in `withImageUploads`; the ingress must let a body that size through (`deployment.md`).

## Auth

- No registration (`registration: null`): an Admin adds Users in the Back Office (`back-office.md`).
- One Session across the Apps: on the parent domain in Production (`AUTH_COOKIE_DOMAIN`), on `localhost` Locally. Sign-in actions and the proxy wrappers are `@allonfire/auth` (`packages/auth/README.md`).

## Environment and ports

- Names are in `apps/laura/.env.example` and `src/environment/environment.ts` (`API_*`, `AUTH_*`, `LAURA_URL`, `TELEMETRY_*`); Laura reads only its own address, at build and at runtime, and never `BACK_OFFICE_URL` (`deployment.md`).
- Ports are `LOCAL.PORT` in `packages/config/local/addresses.ts`: 3200 Local, 3210 e2e, 3220 preview (`pnpm --filter @allonfire/laura preview`).

## Language

- Laura speaks the Base languages and routes them like the Back Office (`aofBaseRouting`, as-needed): English has no prefix, Italian is `/it/...`. Which one a visitor sees at an unprefixed address is the cookie, then the browser, then English (`next-apps.md`, "an App routes `I18N.BASE_LANGUAGES`").
- Laura has no Italian default on purpose. An Italian phone already opens `/it/...`, and the language switch is remembered by the cookie, so closing and reopening the installed app keeps the last choice. Forcing Italian (a default for Laura, or `/it` as the manifest's `start_url`) was planned and dropped on 2026-11-25: the first needs the ten shared ui pieces to read the App's navigation, the second undoes a switch to English at every cold start (`next-apps.md` has the reasons).
- Stored content falls back to English (`I18N.DEFAULT_LANGUAGE`): an image with no Italian alt text shows its English one, and every alt has English.

## Where each shared piece lives

- The scaffold (providers, request config, page information, manifest, proxy matcher suite): core, `packages/core/README.md`.
- The session pieces (`requireAppSession`, `withSignInGate`, `hasSectionRole`): auth, `packages/auth/README.md`.
- The frame, account, switcher, signed-out pages (`AOFGateFrame`), `AOFLanguageSwitch`, notices (`AOFNoticeStage`), PWA cards, share card and the e2e and translation suites: ui, `package-layout.md` ("shared scaffold") and `testing.md`.
- The Vitest presets and `environmentSuite`: `packages/config/README.md`.

## Parity audit

What became of every file and library of the old Laura: `docs/superpowers/specs/2026-11-17-laura-parity-audit.md`, checked by `packages/config/local/tests/laura-parity-audit.test.ts`.

## History and gotchas

- 2026-11-19: the sidebar marked Play and Leaderboard both on `/memory/leaderboard`. Cause: `currentSubPage` took the first page whose path prefixes the address. Fix: ui's `currentSubPage` takes the longest match (`packages/ui/src/features/navigation/utils/sections.ts`).
