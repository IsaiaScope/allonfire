# Back Office special pages and page information

## Goal

The Back Office gets every Next.js special file and every piece of page
information a private admin tool needs, each visual one designed in the Japan
Design: the two not-found pages, the two error pages, a loading state, the
icons, the manifest, the link-preview images, the iOS launch screens and a
complete `<head>`. Today three of the pages are unstyled placeholders and the
rest are missing: a dotted bad URL shows Next's bare 404, the tab has no icon,
home shows nothing while the Session is checked, a pasted link has no
preview, the iPhone home-screen icon opens a blank white screen, and nothing
keeps the App out of search results.

Research behind the decisions (2026-10-08): the installed Next 16.3.6 docs
and source, the repo skills, and primary web sources (WebKit blog, Apple
TN3156, MDN browser-compat-data 8.1.5, web.dev, Chrome docs, ogp.me, Meta,
WhatsApp, Slack, LinkedIn, Google Search docs). Safari/iOS 27 shipped
2026-09-17 with no web-app changes, so the iOS 26 findings stand.

Revised 2026-10-13, after the wiring was built (the 404 mechanism, per-page
`openGraph`, explicit preview images, the logo); and for `dev` at v0.3.0: constants nest per owner (`HTTP`,
`I18N`, `ACCESS`), e2e runs a production build, deploys go through
`deploy.yml` and `docker-compose.prod.yml`.

## Scope

In:

- Pages: `[locale]/not-found.tsx`, `[locale]/error.tsx`, `global-error.tsx`,
  `[locale]/(signed-in)/loading.tsx`, and the designed 404 for every URL no
  language owns.
- Head: the root layout's `generateMetadata` and `viewport`, page titles.
- Files: `icon.tsx` (SVG), `apple-icon.tsx`, `public/favicon.ico`, `manifest.ts`,
  manifest PNG icons, `[locale]/opengraph-image.tsx`,
  `[locale]/twitter-image.tsx`, iOS launch screens, `robots.ts`.
- Headers: `X-Robots-Tag: noindex, nofollow`.
- App scaffolding in `@allonfire/core` that any App composes, indexed or not
  (see "Decisions: App scaffolding and Indexing").
- The Brand (the AOF monogram, its O lit by the flame) as an SVG string in
  `packages/design`.

Out, with the reason:

- `forbidden.tsx`, `unauthorized.tsx`: `requireAppSession` already redirects
  to Sign in, and Sign in already answers an account that cannot enter.
- `template`, `default`: no per-navigation animation, no parallel routes.
- A sitemap and `alternates` (canonical, hreflang, `x-default`) **in the
  Back Office**: it is unindexed, search engines never list a `noindex` page,
  and next-intl already sends hreflang as a `Link` header from the proxy. The
  core helpers for them ship, tested, for the first indexed App.
- Service worker, offline mode: not wanted, as in Laura.
- Manifest `screenshots`, `shortcuts`, `display_override`, `launch_handler`,
  `orientation`: with `display: "browser"` Chrome never installs the App and
  iOS ignores these members, so they would do nothing.
- `viewport-fit=cover` and safe-area padding: only needed with a translucent
  status bar, which this design does not use.
- `msapplication-*`, `browserconfig.xml`, `apple-touch-icon-precomposed`:
  dead tags.
- Dark or tinted iOS home-screen icons: the web has no way to supply them.

## Decisions: App scaffolding and Indexing

Every App will need this page information, and a future App may want search
engines to list it, so what does not depend on the App is **App scaffolding**
in `@allonfire/core` (ADR 0012), written for both Indexing values. The App
keeps its Brand label, text, colors and route files. Laura is paused and keeps
its own setup until it is rebuilt.

