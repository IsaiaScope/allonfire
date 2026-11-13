# Next.js Apps

Rules for every Next App (Back Office now, Laura once rebuilt). Back Office specifics: `back-office.md`.

## Server-Side Rendering First

Default to Server Components. Only add `"use client"` when the component actually needs:

- React hooks (`useState`, `useEffect`, `useTransition`, `useForm`, etc.)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `localStorage`, `navigator`)
- Third-party client libraries (`useTheme`, `usePathname`, context providers)

**Do not** add `"use client"` to pure presentational components that just receive props and render JSX — they work as Server Components with zero client JS cost.

**Pragmatic rule**: if making something server-side requires significantly more complexity (extra data-fetching layers, prop-drilling through many levels, splitting one simple component into server/client pairs), just use `"use client"`. Simplicity wins over purity.

### Patterns

- Fetch data in Server Components (pages, layouts), pass as props to client components
- Use Server Actions for mutations — keep form logic in client components but action definitions server-side
- Use `initialData` pattern with TanStack Query: server-fetch in page, hydrate in client component
- A failed query or mutation is told in one place: an App mounts ui's `AOFQueryProvider` (`features/query/components/aof-query-provider`: core's `AOFQueryClientProvider` with `aofErrorCaches`, `features/next/query/utils/aof-query-errors`, telling through `aofToast`). A mutation always toasts; a query only when refreshing what is on screen fails, since a first load shows its own error state (a table's). `meta: aofErrorMeta(t("…"))` gives the toast its own words, `aofErrorMeta(false)` silences it where the component shows the error; the default words are core's `Common.Request.failed`. Never an `aofToast` in a query's or mutation's own `onError`. A mutation's options live in its feature's `utils/<feature>-mutations.ts`, apart from `<feature>-queries.ts`, which the server reads too
- Providers must be client: an App composes the AOF providers from `@allonfire/core/features/next/providers/*` one by one in its `[locale]/layout.tsx` (ADR 0012), never a single all-in-one `Providers` component

## The data checklist (every page that reads or writes the API)

A plan that adds or changes a page of any Next App (Back Office now, Laura once rebuilt) that reads or writes through the API names, task by task, each of these; a plan missing one is not ready (ADR 0028, ADR 0020):

1. **Reads go through TanStack Query, hydrated from the private cache.** The page reads and dehydrates in one `"use cache: private"` function (`xHydration`, `cacheTag`/`cacheLife` from the feature's `CACHE`, `stale` never under 5 minutes); the client view reads it back with `useQuery(xQuery(api))` under a `QUERY.X` key, `staleTime: "static"`. Never a `fetch` in a component, never a read keyed on the Session in a shared `"use cache"`.
2. **Every change refreshes both copies.** A server action calls the API then `updateTag(X.CACHE.TAG)` (the server's copy); the client mutation then `invalidateQueries` on the `QUERY.X` keys (this browser's). A read-only page names what moves its numbers and which action clears them.
3. **Resource protection, twice.** The page gates itself (the Back Office's `signedInPage`; another App's own equivalent) and the API route gates itself (`guard` with a Host-decided `canX`, 401 without a Session, 403 without the Role; writes also ask the Session fresh): the page check is a convenience, the API is the judge. A refusal shows as a toast, never a pre-check.
4. **Resource changed.** A save carries the Version the form opened on (`versionOf`, `versionSchema`); the API answers an older one 409 `ERROR.CODE.RESOURCE_CHANGED` (`checkVersion` under the row lock) and the form shows `Common.Request.changed`. A read-only page says so in its plan: it has no save, so its staleness is the cache's `stale` and its refresh is the action or a reload.
5. **Lost and gone.** A resource deleted elsewhere answers 404 and the view shows its gone state, never a blank.
6. **A skeleton, kept in step with its page.** A page that waits (for its Session, for its data) shows a skeleton drawn at the loaded page's own sizes, never the Section's generic waiting room (`SectionLoading` is only for a page with none yet): the words that never change stand as they are, every control and value is a bar (`Bar`, `ink` from `shared/utils/skeleton-ink`), and the wrapper is `FormSkeleton` for a form or `ListSkeleton` for a list (busy, a status line for a screen reader, its parts hidden from it). A class list the page and its skeleton share is one `cva` both read (`sharedSet` for the Add Images card). A skeleton is kept in step automatically, by a browser test, never by memory: next to the skeleton's component a test renders the real page and the skeleton inside the Section's `@container` at a wide and at a phone width and asserts the heights are equal (`image-skeletons.browser.test.tsx`, `services-skeleton.browser.test.tsx`; a list's checks its column count against the real table). Change a page's layout and its test turns red until its skeleton follows, in the same change; a new page that waits ships its skeleton, its test and its `Suspense fallback` (and, for a resource page, `ResourceView`'s `loading`) with it. A plan names the skeleton and its test.

## Reading and changing data (the private cache)

- a read from the API that needs the visitor's Session is kept in their browser only (ADR 0028): `"use cache: private"` with auth's `readSessionCookie` read inside (`usersHydration`, `userHydration` in `features/users/utils`), never a `"use cache"` keyed on the Session (cache keys are stored in plain text). `cacheTag` and `cacheLife` come from the feature's `CACHE`: the list and one User both under `USERS.CACHE.TAG`, since every change to a User changes the list too; the rows hold Avatar links signed for an hour, so `{ stale: 300, revalidate: 1800, expire: 3600 }`, and `stale` stays at least 5 minutes so a prefetch carries the read (under 30 seconds it drops out of prefetching). Every change is a server action that calls the API, then `updateTag(USERS.CACHE.TAG)` in the same request (`addUser`, `editUser`, `deleteUsers`), which clears this browser's copies at once; another Admin's browser can lag by `stale`. A page that hands TanStack its first data reads and dehydrates in one private cache (`usersHydration`): TanStack stamps `Date.now()`, and a time read outside a cache keeps the page's data out of every prefetch. A TanStack mutation calls the action, and the action answers a refusal as a value, never a throw, whose message production hides
- `stale` never under 5 minutes, and `staleTime: "static"` on the client query: under 5 minutes Next takes the read for uncached data outside any boundary, so a soft navigation to the page logs "uncached data during prerendering" and blocks; a numeric `staleTime` makes TanStack read the time while the page prerenders, and a time read there blocks a soft navigation too. A read is asked again only by an action (`updateTag`, `invalidateQueries`), never on a clock; another Admin's change shows after `stale`, on a reload or a navigation, not live.
- **A page of one resource** (an Image's or a User's edit page) is read like a list: the page hydrates it (`imageHydration(id)`, `userHydration(id)`, under `QUERY.X.ONE(id)` and the list's tag) and the client editor (`ImageEditor`, `UserEditor`) reads it back with `useQuery(imageQuery(api, id))`, drawn by `ResourceView` (`shared/components`): the form once there is data, the loading screen while it is read, the Section's 404 (`notFound()`, from `isGone`: a 404 from the API) for an unknown or deleted id, and the error notice with a retry for any other refusal. The query is `staleTime: "static"`, so it is asked again only by an action, never on a clock, a focus or a reconnect: the form saves on the Version it opened with, and a newer one read meanwhile would let a save overwrite a change the form never showed. A read that fails after the form was drawn (this very page deleted it) leaves the form as it is.
- **Clear by data, not by page.** Every write that moves numbers a page shows clears every layer that holds them: the API's own cache (a module's `changed` dep, e.g. `ImageDeps`/`UserDeps` dropping the bucket listing), the server action's `updateTag` on each tag the numbers sit under, and the mutation's `invalidateQueries` on each `QUERY` key. A new action that changes bytes in the bucket clears the storage layers too (`STORAGE.CACHE.TAG`, `QUERY.STORAGE.ALL`), whichever page it lives on.
- A card that reads the API on a page (a Home overview) is hydrated through core's `AOFHydratedBoundary` (`features/next/query/components`: the read never throws past it, a refusal is left to the view) and drawn by ui's `AOFQueryView` (`features/query/components`: its data, the host's `forbidden` for a 403, the host's `failed` with a retry, the skeleton). A 403 and a failed first read each draw a card of the loaded card's own size, so no state moves the page, and neither toasts. A skeleton holds the loaded card's exact height (a chart's `barChartHeight`, not a guess).
- a page left is hidden in React's `<Activity>`, not unmounted, and keeps its state: a form that adds something is wrapped in ui's `AOFFreshOnReturn` (`features/query/components/aof-fresh-on-return`), which remounts it when its page is hidden, so it opens empty every visit (no password kept in a hidden page); a filter or a draft worth keeping is left alone

## Signed-in and signed-out pages

- a signed-in page is `export default signedInPage(Page)` (`features/navigation/utils/signed-in-page`): `withAppSession(Page, <SectionLoading />)` from `@allonfire/auth/features/next/components/with-app-session`, Next's auth-with-Cache-Components pattern. The Session check (`requireAppSession`) runs beside the page behind its own `<Suspense fallback={null}>`, so a page with no request-time data of its own is in the static shell and paints at once; a visitor the App keeps out is redirected at request time and may see that static frame first, never its data: the API checks every request itself. The check is `use cache: private` (the browser keeps a passed one for `AUTH.SESSION.PAGE_CHECK_STALE_S`, 30 minutes; a redirect is never kept). The page itself sits in its own `<Suspense>` (the loading screen as its fallback) for its request-time data: a route group's `loading.tsx` sits above where sibling pages diverge, so a soft navigation between them would block. Its `generateMetadata` stays static (translations and `pageOpenGraph`, never cookies, headers or fetched data); a route param is the one exception (`users/[id]` reads its id for its `og:url`): the Session check already waits for the request, so Next streams that metadata with the page
- Sign in and Forgot password send someone the App already lets in Home: the proxy's `withSignInGate` asks the API (the real Session check, `entersApp`) on a visit to either that carries a Session cookie and answers 307 to Home before any HTML; never the cookie alone, since a cookie the API refuses would bounce between Home and Sign in. Reset password always renders, since its link may be for another account than the one signed in. A signed-out visit asks nothing
- no `loading.tsx` under `[locale]`: above the catch-all it turns every 404 into a 200

## Page information, 404s and special pages

Page information (the `<head>`, icons, link previews, iOS launch screens) comes from `@allonfire/core/features/next/metadata/*` and core's `METADATA` (`features/metadata/constants/metadata`: Indexing, the metadata paths, the icon sizes, the logo variants, the iOS launch devices). An App's Indexing lives in `ACCESS.APP_SETTINGS`; its own values in one object (`BACK_OFFICE`, `src/shared/constants/back-office`). Per App:

- the layout spreads `baseMetadata(locale)`; a page's `generateMetadata` is `pageMetadata(path, "Its.title.key")` (`features/metadata/utils`, over core's `AOFPageMetadata`): its title, read by its translation's full key, and `openGraph: pageOpenGraph(path, locale)`. A page needing more (`description`) spreads it; never `openGraph` or `robots` by hand: Next replaces them whole, and `"./"` as `og:url` resolves to `/en/...`, not the public path
- a URL no language owns (one with a dot, `/api/...`) gets the localized 404 through `AOFWithLocalizedNotFound` in `next.config.ts`; core's own routes (launch screens, manifest icons, logos) are kept already; any other dynamic route outside `[locale]` goes in its `keep` list. A path is matched case-sensitively, so `/IT/x.png` gets the 404 too. There is no `global-not-found`: under a top-level `[locale]` every URL matches a route. A 404's HTML, in dev and production alike, is Next's empty `__next_error__` shell (status 404, `noindex`): with Cache Components a `notFound()` at request time comes before any shell, and the browser renders `not-found.tsx` from the RSC payload. Expected; a test reading the raw HTML finds no title
- the proxy matcher skips Next's generated metadata routes that carry no dot (`icon`, `apple-icon`, `opengraph-image`, `twitter-image`, with a language prefix or a suffix, whole segment only); a new one goes in the matcher and `proxy.test.ts`, or next-intl rewrites it under a language and it 404s (`src/proxy.ts`). (`docs/superpowers/specs/2026-10-08-back-office-special-pages-design.md`)
- `global-error.tsx` replaces the root layout: it renders its own `<html>` and `<body>`, imports `./globals.css` and wraps its content in `AOFThemeProvider`, or it renders light and unstyled. (`docs/superpowers/specs/2026-10-08-back-office-special-pages-design.md`)
- the favicon is `public/favicon.ico`, never `app/favicon.ico`: Next marks that one `sizes="any"` and Chrome picks it over the SVG `icon.tsx`. (`docs/superpowers/specs/2026-10-08-back-office-special-pages-design.md`)

## Brand, icons, viewport and the PWA

- the logo is the Brand's (`@allonfire/design/brand/aof-logo`), given `BACK_OFFICE.LOGO` (name, banner, face). As SVG it is `aofLogoSvg`: the favicon in `auto`, `/logo/<layout>-<scheme>.svg` through core's `AOFLogoRoute` for a file other sites link to, and `aofLogoDataUrl` for a page's own logo (`AOFImage` with a data URL: painted with the HTML, no request of its own). In an `ImageResponse` it is ui's `AOFBrandLogo` (`features/image/components/aof-brand-logo`)
- icons go through core's `AOFIconImage` and `AOFManifestIconRoute`; launch screens through `AOFLaunchScreenRoute`, where the App says only how its mark looks per color scheme (ground, mark, fonts)
- the preview card is ui's `AOFShareCard` dressed in the Japan Design's `JAPAN_SHARE_CARD` (`designs/japan/share-card-look`: colours, image face, tactile edge), with `BACK_OFFICE.LINE` as its band
- fonts for generated images come from `imageFonts()` (`features/metadata/utils/image-fonts`): `loadJapanImageFonts` under `"use cache"` and `cacheLife("max")`. A shorter life re-renders every prerendered image when it runs out
- the viewport is core's `AOFBaseViewport({ schemeColors })` (`features/next/metadata/utils/aof-base-viewport`: both colour schemes, a theme colour per scheme from the App's ground, and `viewport-fit=cover`, without which iOS reports every safe-area inset as 0); nothing is drawn under a notch, a rounded corner or the home indicator: see the safe-area rule in `design-system.md`
- the PWA comes from core's `features/next/pwa` (ADR 0023): the App's `build` runs `pwa:build` after `next build`, writing `public/sw.js` (gitignored, a turbo build output; Workbox: Next's static files and each language's Offline page precached, page loads network only with the Offline page as fallback, nothing else cached); the layout wraps its pages in core's `AOFPwa` (`enabled` in production only), handing it the App's own `hint` and `banner`, which send toasts drawn in its Design through ui's `AOFToaster` (shadcn's Sonner, mounted once in the layout; ids in `PWA.TOAST`), sent from a client component with `useAOFToast(id, content | null, options)` (`@allonfire/ui/shared/hooks/use-aof-toast`: a frame late, since a toast sent before the toaster hydrates is lost, and dismissing only what it sent) (`features/pwa/components/install-hint` and `offline-banner`: the hint a toast at the bottom, from `useInstallHint`: an Install button opening the browser's dialog (`beforeinstallprompt`, held by core from page load) where offered, else iPhone's or macOS Safari's steps, never on a first visit; the offline notice a red toast centred at the top; the manifest is `display: "standalone"` (ADR 0025); the banner shown while `useOffline`), and it registers the worker; an e2e test Playwright drives in Chromium only takes `E2E.TAG.CHROMIUM_ONLY` (`@allonfire/config/tests/e2e/run`); the Offline page is `[locale]/offline`, which the proxy skips at `/<lang>/offline` so the precache meets no redirect
- a new build's service worker takes over on the next visit, never mid-session: `/sw.js` is served `Cache-Control: no-cache`, with `skipWaiting: false` and `clientsClaim: true` (core's `features/next/pwa/utils/build-service-worker`). (`docs/superpowers/specs/2026-10-16-pwa-offline-install-design.md`)

## Environment

- the App's server reaches the API at the server-only `API_URL` (in Production the internal Docker address); the browser keeps `NEXT_PUBLIC_API_URL` (`src/environment/environment.ts`). (`docs/superpowers/specs/2026-10-21-back-office-users-list-design.md`)

## Instrumentation and server logs

Every Next App has a `src/instrumentation.ts` (Next looks for it in the App)
that only exports core's `register` and `onRequestError`
(`features/next/instrumentation/instrumentation`), imported and re-bound, since
an `export … from` trips Biome's `noBarrelFile`. The OpenTelemetry packages are
core's dependencies, not the App's. On the Node runtime only, `register`
imports core's `instrumentation.node.ts`, which
starts the OpenTelemetry NodeSDK (Next's own spans and the server's log
lines, to `TELEMETRY_ENDPOINT`) and does nothing without an endpoint.
`onRequestError` logs every error the server catches answering a request
(page, route, action, proxy) with its path and route type. Server code logs
through core's `serverLogger()` (`features/next/logger/server-logger`): one
lazy pino logger built from core's `telemetryEnv`
(`environment/telemetry-environment`), which the App's env `extends`. It
writes JSON lines to stdout and, when `TELEMETRY_ENDPOINT` is set, emits each
line in the process to the OpenTelemetry logs API under
`TELEMETRY_SERVICE_NAME`, which the SDK's log processor exports with the
line's trace. Never a pino worker transport (OTLP or pretty): pino's worker
loads its target by name at runtime, which a Next build does not trace. Every
`TELEMETRY_*` is optional, so `next build`, Local and tests run with none set
and ship nothing.

## Pointers

- robots.txt is core's `AOFRobots` (`Allow: /`, plus a sitemap line when indexed), never `Disallow: /`, which would hide an unindexed App's `noindex` from search engines and block link-preview bots: `packages/core/src/features/next/metadata/utils/aof-indexed.ts`. (`docs/superpowers/specs/2026-10-08-back-office-special-pages-design.md`)
- The App scaffolding (providers, i18n, PWA, the Next config), export by export: `packages/core/README.md`.
- A Next App's side of auth (sign-in and sign-out actions, the Session, the proxy wrappers): `packages/auth/README.md`.
