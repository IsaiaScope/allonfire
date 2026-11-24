# Laura parity audit

Every file and library of the old Laura, with what became of it in the rebuild
(`docs/superpowers/plans/2026-11-17-laura-p3-laura-shell.md`, Task 13; spec
`docs/superpowers/specs/2026-11-17-laura-rebuild-design.md`, "Parity rule"). Phase 7
verifies this table before the cutover.

## How to read it

- Paths are relative to `apps/laura/`. `*`, `**` and `{a,b}` are globs; square
  brackets are literal folder names (`[locale]`), never character classes.
- Fate is one of three words. `kept`: the path still exists (`kept (rewritten: what
  changed)` when the file now holds new content). `replaced`: the path is gone and a
  named piece or a later phase's file does its job. `deleted`: the path is gone and
  nothing takes its place.
- A `replaced` file that a later phase writes names that phase's file. No row says
  `pending`.
- The old list is `packages/config/local/tests/fixtures/old-laura-files.txt` (the 176
  files `git ls-files apps/laura` listed before the rebuild). The test
  `packages/config/local/tests/laura-parity-audit.test.ts` fails on a file with no
  row, a fate outside the three words, a `kept` path that is missing, a `replaced` or
  `deleted` path that still exists, and a library row that disagrees with
  `apps/laura/package.json`. Turbo's inputs leave Markdown out, so run it directly:
  `pnpm --filter @allonfire/config exec vitest run local/tests/laura-parity-audit.test.ts`.

## Files