- **One object, `METADATA`.** Core's page-information constants nest in
  `METADATA` (`features/metadata/constants/metadata`): `INDEXING`, `ROBOTS`,
  `COLOR_SCHEME`, `OG_LOCALE`, `PATH` (where Next serves each metadata file)
  and `LAUNCH` (the iOS devices). The Back Office's own values nest in
  `BACK_OFFICE` (`src/shared/constants/back-office`): `NAME`, `COLOR`, `PATH`,
  `ICON`, `SHARE_IMAGE`. No path is a string literal outside them.
- **Indexing** (glossary): `METADATA.INDEXING` (`indexed`, `unindexed`) with
  `indexingSchema` and its inferred type, in core. `ACCESS.APP_SETTINGS` gains an
  `indexing` field, so an App declares it once beside `minRole` and
  `registration`; Laura and the Back Office are `unindexed`. The App passes
  `ACCESS.APP_SETTINGS[app].indexing` to both helpers below, so its metadata and its
  headers cannot disagree.
- **`AOFBaseMetadata({ indexing, appName, locale, locales })`**
  (`core/features/next/metadata/`) returns the App-agnostic part of the root
  layout's metadata:
  - `robots`: `noindex, nofollow` when unindexed, `index, follow` when
    indexed.
  - `formatDetection`, `appleWebApp.capable` and the Apple capable tag.
  - OG `type`, `url: "./"`, `locale` and `alternateLocale`, mapped from the
    next-intl locales.
  - `twitter.card`.

  The App spreads it and adds its own fields: `metadataBase`, `title`,
  `description`, `applicationName`, `siteName`, `appleWebApp.title`,
  `startupImage`.
- **`AOFCreateNextConfig(…, { indexing })`** adds `X-Robots-Tag:
  noindex, nofollow` to every path when unindexed, nothing when indexed.
  `HTTP.HEADER` gains `X_ROBOTS_TAG`, and `HTTP.CONTENT_TYPE` gains `PNG` and
  `SVG`.
- **Indexed-App helpers.** Pure functions, unit-tested on both branches; the
  Back Office uses only `AOFRobots`:
  - `AOFAlternates(pathname, routing)`: canonical, every language and
    `x-default`, under next-intl's as-needed prefixes.
  - `AOFRobots({ indexing, origin })`: `Allow: /`, plus a sitemap line when
    indexed. Never a `Disallow: /`, because that would hide the `noindex`
    and block preview bots.
  - `AOFSitemapEntries(paths, routing)`: each path in every locale, with its
    alternates.
- **Launch screens.** `METADATA.LAUNCH.DEVICES` (the device list) and
  `AOFLaunchScreenLinks()` (the `startupImage` entries) live in core,
  plus a route factory whose `generateStaticParams` and `GET` the App's route
  file re-exports. The App passes the render (its mark, colors) and nothing
  else.
- **The proxy matcher stays in each App**: Next requires `config.matcher` to
  be a literal, so it cannot be imported.

## Decisions: pages

- **The designed 404 for every URL, without `global-not-found`.** The first
  design used Next's `global-not-found`, on the belief that a dotted path
  (`/missing.png`), which the proxy skips, matches no route. It does match:
  the root layout sits under `[locale]`, which takes any first segment. Such
  a path reached the layout with a bogus locale, the request config called
  `notFound()` with no boundary above the root layout, and Next answered its
  bare error shell; `global-not-found` is only served for URLs that match
  nothing, so it never ran. Instead, core's `AOFWithLocalizedNotFound`
  (`features/next/config`) adds an `afterFiles` rewrite: a path whose first
  segment is not a language, and that no file, static route or kept dynamic
  route serves, is rendered under the default language, where the catch-all
  shows `[locale]/not-found.tsx` with a 404. The App lists the dynamic routes
  to keep (`METADATA.PATH.LAUNCH_SCREEN`, `BACK_OFFICE.PATH.MANIFEST_ICON`,
  the storage proxy). No experimental flag is needed.
