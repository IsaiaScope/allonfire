# Back Office Special Pages and Page Information Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Back Office every Next.js special page and a complete, correct `<head>` (metadata, icons, manifest, link previews, iOS web app and launch screens), each visual piece designed in the Japan Design, on App scaffolding any App, indexed or not, can reuse.

**Architecture:** App-agnostic pieces (Indexing, base metadata, the `X-Robots-Tag` header, alternates/robots/sitemap helpers, the iOS launch-screen list, links and route) become App scaffolding in `@allonfire/core`, with their constants in one `METADATA` object. `ACCESS.APP_SETTINGS` gains `indexing`. The Brand monogram becomes an SVG string in `@allonfire/design`. The Back Office composes them in its root layout and in metadata route files, with its own values in one `BACK_OFFICE` object. Wiring lands first on placeholder visuals with tests, then eight `/aof-design` rounds replace the placeholders one at a time, each stopping for the owner's approval.

**Tech Stack:** Next.js 16.3.6 App Router (`cacheComponents`, `typedRoutes`), next-intl 4.14 (as-needed prefix), `next/og` `ImageResponse` (Satori), zod 4, Vitest 4 (globals), Playwright (production build through `aofPlaywrightConfig`), Biome (Ultracite), oxlint.

**Spec:** `docs/superpowers/specs/2026-10-08-back-office-special-pages-design.md`

**Revised 2026-10-13** against `dev` at `b8db894` (v0.3.0): nested constants (`HTTP.*`, `I18N.*`, `ACCESS.*`), e2e on a production build at `LOCAL.URL.BACK_OFFICE_E2E`, deploys through `deploy.yml` and `docker-compose.prod.yml`.

## Global Constraints