| Old (path or glob) | Fate | Replaced by, or why |
|---|---|---|
| `package.json`, `tsconfig.json`, `postcss.config.mjs`, `next.config.ts`, `playwright.config.ts` | kept (rewritten: the Back Office's shapes over the shared pieces) | Tasks 1 and 3 of the shell plan; the old `--webpack`, `analyze`, `dev:tailscale`, `seed-photos`, body-size, rewrites and `images.remotePatterns` settings are gone |
| `README.md` | kept (rewritten: Task 14, through `/aof-documentation`) | the rebuilt App's own README |
| `.env.example` | kept (rewritten: owner-prefixed names) | `AUTH_APP`, `API_*`, `LAURA_URL`, `BACK_OFFICE_URL`, `TELEMETRY_*`; `BETTER_AUTH_*`, `DATABASE_URL`, `LAURA_VIEWER_*` and `MINIO_*` are dropped |
| `e2e/login.spec.ts` | replaced | `e2e/sign-in.spec.ts` over ui's `signInSuite` (Task 11) |
| `messages/*` | replaced | `src/features/i18n/translations/{en,it}.json` (Task 4); the old keys are not carried |
| `public/allonfire-laura.svg`, `public/allonfire-laura-horizontal.svg`, `public/laura-logo.png` | replaced | `LAURA_LOGO` through `aofLogoSvg`, the `logo/[file]` route and `icon.tsx` |
| `public/{apple-icon-180x180,favicon-16x16,favicon-32x32,icon-192x192,icon-512x512}.png` | replaced | `apple-icon.tsx` and the `manifest-icon/[icon]` route over core's `AOFIconImage` |
| `public/favicon.ico` | kept (rewritten: the flat square logo as ICO, Task 7) | the same path, new bytes |
| `public/memory-card-back-{dark,light}.png` | replaced | `OCEAN_CARD_BACK` in `@allonfire/design` (Phase 2), used by Phase 6 |
| `public/splash/*` | replaced | the `launch/[screen]` route over core's `AOFLaunchScreenRoute` |
| `scripts/*` | deleted | Images come from the Image module (Upload, Phase 5, and the Back Office); both scripts imported services that no longer exist |
| `src/env.ts` | replaced | `src/environment/environment.ts` (Task 3) |
| `src/proxy.ts` | kept (rewritten: `withSignInGate`) | the same path over the shared gate (Task 8) |
| `src/i18n/*` | replaced | `src/features/i18n/*` over core's `aofBaseRouting` (Task 4) |
| `src/types/css.d.ts` | deleted | Next's own types declare `*.css` |
| `src/lib/auth.ts`, `src/app/api/auth/[...all]/route.ts` | deleted | the API's Auth module is the only auth (ADR 0009, spec decision 2); sign-in actions come from `@allonfire/auth` |
| `src/lib/seo.ts` | replaced | `aofAppMetadata` in `src/shared/constants/page-information.ts` (Task 7) |
| `src/components/json-ld.tsx` | deleted | Laura is unindexed, structured data has no reader (spec decision 7) |
| `src/components/apple-splash-links.tsx` | replaced | `AOFLaunchScreenLinks()` through `aofAppMetadata({ startupImage })` |
| `src/app/sitemap.ts` | deleted | Laura is unindexed |
| `src/app/robots.ts` | kept (rewritten: `AOFRobots`) | the same path over core's `AOFRobots` |
| `src/app/icon.svg` | replaced | `src/app/icon.tsx` over `aofLogoSvg` |
| `src/app/opengraph-image.tsx`, `src/app/[locale]/global-error.tsx`, `src/app/not-found.tsx` | replaced | the shared share card in `[locale]/opengraph-image.tsx`; `src/app/global-error.tsx` outside `[locale]`; the localized 404 (`AOFWithLocalizedNotFound` in `next.config.ts`, `[locale]/not-found.tsx`) |
| `src/app/[locale]/manifest.ts` | replaced | `src/app/manifest.ts` over `aofManifest` |
| `src/app/[locale]/{layout,opengraph-image,twitter-image}.tsx` | kept (rewritten: `AOFLocaleDocument` binding and the shared share card through `aofAppImages`) | the same paths, thin bindings (Tasks 7 and 8) |
| `src/app/[locale]/{error,not-found}.tsx` | kept (rewritten: `AOFErrorNotice` and `AOFNotFoundNotice` bindings) | the same paths over ui's notices (Task 8) |
| `src/app/[locale]/{forbidden,unauthorized}.tsx` | deleted | no `authInterrupts`: a Role too low is sent Home by the proxy and the page, refused 403 by the API |
| `src/app/[locale]/(auth)/login/page.tsx` | replaced | `sign-in` and the three password pages (Task 9); the viewer quick-login is gone with Viewer |
| `src/app/globals.css` | kept (rewritten: Ocean's stylesheet, bound once) | the same path over the Ocean Design (Task 6) |
| `src/app/[locale]/(dashboard)/layout.tsx` | replaced | `(signed-in)/layout.tsx` over `AOFAppFrame` (Task 10) |
| `src/app/[locale]/(dashboard)/**/loading.tsx` | deleted | no `loading.tsx` under `[locale]`; each page ships its own skeleton (Phases 4 to 6) |
| `src/app/[locale]/(dashboard)/page.tsx`, `src/app/[locale]/(dashboard)/favorites/page.tsx` | replaced | Phase 4: the Gallery and Favorites pages (placeholders in Task 10) |
| `src/app/[locale]/(dashboard)/upload/page.tsx` | replaced | Phase 5: the Upload page, Admin only (placeholder in Task 10) |
| `src/app/[locale]/(dashboard)/games/page.tsx` | deleted | Memory is the only game; its page is `/memory` (Phase 6) |
| `src/app/[locale]/(dashboard)/games/memory/**` | replaced | Phase 6: `/memory` and `/memory/leaderboard` |
| `src/app/[locale]/(dashboard)/games/leaderboard/**`, `src/app/[locale]/(dashboard)/games/quiz/**` | deleted | Quiz is removed completely (spec); the leaderboard is Memory's (Phase 6) |
| `src/app/[locale]/(dashboard)/settings/**`, `src/features/settings/**` | deleted | language, theme and sign out live in the account menu (`AOFAccountMenu`, spec decision 6) |
| `src/actions/check-access.ts` | deleted | `requireApp(App.LAURA[, Role.ADMIN])` in the API; `signedInPage({ minRole })` and the proxy `gated` list in the App |
| `src/components/animated-page.tsx`, `src/components/motion-provider.tsx`, `src/lib/animation-variants.ts` | deleted | `framer-motion` is dropped; motion is CSS behind `motion-safe:` where the Design needs it |
| `src/components/user-role-provider.tsx` | deleted | the Role is read on the server from the Session (`AOFRoleGatedSection`, the account menu); there is no client Role context, and Viewer is gone |
| `src/lib/blur-placeholder.ts` | replaced | the API's `blurDataUrl` with `AOFStorageImage placeholder="blur"` (Phase 4) |
| `src/lib/convert-heic.ts` | replaced | `heicToJpeg` and `isHeic` in `@allonfire/ui/shared/utils/heic-to-jpeg` (`heic-to`; Phase 5) |
| `src/lib/file-validation.ts` | replaced | the Image module's `IMAGE.LIMIT.*` and ui's file field (Phase 5) |
| `src/features/gallery/**` | kept (rewritten: Phase 4) | Phase 4 `features/gallery`: private-cache hydration, `useInfiniteQuery`, an `optimisticMutation` favorite, `AOFStorageImage`; `use-heart-animation.ts` and its heart are not carried (a Favorite is a static mark for a User) |
| `src/features/games/**/quiz*`, `src/features/games/hooks/use-quiz-game.ts`, `src/features/games/components/game-hub.tsx` | deleted | Quiz is removed completely (spec); the hub listed games and Memory is the only one |
| `src/features/games/utils/format-time.ts` | replaced | the Phase 6 timer helper |
| `src/features/games/**` | replaced | Phase 6 `features/memory` (the Memory board, leaderboard and score actions) |
| `src/features/layout/hooks/use-auto-hide-navbar.ts` | deleted | a sidebar frame has no navbar to hide |
| `src/features/layout/**` | replaced | `AOFAppFrame`, `AOFSidebarSectionLink` and `AOFFrameBreadcrumb` in ui, bound in `src/features/navigation` (Task 10) |
| `src/features/upload/**` | replaced | Phase 5 `features/upload`: the shared dropzone and preview grid, all-or-nothing `POST /images` |
| `src/features/*/CLAUDE.md`, `src/features/*/README.md` | deleted | the old feature docs describe deleted code; later phases write their own |

## Libraries

| Old library | Fate | Replaced by, or why |
|---|---|---|
| `framer-motion` | deleted | motion is CSS (see `animated-page.tsx` above) |
| `lucide-react` | replaced | `@tabler/icons-react` |
| `react-hook-form` | replaced | `useAOFForm` (`@allonfire/ui/features/form/utils/form`) |
| `sonner` | replaced | `AOFToaster` and `useAOFToast` (ui); sonner stays inside ui |
| `heic2any` | replaced | `heic-to` through ui's `heic-to-jpeg` |
| `@t3-oss/env-nextjs` | kept | `createEnv`, as the Back Office |
| `better-auth`, `@better-auth/prisma-adapter` | deleted | auth runs in the API |
| `@allonfire/database` | kept | enums, `ACCESS` and fixtures only; no Prisma client or service import (Task 1's guard) |
| `@allonfire/storage` | kept | Phase 4: the Gallery reads the image server's constants (`IMAGE_SERVER`) through it |
| `@next/bundle-analyzer`, `sharp`, `tsx` | deleted | the Back Office has none; the scripts that needed `sharp` and `tsx` are gone |
| `next-themes`, `@tanstack/react-query` | kept | the Back Office's range; `@tanstack/react-query` is read first in Phase 4 |
