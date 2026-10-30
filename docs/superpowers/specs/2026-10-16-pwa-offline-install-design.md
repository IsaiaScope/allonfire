# PWA: offline, loading and install hint (design)

## Intent

Every AllOnFire App behaves like a well-made Progressive Web App without
becoming a standalone one:

- **Installation**: the manifest, icons and launch screens stay valid, and a
  dismissible hint tells people how to add the App to their home screen,
  dock or desktop, on every platform that offers it.
- **Loading**: repeat visits load Next's static files (JS, CSS, fonts) from
  the browser, not the network.
- **Errors**: a page loaded with no network shows the App's own localized
  "no connection" page instead of the browser's; a navigation or Server
  Action that fails mid-session waits and retries, with a banner saying so.

Out of scope, decided by the owner: `display` stays `"browser"` (no own
window, so Chrome never fires `beforeinstallprompt` and the hint is text
only); no push notifications (iOS allows Web Push only for a standalone Home
Screen app); no offline copies of pages or data (a back office must never
show stale or another person's data).

Everything is shared: core and ui hold the pieces, an App wires them in a
few lines. The Back Office is the first App to wear them; a later page with
no sign-in gate gets them too, since they live in the locale layout.

## Libraries

Workbox (Google): `workbox-build` (about 9.6M downloads a week) generates the
service worker at build; `workbox-window` (about 9.6M) registers it and
handles updates. Serwist was considered: `@serwist/next` is a webpack plugin
and `@serwist/turbopack` is under the 200k a week rule. A hand-written worker
was the fallback; Workbox brings a tested precache with revisions and update
handling instead.

## Pieces

### Core: one PWA feature (`@allonfire/core/features/next/pwa/`)

Every PWA behaviour lives in this one feature; it renders nothing a visitor
sees. A future App imports from here and mounts ui's two components.

- **`build-service-worker.ts`** and its CLI (`cli.ts`, core's `pwa:build`
  script, run by the App's `build` after `next build`): calls
  `workbox-build`'s `generateSW` with the Workbox runtime inlined, writing
  one file, `public/sw.js` (gitignored), then prepends
  `self.AOF_PWA = { defaultLanguage }` to it. The languages are the Host's
  (`I18N.BASE_LANGUAGES`, `I18N.DEFAULT_LANGUAGE` first); an App with its
  own passes `--languages`. The build id comes from `.next/BUILD_ID`. The
  generated worker:
  - **precaches** every file under `.next/static` (served at
    `/_next/static/`), and the Offline page of every language at
    `/<lang>/offline` (`/en/offline`, `/it/offline`), the build id as its
    revision. The App's proxy skips `/<lang>/offline`, so the precache never
    meets a language redirect (next-intl would send `/en/offline` to
    `/offline`, or follow the browser's language);
  - **page loads** (`request.mode === "navigate"`): network only; on failure
    the `offlineFallback` plugin (`handlerDidError`) answers with the
    precached Offline page of the URL's first segment when it is cached,
    else the default language's. The plugin reads nothing from its closure
    (Workbox copies its source into the worker): the default language comes
    from `self.AOF_PWA`;
  - **nothing else** is routed: RSC payloads, the API, auth, images and the
    proxy's rewrites go to the network untouched;
  - `skipWaiting` off, `clientsClaim` on, `cleanupOutdatedCaches` on: a new
    build's worker takes over on the next visit, never mid-session.
- **`aof-service-worker.tsx`** (`"use client"`): registers `/sw.js` through
  `workbox-window`, production only (a worker in `next dev` caches HMR
  assets); renders nothing, like core's providers.
- **`install-platform.ts`**: `installPlatform(userAgent, standalone)`, a pure
  function naming whose steps apply:
  - iOS and iPadOS Safari: Share, then Add to Home Screen;
  - Android Chrome: menu, then Add to Home screen;
  - desktop Chrome: menu, then Cast, save and share, then Create shortcut;
    Edge: Apps, then Install this site as an app;
  - macOS Safari: File, then Add to Dock;
  - anything else (Firefox desktop, in-app browsers), or a page opened from
    the home screen (`display-mode: standalone`, which iOS 26 uses): none.
- **`use-install-hint.ts`** (`"use client"`): `useInstallHint()` returns
  `{ platform, dismiss }`, `platform` null on the server, before mount, when
  none applies or within a year of a dismissal (its date kept in
  `localStorage`, wrapped in try/catch: a private window forgets it, the
  hint still works). Deciding after mount means no hydration mismatch.
- **Config**: `features/next/config/aof-create-next-config.ts` turns on
  `experimental.useOffline` and sends `Cache-Control: no-cache` and the
  JavaScript content type on `/sw.js` (Next's PWA guide). `/sw.js` is a
  file in `public/`, so the localized-404 rewrite (after files) never meets
  it, and the proxy skips it (it has a dot).
- **Translations** (`features/next/i18n/translations/{en,it}.json`):
  `Common.Offline` (the banner and the Offline page) and `Common.Install`
  (the hint, one step line per platform), so every App has them.

### UI (`@allonfire/ui`): only what shows

- **`components/aof-offline-banner.tsx`** (`"use client"`): reads
  `useOffline()` from `next/offline`; while offline, a small `role="status"`
  bar says the connection is gone and the App carries on when it is back.
  No button: Next retries on its own the moment the network returns.
- **`components/aof-install-hint.tsx`** (`"use client"`): draws core's
  `useInstallHint()`: the steps for its platform and a dismiss button
  (`AOFButton`); nothing when `platform` is null.
- Both are drawn with the theme's tokens and take `className`, so an App
  dresses them in its Design. The Back Office's look comes from
  `/aof-design` (one build, one screenshot round), in the Japan Design's
  furniture. Neither ever covers a form or the language and theme capsule;
  the starting point is the banner as a thin LED strip across the top while
  offline, the hint as a small card above the capsule.
- `packages/design` gains no component (ADR 0022): only the brush subset's
  new glyphs.

### Back Office

- **`app/[locale]/offline/page.tsx`**: a static `StationNotice` (signage for
  "no connection", a Retry button that reloads the address that failed,
  since the worker serves this page there; a small client leaf, its JS
  precached with the rest), prerendered per language, outside the sign-in
  gate (the gate lists signed-in pages only) and with `pageOpenGraph` like
  every page.
- **`src/proxy.ts`**: the matcher also skips `/<lang>/offline`.
- **`app/[locale]/layout.tsx`**: mounts `AOFServiceWorker`,
  `AOFOfflineBanner` and `AOFInstallHint`, passing the translations.
- **`package.json`**: `build` runs core's PWA CLI after `next build`
  (the `._*` cleanup stays first); Docker's `turbo build` runs it.
- **`.gitignore`**: the generated `public/sw.js`.
- **`features/errors/constants`**: the offline signage beside
  `ERROR_SIGNAGE`: stamp figure 断 (cut), stamp kana 不通 (line cut), and
  圏外 (out of range, what a phone shows with no signal) brushed across the
  wall. The brush subset (`fonts/README.md`) gains 圏外 (the stamp prints in the system face).

Laura is left out until its rebuild onto core and ui. ADR 0023 records the
browser display, the missing push and the Workbox choice.

## Testing

- Unit: `installPlatform` per user agent and display mode; `useInstallHint`'s
  one-year window and a throwing `localStorage`; the build config
  `generateSW` receives (precache globs, offline entries per language, the
  navigate route); the plugin's fallback choice per URL; the Next config's
  `useOffline` and `/sw.js` headers; the kept routes.
- Browser (Vitest, Chromium and WebKit): the hint shows, dismisses and stays
  dismissed, renders nothing when standalone; the banner shows only while
  offline.
- e2e (production build, every project):
  - `/sw.js` answers with `no-cache`, and registers;
  - with the worker active, `context.setOffline(true)` then a reload of
    `/it/sign-in` shows the Italian offline page, of `/sign-in` the English;
  - a static file is served from the precache while offline;
  - a soft navigation while offline shows the banner and completes after
    `setOffline(false)`.

## Docs

CLAUDE.md's page-information paragraph gains the PWA line (the worker, the
build step, the offline page, the hint); CONTEXT.md carries **Offline page**
and **Install hint**; the core and ui
READMEs list the new exports.

## Revision after the first build (owner's review)

- **No standalone, from the hint either.** iOS 26 opens a Home Screen site
  as a web app unless Open as Web App is turned off; Edge's Install this
  site as an app and macOS Safari's Add to Dock always open their own
  window. The hint keeps iOS (with the toggle turned off as its last step),
  Android Chrome and desktop Chrome (Create shortcut, Open as window left
  unchecked), and drops Edge and macOS Safari.
- **The look is the App's.** ui's `AOFInstallHint`, `AOFOfflineBanner` and
  `AOFPwa` are gone. Core's `AOFPwa` takes the App's `hint` and `banner`;
  the Back Office draws them in the Japan Design
  (`features/pwa/components/`): the hint a ticket card (night band with
  the line colour and the App's name, numbered steps with the browser's
  icons) docked at the bottom on a phone and in the corner on desktop; the
  banner a red toast centred at the top: 圏外 in red, a no-connection
  icon, "No connection" over "Waiting for the network".
- **Never on a first visit** (web.dev's install patterns): core remembers
  a first load and shows the hint from the next one.
- **Storage through core.** `storageItem(key, schema, area?)`
  (`shared/utils/storage`) keeps each value as JSON typed by its zod
  schema and never throws; the hint's dismissal and first visit use it.

## Second revision: standalone, with an Install button (ADR 0025)

The owner chose standalone display over keeping the browser: the manifest
says `display: "standalone"`. Chrome, Edge and Android then fire
`beforeinstallprompt`, which core holds from page load
(`install-prompt.ts`); the hint shows an Install button that opens the
browser's dialog, "Installing…" until `appinstalled`, an error line when
the dialog fails, and a refusal counts as a dismissal. iPhone keeps two
steps (Share, Add to Home Screen) and macOS Safari one (File, Add to Dock).
The first revision's "no standalone" steps are gone.

## Third revision: toasts (owner's walkthrough)

The Install hint and the offline notice are toasts, through shadcn's Sonner
(`npx shadcn add sonner`), wrapped in ui as `AOFToaster`, sent with `useAOFToast`. The
layout mounts one `AOFToaster`; the App's `InstallHint` and `OfflineBanner`
send one toast each (`PWA.TOAST` ids, updated in place, never swiped away)
and render nothing. The hint is a night card: 導入 in the line's green and
"Install Back Office" on the first row with a green Install button when the
card has room, the button on a full-width row of its own on a phone, a
failed install on its own line under the words, the iPhone steps numbered
below with their icons in the ✕'s column. The offline notice is the LED
pill at the top. Both send through ui's `useAOFToast`, a frame late:
Sonner's toaster listens from an effect, so a toast sent while the page
still hydrates is lost. The e2e for the offline toast submits the sign-in
form offline, since Next goes offline only when one of its own requests
fails. The Back Office's stylesheet widens Sonner's toaster to
28rem above 600px, so the hint's one-row layout fits.