- Constants nest in one `as const` object per owner; the first word says where a value comes from. A new constant is a new key in its owner's object, never a new top-level export: core's are `METADATA.*` (core carries no owner name), the Back Office's are `BACK_OFFICE.*`. zod schemas stay standalone exports derived from the object.
- A path is never a string literal, tests included: `METADATA.PATH.*`, `BACK_OFFICE.PATH.*`, `AUTH.PAGE.SIGN_IN`. Local addresses come from `@allonfire/config/local/addresses` (`LOCAL.URL.*`). The one exception is `proxy.ts`'s `config.matcher`, which Next requires to be a literal; its test builds every case from the constants.
- A constant's name never carries its value. Tests read text from the translation JSON, never retyped.
- Never `Object.keys/values/entries/fromEntries`: use `objectKeys`, `objectValues`, `objectEntries`, `objectFromEntries` from `@allonfire/core/shared/utils/object`.
- Never `JSON.parse/stringify` directly: `@allonfire/core/shared/utils/json`.
- A constant's type comes from zod: `export const xSchema = z.enum(X)`, `export type X = z.infer<typeof xSchema>`. Lookup tables are `as const satisfies Record<K, V>`.
- No `as` casts; narrow, parse or `satisfies`.
- Package export keys mirror the file path without `src/` and the extension, one line per file.
- Every test file's first line is `// @module-tag unit` (or `integration`); Vitest runs with globals (no `from "vitest"`).
- Env var names start with their owner: `BACK_OFFICE_URL`, never `APP_*`.
- Server Components by default; `"use client"` only for hooks, handlers, browser APIs.
- Every page frames itself with `AOFPage`; classes join with `cn`; visual states are `cva` variants.
- Both themes, WCAG 2.0 AA; new text-on-surface pairs go into `packages/design/src/designs/japan/tests/theme.test.ts`.
- New strings go into `apps/back-office/src/features/i18n/translations/{en,it}.json` (or core's shared `Common` when a global page reads them); run `pnpm i18n:check`.
- Every page design goes through `/aof-design`, never plain `/impeccable`; browser checks through `/iso-browser`, attached to an open window.
- No commits from the executor: the owner commits with `/iso-commit`. Each task ends with a checkpoint instead. The pre-commit hook runs Biome, oxlint, `check-types`, unit, browser and e2e tests, so every checkpoint must leave those green.
- Never add `biome-ignore`; fix the code. A deprecated API fails oxlint; fix the use.
- The repo is on exFAT: any new directory-scanning tool ignores `**/._*`.

## Review Focus

1. **Generated metadata URLs reaching the proxy** (the icon, the apple icon, the preview images with or without a locale): a bot fetching them must get the image, not a 404 from the catch-all or a locale redirect. Pinned by the matcher test in Task 8 and the e2e image checks in Tasks 12 and 13.
2. **A page that sets `openGraph` or `robots`** silently drops the layout's `siteName`, locale or `noindex` (shallow merge). Pinned by the e2e head test in Task 10, which checks `og:site_name`, `og:locale` and `robots` on Sign in, a page with its own `title`.
3. **`og:url: "./"` not resolving** to the current page: WhatsApp would show the wrong link. Pinned by the e2e head test in Task 10 (`og:url` equals `${LOCAL.URL.BACK_OFFICE_E2E}${AUTH.PAGE.SIGN_IN}`).
4. **Landscape launch screens never matching**: iOS keeps `device-width` the portrait width in landscape, so a media query that swaps width and height (Laura's) never matches. Pinned by the `AOFLaunchScreenLinks` test in Task 5.
5. **The global pages rendering unstyled or always light**, because they replace the root layout: pinned by the e2e check in Task 11 that an unmatched URL has the Japan Design's background color; round 2 checks dark by screenshot.

---

## File Structure

**Core (`packages/core`)**
- Create `src/features/metadata/constants/metadata.ts`: `METADATA` (`INDEXING`, `ROBOTS`, `COLOR_SCHEME`, `OG_LOCALE`, `PATH`, `LAUNCH`), `indexingSchema`, `colorSchemeSchema`, `launchOrientationSchema` and their types.
- Modify `src/features/http/constants/http.ts`: `HTTP.HEADER.X_ROBOTS_TAG`, `HTTP.CONTENT_TYPE.PNG`, `HTTP.CONTENT_TYPE.SVG`.
- Modify `src/features/next/config/aof-create-next-config.ts`: `indexing` option.
- Create `src/features/next/metadata/aof-base-metadata.ts`: `AOFBaseMetadata`.
- Create `src/features/next/metadata/aof-indexed.ts`: `localizedPath`, `AOFAlternates`, `AOFRobots`, `AOFSitemapEntries`.
- Create `src/features/next/metadata/launch-screens.ts`: `launchScreenVariants`, `launchScreenFile`, `AOFLaunchScreenLinks`.
- Create `src/features/next/metadata/aof-launch-screen-route.ts`: `AOFLaunchScreenRoute`.
- Tests under `src/features/next/metadata/tests/`.
- Modify `src/features/next/i18n/translations/{en,it}.json`: `Common.Error.reference`, `Common.Loading.label`.

**Database (`packages/database`)**
- Modify `src/features/auth/access/constants/app-settings.ts` (the type), `constants/access.ts` (the rows) and `tests/app-settings.test.ts`.

**Config (`packages/config`)**
- Modify `local/tests/local-files.test.ts`: the Back Office `.env.example` holds `BACK_OFFICE_URL`.

**Design (`packages/design`)**
- Create `src/brand/aof-monogram.ts`: `BRAND` (`MONOGRAM_SVG`, `MONOGRAM_DATA_URL`).
- Create `src/designs/japan/image-fonts.ts`: `loadJapanImageFonts`.
- Add `src/designs/japan/fonts/atkinson-hyperlegible-next-{400,700}.ttf`.

**Back Office (`apps/back-office`)**
- Create `src/shared/constants/back-office.ts`: `BACK_OFFICE` (`NAME`, `COLOR`, `PATH`, `ICON`, `SHARE_IMAGE`); `src/shared/utils/page-title.ts`: `pageTitle`.
- Modify `src/environment/environment.ts` (+ test), `.env.example`, `next.config.ts`, `playwright.config.ts`, `src/proxy.ts` (+ `src/proxy.test.ts`).
- Create `src/features/errors/components/{not-found-notice,error-notice}.tsx` (+ tests).
- Create `src/features/metadata/components/{back-office-mark,icon-ground,share-card,launch-screen}.tsx` (+ tests), `src/features/metadata/utils/share-image.tsx`, `src/shared/constants/tests/back-office.test.ts`.
- Modify `src/app/[locale]/layout.tsx`, `not-found.tsx`, `error.tsx`, `src/app/global-error.tsx`.
- Create `src/app/global-not-found.tsx`, `src/app/[locale]/loading.tsx`, `src/app/robots.ts`, `src/app/manifest.ts`, `src/app/icon.tsx`, `src/app/apple-icon.tsx`, `src/app/manifest-icon/[icon]/route.tsx`, `src/app/launch/[screen]/route.tsx`, `src/app/[locale]/opengraph-image.tsx`, `src/app/[locale]/twitter-image.tsx`, `public/favicon.ico`.
- Create `e2e/head.spec.ts` (the new checks; `smoke.spec.ts` and `sign-in.spec.ts` stay as they are).

**Repo**
- Modify `docker/Dockerfile`, `docker/docker-compose.prod.yml`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `CLAUDE.md`.

---

## Phase 1: Core scaffolding

### Task 1: `METADATA`, the header and the Next config option

**Files:**
- Create: `packages/core/src/features/metadata/constants/metadata.ts`
- Modify: `packages/core/src/features/http/constants/http.ts` (`CONTENT_TYPES`, `HEADER`)
- Modify: `packages/core/src/features/next/config/aof-create-next-config.ts`
- Modify: `packages/core/package.json` (exports)
- Test: `packages/core/src/features/next/config/tests/aof-create-next-config.test.ts`

**Interfaces:**
- Produces, from `@allonfire/core/features/metadata/constants/metadata`:
  - `METADATA.INDEXING.{INDEXED,UNINDEXED}`, `indexingSchema`, `type Indexing`
  - `METADATA.ROBOTS.NOINDEX` (the directive an unindexed App sends)
  - `METADATA.COLOR_SCHEME.{LIGHT,DARK}`, `colorSchemeSchema`, `type ColorScheme`
  - `METADATA.OG_LOCALE` (`en` to `en_US`, `it` to `it_IT`)
  - `METADATA.PATH.{APPLE_ICON,FAVICON,ICON,LAUNCH_SCREEN,MANIFEST,OPENGRAPH_IMAGE,ROBOTS,SITEMAP,TWITTER_IMAGE}`
  - `METADATA.LAUNCH.{DEVICES,ORIENTATION}`, `launchOrientationSchema`, `type LaunchOrientation`, `type LaunchDevice = { width: number; height: number; ratio: 2 | 3 }`
- Produces: `HTTP.HEADER.X_ROBOTS_TAG`, `HTTP.CONTENT_TYPE.PNG`, `HTTP.CONTENT_TYPE.SVG`; `AOFCreateNextConfig(config, { indexing?: Indexing })`, which defaults to `METADATA.INDEXING.UNINDEXED`.

- [x] **Step 1: Write the failing tests.** In `aof-create-next-config.test.ts`, add the import `import { METADATA } from "../../../metadata/constants/metadata";` and a file-local helper above `describe`:

```ts
const UNINDEXED_HEADERS = [
  ...HTTP.SECURITY_HEADERS,
  { key: HTTP.HEADER.X_ROBOTS_TAG, value: METADATA.ROBOTS.NOINDEX },
];
```

Append to the `describe`:

```ts
  it("keeps an unindexed App out of search on every path, by default", async () => {
    const headers = await AOFCreateNextConfig().headers?.();
    expect(headers?.[0]).toEqual({ headers: UNINDEXED_HEADERS, source: "/(.*)" });
  });

  it("sends no X-Robots-Tag for an indexed App", async () => {
    const headers = await AOFCreateNextConfig(
      {},
      { indexing: METADATA.INDEXING.INDEXED }
    ).headers?.();
    expect(headers?.[0]).toEqual({
      headers: HTTP.SECURITY_HEADERS,
      source: "/(.*)",
    });
  });
```

In the existing test "sends the security headers first and the App's after, so the App's win", change the first expected entry to `{ headers: UNINDEXED_HEADERS, source: "/(.*)" }`.

- [x] **Step 2: Run to verify they fail**

Run: `pnpm --filter @allonfire/core test -- src/features/next/config`
Expected: FAIL, `Cannot find module '../../../metadata/constants/metadata'`.

- [x] **Step 3: Implement `metadata.ts`**

```ts
import { z } from "zod";
import type { ContentLanguage } from "../../i18n/constants/locales";

/**
 * Whether search engines may list an App's pages (CONTEXT.md, Indexing).
 * Unindexed Apps still give link previews: only search listing is refused.
 */
const INDEXING = {
  INDEXED: "indexed",
  UNINDEXED: "unindexed",
} as const;

export const indexingSchema = z.enum(INDEXING);
export type Indexing = z.infer<typeof indexingSchema>;

/** The OS themes `prefers-color-scheme` reports; generated images come in both. */
const COLOR_SCHEME = { DARK: "dark", LIGHT: "light" } as const;

export const colorSchemeSchema = z.enum(COLOR_SCHEME);
export type ColorScheme = z.infer<typeof colorSchemeSchema>;

const LAUNCH_ORIENTATION = {
  LANDSCAPE: "landscape",
  PORTRAIT: "portrait",
} as const;

export const launchOrientationSchema = z.enum(LAUNCH_ORIENTATION);
export type LaunchOrientation = z.infer<typeof launchOrientationSchema>;

/** A device's screen in CSS pixels, portrait, and its pixel ratio. */
export type LaunchDevice = { width: number; height: number; ratio: 2 | 3 };

/**
 * Every iPhone and iPad on iOS/iPadOS 26-27, one entry per CSS size and
 * ratio (checked 2026-10-08: useyourloaf.com iPhone 17 and iPad 2024 sizes,
 * iPhone 18 Pro from its announcement). Add a size when Apple ships one;
 * the launch screens and their links follow.
 */
const LAUNCH_DEVICES = [
  // iPhone
  { height: 956, ratio: 3, width: 440 }, // 16/17 Pro Max
  { height: 932, ratio: 3, width: 430 }, // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  { height: 926, ratio: 3, width: 428 }, // 12/13 Pro Max, 14 Plus
  { height: 912, ratio: 3, width: 420 }, // Air
  { height: 896, ratio: 3, width: 414 }, // 11 Pro Max
  { height: 896, ratio: 2, width: 414 }, // 11
  { height: 874, ratio: 3, width: 402 }, // 16 Pro, 17, 17 Pro, 18 Pro
  { height: 852, ratio: 3, width: 393 }, // 14 Pro, 15, 15 Pro, 16
  { height: 844, ratio: 3, width: 390 }, // 12, 13, 14, 16e, 17e
  { height: 812, ratio: 3, width: 375 }, // 11 Pro, 12 mini, 13 mini
  { height: 667, ratio: 2, width: 375 }, // SE 2nd/3rd gen
  // iPad
  { height: 1376, ratio: 2, width: 1032 }, // Pro 13" M4/M5
  { height: 1366, ratio: 2, width: 1024 }, // Air 13", Pro 12.9"
  { height: 1210, ratio: 2, width: 834 }, // Pro 11" M4/M5
  { height: 1194, ratio: 2, width: 834 }, // Pro 11" gen 1-4
  { height: 1180, ratio: 2, width: 820 }, // Air 4/5, Air 11", iPad 10th/A16
  { height: 1112, ratio: 2, width: 834 }, // Air 3, Pro 10.5"
  { height: 1080, ratio: 2, width: 810 }, // iPad 8th/9th
  { height: 1133, ratio: 2, width: 744 }, // mini 6/A17 Pro
  { height: 1024, ratio: 2, width: 768 }, // mini 5
] as const satisfies readonly LaunchDevice[];

/** Open Graph wants `language_TERRITORY`; each language's main region. */
const OG_LOCALE = {
  en: "en_US",
  it: "it_IT",
} as const satisfies Record<ContentLanguage, string>;

/**
 * Where Next serves each metadata file, the same in every App. The proxy
 * matcher of each App skips them (a literal there; its test reads these).
 */
const PATH = {
  APPLE_ICON: "/apple-icon",
  FAVICON: "/favicon.ico",
  ICON: "/icon",
  /** The folder of an App's iOS launch screens, one PNG per device and scheme. */
  LAUNCH_SCREEN: "/launch",
  MANIFEST: "/manifest.webmanifest",
  OPENGRAPH_IMAGE: "/opengraph-image",
  ROBOTS: "/robots.txt",
  SITEMAP: "/sitemap.xml",
  TWITTER_IMAGE: "/twitter-image",
} as const;

/** What an App says about its pages: to search engines, link previews and iOS. */
export const METADATA = {
  COLOR_SCHEME,
  INDEXING,
  LAUNCH: { DEVICES: LAUNCH_DEVICES, ORIENTATION: LAUNCH_ORIENTATION },
  OG_LOCALE,
  PATH,
  /** The robots directive an unindexed App sends, as meta tag and header. */
  ROBOTS: { NOINDEX: "noindex, nofollow" },
} as const;
```

In `http.ts`, add to `CONTENT_TYPES`, each in sorted position:

```ts
  PNG: "image/png",
```

```ts
  SVG: "image/svg+xml",
```

and to `HEADER` after `X_REQUEST_ID`:

```ts
  /** Robots directives for any response, images and JSON included. */
  X_ROBOTS_TAG: "x-robots-tag",
```

In `aof-create-next-config.ts`:

```ts
import { type Indexing, METADATA } from "../../metadata/constants/metadata";
```

Add to `Options`:

```ts
  /**
   * The App's Indexing, from `ACCESS.APP_SETTINGS`. Unindexed (the default,
   * so an App that forgets is never listed) sends `X-Robots-Tag` on every path.
   */
  indexing?: Indexing | undefined;
```

Change the destructuring to `{ transpile = [], intl, indexing = METADATA.INDEXING.UNINDEXED }: Options = {}` and the first headers entry to:

```ts
      {
        headers:
          indexing === METADATA.INDEXING.INDEXED
            ? HTTP.SECURITY_HEADERS
            : [
                ...HTTP.SECURITY_HEADERS,
                {
                  key: HTTP.HEADER.X_ROBOTS_TAG,
                  value: METADATA.ROBOTS.NOINDEX,
                },
              ],
        source: "/(.*)",
      },
```

Add to `packages/core/package.json` `exports`, in sorted position:

```json
    "./features/metadata/constants/metadata": "./src/features/metadata/constants/metadata.ts",
```

- [x] **Step 4: Run to verify they pass**

Run: `pnpm --filter @allonfire/core test -- src/features/next/config src/features/http && pnpm --filter @allonfire/core check-types`
Expected: PASS. If a test under `src/features/http/tests/` asserts the full header or content-type list, add the new keys to its expectation.

- [x] **Step 5: Checkpoint**

Run: `pnpm biome check --write packages/core/src/features/metadata packages/core/src/features/http packages/core/src/features/next/config packages/core/package.json`
Expected: no remaining diagnostics.

---

### Task 2: `ACCESS.APP_SETTINGS` gains `indexing`

**Files:**
- Modify: `packages/database/src/features/auth/access/constants/app-settings.ts` (the `AppSettings` type)
- Modify: `packages/database/src/features/auth/access/constants/access.ts` (the rows)
- Test: `packages/database/src/features/auth/access/tests/app-settings.test.ts`

**Interfaces:**
- Consumes: `METADATA.INDEXING`, `type Indexing` (Task 1).
- Produces: `AppSettings.indexing: Indexing`; `ACCESS.APP_SETTINGS[App.BACK_OFFICE].indexing` and Laura's are `METADATA.INDEXING.UNINDEXED`.

- [x] **Step 1: Write the failing test.** Add `import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";` and replace the "keeps the Back Office sign-in only and Admin-only" test with:

```ts
  it("keeps the Back Office sign-in only, Admin-only and out of search", () => {
    expect(ACCESS.APP_SETTINGS[App.BACK_OFFICE]).toEqual({
      indexing: METADATA.INDEXING.UNINDEXED,
      minRole: Role.ADMIN,
      registration: null,
    });
  });

  it("keeps Laura out of search", () => {
    expect(ACCESS.APP_SETTINGS[App.LAURA].indexing).toBe(
      METADATA.INDEXING.UNINDEXED
    );
  });
```

- [x] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/database test -- src/features/auth/access/tests/app-settings.test.ts`
Expected: FAIL, `indexing` missing from the received object.

- [x] **Step 3: Implement.** In `app-settings.ts`:

```ts
import type { Indexing } from "@allonfire/core/features/metadata/constants/metadata";
```

```ts
  /** Whether search engines may list this App's pages (CONTEXT.md, Indexing). */
  indexing: Indexing;
```

In `access.ts`:

```ts
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
```

```ts
const APP_SETTINGS = {
  [App.LAURA]: {
    indexing: METADATA.INDEXING.UNINDEXED,
    minRole: Role.VIEWER,
    registration: null,
  },
  [App.BACK_OFFICE]: {
    indexing: METADATA.INDEXING.UNINDEXED,
    minRole: Role.ADMIN,
    registration: null,
  },
} as const satisfies AppSettingsTable;
```

- [x] **Step 4: Run to verify it passes**

Run: `pnpm --filter @allonfire/database test -- src/features/auth/access && pnpm --filter @allonfire/database check-types`
Expected: PASS. A row without `indexing` fails `check-types` through `satisfies AppSettingsTable`, so no separate type test is needed.

- [x] **Step 5: Checkpoint.** Run `pnpm biome check --write packages/database/src/features/auth/access`. Then `grep -rn "APP_SETTINGS\[" apps packages --include="*.ts" --include="*.tsx" | grep -v node_modules` and update any `toEqual` on a whole row to include `indexing`.

---

### Task 3: `AOFBaseMetadata`

**Files:**
- Create: `packages/core/src/features/next/metadata/aof-base-metadata.ts`
- Modify: `packages/core/package.json` (exports)
- Test: `packages/core/src/features/next/metadata/tests/aof-base-metadata.test.ts`

**Interfaces:**
- Consumes: `METADATA`, `type Indexing` (Task 1); `type ContentLanguage`, `I18N`.
- Produces: `AOFBaseMetadata({ appName: string; indexing: Indexing; locale: ContentLanguage; locales: readonly ContentLanguage[]; startupImage?: { url: string; media: string }[] }): Metadata`. It returns `applicationName`, `appleWebApp`, `formatDetection`, `openGraph`, `other`, `robots` and `twitter`, and never `title`, `description` or `metadataBase`.

- [x] **Step 1: Write the failing test**

```ts
// @module-tag unit
import { I18N } from "../../../i18n/constants/locales";
import { METADATA } from "../../../metadata/constants/metadata";
import { AOFBaseMetadata } from "../aof-base-metadata";

const APP_NAME = "Any App";
const base = {
  appName: APP_NAME,
  indexing: METADATA.INDEXING.UNINDEXED,
  locale: "it",
  locales: I18N.BASE_LANGUAGES,
} as const;

describe("AOFBaseMetadata", () => {
  it("keeps an unindexed App out of search", () => {
    expect(AOFBaseMetadata(base).robots).toEqual({
      follow: false,
      index: false,
    });
  });

  it("lets an indexed App be listed", () => {
    expect(
      AOFBaseMetadata({ ...base, indexing: METADATA.INDEXING.INDEXED }).robots
    ).toEqual({ follow: true, index: true });
  });

  it("describes the page for link previews in the request's language", () => {
    expect(AOFBaseMetadata(base).openGraph).toEqual({
      alternateLocale: [METADATA.OG_LOCALE.en],
      locale: METADATA.OG_LOCALE.it,
      siteName: APP_NAME,
      type: "website",
      url: "./",
    });
    expect(AOFBaseMetadata(base).twitter).toEqual({
      card: "summary_large_image",
    });
  });

  it("makes the App an iOS web app with launch screens", () => {
    const startupImage = [
      {
        media: "(orientation: portrait)",
        url: `${METADATA.PATH.LAUNCH_SCREEN}/any.png`,
      },
    ];
    const metadata = AOFBaseMetadata({ ...base, startupImage });
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      startupImage,
      statusBarStyle: "default",
      title: APP_NAME,
    });
    // Next 15+ emits only mobile-web-app-capable; iOS launch screens need this one.
    expect(metadata.other).toEqual({
      "apple-mobile-web-app-capable": "yes",
      google: "notranslate",
    });
  });

  it("stops iOS turning numbers, emails and addresses into links", () => {
    expect(AOFBaseMetadata(base).formatDetection).toEqual({
      address: false,
      email: false,
      telephone: false,
    });
  });

  it("never sets what each App and page must say", () => {
    const metadata = AOFBaseMetadata(base);
    expect(metadata).not.toHaveProperty("title");
    expect(metadata).not.toHaveProperty("description");
    expect(metadata).not.toHaveProperty("metadataBase");
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata`
Expected: FAIL, the module is not found.

- [x] **Step 3: Implement**

```ts
import type { Metadata } from "next";
import type { ContentLanguage } from "../../i18n/constants/locales";
import { type Indexing, METADATA } from "../../metadata/constants/metadata";

type Options = {
  /** The App's name: tab, iOS home-screen title, link-preview site name. */
  appName: string;
  indexing: Indexing;
  locale: ContentLanguage;
  locales: readonly ContentLanguage[];
  /** iOS launch screens, from `AOFLaunchScreenLinks`. */
  startupImage?: { url: string; media: string }[] | undefined;
};

/**
 * What every App's root layout says the same way. The App spreads it and adds
 * `metadataBase`, `title` and `description`; pages add only `title` and
 * `description`, so Next fills `og:*` and `twitter:*` from them. A page that
 * sets `openGraph` or `robots` replaces these whole (Next merges shallowly).
 */
export const AOFBaseMetadata = ({
  appName,
  indexing,
  locale,
  locales,
  startupImage,
}: Options) =>
  ({
    applicationName: appName,
    appleWebApp: {
      capable: true,
      ...(startupImage ? { startupImage } : {}),
      // Readable in both themes; black-translucent keeps white text and is
      // buggy on iOS 26.1+ (WebKit 301994, 305546).
      statusBarStyle: "default",
      title: appName,
    },
    formatDetection: { address: false, email: false, telephone: false },
    openGraph: {
      alternateLocale: locales
        .filter((other) => other !== locale)
        .map((other) => METADATA.OG_LOCALE[other]),
      locale: METADATA.OG_LOCALE[locale],
      siteName: appName,
      type: "website",
      // Resolved against metadataBase and the current path.
      url: "./",
    },
    other: {
      // Next 15+ emits only mobile-web-app-capable for `capable`; iOS shows
      // launch screens only with Apple's own tag.
      "apple-mobile-web-app-capable": "yes",
      // Every language ships; a browser's machine translation would only
      // rewrite React's DOM under it.
      google: "notranslate",
    },
    robots:
      indexing === METADATA.INDEXING.INDEXED
        ? { follow: true, index: true }
        : { follow: false, index: false },
    twitter: { card: "summary_large_image" },
  }) satisfies Metadata;
```

Add the export key `"./features/next/metadata/aof-base-metadata": "./src/features/next/metadata/aof-base-metadata.ts"`.

- [x] **Step 4: Run to verify it passes**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata && pnpm --filter @allonfire/core check-types`
Expected: PASS.

- [x] **Step 5: Checkpoint.** Run `pnpm biome check --write packages/core/src/features/next/metadata packages/core/package.json`.

---

### Task 4: Indexed-App helpers (`AOFAlternates`, `AOFRobots`, `AOFSitemapEntries`)

**Files:**
- Create: `packages/core/src/features/next/metadata/aof-indexed.ts`
- Modify: `packages/core/package.json`
- Test: `packages/core/src/features/next/metadata/tests/aof-indexed.test.ts`

**Interfaces:**
- Consumes: `METADATA`, `type Indexing` (Task 1); `objectFromEntries`; `I18N`.
- Produces:
  - `type AsNeededRouting = { defaultLocale: string; locales: readonly string[] }`
  - `localizedPath(pathname: string, locale: string, routing: AsNeededRouting): string`
  - `AOFAlternates(pathname: string, locale: string, routing): NonNullable<Metadata["alternates"]>`
  - `AOFRobots({ indexing, origin }: { indexing: Indexing; origin: string }): MetadataRoute.Robots`
  - `AOFSitemapEntries(paths: readonly string[], origin: string, routing): MetadataRoute.Sitemap`

- [x] **Step 1: Write the failing test**

```ts
// @module-tag unit
import { I18N } from "../../../i18n/constants/locales";
import { METADATA } from "../../../metadata/constants/metadata";
import {
  AOFAlternates,
  AOFRobots,
  AOFSitemapEntries,
  localizedPath,
} from "../aof-indexed";

const routing = {
  defaultLocale: I18N.DEFAULT_LANGUAGE,
  locales: I18N.BASE_LANGUAGES,
} as const;
const ORIGIN = "https://example.test";
const HOME = "/";
const PAGE = "/any-page";

describe("localizedPath", () => {
  it("prefixes every language but the default", () => {
    expect(localizedPath(HOME, "en", routing)).toBe(HOME);
    expect(localizedPath(HOME, "it", routing)).toBe("/it");
    expect(localizedPath(PAGE, "en", routing)).toBe(PAGE);
    expect(localizedPath(PAGE, "it", routing)).toBe(`/it${PAGE}`);
  });
});

describe("AOFAlternates", () => {
  it("points canonical at this language and lists every language plus x-default", () => {
    expect(AOFAlternates(PAGE, "it", routing)).toEqual({
      canonical: `/it${PAGE}`,
      languages: { en: PAGE, it: `/it${PAGE}`, "x-default": PAGE },
    });
  });
});

describe("AOFRobots", () => {
  it("never blocks crawling, so an unindexed App's noindex stays readable", () => {
    expect(
      AOFRobots({ indexing: METADATA.INDEXING.UNINDEXED, origin: ORIGIN })
    ).toEqual({ rules: { allow: HOME, userAgent: "*" } });
  });

  it("points an indexed App's crawlers at its sitemap", () => {
    expect(
      AOFRobots({ indexing: METADATA.INDEXING.INDEXED, origin: ORIGIN })
    ).toEqual({
      rules: { allow: HOME, userAgent: "*" },
      sitemap: `${ORIGIN}${METADATA.PATH.SITEMAP}`,
    });
  });
});

describe("AOFSitemapEntries", () => {
  it("lists each path once, with every language as an alternate", () => {
    expect(AOFSitemapEntries([HOME, PAGE], ORIGIN, routing)).toEqual([
      {
        alternates: { languages: { en: `${ORIGIN}/`, it: `${ORIGIN}/it` } },
        url: `${ORIGIN}/`,
      },
      {
        alternates: {
          languages: { en: `${ORIGIN}${PAGE}`, it: `${ORIGIN}/it${PAGE}` },
        },
        url: `${ORIGIN}${PAGE}`,
      },
    ]);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata/tests/aof-indexed.test.ts`
Expected: FAIL, the module is not found.

- [x] **Step 3: Implement**

```ts
import type { Metadata, MetadataRoute } from "next";
import { objectFromEntries } from "../../../shared/utils/object";
import { type Indexing, METADATA } from "../../metadata/constants/metadata";

/** next-intl's as-needed routing, as `AOFDefineRouting` builds it. */
export type AsNeededRouting = {
  defaultLocale: string;
  locales: readonly string[];
};

const ROOT = "/";
const X_DEFAULT = "x-default";

/** A path as next-intl's as-needed prefix serves it in `locale`. */
export const localizedPath = (
  pathname: string,
  locale: string,
  { defaultLocale }: AsNeededRouting
) => {
  if (locale === defaultLocale) {
    return pathname;
  }
  return pathname === ROOT ? `/${locale}` : `/${locale}${pathname}`;
};

/**
 * For an indexed App's pages: canonical in this language, every language as
 * an alternate and `x-default` on the default one. Relative to metadataBase.
 * An unindexed App leaves it out (search engines ignore it on noindex pages).
 */
export const AOFAlternates = (
  pathname: string,
  locale: string,
  routing: AsNeededRouting
) =>
  ({
    canonical: localizedPath(pathname, locale, routing),
    languages: {
      ...objectFromEntries(
        routing.locales.map((each) => [
          each,
          localizedPath(pathname, each, routing),
        ])
      ),
      [X_DEFAULT]: localizedPath(pathname, routing.defaultLocale, routing),
    },
  }) satisfies NonNullable<Metadata["alternates"]>;

/**
 * robots.txt for any App. Never `Disallow: /`: it would hide an unindexed
 * App's noindex from search engines and block preview bots that obey it.
 */
export const AOFRobots = ({
  indexing,
  origin,
}: {
  indexing: Indexing;
  origin: string;
}): MetadataRoute.Robots => ({
  rules: { allow: ROOT, userAgent: "*" },
  ...(indexing === METADATA.INDEXING.INDEXED
    ? { sitemap: new URL(METADATA.PATH.SITEMAP, origin).href }
    : {}),
});

/** An indexed App's sitemap: each path in the default language, alternates for the rest. */
export const AOFSitemapEntries = (
  paths: readonly string[],
  origin: string,
  routing: AsNeededRouting
): MetadataRoute.Sitemap =>
  paths.map((pathname) => ({
    alternates: {
      languages: objectFromEntries(
        routing.locales.map((each) => [
          each,
          new URL(localizedPath(pathname, each, routing), origin).href,
        ])
      ),
    },
    url: new URL(localizedPath(pathname, routing.defaultLocale, routing), origin)
      .href,
  }));
```

Add the export key `"./features/next/metadata/aof-indexed": "./src/features/next/metadata/aof-indexed.ts"`.

- [x] **Step 4: Run to verify it passes**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata && pnpm --filter @allonfire/core check-types`
Expected: PASS.

- [x] **Step 5: Checkpoint.** Run `pnpm biome check --write packages/core/src/features/next/metadata packages/core/package.json`.

---

### Task 5: iOS launch screens (variants, links, route)

**Files:**
- Create: `packages/core/src/features/next/metadata/launch-screens.ts`
- Create: `packages/core/src/features/next/metadata/aof-launch-screen-route.ts`
- Modify: `packages/core/package.json`
- Test: `packages/core/src/features/next/metadata/tests/launch-screens.test.ts`

**Interfaces:**
- Consumes: `METADATA.LAUNCH`, `METADATA.COLOR_SCHEME`, `METADATA.PATH.LAUNCH_SCREEN`, `type LaunchDevice`, `type LaunchOrientation`, `type ColorScheme` (Task 1); `HTTP.STATUS.NOT_FOUND`.
- Produces:
  - `type LaunchScreenVariant = LaunchDevice & { orientation: LaunchOrientation; scheme: ColorScheme; pixelWidth: number; pixelHeight: number }`
  - `launchScreenVariants(devices?: readonly LaunchDevice[]): LaunchScreenVariant[]`
  - `launchScreenFile(variant): string`, the PNG's name from its pixel size and scheme
  - `AOFLaunchScreenLinks(): { url: string; media: string }[]`
  - `AOFLaunchScreenRoute(render: (variant: LaunchScreenVariant) => Promise<Response>)`, which returns `{ GET, generateStaticParams }`

- [x] **Step 1: Write the failing test**

```ts
// @module-tag unit
import { HTTP } from "../../../http/constants/http";
import { METADATA } from "../../../metadata/constants/metadata";
import { AOFLaunchScreenRoute } from "../aof-launch-screen-route";
import {
  AOFLaunchScreenLinks,
  launchScreenFile,
  launchScreenVariants,
} from "../launch-screens";

const DEVICE = { height: 844, ratio: 3, width: 390 } as const;
const VARIANTS_PER_DEVICE = 4;
const [PORTRAIT_LIGHT, PORTRAIT_DARK, LANDSCAPE_LIGHT, LANDSCAPE_DARK] =
  launchScreenVariants([DEVICE]);
const render = async () => new Response("png");

describe("launch screens", () => {
  it("lists each device size once", () => {
    const keys = METADATA.LAUNCH.DEVICES.map(
      ({ height, ratio, width }) => `${width}x${height}@${ratio}`
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every device a portrait and a landscape screen in each scheme", () => {
    expect(launchScreenVariants([DEVICE])).toHaveLength(VARIANTS_PER_DEVICE);
    expect(PORTRAIT_LIGHT).toMatchObject({
      orientation: METADATA.LAUNCH.ORIENTATION.PORTRAIT,
      pixelHeight: DEVICE.height * DEVICE.ratio,
      pixelWidth: DEVICE.width * DEVICE.ratio,
      scheme: METADATA.COLOR_SCHEME.LIGHT,
    });
    expect(PORTRAIT_DARK?.scheme).toBe(METADATA.COLOR_SCHEME.DARK);
    expect(LANDSCAPE_LIGHT).toMatchObject({
      orientation: METADATA.LAUNCH.ORIENTATION.LANDSCAPE,
      pixelHeight: DEVICE.width * DEVICE.ratio,
      pixelWidth: DEVICE.height * DEVICE.ratio,
    });
    expect(
      new Set(launchScreenVariants([DEVICE]).map(launchScreenFile)).size
    ).toBe(VARIANTS_PER_DEVICE);
  });

  it("keeps device-width the portrait width in landscape, as iOS reports it", () => {
    if (!LANDSCAPE_DARK) {
      throw new Error("no landscape dark variant");
    }
    const link = AOFLaunchScreenLinks().find(({ url }) =>
      url.endsWith(launchScreenFile(LANDSCAPE_DARK))
    );
    expect(link).toEqual({
      media: `(device-width: ${DEVICE.width}px) and (device-height: ${DEVICE.height}px) and (-webkit-device-pixel-ratio: ${DEVICE.ratio}) and (orientation: ${METADATA.LAUNCH.ORIENTATION.LANDSCAPE}) and (prefers-color-scheme: ${METADATA.COLOR_SCHEME.DARK})`,
      url: `${METADATA.PATH.LAUNCH_SCREEN}/${launchScreenFile(LANDSCAPE_DARK)}`,
    });
  });

  it("builds every linked screen at build time", async () => {
    const route = AOFLaunchScreenRoute(render);
    const files = (await route.generateStaticParams()).map(
      ({ screen }) => `${METADATA.PATH.LAUNCH_SCREEN}/${screen}`
    );
    expect(files).toEqual(AOFLaunchScreenLinks().map(({ url }) => url));
    expect(files).toHaveLength(
      METADATA.LAUNCH.DEVICES.length * VARIANTS_PER_DEVICE
    );
  });

  it("answers Not Found for a screen it does not list", async () => {
    const route = AOFLaunchScreenRoute(render);
    const response = await route.GET(new Request("https://example.test"), {
      params: Promise.resolve({ screen: "unlisted.png" }),
    });
    expect(response.status).toBe(HTTP.STATUS.NOT_FOUND);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata/tests/launch-screens.test.ts`
Expected: FAIL, the modules are not found.

- [x] **Step 3: Implement `launch-screens.ts`**

```ts
import {
  type ColorScheme,
  type LaunchDevice,
  type LaunchOrientation,
  METADATA,
} from "../../metadata/constants/metadata";

export type LaunchScreenVariant = LaunchDevice & {
  orientation: LaunchOrientation;
  scheme: ColorScheme;
  pixelWidth: number;
  pixelHeight: number;
};

const SCHEMES = [
  METADATA.COLOR_SCHEME.LIGHT,
  METADATA.COLOR_SCHEME.DARK,
] as const;
const ORIENTATIONS = [
  METADATA.LAUNCH.ORIENTATION.PORTRAIT,
  METADATA.LAUNCH.ORIENTATION.LANDSCAPE,
] as const;

/** Each device in both orientations and both schemes, in pixels. */
export const launchScreenVariants = (
  devices: readonly LaunchDevice[] = METADATA.LAUNCH.DEVICES
): LaunchScreenVariant[] =>
  devices.flatMap((device) =>
    ORIENTATIONS.flatMap((orientation) =>
      SCHEMES.map((scheme) => {
        const portrait = orientation === METADATA.LAUNCH.ORIENTATION.PORTRAIT;
        return {
          ...device,
          orientation,
          pixelHeight: (portrait ? device.height : device.width) * device.ratio,
          pixelWidth: (portrait ? device.width : device.height) * device.ratio,
          scheme,
        };
      })
    )
  );

/** The PNG's file name: its pixel size (orientation follows) and scheme. */
export const launchScreenFile = ({
  pixelHeight,
  pixelWidth,
  scheme,
}: LaunchScreenVariant) => `${pixelWidth}x${pixelHeight}-${scheme}.png`;

/**
 * `appleWebApp.startupImage` entries. iOS reports `device-width` as the
 * portrait width in both orientations, so it is never swapped. iOS keeps the
 * screen it picked at install: a later theme change shows the old one.
 */
export const AOFLaunchScreenLinks = () =>
  launchScreenVariants().map((variant) => ({
    media: `(device-width: ${variant.width}px) and (device-height: ${variant.height}px) and (-webkit-device-pixel-ratio: ${variant.ratio}) and (orientation: ${variant.orientation}) and (prefers-color-scheme: ${variant.scheme})`,
    url: `${METADATA.PATH.LAUNCH_SCREEN}/${launchScreenFile(variant)}`,
  }));
```

- [x] **Step 4: Implement `aof-launch-screen-route.ts`**

```ts
import { HTTP } from "../../http/constants/http";
import {
  type LaunchScreenVariant,
  launchScreenFile,
  launchScreenVariants,
} from "./launch-screens";

type Context = { params: Promise<{ screen: string }> };

/**
 * The App's `app/launch/[screen]/route.tsx` (the folder
 * `METADATA.PATH.LAUNCH_SCREEN` names) re-exports `GET` and
 * `generateStaticParams` from this; it only says how a screen looks, usually
 * an `ImageResponse` of its mark at the variant's pixel size. Every listed
 * screen is built at build time.
 */
export const AOFLaunchScreenRoute = (
  render: (variant: LaunchScreenVariant) => Promise<Response>
) => ({
  GET: async (_request: Request, { params }: Context) => {
    const { screen } = await params;
    const variant = launchScreenVariants().find(
      (each) => launchScreenFile(each) === screen
    );
    return variant
      ? render(variant)
      : new Response(null, { status: HTTP.STATUS.NOT_FOUND });
  },
  generateStaticParams: async () =>
    launchScreenVariants().map((variant) => ({
      screen: launchScreenFile(variant),
    })),
});
```

Add the export keys:

```json
    "./features/next/metadata/aof-launch-screen-route": "./src/features/next/metadata/aof-launch-screen-route.ts",
    "./features/next/metadata/launch-screens": "./src/features/next/metadata/launch-screens.ts",
```

- [x] **Step 5: Run to verify it passes**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata && pnpm --filter @allonfire/core check-types`
Expected: PASS (20 devices, 80 screens).

- [x] **Step 6: Checkpoint.** Run `pnpm biome check --write packages/core/src/features/next/metadata packages/core/package.json`.

---

### Task 6: Shared text for the global pages

**Files:**
- Modify: `packages/core/src/features/next/i18n/translations/en.json`, `it.json`

**Interfaces:**
- Produces: `Common.Error.reference` (ICU, `{digest}`) and `Common.Loading.label`, read by Task 11.

- [x] **Step 1: Add the keys.** `en.json`:

```json
{
  "Common": {
    "NotFound": {
      "title": "Page not found",
      "back": "Back to the start"
    },
    "Error": {
      "title": "Something went wrong",
      "retry": "Try again",
      "reference": "Reference {digest}"
    },
    "Loading": {
      "label": "Loading…"
    }
  }
}
```

`it.json`:

```json
{
  "Common": {
    "NotFound": {
      "title": "Pagina non trovata",
      "back": "Torna all'inizio"
    },
    "Error": {
      "title": "Qualcosa è andato storto",
      "retry": "Riprova",
      "reference": "Riferimento {digest}"
    },
    "Loading": {
      "label": "Caricamento…"
    }
  }
}
```

- [x] **Step 2: Verify.** Run `pnpm --filter @allonfire/core i18n:check && pnpm --filter @allonfire/core check-types`. Expected: PASS. `SharedTranslations` is `typeof EN`, so Italian missing a key fails.

---

## Phase 2: Back Office wiring (placeholder visuals)

### Task 7: Brand monogram and image fonts in the design package

**Files:**
- Create: `packages/design/src/brand/aof-monogram.ts`
- Create: `packages/design/src/designs/japan/image-fonts.ts`
- Add: `packages/design/src/designs/japan/fonts/atkinson-hyperlegible-next-400.ttf`, `-700.ttf`
- Modify: `packages/design/package.json` (exports), `packages/design/src/designs/japan/fonts/README.md`
- Test: `packages/design/src/brand/tests/aof-monogram.test.ts`

**Interfaces:**
- Produces:
  - `BRAND.MONOGRAM_SVG: string`, a `viewBox="0 0 512 512"` SVG with no background and no label; `BRAND.MONOGRAM_DATA_URL: string`
  - `loadJapanImageFonts(): Promise<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]>`

- [x] **Step 1: Write the failing test**

```ts
// @module-tag unit
import { BRAND } from "../aof-monogram";

describe("the Brand monogram", () => {
  it("is the monogram alone: no background, no App label", () => {
    expect(BRAND.MONOGRAM_SVG).toContain('viewBox="0 0 512 512"');
    expect(BRAND.MONOGRAM_SVG).not.toContain("<rect");
    expect(BRAND.MONOGRAM_SVG).not.toContain("<text");
  });

  it("embeds as a data URL any image renderer can load", () => {
    expect(BRAND.MONOGRAM_DATA_URL).toBe(
      `data:image/svg+xml;base64,${Buffer.from(BRAND.MONOGRAM_SVG).toString("base64")}`
    );
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/design test -- src/brand`
Expected: FAIL, the module is not found.

- [x] **Step 3: Implement `aof-monogram.ts`.** The markup is Laura's `apps/laura/src/app/icon.svg` without the `#151515` background, the "LAURA" box and their defs. It is re-centred (`translate(244, 256)` instead of `translate(244, 230)`) now that the label is gone. Round 6 restyles it.

```ts
const MONOGRAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="flame-grad" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#FFDD44"/>
      <stop offset="50%" stop-color="#FF8811"/>
      <stop offset="100%" stop-color="#E03C00"/>
    </linearGradient>
    <filter id="text-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
    <filter id="flame-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#FF8811" flood-opacity="0.5"/>
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g transform="translate(244, 256)">
    <g filter="url(#text-shadow)">
      <g transform="translate(-168, 0)">
        <path d="M0 110 L58 -120 L90 -120 L148 110 L114 110 L100 56 L48 56 L34 110 Z" fill="#C0C0C0" stroke="#C0C0C0" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"/>
        <path d="M56 30 L74 -52 L92 30 Z" fill="#C0C0C0" stroke="#C0C0C0" stroke-width="4" stroke-linejoin="round" paint-order="stroke"/>
      </g>
      <g transform="translate(6, 0)">
        <ellipse cx="0" cy="-5" rx="78" ry="115" fill="#C0C0C0"/>
        <ellipse cx="0" cy="-5" rx="46" ry="78" fill="#C0C0C0"/>
      </g>
      <g transform="translate(82, 0)">
        <path d="M0 110 L0 -120 L110 -120 L110 -84 L36 -84 L36 -16 L90 -16 L90 18 L36 18 L36 110 Z" fill="#C0C0C0" stroke="#C0C0C0" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"/>
      </g>
    </g>
    <g transform="translate(4.2, -3.5)" filter="url(#flame-glow)">
      <g transform="scale(5.8)">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="url(#flame-grad)" transform="translate(-12, -12)"/>
      </g>
    </g>
  </g>
</svg>`;

/**
 * The Brand (CONTEXT.md): the AOF monogram, its O lit by the flame, without
 * background or App label. A string, not a .svg file, so an App can answer it
 * as its icon and embed it in generated images without a bundler loader.
 * Drawn from Laura's icon; restyled in the Back Office's mark round.
 */
export const BRAND = {
  MONOGRAM_DATA_URL: `data:image/svg+xml;base64,${Buffer.from(MONOGRAM_SVG).toString("base64")}`,
  MONOGRAM_SVG,
} as const;
```

- [x] **Step 4: Fetch the TTFs.** Satori reads TTF, OTF or WOFF, not WOFF2 or variable fonts. Google Fonts serves static TTF to a client without a modern User-Agent:

```bash
cd packages/design/src/designs/japan/fonts
URLS="$(curl -s "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700" -A "curl" | grep -o 'https://[^)]*\.ttf')"
echo "$URLS"   # expect two URLs: 400 first, 700 second
curl -sL "$(echo "$URLS" | sed -n 1p)" -o atkinson-hyperlegible-next-400.ttf
curl -sL "$(echo "$URLS" | sed -n 2p)" -o atkinson-hyperlegible-next-700.ttf
file atkinson-hyperlegible-next-*.ttf   # expect "TrueType Font data"
```

Add one line to `fonts/README.md`: "`atkinson-hyperlegible-next-{400,700}.ttf`: static TTF instances for generated images (Satori cannot read WOFF2), same OFL licence."

- [x] **Step 5: Implement `image-fonts.ts`**

```ts
import { readFile } from "node:fs/promises";

const FAMILY = "Atkinson Hyperlegible Next";

/**
 * The Japan Design's text face for `ImageResponse`. Each `new URL` is written
 * out so the bundler traces the file. Images are built at build time, so the
 * runner never reads them.
 */
export const loadJapanImageFonts = async () => [
  {
    data: await readFile(
      new URL("./fonts/atkinson-hyperlegible-next-400.ttf", import.meta.url)
    ),
    name: FAMILY,
    style: "normal",
    weight: 400,
  } satisfies { style: "normal"; weight: 400; name: string; data: Buffer },
  {
    data: await readFile(
      new URL("./fonts/atkinson-hyperlegible-next-700.ttf", import.meta.url)
    ),
    name: FAMILY,
    style: "normal",
    weight: 700,
  } satisfies { style: "normal"; weight: 700; name: string; data: Buffer },
];
```

If `ImageResponse`'s `fonts` option rejects the inferred `style: string` or `weight: number`, type the function's return as `NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]` (importing the type from `next/og`, which the design package already has through its dev dependencies, or adding `next` as a dev dependency if it does not).

Exports in `packages/design/package.json`:

```json
    "./brand/aof-monogram": "./src/brand/aof-monogram.ts",
    "./designs/japan/image-fonts": "./src/designs/japan/image-fonts.ts",
```

- [x] **Step 6: Run to verify it passes**

Run: `pnpm --filter @allonfire/design test && pnpm --filter @allonfire/design check-types && pnpm design:sync --check`
Expected: PASS.

- [x] **Step 7: Checkpoint.** Run `pnpm biome check --write packages/design/src/brand packages/design/src/designs/japan/image-fonts.ts packages/design/package.json`.

---

### Task 8: Env, Next config, proxy matcher, deploy wiring

**Files:**
- Modify: `apps/back-office/src/environment/environment.ts`, `src/environment/tests/environment.test.ts`, `.env.example`
- Modify: `packages/config/local/tests/local-files.test.ts` (the Back Office `.env.example` entry)
- Modify: `apps/back-office/playwright.config.ts`, `apps/back-office/next.config.ts`, `apps/back-office/src/proxy.ts`
- Create: `apps/back-office/src/proxy.test.ts`
- Modify: `docker/Dockerfile:28-44`, `docker/docker-compose.prod.yml` (the `back-office` service), `.github/workflows/ci.yml` (`build.env`), `.github/workflows/deploy.yml` (`build-args`)

**Interfaces:**
- Consumes: `ACCESS.APP_SETTINGS` (Task 2), the `indexing` option and `METADATA.PATH` (Task 1), `LOCAL.URL` from `@allonfire/config/local/addresses`.
- Produces: `env.BACK_OFFICE_URL: string`, plus a proxy `config.matcher` that skips generated metadata routes.

- [x] **Step 1: Write the failing tests.** In `environment.test.ts`, add `vi.stubEnv("BACK_OFFICE_URL", LOCAL.URL.BACK_OFFICE);` to `beforeEach` and these cases:

```ts
  it("refuses to start without the Back Office's own address", async () => {
    vi.stubEnv("BACK_OFFICE_URL", undefined);
    await expect(import("../environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("refuses an address that is not a URL", async () => {
    vi.stubEnv("BACK_OFFICE_URL", "not-a-url");
    await expect(import("../environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });
```

In `packages/config/local/tests/local-files.test.ts`, add to the `apps/back-office/.env.example` list:

```ts
      `BACK_OFFICE_URL="${LOCAL.URL.BACK_OFFICE}"`,
```

`apps/back-office/src/proxy.test.ts`:

```ts
// @module-tag unit
// @vitest-environment node
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "./proxy";

vi.mock("@allonfire/auth/features/next/utils/with-session-refresh", () => ({
  withSessionRefresh: (handler: unknown) => handler,
}));
vi.mock("@allonfire/core/features/next/i18n/aof-create-middleware", () => ({
  AOFCreateMiddleware: () => () => undefined,
}));

const IT = "/it";
const { PATH } = METADATA;
const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it.each([
    "/",
    AUTH.PAGE.SIGN_IN,
    IT,
    `${IT}${AUTH.PAGE.SIGN_IN}`,
    // A page whose name only starts like a metadata file is still a page.
    `${PATH.ICON}s`,
    `${PATH.ICON}ic`,
  ])("routes the page %s", (url) => {
    expect(matches(url)).toBe(true);
  });

  it.each([
    PATH.ICON,
    PATH.APPLE_ICON,
    PATH.OPENGRAPH_IMAGE,
    `/en${PATH.OPENGRAPH_IMAGE}`,
    `${IT}${PATH.TWITTER_IMAGE}`,
    // Next appends a hash or an image id to generated images.
    `${PATH.OPENGRAPH_IMAGE}-abc123`,
    `${PATH.OPENGRAPH_IMAGE}/anyid`,
    `${IT}${PATH.TWITTER_IMAGE}/anyid`,
    PATH.MANIFEST,
    PATH.ROBOTS,
    PATH.FAVICON,
    `${PATH.LAUNCH_SCREEN}/any-screen.png`,
    "/_next/static/chunk.js",
    "/api/health",
  ])("leaves the file %s to Next", (url) => {
    expect(matches(url)).toBe(false);
  });
});
```

- [x] **Step 2: Run to verify they fail**

Run: `pnpm --filter @allonfire/back-office test -- src/proxy.test.ts src/environment && pnpm --filter @allonfire/config test -- local/tests/local-files.test.ts`
Expected: FAIL. The icon, the apple icon and the image routes match the old matcher, the env cases resolve instead of throwing, and the `.env.example` line is missing.

- [x] **Step 3: Implement the env.** In `environment.ts`, add a `server` block:

```ts
  server: {
    /**
     * The Back Office's own public address: metadataBase for every absolute
     * URL in its head (link-preview images, og:url). Read at build
     * (prerendered pages bake it in) and at runtime (home renders per
     * request), so both must carry the same value.
     */
    BACK_OFFICE_URL: z.url(),
  },
```

Leave it out of `experimental__runtimeEnv`: `@t3-oss/env-nextjs` reads `server` vars from `process.env` directly, and that block lists only `client` and `shared` ones.

`.env.example`, after `NEXT_PUBLIC_API_URL`:

```
# This App's own public address, for absolute URLs in its head (link
# previews). Read at build and at runtime: keep them equal.
BACK_OFFICE_URL="http://localhost:3400"
```

`playwright.config.ts`: the e2e stack sets its own addresses, so the App's address there is the e2e one:

```ts
  env: {
    AUTH_APP: App.BACK_OFFICE,
    BACK_OFFICE_URL: LOCAL.URL.BACK_OFFICE_E2E,
  },
```

`aofPlaywrightConfig` spreads `env` into the build-and-serve command, so both the build and the server get it.

- [x] **Step 4: Implement the proxy matcher.** Next requires a literal, so the names are written out; the test above reads them from `METADATA.PATH` and fails when the two drift:

```ts
export const config = {
  // Pages only: files with a dot, Next internals, the API, and the generated
  // metadata routes of METADATA.PATH (icons, preview images, with or without
  // a locale, hash or image id) skip the proxy, so bots get the file, not a
  // locale redirect or the 404. A literal: Next reads it statically.
  matcher:
    "/((?!api|_next|_vercel|(?:[a-z]{2}/)?(?:apple-icon|icon|opengraph-image|twitter-image)(?:-\\w+)?(?:/\\w+)?$|.*\\..*).*)",
};
```

If Next rejects the pattern (path-to-regexp error at test or build), rewrite the regex until the unchanged test passes. Keep every listed case.

- [x] **Step 5: Implement the Next config.**

```ts
import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
```

```ts
export default AOFCreateNextConfig(
  withStorageImages(
    // The global 404 for URLs no route matches (dotted paths skip the proxy,
    // so no locale or layout renders them). Experimental in 16.3.6.
    { experimental: { globalNotFound: true } },
    { bucket: buildEnv.STORAGE_BUCKET, origin: buildEnv.STORAGE_ENDPOINT }
  ),
  {
    indexing: ACCESS.APP_SETTINGS[App.BACK_OFFICE].indexing,
    // next-intl reads the request config from src/features/i18n, next to the translations.
    intl: { requestConfig: "./src/features/i18n/request.ts" },
    transpile: [
      "@allonfire/auth",
      "@allonfire/database",
      "@allonfire/design",
      "@allonfire/shadcn",
      "@allonfire/storage",
      "@allonfire/ui",
    ],
  }
);
```

`withStorageImages` spreads the config it is given, so `experimental` passes through.

- [x] **Step 6: Deploy wiring.**
  - `docker/Dockerfile`: add `ARG BACK_OFFICE_URL` beside `ARG NEXT_PUBLIC_API_URL`, and `BACK_OFFICE_URL=${BACK_OFFICE_URL} \` to the `ENV` list. Extend the comment: "BACK_OFFICE_URL is the Back Office's metadataBase, baked into prerendered pages; it must equal the runtime value."
  - `.github/workflows/deploy.yml` `build-args`: add `BACK_OFFICE_URL=${{ secrets.PROD_BACK_OFFICE_URL }}`.
  - `docker/docker-compose.prod.yml`, `back-office` `environment`: add `- BACK_OFFICE_URL=${BACK_OFFICE_URL}`, and extend the comment above the service to name it among the values baked in at build.
  - `.github/workflows/ci.yml` `build.env`: add `BACK_OFFICE_URL: ${{ secrets.BACK_OFFICE_URL }}`.

- [x] **Step 7: Run to verify they pass**

Run: `pnpm --filter @allonfire/back-office test -- src/proxy.test.ts src/environment && pnpm --filter @allonfire/config test`
Expected: PASS.

- [x] **Step 8: Local env.** Add `BACK_OFFICE_URL="http://localhost:3400"` to `apps/back-office/.env.development` (gitignored). Tell the owner that a running `next dev` must be restarted to read it. Do not restart a dev server you did not start.

- [x] **Step 9: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/proxy.ts apps/back-office/src/proxy.test.ts apps/back-office/src/environment apps/back-office/next.config.ts apps/back-office/playwright.config.ts packages/config/local`.

---

### Task 9: `BACK_OFFICE` constants and the placeholder mark

**Files:**
- Create: `apps/back-office/src/shared/constants/back-office.ts`
- Create: `apps/back-office/src/shared/constants/tests/back-office.test.ts`
- Create: `apps/back-office/src/shared/utils/page-title.ts`
- Create: `apps/back-office/src/features/metadata/components/back-office-mark.tsx`
- Test: `apps/back-office/src/features/metadata/components/tests/back-office-mark.test.tsx`

**Interfaces:**
- Consumes: `BRAND` (Task 7); `METADATA.COLOR_SCHEME`, `type ColorScheme` (Task 1).
- Produces:
  - `BACK_OFFICE.NAME`: tab, iOS title, preview site name, manifest, label.
  - `BACK_OFFICE.COLOR[scheme].{background,foreground,primary}`: the Japan Design's hex values.
  - `BACK_OFFICE.PATH.MANIFEST_ICON`: the folder of the manifest's PNGs.
  - `BACK_OFFICE.ICON.{APPLE_EDGE,MANIFEST}`, `BACK_OFFICE.SHARE_IMAGE.{ID,SIZE}`.
  - `pageTitle(title: string): string`, the title with the App's name after it.
  - `BackOfficeMark({ scheme: ColorScheme; size: number; label?: boolean })`: Satori-safe JSX.

- [x] **Step 1: Write the failing tests.** `back-office.test.ts`:

```ts
// @module-tag unit
// @vitest-environment node
import { readFileSync } from "node:fs";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { BACK_OFFICE } from "../back-office";

const THEME = readFileSync(
  new URL(
    "../../../../../../packages/design/src/designs/japan/theme.css",
    import.meta.url
  ),
  "utf8"
);

/** Every value of a token in theme.css order: `:root` first, `.dark` second. */
const tokenValues = (token: string) =>
  [...THEME.matchAll(new RegExp(`--${token}: (#[0-9a-f]{6});`, "g"))].map(
    ([, value]) => value
  );

describe("BACK_OFFICE.COLOR", () => {
  it.each(["background", "foreground", "primary"] as const)(
    "matches the Japan Design's --%s in both themes",
    (token) => {
      expect([
        BACK_OFFICE.COLOR[METADATA.COLOR_SCHEME.LIGHT][token],
        BACK_OFFICE.COLOR[METADATA.COLOR_SCHEME.DARK][token],
      ]).toEqual(tokenValues(token));
    }
  );
});
```

`back-office-mark.test.tsx`:

```tsx
// @module-tag unit
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { renderToStaticMarkup } from "react-dom/server";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { BackOfficeMark } from "../back-office-mark";

const EDGE = 512;

describe("BackOfficeMark", () => {
  it("draws the monogram and, when asked, the App's label", () => {
    const html = renderToStaticMarkup(
      <BackOfficeMark label scheme={METADATA.COLOR_SCHEME.DARK} size={EDGE} />
    );
    expect(html).toContain(BRAND.MONOGRAM_DATA_URL);
    expect(html).toContain(BACK_OFFICE.NAME);
  });

  it("leaves the label out at icon sizes", () => {
    const html = renderToStaticMarkup(
      <BackOfficeMark scheme={METADATA.COLOR_SCHEME.LIGHT} size={EDGE} />
    );
    expect(html).not.toContain(BACK_OFFICE.NAME);
  });
});
```

- [x] **Step 2: Run to verify they fail**

Run: `pnpm --filter @allonfire/back-office test -- src/shared src/features/metadata`
Expected: FAIL, the modules are not found.

- [x] **Step 3: Implement.** `back-office.ts` (the hex values are `theme.css` lines 36, 37, 42 and 89, 90, 97 today; the test fails when they change):

```ts
import {
  type ColorScheme,
  METADATA,
} from "@allonfire/core/features/metadata/constants/metadata";

type Colors = { background: string; foreground: string; primary: string };

/**
 * The Japan Design's colors where CSS variables cannot reach: theme-color,
 * the manifest, generated images.
 */
const COLOR = {
  [METADATA.COLOR_SCHEME.DARK]: {
    background: "#16191d",
    foreground: "#eef0f2",
    primary: "#3a9ee0",
  },
  [METADATA.COLOR_SCHEME.LIGHT]: {
    background: "#f6f7f8",
    foreground: "#1a1a1a",
    primary: "#006fb3",
  },
} as const satisfies Record<ColorScheme, Colors>;

/**
 * The manifest's PNGs. `inset` is the share of the edge the mark fills:
 * maskable keeps it inside the 409/512 safe circle.
 */
const MANIFEST_ICONS = {
  LARGE: { edge: 512, file: "large.png", inset: 1, purpose: "any" },
  MASKABLE: { edge: 512, file: "maskable.png", inset: 0.8, purpose: "maskable" },
  SMALL: { edge: 192, file: "small.png", inset: 1, purpose: "any" },
} as const;

/** What the Back Office says about itself in its head, manifest and mark. */
export const BACK_OFFICE = {
  COLOR,
  ICON: {
    /** The apple-touch-icon's edge, the one size iOS needs. */
    APPLE_EDGE: 180,
    MANIFEST: MANIFEST_ICONS,
  },
  NAME: "Back Office",
  PATH: {
    /** The folder of the manifest's PNG icons. */
    MANIFEST_ICON: "/manifest-icon",
  },
  SHARE_IMAGE: {
    /** The one preview image each of the two image files generates. */
    ID: "card",
    /** What Open Graph and X both show uncropped. */
    SIZE: { height: 630, width: 1200 },
  },
} as const;
```

`page-title.ts`:

```ts
import { BACK_OFFICE } from "../constants/back-office";

/** A page's tab title: its own, then the App's name. `%s` builds Next's template. */
export const pageTitle = (title: string) => `${title} · ${BACK_OFFICE.NAME}`;
```

`back-office-mark.tsx` (a placeholder; round 6 designs it):

```tsx
import type { ColorScheme } from "@allonfire/core/features/metadata/constants/metadata";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { BACK_OFFICE } from "@/shared/constants/back-office";

const LABEL_SCALE = 0.09;
const MONOGRAM_SCALE = 0.62;
const GAP_SCALE = 0.02;

type BackOfficeMarkProps = {
  scheme: ColorScheme;
  /** Edge of the square it fills, in pixels. */
  size: number;
  /** The App's label under the monogram; off at icon sizes, unreadable there. */
  label?: boolean;
};

/**
 * The Back Office's mark: the Brand monogram plus its label. Satori-safe
 * (flex layout, inline styles, an img for the SVG) so ImageResponse renders
 * it; every generated icon, preview and launch screen draws this.
 */
export const BackOfficeMark = ({
  label = false,
  scheme,
  size,
}: BackOfficeMarkProps) => (
  <div
    style={{
      alignItems: "center",
      display: "flex",
      flexDirection: "column",
      gap: size * GAP_SCALE,
      justifyContent: "center",
    }}
  >
    <img
      alt=""
      height={size * MONOGRAM_SCALE}
      src={BRAND.MONOGRAM_DATA_URL}
      width={size * MONOGRAM_SCALE}
    />
    {label ? (
      <span
        style={{
          color: BACK_OFFICE.COLOR[scheme].foreground,
          fontFamily: "Atkinson Hyperlegible Next",
          fontSize: size * LABEL_SCALE,
          fontWeight: 700,
        }}
      >
        {BACK_OFFICE.NAME}
      </span>
    ) : null}
  </div>
);
```

Biome's `noImgElement` may flag the `<img>`: Satori cannot render `next/image`, and `next/og`'s own docs use a plain `img`. Do not add `biome-ignore`. If the rule fires, stop and ask the owner whether to turn it off for `src/features/metadata/components/` in `biome.json`.

- [x] **Step 4: Run to verify they pass**

Run: `pnpm --filter @allonfire/back-office test -- src/shared src/features/metadata`
Expected: PASS.

- [x] **Step 5: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/shared apps/back-office/src/features/metadata`.

---

### Task 10: Root layout head, viewport, robots.ts, page titles

**Files:**
- Modify: `apps/back-office/src/app/[locale]/layout.tsx`
- Create: `apps/back-office/src/app/robots.ts`
- Modify: `apps/back-office/src/features/i18n/translations/en.json`, `it.json`
- Create: `apps/back-office/e2e/head.spec.ts`

**Interfaces:**
- Consumes: `AOFBaseMetadata` (Task 3), `AOFRobots` (Task 4), `AOFLaunchScreenLinks` (Task 5), `env.BACK_OFFICE_URL` (Task 8), `BACK_OFFICE`, `pageTitle` (Task 9), `ACCESS.APP_SETTINGS` (Task 2).
- Produces: `Metadata.title`, `Metadata.description` and `Metadata.ogAlt` translation keys, used by Tasks 12 and 13.

- [x] **Step 1: Write the failing e2e test.** `e2e/head.spec.ts`:

```ts
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOFLaunchScreenLinks } from "@allonfire/core/features/next/metadata/launch-screens";
import { expect, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { pageTitle } from "../src/shared/utils/page-title";

const SIGN_IN = AUTH.PAGE.SIGN_IN;
const COLOR_SCHEMES = 2;

test("gives Sign in a complete head", async ({ page }) => {
  const response = await page.goto(SIGN_IN);
  expect(response?.headers()["x-robots-tag"]).toBe(METADATA.ROBOTS.NOINDEX);
  const meta = (selector: string) => page.locator(selector).first();
  await expect(page).toHaveTitle(pageTitle(EN.SignIn.submit));
  await expect(meta('meta[name="robots"]')).toHaveAttribute("content", METADATA.ROBOTS.NOINDEX);
  await expect(meta('meta[name="description"]')).toHaveAttribute("content", EN.Metadata.description);
  await expect(meta('meta[property="og:url"]')).toHaveAttribute("content", `${LOCAL.URL.BACK_OFFICE_E2E}${SIGN_IN}`);
  await expect(meta('meta[property="og:site_name"]')).toHaveAttribute("content", BACK_OFFICE.NAME);
  await expect(meta('meta[property="og:locale"]')).toHaveAttribute("content", METADATA.OG_LOCALE.en);
  await expect(meta('meta[property="og:locale:alternate"]')).toHaveAttribute("content", METADATA.OG_LOCALE.it);
  await expect(meta('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(COLOR_SCHEMES);
  await expect(meta('meta[name="color-scheme"]')).toHaveAttribute("content", "light dark");
  await expect(meta('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(meta('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute("content", "default");
  await expect(meta('meta[name="format-detection"]')).toHaveAttribute("content", /telephone=no/);
  await expect(page.locator('link[rel="apple-touch-startup-image"]')).toHaveCount(AOFLaunchScreenLinks().length);
});

test("localizes the head in Italian", async ({ page }) => {
  await page.goto(`/it${SIGN_IN}`);
  await expect(page.locator('meta[property="og:locale"]').first()).toHaveAttribute("content", METADATA.OG_LOCALE.it);
});

test("serves a robots.txt that allows crawling", async ({ request }) => {
  const body = await (await request.get(METADATA.PATH.ROBOTS)).text();
  expect(body).toContain("Allow: /");
  expect(body).not.toContain("Disallow");
  expect(body).not.toContain("Sitemap");
});
```

- [x] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/back-office test:e2e -- head.spec.ts --project=chromium`
Expected: FAIL (the run builds the App first). The title has no App name, there is no `og:url`, and `robots.txt` is 404.

- [x] **Step 3: Translations.** In `en.json`, replace the `"Metadata"` block:

```json
  "Metadata": {
    "title": "Back Office",
    "description": "Where the AllOnFire family's content, users and data are managed.",
    "ogAlt": "Back Office, AllOnFire"
  },
```

`it.json`:

```json
  "Metadata": {
    "title": "Back Office",
    "description": "Dove si gestiscono i contenuti, gli utenti e i dati della famiglia AllOnFire.",
    "ogAlt": "Back Office, AllOnFire"
  },
```

- [x] **Step 4: Layout.** Add the imports to `[locale]/layout.tsx`:

```ts
import { languageSchema } from "@allonfire/core/features/i18n/constants/locales";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOFBaseMetadata } from "@allonfire/core/features/next/metadata/aof-base-metadata";
import { AOFLaunchScreenLinks } from "@allonfire/core/features/next/metadata/launch-screens";
import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import type { Metadata, Viewport } from "next";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { pageTitle } from "@/shared/utils/page-title";
```

Replace `generateMetadata` and add `viewport`:

```ts
export const generateMetadata = async (): Promise<Metadata> => {
  const [t, locale] = await Promise.all([
    getTranslations("Metadata"),
    getLocale(),
  ]);
  return {
    ...AOFBaseMetadata({
      appName: BACK_OFFICE.NAME,
      indexing: ACCESS.APP_SETTINGS[App.BACK_OFFICE].indexing,
      locale: languageSchema.parse(locale),
      locales: routing.locales,
      startupImage: AOFLaunchScreenLinks(),
    }),
    description: t("description"),
    metadataBase: new URL(env.BACK_OFFICE_URL),
    title: { default: t("title"), template: pageTitle("%s") },
  };
};

// Installed-app chrome and form controls follow the OS theme. Safari 26+
// tints its tabs from the page background instead, which the Design sets.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    {
      color: BACK_OFFICE.COLOR[METADATA.COLOR_SCHEME.LIGHT].background,
      media: `(prefers-color-scheme: ${METADATA.COLOR_SCHEME.LIGHT})`,
    },
    {
      color: BACK_OFFICE.COLOR[METADATA.COLOR_SCHEME.DARK].background,
      media: `(prefers-color-scheme: ${METADATA.COLOR_SCHEME.DARK})`,
    },
  ],
};
```

The old `other: { google: "notranslate" }` now comes from `AOFBaseMetadata`; delete it and its comment from the layout.

`src/app/robots.ts`:

```ts
import { AOFRobots } from "@allonfire/core/features/next/metadata/aof-indexed";
import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import type { MetadataRoute } from "next";
import { env } from "@/environment/environment";

// Crawling stays open so search engines read the pages' noindex.
const robots = (): MetadataRoute.Robots =>
  AOFRobots({
    indexing: ACCESS.APP_SETTINGS[App.BACK_OFFICE].indexing,
    origin: env.BACK_OFFICE_URL,
  });

export default robots;
```

- [x] **Step 5: Run to verify it passes**

Run: `pnpm --filter @allonfire/back-office test:e2e -- head.spec.ts --project=chromium`
Expected: PASS.
  - If `og:url` comes out as the bare origin, Next did not resolve `"./"`. Then give each page `openGraph: { ...AOFBaseMetadata(...).openGraph, url: <its path constant> }` through a shared `pageOpenGraph(path)` helper in `src/shared/utils/`, and rerun.
  - If the Sign in title lacks the App's name, check that `sign-in/page.tsx` returns a plain string `title` (a `title.absolute` skips the template).
- [x] **Step 6: Check in the dev tools.** With the owner's dev server running, use the `next-devtools` MCP `get_page_metadata` on Sign in in both languages; every field from the spec's table is present.

- [x] **Step 7: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/app apps/back-office/e2e && pnpm --filter @allonfire/back-office i18n:check && pnpm --filter @allonfire/back-office check-types`.

---

### Task 11: Error, not-found and loading pages on shared notices

**Files:**
- Create: `apps/back-office/src/features/errors/components/not-found-notice.tsx`, `error-notice.tsx`
- Create: `apps/back-office/src/features/errors/components/tests/notices.test.tsx`
- Modify: `apps/back-office/src/app/[locale]/not-found.tsx`, `[locale]/error.tsx`, `src/app/global-error.tsx`
- Create: `apps/back-office/src/app/global-not-found.tsx`, `apps/back-office/src/app/[locale]/loading.tsx`
- Modify: `apps/back-office/e2e/head.spec.ts`

**Interfaces:**
- Consumes: the `Common.Error.reference` and `Common.Loading.label` keys (Task 6); `globalNotFound` (Task 8); `BACK_OFFICE`, `pageTitle` (Task 9).
- Produces:
  - `NotFoundNotice({ title: string; children: ReactNode })`, where `children` is the way back.
  - `ErrorNotice({ title: string; retryLabel: string; onRetry: () => void; reference?: string | undefined })`

- [x] **Step 1: Write the failing tests.** `notices.test.tsx`:

```tsx
// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorNotice } from "../error-notice";
import { NotFoundNotice } from "../not-found-notice";

const { Error: ERROR_TEXT, NotFound } =
  SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common;
const REFERENCE = "ref-1234";
const noop = () => undefined;

describe("NotFoundNotice", () => {
  it("titles the page and offers the way back it is given", () => {
    const html = renderToStaticMarkup(
      <NotFoundNotice title={NotFound.title}>
        <span>{NotFound.back}</span>
      </NotFoundNotice>
    );
    expect(html).toContain("<h1");
    expect(html).toContain(NotFound.title);
    expect(html).toContain(`<span>${NotFound.back}</span>`);
  });
});

describe("ErrorNotice", () => {
  it("shows the reference only when the error has one", () => {
    const withReference = renderToStaticMarkup(
      <ErrorNotice
        onRetry={noop}
        reference={REFERENCE}
        retryLabel={ERROR_TEXT.retry}
        title={ERROR_TEXT.title}
      />
    );
    const without = renderToStaticMarkup(
      <ErrorNotice
        onRetry={noop}
        retryLabel={ERROR_TEXT.retry}
        title={ERROR_TEXT.title}
      />
    );
    expect(withReference).toContain(REFERENCE);
    expect(without).not.toContain(REFERENCE);
  });

  it("offers a retry button", () => {
    const html = renderToStaticMarkup(
      <ErrorNotice
        onRetry={noop}
        retryLabel={ERROR_TEXT.retry}
        title={ERROR_TEXT.title}
      />
    );
    expect(html).toContain('type="button"');
    expect(html).toContain(ERROR_TEXT.retry);
  });
});
```

Append to `e2e/head.spec.ts` (add the imports `HTTP` from `@allonfire/core/features/http/constants/http`, `I18N` from `@allonfire/core/features/i18n/constants/locales` and `SHARED_TRANSLATIONS` from `@allonfire/core/features/next/i18n/shared-translations`):

```ts
const NOT_FOUND = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common.NotFound;
// A dotted path skips the proxy, so no locale or layout renders it.
const UNMATCHED = "/no-such-file.png";
// The Japan Design's light --background, as the browser reports it.
const LIGHT_BACKGROUND = "rgb(246, 247, 248)";

test("styles the 404 for a URL no route matches", async ({ page }) => {
  const response = await page.goto(UNMATCHED);
  expect(response?.status()).toBe(HTTP.STATUS.NOT_FOUND);
  await expect(page.getByRole("heading", { name: NOT_FOUND.title })).toBeVisible();
  await expect(page).toHaveTitle(pageTitle(NOT_FOUND.title));
  const background = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor
  );
  expect(background).toBe(LIGHT_BACKGROUND);
});

test("titles the localized 404", async ({ page }) => {
  await page.goto("/it/no-such-page");
  await expect(page).toHaveTitle(
    pageTitle(SHARED_TRANSLATIONS.it.Common.NotFound.title)
  );
});
```

`LIGHT_BACKGROUND` is the rgb form of the light `BACK_OFFICE.COLOR` background; the unit test in Task 9 ties that hex to `theme.css`. Playwright emulates the light scheme by default.

- [x] **Step 2: Run to verify they fail**

Run: `pnpm --filter @allonfire/back-office test -- src/features/errors` (FAIL, the modules are missing), then `pnpm --filter @allonfire/back-office test:e2e -- head.spec.ts --project=chromium -g "404"` (FAIL, the unstyled default 404 and the title).

- [x] **Step 3: Implement the notices** (placeholders; rounds 1 and 3 design them):

```tsx
// not-found-notice.tsx
import { AOFPage } from "@allonfire/ui/components/aof-page";
import type { ReactNode } from "react";

type NotFoundNoticeProps = { title: string; children: ReactNode };

/** The 404 every not-found page shows; text comes in, so it reads no i18n. */
export const NotFoundNotice = ({ children, title }: NotFoundNoticeProps) => (
  <AOFPage layout="centered">
    <h1 className="font-semibold text-2xl">{title}</h1>
    <nav>{children}</nav>
  </AOFPage>
);
```

```tsx
// error-notice.tsx
import { AOFButton } from "@allonfire/ui/components/aof-button";
import { AOFPage } from "@allonfire/ui/components/aof-page";

type ErrorNoticeProps = {
  title: string;
  retryLabel: string;
  onRetry: () => void;
  /** "Reference <digest>", so a report matches the server log. */
  reference?: string | undefined;
};

/** What every error page shows; rendered inside the client error boundaries. */
export const ErrorNotice = ({
  onRetry,
  reference,
  retryLabel,
  title,
}: ErrorNoticeProps) => (
  <AOFPage layout="centered">
    <h1 className="font-semibold text-2xl">{title}</h1>
    {reference ? (
      <p className="font-mono text-muted-foreground text-xs">{reference}</p>
    ) : null}
    <AOFButton onClick={onRetry} type="button">
      {retryLabel}
    </AOFButton>
  </AOFPage>
);
```

- [x] **Step 4: Wire the pages.** `[locale]/not-found.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { NotFoundNotice } from "@/features/errors/components/not-found-notice";
import { Link } from "@/features/i18n/navigation";
import { pageTitle } from "@/shared/utils/page-title";

// not-found.js takes no metadata exports (only global-not-found does), so
// React 19 hoists this <title> into the head.
const NotFound = async () => {
  const t = await getTranslations("Common.NotFound");
  return (
    <NotFoundNotice title={t("title")}>
      <title>{pageTitle(t("title"))}</title>
      <Link className="underline" href="/">
        {t("back")}
      </Link>
    </NotFoundNotice>
  );
};

export default NotFound;
```

`NotFoundNotice` renders `children` inside `<nav>`, and a `<title>` there is still hoisted to `<head>` by React 19. If the layout's default title wins (two `<title>` elements, the e2e title check fails), move the `<title>` to the start of `NotFoundNotice` via a `documentTitle` prop and recheck. If it still loses, report it to the owner rather than forcing it.

`app/global-not-found.tsx`:

```tsx
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/aof-theme-provider";
import type { Metadata } from "next";
import { NotFoundNotice } from "@/features/errors/components/not-found-notice";
import { pageTitle } from "@/shared/utils/page-title";
import "./globals.css";

// No route matched, so no locale and no layout: the shared text in the
// default language, and this file's own html, styles and theme.
const { NotFound: TEXT } = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common;

export const metadata: Metadata = { title: pageTitle(TEXT.title) };

const GlobalNotFound = () => (
  <html lang={I18N.DEFAULT_LANGUAGE} suppressHydrationWarning translate="no">
    <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
      <AOFThemeProvider>
        <NotFoundNotice title={TEXT.title}>
          {/* A plain link: no locale routing runs here. */}
          <a className="underline" href="/">
            {TEXT.back}
          </a>
        </NotFoundNotice>
      </AOFThemeProvider>
    </body>
  </html>
);

export default GlobalNotFound;
```

`[locale]/error.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { ErrorNotice } from "@/features/errors/components/error-notice";

type ErrorProps = { error: Error & { digest?: string }; retry: () => void };

// `retry` re-fetches and re-renders the segment (stable since Next 16.3);
// `reset` would re-render the failed server payload as it was.
const ErrorPage = ({ error, retry }: ErrorProps) => {
  const t = useTranslations("Common.Error");
  return (
    <ErrorNotice
      onRetry={retry}
      reference={
        error.digest ? t("reference", { digest: error.digest }) : undefined
      }
      retryLabel={t("retry")}
      title={t("title")}
    />
  );
};

export default ErrorPage;
```

`app/global-error.tsx`:

```tsx
"use client";

import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/aof-theme-provider";
import { createTranslator } from "next-intl";
import { ErrorNotice } from "@/features/errors/components/error-notice";
import { pageTitle } from "@/shared/utils/page-title";
import "./globals.css";

// Replaces the root layout, so no locale is known and no next-intl provider
// runs: the shared text in the default language, through a plain translator.
const t = createTranslator({
  locale: I18N.DEFAULT_LANGUAGE,
  messages: SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE],
  namespace: "Common.Error",
});

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

const GlobalError = ({ error, retry }: GlobalErrorProps) => (
  <html lang={I18N.DEFAULT_LANGUAGE} suppressHydrationWarning translate="no">
    <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
      <title>{pageTitle(t("title"))}</title>
      <AOFThemeProvider>
        <ErrorNotice
          onRetry={retry}
          reference={
            error.digest ? t("reference", { digest: error.digest }) : undefined
          }
          retryLabel={t("retry")}
          title={t("title")}
        />
      </AOFThemeProvider>
    </body>
  </html>
);

export default GlobalError;
```

`[locale]/loading.tsx` (placeholder; round 5 designs it):

```tsx
import { AOFPage } from "@allonfire/ui/components/aof-page";
import { useTranslations } from "next-intl";

// The Suspense fallback while a page waits (home checks the Session).
const Loading = () => {
  const t = useTranslations("Common.Loading");
  return (
    <AOFPage aria-busy="true" layout="centered">
      <p className="text-muted-foreground" role="status">
        {t("label")}
      </p>
    </AOFPage>
  );
};

export default Loading;
```

- [x] **Step 5: Run to verify they pass**

Run: `pnpm --filter @allonfire/back-office test -- src/features/errors && pnpm --filter @allonfire/back-office test:e2e -- --project=chromium -g "404"`
Expected: PASS, including `smoke.spec.ts`'s existing "renders the localized 404 for an unknown path". Also open `/` signed out in the browser (via `/iso-browser`): the redirect to Sign in still works, and a forced error shows the notice (throw once from home locally, then revert).

- [x] **Step 6: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/features/errors apps/back-office/src/app apps/back-office/e2e && pnpm --filter @allonfire/back-office check-types`.

---

### Task 12: Icons, favicon and manifest

**Files:**
- Create: `apps/back-office/src/features/metadata/components/icon-ground.tsx`
- Create: `apps/back-office/src/app/icon.tsx`, `apple-icon.tsx`, `manifest.ts`, `manifest-icon/[icon]/route.tsx`
- Create: `apps/back-office/public/favicon.ico`
- Modify: `apps/back-office/e2e/head.spec.ts`

**Interfaces:**
- Consumes: `BRAND` (Task 7), `BackOfficeMark`, `BACK_OFFICE` (Task 9), `METADATA.PATH`, `HTTP.CONTENT_TYPE.{PNG,SVG}` (Task 1), the `Metadata.description` key (Task 10).
- Produces: the icon (SVG), the apple icon (PNG), the three manifest PNGs under `BACK_OFFICE.PATH.MANIFEST_ICON`, the manifest, `favicon.ico`, and `IconGround({ children })`.

- [x] **Step 1: Write the failing e2e test** (append to `head.spec.ts`; add the import `objectValues` from `@allonfire/core/shared/utils/object`):

```ts
const MANIFEST_ICONS = objectValues(BACK_OFFICE.ICON.MANIFEST);
const ROOT = "/";

test("serves every icon and the manifest", async ({ page, request }) => {
  const icons = [
    { path: METADATA.PATH.ICON, type: HTTP.CONTENT_TYPE.SVG },
    { path: METADATA.PATH.APPLE_ICON, type: HTTP.CONTENT_TYPE.PNG },
    ...MANIFEST_ICONS.map(({ file }) => ({
      path: `${BACK_OFFICE.PATH.MANIFEST_ICON}/${file}`,
      type: HTTP.CONTENT_TYPE.PNG,
    })),
  ];
  for (const { path, type } of icons) {
    const response = await request.get(path);
    expect({ path, status: response.status() }).toEqual({
      path,
      status: HTTP.STATUS.OK,
    });
    expect(response.headers()["content-type"]).toContain(type);
  }
  expect((await request.get(METADATA.PATH.FAVICON)).status()).toBe(
    HTTP.STATUS.OK
  );

  const manifest = await (await request.get(METADATA.PATH.MANIFEST)).json();
  expect(manifest).toMatchObject({
    display: "browser",
    id: ROOT,
    name: BACK_OFFICE.NAME,
    scope: ROOT,
    short_name: BACK_OFFICE.NAME,
    start_url: ROOT,
  });
  expect(manifest.icons).toHaveLength(MANIFEST_ICONS.length);

  await page.goto(SIGN_IN);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(
    page.locator(`link[rel="icon"][type="${HTTP.CONTENT_TYPE.SVG}"]`)
  ).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});
```

- [x] **Step 2: Run to verify it fails.** Run `pnpm --filter @allonfire/back-office test:e2e -- head.spec.ts --project=chromium -g "icon"`. Expected: FAIL with 404s.

- [x] **Step 3: Implement.** `app/icon.tsx`:

```tsx
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { BRAND } from "@allonfire/design/brand/aof-monogram";

// The tab icon: the monogram alone (a label is unreadable at 16-32px), as
// SVG, which follows the OS theme through its own media query (round 6).
export const contentType = HTTP.CONTENT_TYPE.SVG;

const Icon = () =>
  new Response(BRAND.MONOGRAM_SVG, {
    headers: { [HTTP.HEADER.CONTENT_TYPE]: contentType },
  });

export default Icon;
```

If Next refuses a non-literal `contentType` export (a build error naming the export), write the literal there and keep the header from `HTTP`.

`features/metadata/components/icon-ground.tsx`:

```tsx
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import type { ReactNode } from "react";
import { BACK_OFFICE } from "@/shared/constants/back-office";

/**
 * The opaque ground of a square icon: iOS fills transparency with black, and
 * a maskable icon is cropped to a circle, so the mark sits on the Design's
 * light background, never on nothing.
 */
export const IconGround = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      alignItems: "center",
      background: BACK_OFFICE.COLOR[METADATA.COLOR_SCHEME.LIGHT].background,
      display: "flex",
      height: "100%",
      justifyContent: "center",
      width: "100%",
    }}
  >
    {children}
  </div>
);
```

`app/apple-icon.tsx`:

```tsx
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { ImageResponse } from "next/og";
import { BackOfficeMark } from "@/features/metadata/components/back-office-mark";
import { IconGround } from "@/features/metadata/components/icon-ground";
import { BACK_OFFICE } from "@/shared/constants/back-office";

const EDGE = BACK_OFFICE.ICON.APPLE_EDGE;
export const size = { height: EDGE, width: EDGE };
export const contentType = HTTP.CONTENT_TYPE.PNG;

// iOS prefers this over the manifest's icons.
const AppleIcon = () =>
  new ImageResponse(
    <IconGround>
      <BackOfficeMark scheme={METADATA.COLOR_SCHEME.LIGHT} size={EDGE} />
    </IconGround>,
    size
  );

export default AppleIcon;
```

`app/manifest-icon/[icon]/route.tsx` (the folder `BACK_OFFICE.PATH.MANIFEST_ICON` names):

```tsx
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { ImageResponse } from "next/og";
import { BackOfficeMark } from "@/features/metadata/components/back-office-mark";
import { IconGround } from "@/features/metadata/components/icon-ground";
import { BACK_OFFICE } from "@/shared/constants/back-office";

const ICONS = objectValues(BACK_OFFICE.ICON.MANIFEST);

export const generateStaticParams = async () =>
  ICONS.map(({ file }) => ({ icon: file }));

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ icon: string }> }
) => {
  const { icon } = await params;
  const found = ICONS.find(({ file }) => file === icon);
  if (!found) {
    return new Response(null, { status: HTTP.STATUS.NOT_FOUND });
  }
  return new ImageResponse(
    <IconGround>
      <BackOfficeMark
        scheme={METADATA.COLOR_SCHEME.LIGHT}
        size={found.edge * found.inset}
      />
    </IconGround>,
    { height: found.edge, width: found.edge }
  );
};
```

`app/manifest.ts`:

```ts
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { objectValues } from "@allonfire/core/shared/utils/object";
import type { MetadataRoute } from "next";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import { BACK_OFFICE } from "@/shared/constants/back-office";

const ROOT = "/";
const LIGHT = BACK_OFFICE.COLOR[METADATA.COLOR_SCHEME.LIGHT];

// Only discovered at the app root, so it is not localized: the default
// language. `display: "browser"`: Android adds a shortcut that opens a tab;
// iOS 26+ opens its own window by default anyway. Members Chrome uses only
// for installable apps (screenshots, shortcuts, display_override) would do
// nothing here.
const manifest = (): MetadataRoute.Manifest => ({
  background_color: LIGHT.background,
  description: EN.Metadata.description,
  dir: "ltr",
  display: "browser",
  icons: objectValues(BACK_OFFICE.ICON.MANIFEST).map(
    ({ edge, file, purpose }) => ({
      purpose,
      sizes: `${edge}x${edge}`,
      src: `${BACK_OFFICE.PATH.MANIFEST_ICON}/${file}`,
      type: HTTP.CONTENT_TYPE.PNG,
    })
  ),
  id: ROOT,
  lang: I18N.DEFAULT_LANGUAGE,
  name: BACK_OFFICE.NAME,
  scope: ROOT,
  short_name: BACK_OFFICE.NAME,
  start_url: ROOT,
  theme_color: LIGHT.background,
});

export default manifest;
```

`color_scheme_dark` is not in Next 16.3.6's `MetadataRoute.Manifest` type and no browser ships it, so it stays out (spec).

`public/favicon.ico`: generate a 32x32 ICO from the small manifest icon, once, with the owner's dev server running on its usual port:

```bash
cd apps/back-office
T="$(mktemp -d)"
curl -s http://localhost:3400/manifest-icon/small.png -o "$T/small.png"
sips -z 32 32 "$T/small.png" --out "$T/32.png"
sips -s format ico "$T/32.png" --out public/favicon.ico
file public/favicon.ico   # expect "MS Windows icon resource"
```

If `sips` cannot write ICO on this macOS, stop and ask the owner which tool to use; do not add a dependency. Round 6 regenerates the file the same way after the mark changes.

- [x] **Step 4: Run to verify it passes.** Run `pnpm --filter @allonfire/back-office test:e2e -- head.spec.ts --project=chromium -g "icon"`. Expected: PASS.

- [x] **Step 5: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/app apps/back-office/src/features/metadata apps/back-office/e2e && pnpm --filter @allonfire/back-office check-types`.

---

### Task 13: Link-preview images and iOS launch screens

**Files:**
- Create: `apps/back-office/src/features/metadata/components/share-card.tsx`, `launch-screen.tsx`
- Create: `apps/back-office/src/features/metadata/utils/share-image.tsx`
- Create: `apps/back-office/src/app/[locale]/opengraph-image.tsx`, `[locale]/twitter-image.tsx`
- Create: `apps/back-office/src/app/launch/[screen]/route.tsx`
- Test: `apps/back-office/src/features/metadata/components/tests/share-card.test.tsx`
- Modify: `apps/back-office/e2e/head.spec.ts`

**Interfaces:**
- Consumes: `AOFLaunchScreenRoute`, `LaunchScreenVariant` (Task 5), `BackOfficeMark`, `BACK_OFFICE` (Task 9), `loadJapanImageFonts` (Task 7), the `Metadata.*` keys (Task 10).
- Produces:
  - `ShareCard({ title: string; description: string; scheme: ColorScheme })`, a Satori layout at `BACK_OFFICE.SHARE_IMAGE.SIZE`.
  - `LaunchScreen({ variant: LaunchScreenVariant })`
  - `shareImageMetadata(params)` and `shareImage(params)`, what both image files export through.

- [x] **Step 1: Write the failing tests.** `share-card.test.tsx`:

```tsx
// @module-tag unit
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { renderToStaticMarkup } from "react-dom/server";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { ShareCard } from "../share-card";

const DESCRIPTION = "Plain description without markup";

describe("ShareCard", () => {
  it("carries the page's description beside the mark", () => {
    const html = renderToStaticMarkup(
      <ShareCard
        description={DESCRIPTION}
        scheme={METADATA.COLOR_SCHEME.LIGHT}
        title={BACK_OFFICE.NAME}
      />
    );
    expect(html).toContain(DESCRIPTION);
    expect(html).toContain(BRAND.MONOGRAM_DATA_URL);
  });
});
```

Append to `e2e/head.spec.ts`:

```ts
// WhatsApp reads up to 600 KB; half of that keeps every preview bot happy.
const SHARE_IMAGE_MAX_BYTES = 300_000;
const shareImagePaths = ["", "/it"].flatMap((locale) =>
  [METADATA.PATH.OPENGRAPH_IMAGE, METADATA.PATH.TWITTER_IMAGE].map(
    (path) => `${locale}${path}/${BACK_OFFICE.SHARE_IMAGE.ID}`
  )
);

test("serves link-preview images in both languages", async ({
  page,
  request,
}) => {
  for (const path of shareImagePaths) {
    const response = await request.get(path);
    expect({ path, status: response.status() }).toEqual({
      path,
      status: HTTP.STATUS.OK,
    });
    expect(response.headers()["content-type"]).toBe(HTTP.CONTENT_TYPE.PNG);
    expect((await response.body()).byteLength).toBeLessThan(
      SHARE_IMAGE_MAX_BYTES
    );
  }
  await page.goto(SIGN_IN);
  const og = page.locator('meta[property="og:image"]').first();
  await expect(og).toHaveAttribute(
    "content",
    new RegExp(`^${LOCAL.URL.BACK_OFFICE_E2E}.*${METADATA.PATH.OPENGRAPH_IMAGE}`)
  );
  await expect(
    page.locator('meta[property="og:image:alt"]').first()
  ).toHaveAttribute("content", EN.Metadata.ogAlt);
  await expect(
    page.locator('meta[name="twitter:image"]').first()
  ).toHaveAttribute("content", new RegExp(METADATA.PATH.TWITTER_IMAGE));
  const image = await request.get((await og.getAttribute("content")) ?? "");
  expect(image.status()).toBe(HTTP.STATUS.OK);
});

test("serves the launch screens it links", async ({ request }) => {
  const links = AOFLaunchScreenLinks();
  // The first and the last: an iPhone in portrait and an iPad in landscape.
  for (const link of [links[0], links.at(-1)]) {
    const response = await request.get(link?.url ?? "");
    expect({ status: response.status(), url: link?.url }).toEqual({
      status: HTTP.STATUS.OK,
      url: link?.url,
    });
    expect(response.headers()["content-type"]).toBe(HTTP.CONTENT_TYPE.PNG);
  }
  const unlisted = await request.get(
    `${METADATA.PATH.LAUNCH_SCREEN}/unlisted.png`
  );
  expect(unlisted.status()).toBe(HTTP.STATUS.NOT_FOUND);
});
```

- [x] **Step 2: Run to verify they fail.** Run `pnpm --filter @allonfire/back-office test -- src/features/metadata` and `pnpm --filter @allonfire/back-office test:e2e -- head.spec.ts --project=chromium -g "preview|launch"`. Expected: FAIL.

- [x] **Step 3: Implement the components** (placeholders; rounds 7 and 8 design them):

```tsx
// share-card.tsx
import type { ColorScheme } from "@allonfire/core/features/metadata/constants/metadata";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { BackOfficeMark } from "./back-office-mark";

const MARK_EDGE = 360;
const PADDING = 72;
const GAP = 48;
const TEXT_GAP = 16;
const TITLE_SIZE = 72;
const DESCRIPTION_SIZE = 34;

type ShareCardProps = {
  title: string;
  description: string;
  scheme: ColorScheme;
};

/** The link-preview card (Open Graph and X): the mark and what the App is. */
export const ShareCard = ({ description, scheme, title }: ShareCardProps) => {
  const colors = BACK_OFFICE.COLOR[scheme];
  return (
    <div
      style={{
        alignItems: "center",
        background: colors.background,
        color: colors.foreground,
        display: "flex",
        fontFamily: "Atkinson Hyperlegible Next",
        gap: GAP,
        height: "100%",
        padding: PADDING,
        width: "100%",
      }}
    >
      <BackOfficeMark scheme={scheme} size={MARK_EDGE} />
      <div style={{ display: "flex", flexDirection: "column", gap: TEXT_GAP }}>
        <span style={{ fontSize: TITLE_SIZE, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: DESCRIPTION_SIZE }}>{description}</span>
      </div>
    </div>
  );
};
```

```tsx
// launch-screen.tsx
import type { LaunchScreenVariant } from "@allonfire/core/features/next/metadata/launch-screens";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { BackOfficeMark } from "./back-office-mark";

/** The share of the screen's shortest edge the mark fills. */
const MARK_SHARE = 0.4;

/** An iOS launch screen: the mark centred on the scheme's ground. */
export const LaunchScreen = ({ variant }: { variant: LaunchScreenVariant }) => (
  <div
    style={{
      alignItems: "center",
      background: BACK_OFFICE.COLOR[variant.scheme].background,
      display: "flex",
      height: "100%",
      justifyContent: "center",
      width: "100%",
    }}
  >
    <BackOfficeMark
      label
      scheme={variant.scheme}
      size={Math.min(variant.pixelWidth, variant.pixelHeight) * MARK_SHARE}
    />
  </div>
);
```

- [x] **Step 4: Implement the share image.** Route handlers cannot read `next/root-params`, so the image translates from `params.locale` with `createTranslator` over the App's JSON. `features/metadata/utils/share-image.tsx` holds what both image files do:

```tsx
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { languageSchema } from "@allonfire/core/features/i18n/constants/locales";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { loadJapanImageFonts } from "@allonfire/design/designs/japan/image-fonts";
import { ImageResponse } from "next/og";
import { createTranslator } from "next-intl";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { ShareCard } from "../components/share-card";

const TRANSLATIONS = { en: EN, it: IT } as const;

export type ShareImageParams = Promise<{ locale: string }>;

const translator = async (params: ShareImageParams) => {
  const locale = languageSchema.parse((await params).locale);
  return createTranslator({
    locale,
    messages: TRANSLATIONS[locale],
    namespace: "Metadata",
  });
};

/** One image per file, so its alt can follow the locale (`alt` alone is static). */
export const shareImageMetadata = async (params: ShareImageParams) => {
  const t = await translator(params);
  return [
    {
      alt: t("ogAlt"),
      contentType: HTTP.CONTENT_TYPE.PNG,
      id: BACK_OFFICE.SHARE_IMAGE.ID,
      size: BACK_OFFICE.SHARE_IMAGE.SIZE,
    },
  ];
};

export const shareImage = async (params: ShareImageParams) => {
  const t = await translator(params);
  return new ImageResponse(
    <ShareCard
      description={t("description")}
      scheme={METADATA.COLOR_SCHEME.LIGHT}
      title={t("title")}
    />,
    { ...BACK_OFFICE.SHARE_IMAGE.SIZE, fonts: await loadJapanImageFonts() }
  );
};
```

`[locale]/opengraph-image.tsx` and `[locale]/twitter-image.tsx` hold the same lines; Next reads each metadata file's exports from that file, so both exist:

```tsx
import {
  type ShareImageParams,
  shareImage,
  shareImageMetadata,
} from "@/features/metadata/utils/share-image";

type Props = { params: ShareImageParams };

export const generateImageMetadata = ({ params }: Props) =>
  shareImageMetadata(params);

const Image = ({ params }: Props) => shareImage(params);

export default Image;
```

The image id puts each image at `<path>/<BACK_OFFICE.SHARE_IMAGE.ID>`; the proxy matcher from Task 8 already skips those paths.

`app/launch/[screen]/route.tsx` (the folder `METADATA.PATH.LAUNCH_SCREEN` names):

```tsx
import { AOFLaunchScreenRoute } from "@allonfire/core/features/next/metadata/aof-launch-screen-route";
import { loadJapanImageFonts } from "@allonfire/design/designs/japan/image-fonts";
import { ImageResponse } from "next/og";
import { LaunchScreen } from "@/features/metadata/components/launch-screen";

const route = AOFLaunchScreenRoute(
  async (variant) =>
    new ImageResponse(<LaunchScreen variant={variant} />, {
      fonts: await loadJapanImageFonts(),
      height: variant.pixelHeight,
      width: variant.pixelWidth,
    })
);

export const GET = route.GET;
export const generateStaticParams = route.generateStaticParams;
```

- [x] **Step 5: Run to verify they pass.** Run `pnpm --filter @allonfire/back-office test -- src/features/metadata && pnpm --filter @allonfire/back-office test:e2e -- head.spec.ts --project=chromium`. Expected: PASS, the whole file.

- [x] **Step 6: Build check.** Read the build output of the e2e run just made. It lists `/launch/[screen]` with 80 prerendered paths, the image routes as static, and no "metadataBase is not set" warning. Compare the build time with a run from before Task 13: if the 80 PNGs added more than a minute, tell the owner the added time; do not trim the device list without asking (the pre-commit hook runs this build).

- [x] **Step 7: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/app apps/back-office/src/features/metadata apps/back-office/e2e`.

---

## Execution notes (2026-10-13)

What was built differs from the tasks above in these ways; the ledger (`.superpowers/sdd/<plan>/progress.md`) has each ruling with its cost.

- **No `global-not-found`.** With a top-level `[locale]` segment every URL matches a route, so Next never serves that file, and a path the proxy skips reached the root layout with a bogus locale and got Next's bare error shell. Core's new `AOFWithLocalizedNotFound` (`features/next/config`) adds an `afterFiles` rewrite that sends any path whose first segment is not a language to the default language, where the catch-all renders the designed 404. `global-not-found.tsx` and `experimental.globalNotFound` are gone.
- **`loading.tsx` lives in `[locale]/(signed-in)/`**, with home. At `[locale]` it made every 404 answer 200 (Suspense streams the shell first).
- **Pages set `openGraph`.** `og:url: "./"` resolved to `/en/sign-in`, not `/sign-in`, so each page passes `openGraph: pageOpenGraph(path, locale)` (`features/metadata/utils`), spread from `baseMetadata(locale)`.
- **The preview images are named in the metadata**, not left to the file convention (a page's own `openGraph` dropped them): `AOFBaseMetadata` takes `shareImage`. The image files have no `generateImageMetadata` and no `/card` id; they export `generateStaticParams`, so each is built once per language.
- **`loadJapanImageFonts` is `"use cache"`** and returns plain `ArrayBuffer`s: under Cache Components a file read in an on-demand route must be cached.
- **The logo follows Laura's** (owner's instruction): `BRAND` holds the monogram, the dark ground and the layout; `backOfficeLogoSvg()` and `BackOfficeMark` draw it; the mark has no `scheme` or `label` prop, and a `rounded` one.
- **The mark draws the monogram as a CSS background**, not an `<img>` (Biome's `noImgElement`).
- **Names:** manifest icons are `small.png`, `large.png`, `maskable.png`; `PATTERN` gained `LEADING_SLASH` and `REGEX_SYNTAX`.
- **e2e:** one test per file or path (Biome forbids `await` in loops), run with `pnpm exec playwright test` from the App (pnpm's `--` hides Playwright's filters).

## Phase 3: Design rounds

Seven rounds remain (round 2 was dropped, see Task 15). The owner's dev server on port 3400 already serves everything built in Phases 1 and 2.

Every round follows the same loop:

1. `/aof-design craft <target> --app back-office` (direct mode). The brief: the spec section for that piece, `packages/design/src/apps/back-office/PRODUCT.md`, the Japan Design, and the reference named in the round.
2. Keep the component's props and the tests from Phase 2 passing, and add pairs to `theme.test.ts` for new text colors.
3. Take one screenshot round via `/iso-browser` (attach to the open window): light and dark, 390px and 1440px wide.
4. **Stop.** Show the owner the screenshots and wait for approval. Do not start the next round until they approve.
5. Checkpoint: `pnpm biome check --write <touched files> && pnpm --filter @allonfire/back-office test`.

### Task 14: Round 1, not found
Target `apps/back-office/src/features/errors/components/not-found-notice.tsx` (look at any unknown page path). It sets the look every later status page reuses: departure-board vocabulary, the hanko, the Line Rule. The way back stays a link.

- [x] Steps 1-5 of the loop. Built as an eki stamp (404, 回送), 迷子 brushed on the wall, the way back a link brushed 戻.

### Task 15: Round 2, global not found (dropped)
Dropped during Task 11: `global-not-found.tsx` no longer exists. With a top-level `[locale]` segment every URL matches a route, so Next never serves it; `AOFWithLocalizedNotFound` sends those URLs to the localized not-found page instead, which round 1 designs.

- [x] Nothing to design.

### Task 16: Round 3, error
Target `apps/back-office/src/features/errors/components/error-notice.tsx`. To see it, throw from home locally, then revert. The reference line stays small and copyable (`select-all`).

- [x] Steps 1-5 of the loop. Approved 2026-10-16: eki stamp 停 / 見合わせ, 運休 brushed on the wall, a description line, the reference on a small LED board, Try again brushed 再.

### Task 17: Round 4, global error
Target `apps/back-office/src/app/global-error.tsx`. To see it, throw in `[locale]/layout.tsx` locally, then revert. It must match round 3.

- [x] Steps 1-5 of the loop. Approved 2026-10-16: renders `ErrorNotice`, so it matches round 3 (in the default language: no locale is known).

### Task 18: Round 5, loading
Target `apps/back-office/src/app/[locale]/loading.tsx`. Look at home while the Session check is slowed with a local `await new Promise((r) => setTimeout(r, 3000))`, then revert. Respect `prefers-reduced-motion`, and keep `role="status"` and `aria-busy`.

- [x] Steps 1-5 of the loop. Approved 2026-10-16: eki stamp 待 / 接近中, 到着 brushed on the wall, the status on a small LED board with three lamps (`animate-lamp`). It lives in `[locale]/(signed-in)/loading.tsx`, and `aria-busy` was dropped on purpose: a screen reader holds back a status inside a busy region.

### Task 19: Round 6, the logo and icons
The owner set the direction on 2026-10-13 and a first pass is built: the logo follows Laura's (dark tile, AOF monogram with the flame, a banner carrying BACK OFFICE), with the banner in the Japan Design's blue. This round is the owner's review of it.

Targets:
- `packages/design/src/brand/aof-monogram.ts` (`BRAND`: the monogram, the dark ground, the logo's geometry).
- `apps/back-office/src/features/metadata/utils/logo-svg.ts` (the tab icon) and `components/back-office-mark.tsx` (every PNG); `BACK_OFFICE.LOGO.BANNER` for the banner's colors.

References: Laura's `src/app/icon.svg`, `public/allonfire-laura.svg`, `public/allonfire-laura-horizontal.svg`. Screenshots: the icon, the apple icon, the three manifest PNGs (the maskable one in a circle mask). After any change, regenerate `public/favicon.ico` with the commands from Task 12 Step 3 (the file is `small.png`).

- [x] Steps 1-5 of the loop. Approved 2026-10-16.

### Task 20: Round 7, link-preview card
Target `apps/back-office/src/features/metadata/components/share-card.tsx`. Screenshot the Open Graph image in both languages. Keep each under 300 KB (the e2e test checks it). No App name in the title text beyond `siteName` (Apple TN3156).

- [x] Steps 1-5 of the loop. Approved 2026-10-16; the owner keeps "Back Office" as the card's headline. Also paste the dev URL (via a tunnel the owner chooses) into WhatsApp or iMessage if the owner wants a real preview; that step is optional.

### Task 21: Round 8, iOS launch screens
Target `apps/back-office/src/features/metadata/components/launch-screen.tsx`. Screenshot one iPhone portrait screen in light and in dark, and one iPad landscape screen. The mark must fit inside the shortest edge in landscape.

- [x] Steps 1-5 of the loop. Approved 2026-10-16.

---

## Phase 4: Finish

### Task 22: Docs and full verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `CLAUDE.md`.**
  - In the `ACCESS.APP_SETTINGS` sentence, change "each App's `minRole` and `registration`" to "each App's `minRole`, `registration` and `indexing`".
  - In the sentence listing what lives in `@allonfire/core`, add `METADATA` (`features/metadata/constants/metadata`: Indexing, the metadata paths, the iOS launch devices).
  - Under "Patterns", add one line: "Page information comes from `@allonfire/core/features/next/metadata/*` (`AOFBaseMetadata`, `AOFRobots`, launch screens); an App's Indexing lives in `ACCESS.APP_SETTINGS`, its own values in one object (`BACK_OFFICE`)."
  - Under "Deployment", extend the Back Office build line: it also needs `BACK_OFFICE_URL` (Docker build arg, CI secret, and the same value at runtime).
- [ ] **Step 2: Repo-wide checks.** Run `pnpm turbo run check-types lint test test:browser && pnpm i18n:check && pnpm design:sync --check`. Expected: all green. Fix every failure this plan caused, including ones in files it did not touch.
- [ ] **Step 3: e2e, all four projects.** Run `pnpm --filter @allonfire/back-office test:e2e`. Expected: all PASS on chromium, webkit, mobile-chrome and mobile-safari, including `smoke.spec.ts` and `sign-in.spec.ts`.
- [ ] **Step 4: Deploy prerequisites, for the owner.** Before the deploy:
  - GitHub secret `BACK_OFFICE_URL` in the `dev` environment (CI's build job).
  - GitHub secret `PROD_BACK_OFFICE_URL` (`deploy.yml`'s build arg).
  - `BACK_OFFICE_URL` in Dokploy's env for the compose project, the same value as `PROD_BACK_OFFICE_URL`.
- [ ] **Step 5: Device checks, for the owner** (from the spec's Watch out):
  - On iOS 26/27, Add to Home Screen opens its own window, with the launch screen in light and in dark.
  - iOS 18 opening Safari is the accepted outcome.
  - Android: Add to Home screen makes a shortcut that opens in a Chrome tab.