- **A real 404 status.** A `loading.tsx` above a page wraps it in Suspense,
  so Next streams a 200 shell before `notFound()` runs. `loading.tsx` and
  home therefore live in a route group, `[locale]/(signed-in)/`, and the
  catch-all and Sign in sit outside it.
- **Shared status components.** The two error pages look the same, and the
  not-found page is one more notice in the same language, so each renders a
  presentational component from
  `apps/back-office/src/features/errors/components/`: `NotFoundNotice` and
  `ErrorNotice`. Text comes in as props; the components never import
  next-intl. The `[locale]` pages pass translations; `global-error` passes
  `SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common`, since no locale is known
  outside `[locale]`.
- **The global error page wears the theme.** `global-error.tsx` replaces the
  root layout, so it renders its own `<html>` and `<body>`, imports
  `./globals.css` and wraps its content in `AOFThemeProvider`, or it would
  always render light and unstyled.
- **Error digest.** `ErrorNotice` shows the error's `digest` small under the
  message when present, so a report can be matched to the server log.
- **Loading.** `[locale]/(signed-in)/loading.tsx` is the Suspense fallback while home
  checks the Session (`instant = false`, so nothing is prerendered there).

## Decisions: the `<head>`

Everything lives in the root `[locale]/layout.tsx`, except each page's
`title`, `description` and `openGraph`. Nested metadata merges shallowly: a page that sets
`openGraph` replaces the layout's whole `openGraph` (the bug Laura has on
every page). So the layout sets `openGraph` and `twitter` **without** title or
description, and Next fills `og:title`, `og:description` and `twitter:*` from
each page's own. Two things a page cannot inherit, both found by the e2e head
test:

- **`og:url`.** `"./"` resolves to the route Next renders (`/en/sign-in`), not
  the path next-intl serves without a prefix (`/sign-in`). Each page passes
  `openGraph: pageOpenGraph(path, locale)`, which spreads the layout's
  `openGraph` (from `baseMetadata(locale)`) and sets the public address.
- **The images.** A page's own `openGraph` would drop images that came from
  the file convention, so `AOFBaseMetadata` takes `shareImage` and names
  `og:image` and `twitter:image` explicitly, under the locale, with their alt
  and size.
 A page never sets `robots`, which would replace the
layout's `noindex` whole.

`generateMetadata` reads only translations (the locale comes from
`next/root-params`), never cookies or the Session, so it stays prerenderable
under Cache Components; on home (`instant = false`) it streams with the page,
and HTML-limited bots (Twitterbot, Slackbot, facebookexternalhit) get it
blocking in `<head>`.

| Field | Value | Why |
|---|---|---|
| `metadataBase` | `BACK_OFFICE_URL` | absolute URLs for every image and `og:url`; without it Next falls back to localhost in production |
| `title` | `{ default: t("title"), template: "%s · Back Office" }` | each page's tab and preview title; the template names the App once |
| `description` | translated | search snippet, WhatsApp and LinkedIn previews need it |
| `applicationName` | "Back Office" | `application-name` meta |
| `robots` | `{ index: false, follow: false }` | keeps the App out of search; plus the `X-Robots-Tag` header for non-HTML responses |
| `openGraph` | `type: "website"`, `siteName`, `locale` (`en_US` / `it_IT`), `alternateLocale` (the other one), `url: "./"` | WhatsApp needs `og:url`; `"./"` resolves against the current path |
| `twitter` | `{ card: "summary_large_image" }` | X falls back to OG for the rest |
| `appleWebApp` | `capable: true`, `title: "Back Office"`, `statusBarStyle: "default"`, `startupImage` (launch screens) | iOS web app, add-sheet name, splash |
| `other` | `google: "notranslate"` (kept), `apple-mobile-web-app-capable: "yes"` | Next 15+ emits only `mobile-web-app-capable` for `capable`; iOS launch screens need the Apple tag |
| `formatDetection` | `telephone: false, email: false, address: false` | iOS must not turn IDs and numbers into links |
| `viewport.themeColor` | light `--background`, dark `--background` (`media: prefers-color-scheme`) | installed web app chrome; Safari 26+ tints tabs from the page background instead |
| `viewport.colorScheme` | `"light dark"` | form controls and scrollbars follow the theme |

Page titles: Sign in "Sign in" (exists), home uses the default, not-found and
error set their own title. Every title and description is in `en.json` and
`it.json`.

`statusBarStyle` is `default`, not Laura's `black-translucent`: the
translucent bar keeps white text, unreadable in the light theme, and it is
buggy on iOS 26.1 and later (WebKit bugs 301994, 305546).

`BACK_OFFICE_URL` is the Back Office's own public address, server-only,
`z.url()`, in `src/environment/environment.ts`, named after its owner (never
`APP_`).

## Decisions: files and icons

- **Brand.** Laura's `src/app/icon.svg`, `public/allonfire-laura.svg`,
  `public/allonfire-laura-horizontal.svg` and `src/app/opengraph-image.tsx`
  carry the Brand, the AOF monogram (silver A, O, F) with the flame in the O,
  on a dark tile, plus a green "LAURA" banner.
  - **The Back Office's logo is built the same way** (the owner's
    instruction): the dark tile, the monogram, and a banner in its own color,
    the Japan Design's blue, carrying "BACK OFFICE". Never the bare monogram.
  - `packages/design/src/brand/aof-monogram.ts` exports `BRAND`: the
    monogram (markup, SVG, data URL), the dark ground and the logo's
    geometry, so every App lays its logo out alike. Strings, not `.svg`
    files, so an App can serve and embed them without a bundler loader; an
    asset, not a component, so ADR 0014 holds.
  - `backOfficeLogoSvg()` is the logo as SVG; `BackOfficeMark` draws the same
    logo for `ImageResponse` from Satori-safe markup, with the banner's text
    set in the loaded TTF (Satori's SVG renderer draws `<text>` without
    fonts) and the monogram as a CSS background.
  - Every PNG (apple icon, manifest icons, preview images, launch screens)
    renders that one logo.
- **Favicon.**
  - `app/icon.tsx` answers the Back Office's logo as SVG
    (`backOfficeLogoSvg()`), sharp at any size. Safari 26 and every current
    browser read SVG favicons.
  - `public/favicon.ico` (32x32) is served for whatever asks for
    `/favicon.ico` directly, and no `<link>` points at it. Next's
    `app/favicon.ico` convention would emit `sizes="any"`, which makes Chrome
    pick the ICO over the SVG.
  - Next cannot generate an ICO, so the icon round writes it once from the
    mark.
- **Apple touch icon.** `app/apple-icon.tsx`, 180x180 PNG, opaque background
  and about 20px padding: iOS fills transparency with black, and it prefers
  this icon over the manifest's.
- **Manifest icons.** 192 and 512 PNG with `purpose: "any"` and a 512
  `maskable` PNG (mark inside the 409px safe circle), generated from the mark
  by a route handler with `generateStaticParams`, so they are built at build
  time.
- **Manifest** (`app/manifest.ts`; only discovered at the `app/` root, which
  is why Laura's `[locale]/manifest.ts` is never linked):
  - `id`, `start_url` and `scope` all `"/"`.
  - `name` and `short_name` "Back Office", plus `description`.
  - `display: "browser"`, `lang: "en"`, `dir: "ltr"`.
  - `theme_color` and `background_color` from the light `--background`.
  - The icons above.
  - Add `color_scheme_dark` (dark theme and background colors) only if Next's
    `MetadataRoute.Manifest` type accepts it. It is in the W3C spec since
    April 2026 but not shipped in any browser yet.
- **Open Graph and X images.** `[locale]/opengraph-image.tsx` and
  `[locale]/twitter-image.tsx`, 1200x630 PNG under 300 KB (WhatsApp's limit
  is 600 KB), the same card from one function, each built once per language
  (`generateStaticParams`). They are Route Handlers, where
  `next/root-params` is not available, so they read `params.locale` and
  translate with next-intl's `createTranslator` over the imported JSON
  (`metadataText`), not `getTranslations`. The head names them through
  `shareImage`, alt included. No branding in the title text (Apple TN3156).
- **Theme colors in code.** Manifest, `themeColor` and the generated images
  cannot read CSS variables, so `BACK_OFFICE.COLOR` holds the Japan hex
  values they need, keyed by `METADATA.COLOR_SCHEME`. A test reads `theme.css` and fails if any
  of them drifts from its `--background` / `--primary` source.
- **Fonts in generated images.** `ImageResponse` (Satori) reads TTF, OTF or
  WOFF, not WOFF2, and the Japan fonts ship as WOFF2. Static 400 and 700
  TTFs of Atkinson Hyperlegible Next (OFL) sit beside the WOFF2;
  `loadJapanImageFonts` reads them under `"use cache"`, which Cache
  Components requires of a file read in a route rendered on demand.

## Decisions: iOS home-screen web app

- **Window.** Manifest `display: "browser"` with `appleWebApp.capable`, as in
  Laura:
  - Android: Chrome's Add to Home screen makes a shortcut that opens a
    normal tab.
  - iOS 26 and later: Add to Home Screen opens the App in its own window by
    default (the "Open as Web App" toggle, on unless the user turns it off),
    whatever `display` says.
- **Launch screens.**
  - iOS never builds a splash from the manifest, so without startup images
    the App opens on a blank screen.
  - `METADATA.LAUNCH.DEVICES` in core lists every current iPhone and iPad size:
    CSS width, height and pixel ratio, from iPhone SE to the 17 and 18
    families, iPhone Air and the M4/M5 iPads (2026-10-08, sources in the
    file).
  - That one list drives both `appleWebApp.startupImage` (each link with its
    `(device-width) and (device-height) and (-webkit-device-pixel-ratio) and
    (orientation)` media, via `AOFLaunchScreenLinks`) and the Back Office's
    `app/launch/[screen]/route.tsx`, which re-exports core's route factory
    and renders each screen as a PNG at build time
    (`generateStaticParams`).
  - Portrait and landscape, light and dark (`and (prefers-color-scheme:
    dark)`): about 80 images. None of them is committed; Laura commits 32 by
    hand.
  - The URL ends in `.png`, so it skips the proxy.
  - iOS keeps the screen it picked at install, so a theme change after
    installing shows the old one until the App is re-added.

## Decisions: proxy and placement

Generated metadata URLs without a dot (`/apple-icon`,
`/opengraph-image-<hash>`, `/en/twitter-image-<hash>`) would pass through the
proxy: next-intl would rewrite them under a locale and the catch-all would
404 them, and `withSessionRefresh` would run for a bot. The proxy matcher
excludes them, as Next's metadata docs advise: each name is anchored to a
whole path segment (`(?:[a-z]{2}/)?(?:apple-icon|icon|opengraph-image|twitter-image)(?:-[\\w]+)?$`
inside the negative lookahead), so a future route such as `/icons` still
reaches the proxy. A unit test runs the matcher against the expected
included and excluded paths. Files whose URL has a dot (`manifest.webmanifest`,
`favicon.ico`, `launch/*.png`, manifest icon PNGs) already skip it and sit at
the `app/` root or `public/`. The two preview images live in `[locale]/` so
their text follows the locale.

## Design rounds

Each round runs `/aof-design craft` in direct mode on the App file, takes one
screenshot round in light and dark at phone and desktop width, then stops for
the owner's approval before the next starts.

1. `[locale]/not-found.tsx` with `NotFoundNotice`: sets the look every later
   status page reuses.
2. Dropped: there is no global not-found page (see "Decisions: pages").
3. `[locale]/error.tsx` with `ErrorNotice`, digest included.
4. `global-error.tsx`: reuses `ErrorNotice`; checks it matches round 3.
5. `[locale]/loading.tsx`.
6. The logo, built like Laura's with the Back Office's banner, then the `icon`
   (light and dark), `apple-icon`, the manifest icons and `favicon.ico`.
7. Link-preview card: `opengraph-image` and `twitter-image`, localized.
8. iOS launch screens, light and dark.

## Testing

- `NotFoundNotice`, `ErrorNotice`: component tests (text from props, digest
  shown only when present, retry calls back).
- `BACK_OFFICE.COLOR` matches `theme.css`.
- Core: `AOFBaseMetadata` on both Indexing values; `AOFCreateNextConfig`
  sends `X-Robots-Tag` only when unindexed; `AOFAlternates`, `AOFRobots`,
  `AOFSitemapEntries` on both values and with the as-needed prefix;
  `AOFLaunchScreenLinks` yields one portrait and one landscape link per
  scheme for every `METADATA.LAUNCH.DEVICES` entry, and the route factory's static
  params cover every link.
- `ACCESS.APP_SETTINGS`: a row without `indexing` fails `check-types`
  (`satisfies AppSettingsTable`).
- The Back Office proxy matcher: a unit test runs it against the paths it
  must and must not match.
- Environment test covers `BACK_OFFICE_URL`.
- Playwright (`e2e/head.spec.ts`, on the production build
  `aofPlaywrightConfig` serves at `LOCAL.URL.BACK_OFFICE_E2E`, four browser
  projects):
  - `/no-such-file.png`, `/zz/deep/no-such-file.png` and `/api/no-such-route`
    show the designed "Page not found" with status 404; so does an unknown
    page in a language.
  - `/manifest.webmanifest`, `/icon`, `/favicon.ico`, `/apple-icon`, a
    launch PNG, `/opengraph-image` and `/it/opengraph-image` all answer 200
    with an image or JSON type.
  - Home's head has `noindex`, `og:url`, `og:locale`, two `theme-color`
    metas, `apple-mobile-web-app-capable` and the title template applied on
    Sign in.
  - The response carries `X-Robots-Tag`.
- New text-on-surface pairs go into the Japan Design's `theme.test.ts`.
- `next-devtools` `get_page_metadata` checks the resolved head in dev.

## Watch out

- `BACK_OFFICE_URL` is read at build (prerendered pages and images bake
  `metadataBase` in) and at runtime (home renders per request), so it must
  have the same value in both, all set before the deploy that ships this:
  - a `docker/Dockerfile` build arg, fed by `deploy.yml` from the secret
    `PROD_BACK_OFFICE_URL`;
  - the CI `build` job's env (secret `BACK_OFFICE_URL` in the `dev`
    environment);
  - the `back-office` service's runtime env in `docker-compose.prod.yml`
    (Dokploy);
  - the e2e stack, where `playwright.config.ts` sets it to
    `LOCAL.URL.BACK_OFFICE_E2E`.
- A new dynamic route whose URL does not start with a language (another
  generated file folder) must be added to `AOFWithLocalizedNotFound`'s `keep`
  in `next.config.ts`, or the rewrite sends it to the 404.
- A new page sets `openGraph: pageOpenGraph(path, locale)`, or its `og:url`
  carries the `/en` prefix.
- iOS 18 and earlier opening a `display: "browser"` App in Safari is
  accepted: iOS 26+ is the target.
- Three things are unconfirmed and need a real device:
  - iOS 26/27 opens a `display: "browser"` App in its own window.
  - iOS 18 and earlier honour the Apple tag over `display: "browser"`
    (probably not: they likely open Safari).
  - Dark launch screens match.
- `og:url: "./"` resolving to the current path is checked by the e2e head
  test; if Next does not resolve it, pages set `openGraph.url` by spreading
  the shared base.
