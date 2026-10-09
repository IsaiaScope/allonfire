# Back Office Special Pages and Page Information Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Back office every Next.js special page and a complete, correct `<head>` (metadata, icons, manifest, link previews, iOS web app and launch screens), each visual piece designed in the Japan Design, on App scaffolding any App, indexed or not, can reuse.

**Architecture:** App-agnostic pieces (Indexing, base metadata, the `X-Robots-Tag` header, alternates/robots/sitemap helpers, the iOS launch-screen list, links and route) become App scaffolding in `@allonfire/core`. `APP_SETTINGS` gains `indexing`. The Brand monogram becomes an SVG string in `@allonfire/design`. The Back office composes them in its root layout and in metadata route files. Wiring lands first on placeholder visuals with tests, then eight `/aof-design` rounds replace the placeholders one at a time, each stopping for the owner's approval.

**Tech Stack:** Next.js 16.3.6 App Router (`cacheComponents`, `typedRoutes`), next-intl 4.14 (as-needed prefix), `next/og` `ImageResponse` (Satori), zod 4, Vitest 4 (globals), Playwright 1.63, Biome (Ultracite).

**Spec:** `docs/superpowers/specs/2026-10-08-back-office-special-pages-design.md`

## Global Constraints

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
- No commits from the executor: the owner commits with `/iso-commit`. Each task ends with a checkpoint instead.
- Never add `biome-ignore`; fix the code.
- The repo is on exFAT: any new directory-scanning tool ignores `**/._*`.

## Review Focus

1. **Generated metadata URLs reaching the proxy** (`/apple-icon`, `/en/opengraph-image`, `/icon`): a bot fetching them must get the image, not a 404 from the catch-all or a locale redirect. Pinned by the matcher test in Task 8 and the e2e image checks in Task 13.
2. **A page that sets `openGraph` or `robots`** silently drops the layout's `siteName`, locale or `noindex` (shallow merge). Pinned by the e2e head test in Task 10, which checks `og:site_name`, `og:locale` and `robots` on Sign in, a page with its own `title`.
3. **`og:url: "./"` not resolving** to the current page: WhatsApp would show the wrong link. Pinned by the e2e head test in Task 10 (`og:url` equals `${BACK_OFFICE_URL}/sign-in`).
4. **Landscape launch screens never matching**: iOS keeps `device-width` the portrait width in landscape, so a media query that swaps width and height (Laura's) never matches. Pinned by the `AOFLaunchScreenLinks` test in Task 5.
5. **The global pages rendering unstyled or always light**, because they replace the root layout: pinned by the e2e check in Task 11 that `/missing.png` has the Japan background color; round 2 checks dark by screenshot.

---

## File Structure

**Core (`packages/core`)**
- Create `src/features/metadata/constants/indexing.ts`: `INDEXING`, `indexingSchema`, `Indexing`, `ROBOTS_NOINDEX`.
- Modify `src/features/http/constants/http.ts`: `HTTP_HEADER.X_ROBOTS_TAG`.
- Modify `src/features/next/config/aof-create-next-config.ts`: `indexing` option.
- Create `src/features/next/metadata/aof-base-metadata.ts`: `AOFBaseMetadata`.
- Create `src/features/next/metadata/aof-indexed.ts`: `AOFAlternates`, `AOFRobots`, `AOFSitemapEntries`.
- Create `src/features/next/metadata/launch-screens.ts`: `AOF_LAUNCH_SCREENS`, `launchScreenVariants`, `launchScreenFile`, `AOFLaunchScreenLinks`.
- Create `src/features/next/metadata/aof-launch-screen-route.ts`: `AOFLaunchScreenRoute`.
- Tests under `src/features/metadata/tests/` and `src/features/next/metadata/tests/`.
- Modify `src/features/next/i18n/translations/{en,it}.json`: `Common.Error.reference`, `Common.Loading.label`.

**Database (`packages/database`)**
- Modify `src/features/auth/access/constants/app-settings.ts` and its test: `indexing`.

**Design (`packages/design`)**
- Create `src/brand/aof-monogram.ts`: `AOF_MONOGRAM_SVG`, `AOF_MONOGRAM_DATA_URL`.
- Create `src/designs/japan/image-fonts.ts`: `loadJapanImageFonts`.
- Add `src/designs/japan/fonts/atkinson-hyperlegible-next-{400,700}.ttf`.

**Back office (`apps/back-office`)**
- Modify `src/environment/environment.ts` (+ test), `.env.example`, `next.config.ts`, `src/proxy.ts` (+ `src/proxy.test.ts`).
- Create `src/features/errors/components/{not-found-notice,error-notice}.tsx` (+ tests).
- Create `src/features/metadata/constants/colors.ts` (+ test), `src/features/metadata/components/{back-office-mark,share-card,launch-screen}.tsx`, `src/features/metadata/utils/image-fonts.ts`.
- Modify `src/app/[locale]/layout.tsx`, `not-found.tsx`, `error.tsx`, `src/app/global-error.tsx`.
- Create `src/app/global-not-found.tsx`, `src/app/[locale]/loading.tsx`, `src/app/robots.ts`, `src/app/manifest.ts`, `src/app/icon.tsx`, `src/app/apple-icon.tsx`, `src/app/manifest-icon/[icon]/route.tsx`, `src/app/launch/[screen]/route.tsx`, `src/app/[locale]/opengraph-image.tsx`, `src/app/[locale]/twitter-image.tsx`, `public/favicon.ico`.
- Modify `e2e/smoke.spec.ts`.

**Repo**
- Modify `docker/Dockerfile`, `.github/workflows/ci.yml`, `CLAUDE.md`.

---

## Phase 1: Core scaffolding

### Task 1: Indexing and the `X-Robots-Tag` header

**Files:**
- Create: `packages/core/src/features/metadata/constants/indexing.ts`
- Modify: `packages/core/src/features/http/constants/http.ts:99-124`
- Modify: `packages/core/src/features/next/config/aof-create-next-config.ts`
- Modify: `packages/core/package.json` (exports)
- Test: `packages/core/src/features/next/config/tests/aof-create-next-config.test.ts`

**Interfaces:**
- Produces: `INDEXING = { INDEXED: "indexed", UNINDEXED: "unindexed" }`, `indexingSchema`, `type Indexing`, `ROBOTS_NOINDEX = "noindex, nofollow"` from `@allonfire/core/features/metadata/constants/indexing`; `HTTP_HEADER.X_ROBOTS_TAG = "x-robots-tag"`; `AOFCreateNextConfig(config, { indexing?: Indexing })`, which defaults to `INDEXING.UNINDEXED`.

- [ ] **Step 1: Write the failing tests** (append to the existing `describe`):

```ts
  it("keeps an unindexed App out of search on every path, by default", async () => {
    const headers = await AOFCreateNextConfig().headers?.();
    expect(headers?.[0]).toEqual({
      headers: [
        ...SECURITY_HEADERS,
        { key: HTTP_HEADER.X_ROBOTS_TAG, value: ROBOTS_NOINDEX },
      ],
      source: "/(.*)",
    });
  });

  it("sends no X-Robots-Tag for an indexed App", async () => {
    const headers = await AOFCreateNextConfig(
      {},
      { indexing: INDEXING.INDEXED }
    ).headers?.();
    expect(headers?.[0]).toEqual({ headers: SECURITY_HEADERS, source: "/(.*)" });
  });
```

Add the imports at the top:

```ts
import { HTTP_HEADER } from "../../../http/constants/http";
import {
  INDEXING,
  ROBOTS_NOINDEX,
} from "../../../metadata/constants/indexing";
```

The existing test "sends the security headers first and the App's after" now expects the unindexed default. Change its first entry to:

```ts
      {
        headers: [
          ...SECURITY_HEADERS,
          { key: HTTP_HEADER.X_ROBOTS_TAG, value: ROBOTS_NOINDEX },
        ],
        source: "/(.*)",
      },
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @allonfire/core test -- src/features/next/config`
Expected: FAIL, `Cannot find module '../../../metadata/constants/indexing'`.

- [ ] **Step 3: Implement**

`packages/core/src/features/metadata/constants/indexing.ts`:

```ts
import { z } from "zod";

/**
 * Whether search engines may list an App's pages (CONTEXT.md, Indexing).
 * Unindexed Apps still give link previews: only search listing is refused.
 */
export const INDEXING = {
  INDEXED: "indexed",
  UNINDEXED: "unindexed",
} as const;

export const indexingSchema = z.enum(INDEXING);
export type Indexing = z.infer<typeof indexingSchema>;

/** The robots directive an unindexed App sends, as meta tag and header. */
export const ROBOTS_NOINDEX = "noindex, nofollow";
```

In `http.ts`, add inside `HTTP_HEADER` after `X_REQUEST_ID` (keep the keys sorted):

```ts
  X_REQUEST_ID: "x-request-id",
  /** Robots directives for any response, images and JSON included. */
  X_ROBOTS_TAG: "x-robots-tag",
```

In `aof-create-next-config.ts`, import and extend `Options`:

```ts
import { HTTP_HEADER } from "../../http/constants/http";
import {
  INDEXING,
  type Indexing,
  ROBOTS_NOINDEX,
} from "../../metadata/constants/indexing";
```

```ts
  /**
   * The App's Indexing, from `APP_SETTINGS`. Unindexed (the default, so an
   * App that forgets is never listed) sends `X-Robots-Tag` on every path.
   */
  indexing?: Indexing | undefined;
```

Change the signature to `{ transpile = [], intl, indexing = INDEXING.UNINDEXED }: Options = {}` and the headers entry to:

```ts
    headers: async () => [
      {
        headers:
          indexing === INDEXING.INDEXED
            ? SECURITY_HEADERS
            : [
                ...SECURITY_HEADERS,
                { key: HTTP_HEADER.X_ROBOTS_TAG, value: ROBOTS_NOINDEX },
              ],
        source: "/(.*)",
      },
      ...((await config.headers?.()) ?? []),
    ],
```

Add to `packages/core/package.json` `exports`, in sorted position:

```json
    "./features/metadata/constants/indexing": "./src/features/metadata/constants/indexing.ts",
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter @allonfire/core test -- src/features/next/config src/features/http`
Expected: PASS. `src/features/http/tests/http.test.ts` may assert the header list; if it fails, add `X_ROBOTS_TAG` to its expectation.

- [ ] **Step 5: Checkpoint**

Run: `pnpm biome check --write packages/core/src/features/metadata packages/core/src/features/http packages/core/src/features/next/config packages/core/package.json`
Expected: no remaining diagnostics.

---

### Task 2: `APP_SETTINGS.indexing`

**Files:**
- Modify: `packages/database/src/features/auth/access/constants/app-settings.ts`
- Test: `packages/database/src/features/auth/access/tests/app-settings.test.ts`

**Interfaces:**
- Consumes: `INDEXING`, `type Indexing` (Task 1).
- Produces: `AppSettings.indexing: Indexing`; `APP_SETTINGS[App.BACK_OFFICE].indexing === "unindexed"`, and the same for Laura.

- [ ] **Step 1: Write the failing test.** Replace the "keeps the Back office sign-in only and Admin-only" test with:

```ts
  it("keeps the Back office sign-in only, Admin-only and out of search", () => {
    expect(APP_SETTINGS[App.BACK_OFFICE]).toEqual({
      indexing: INDEXING.UNINDEXED,
      minRole: Role.ADMIN,
      registration: null,
    });
  });

  it("keeps Laura out of search", () => {
    expect(APP_SETTINGS[App.LAURA].indexing).toBe(INDEXING.UNINDEXED);
  });
```

Add `import { INDEXING } from "@allonfire/core/features/metadata/constants/indexing";`.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/database test -- src/features/auth/access/tests/app-settings.test.ts`
Expected: FAIL, `indexing` missing from the received object.

- [ ] **Step 3: Implement**

```ts
import {
  INDEXING,
  type Indexing,
} from "@allonfire/core/features/metadata/constants/indexing";
```

In `AppSettings`:

```ts
  /** Whether search engines may list this App's pages (CONTEXT.md, Indexing). */
  indexing: Indexing;
```

Rows:

```ts
  [App.LAURA]: {
    indexing: INDEXING.UNINDEXED,
    minRole: Role.VIEWER,
    registration: null,
  },
  [App.BACK_OFFICE]: {
    indexing: INDEXING.UNINDEXED,
    minRole: Role.ADMIN,
    registration: null,
  },
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @allonfire/database test -- src/features/auth/access && pnpm --filter @allonfire/database check-types`
Expected: PASS. A missing `indexing` on any row fails `check-types` through `satisfies AppSettingsTable`, so no separate type test is needed.

- [ ] **Step 5: Checkpoint.** Run `pnpm biome check --write packages/database/src/features/auth/access`. Also run `grep -rn "APP_SETTINGS\[" apps packages --include=*.ts -l` and check every `toEqual` on a full row; update it to include `indexing`.

---

### Task 3: `AOFBaseMetadata`

**Files:**
- Create: `packages/core/src/features/next/metadata/aof-base-metadata.ts`
- Modify: `packages/core/package.json` (exports)
- Test: `packages/core/src/features/next/metadata/tests/aof-base-metadata.test.ts`

**Interfaces:**
- Consumes: `INDEXING`, `type Indexing`, `ROBOTS_NOINDEX` (Task 1); `type ContentLanguage` from `features/i18n/constants/locales`.
- Produces:
  - `AOFBaseMetadata({ appName: string; indexing: Indexing; locale: ContentLanguage; locales: readonly ContentLanguage[]; startupImage?: AppleImageDescriptor[] }): Metadata`. It returns `applicationName`, `appleWebApp`, `formatDetection`, `openGraph`, `other`, `robots` and `twitter`, and never `title`, `description` or `metadataBase`.
  - `OG_LOCALE` (`en` maps to `en_US`, `it` to `it_IT`).

- [ ] **Step 1: Write the failing test**

```ts
// @module-tag unit
import { INDEXING } from "../../../metadata/constants/indexing";
import { AOFBaseMetadata } from "../aof-base-metadata";

const base = {
  appName: "Back office",
  indexing: INDEXING.UNINDEXED,
  locale: "it",
  locales: ["en", "it"],
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
      AOFBaseMetadata({ ...base, indexing: INDEXING.INDEXED }).robots
    ).toEqual({ follow: true, index: true });
  });

  it("describes the page for link previews in the request's language", () => {
    expect(AOFBaseMetadata(base).openGraph).toEqual({
      alternateLocale: ["en_US"],
      locale: "it_IT",
      siteName: "Back office",
      type: "website",
      url: "./",
    });
    expect(AOFBaseMetadata(base).twitter).toEqual({
      card: "summary_large_image",
    });
  });

  it("makes the App an iOS web app with launch screens", () => {
    const startupImage = [{ media: "(orientation: portrait)", url: "/l.png" }];
    const metadata = AOFBaseMetadata({ ...base, startupImage });
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      startupImage,
      statusBarStyle: "default",
      title: "Back office",
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

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Implement**

```ts
import type { Metadata } from "next";
import type { AppleImageDescriptor } from "next/dist/lib/metadata/types/extra-types";
import type { ContentLanguage } from "../../i18n/constants/locales";
import { INDEXING, type Indexing } from "../../metadata/constants/indexing";

/** Open Graph wants `language_TERRITORY`; each language's main region. */
export const OG_LOCALE = {
  en: "en_US",
  it: "it_IT",
} as const satisfies Record<ContentLanguage, string>;

type Options = {
  /** The App's name: tab, iOS home-screen title, link-preview site name. */
  appName: string;
  indexing: Indexing;
  locale: ContentLanguage;
  locales: readonly ContentLanguage[];
  /** iOS launch screens, from `AOFLaunchScreenLinks`. */
  startupImage?: AppleImageDescriptor[] | undefined;
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
        .map((other) => OG_LOCALE[other]),
      locale: OG_LOCALE[locale],
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
      indexing === INDEXING.INDEXED
        ? { follow: true, index: true }
        : { follow: false, index: false },
    twitter: { card: "summary_large_image" },
  }) satisfies Metadata;
```

If `next/dist/lib/metadata/types/extra-types` is not importable under the package's `moduleResolution`, use `type AppleImageDescriptor = { url: string; media?: string }` locally. That is the same shape, and `satisfies Metadata` checks it.

Add the export key `"./features/next/metadata/aof-base-metadata": "./src/features/next/metadata/aof-base-metadata.ts"`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata && pnpm --filter @allonfire/core check-types`
Expected: PASS.

- [ ] **Step 5: Checkpoint.** Run `pnpm biome check --write packages/core/src/features/next/metadata packages/core/package.json`.

---

### Task 4: Indexed-App helpers (`AOFAlternates`, `AOFRobots`, `AOFSitemapEntries`)

**Files:**
- Create: `packages/core/src/features/next/metadata/aof-indexed.ts`
- Modify: `packages/core/package.json`
- Test: `packages/core/src/features/next/metadata/tests/aof-indexed.test.ts`

**Interfaces:**
- Consumes: `INDEXING`, `type Indexing` (Task 1); `objectFromEntries`.
- Produces:
  - `type AsNeededRouting = { defaultLocale: string; locales: readonly string[] }`
  - `localizedPath(pathname: string, locale: string, routing: AsNeededRouting): string`
  - `AOFAlternates(pathname: string, locale: string, routing): NonNullable<Metadata["alternates"]>`
  - `AOFRobots({ indexing, origin }: { indexing: Indexing; origin: string }): MetadataRoute.Robots`
  - `AOFSitemapEntries(paths: readonly string[], origin: string, routing): MetadataRoute.Sitemap`

- [ ] **Step 1: Write the failing test**

```ts
// @module-tag unit
import { INDEXING } from "../../../metadata/constants/indexing";
import {
  AOFAlternates,
  AOFRobots,
  AOFSitemapEntries,
  localizedPath,
} from "../aof-indexed";

const routing = { defaultLocale: "en", locales: ["en", "it"] } as const;
const ORIGIN = "https://example.com";

describe("localizedPath", () => {
  it("prefixes every language but the default", () => {
    expect(localizedPath("/", "en", routing)).toBe("/");
    expect(localizedPath("/", "it", routing)).toBe("/it");
    expect(localizedPath("/games", "en", routing)).toBe("/games");
    expect(localizedPath("/games", "it", routing)).toBe("/it/games");
  });
});

describe("AOFAlternates", () => {
  it("points canonical at this language and lists every language plus x-default", () => {
    expect(AOFAlternates("/games", "it", routing)).toEqual({
      canonical: "/it/games",
      languages: { en: "/games", it: "/it/games", "x-default": "/games" },
    });
  });
});

describe("AOFRobots", () => {
  it("never blocks crawling, so an unindexed App's noindex stays readable", () => {
    expect(AOFRobots({ indexing: INDEXING.UNINDEXED, origin: ORIGIN })).toEqual(
      { rules: { allow: "/", userAgent: "*" } }
    );
  });

  it("points an indexed App's crawlers at its sitemap", () => {
    expect(AOFRobots({ indexing: INDEXING.INDEXED, origin: ORIGIN })).toEqual({
      rules: { allow: "/", userAgent: "*" },
      sitemap: "https://example.com/sitemap.xml",
    });
  });
});

describe("AOFSitemapEntries", () => {
  it("lists each path once, with every language as an alternate", () => {
    expect(AOFSitemapEntries(["/", "/games"], ORIGIN, routing)).toEqual([
      {
        alternates: {
          languages: {
            en: "https://example.com/",
            it: "https://example.com/it",
          },
        },
        url: "https://example.com/",
      },
      {
        alternates: {
          languages: {
            en: "https://example.com/games",
            it: "https://example.com/it/games",
          },
        },
        url: "https://example.com/games",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata/tests/aof-indexed.test.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Implement**

```ts
import type { Metadata, MetadataRoute } from "next";
import { objectFromEntries } from "../../../shared/utils/object";
import { INDEXING, type Indexing } from "../../metadata/constants/indexing";

/** next-intl's as-needed routing, as `AOFDefineRouting` builds it. */
export type AsNeededRouting = {
  defaultLocale: string;
  locales: readonly string[];
};

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
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
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
  rules: { allow: "/", userAgent: "*" },
  ...(indexing === INDEXING.INDEXED
    ? { sitemap: new URL("/sitemap.xml", origin).href }
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

`new URL("/", origin).href` is `https://example.com/`, which matches the test.

Add the export key `"./features/next/metadata/aof-indexed": "./src/features/next/metadata/aof-indexed.ts"`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata && pnpm --filter @allonfire/core check-types`
Expected: PASS.

- [ ] **Step 5: Checkpoint.** Run `pnpm biome check --write packages/core/src/features/next/metadata packages/core/package.json`.

---

### Task 5: iOS launch screens (list, links, route)

**Files:**
- Create: `packages/core/src/features/next/metadata/launch-screens.ts`
- Create: `packages/core/src/features/next/metadata/aof-launch-screen-route.ts`
- Modify: `packages/core/package.json`
- Test: `packages/core/src/features/next/metadata/tests/launch-screens.test.ts`

**Interfaces:**
- Produces:
  - `type LaunchScreen = { width: number; height: number; ratio: 2 | 3 }`: the portrait CSS size.
  - `AOF_LAUNCH_SCREENS: readonly LaunchScreen[]`
  - `LAUNCH_THEME = { LIGHT: "light", DARK: "dark" }`, `type LaunchTheme`
  - `type LaunchScreenVariant = LaunchScreen & { orientation: "portrait" | "landscape"; theme: LaunchTheme; pixelWidth: number; pixelHeight: number }`
  - `launchScreenVariants(screens?): LaunchScreenVariant[]`
  - `launchScreenFile(variant): string`, e.g. `"1170x2532-light.png"`
  - `AOFLaunchScreenLinks(basePath?: string): { url: string; media: string }[]`
  - `AOFLaunchScreenRoute(render: (variant: LaunchScreenVariant) => Promise<ImageResponse>)`, which returns `{ GET, generateStaticParams }`.

- [ ] **Step 1: Write the failing test**

```ts
// @module-tag unit
import {
  AOF_LAUNCH_SCREENS,
  AOFLaunchScreenLinks,
  launchScreenFile,
  launchScreenVariants,
} from "../launch-screens";
import { AOFLaunchScreenRoute } from "../aof-launch-screen-route";

const IPHONE_13 = { height: 844, ratio: 3, width: 390 } as const;

describe("launch screens", () => {
  it("lists each device size once", () => {
    const keys = AOF_LAUNCH_SCREENS.map(
      ({ height, ratio, width }) => `${width}x${height}@${ratio}`
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every device a portrait and a landscape screen in each theme", () => {
    expect(launchScreenVariants([IPHONE_13]).map(launchScreenFile)).toEqual([
      "1170x2532-light.png",
      "1170x2532-dark.png",
      "2532x1170-light.png",
      "2532x1170-dark.png",
    ]);
  });

  it("keeps device-width the portrait width in landscape, as iOS reports it", () => {
    const landscape = AOFLaunchScreenLinks().find(({ url }) =>
      url.endsWith("/2532x1170-dark.png")
    );
    expect(landscape).toEqual({
      media:
        "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: dark)",
      url: "/launch/2532x1170-dark.png",
    });
  });

  it("builds every linked screen at build time", async () => {
    const route = AOFLaunchScreenRoute(async () => new Response("png"));
    const files = (await route.generateStaticParams()).map(({ screen }) => screen);
    expect(files).toEqual(
      AOFLaunchScreenLinks().map(({ url }) => url.replace("/launch/", ""))
    );
  });

  it("answers 404 for a screen it does not list", async () => {
    const route = AOFLaunchScreenRoute(async () => new Response("png"));
    const response = await route.GET(new Request("http://x/launch/1x1.png"), {
      params: Promise.resolve({ screen: "1x1-light.png" }),
    });
    expect(response.status).toBe(404);
  });
});
```

The render callback is typed to return `Promise<Response>`. `ImageResponse` extends `Response`, so the test's stub fits.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata/tests/launch-screens.test.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Implement `launch-screens.ts`**

```ts
import { z } from "zod";

/** A device's screen in CSS pixels, portrait, and its pixel ratio. */
export type LaunchScreen = { width: number; height: number; ratio: 2 | 3 };

/**
 * Every iPhone and iPad on iOS/iPadOS 26-27, one entry per CSS size and
 * ratio (checked 2026-10-08: useyourloaf.com iPhone 17 and iPad 2024 sizes,
 * iPhone 18 Pro from its announcement). Add a size when Apple ships one;
 * the screens and links follow.
 */
export const AOF_LAUNCH_SCREENS = [
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
] as const satisfies readonly LaunchScreen[];

export const LAUNCH_THEME = { DARK: "dark", LIGHT: "light" } as const;
export const launchThemeSchema = z.enum(LAUNCH_THEME);
export type LaunchTheme = z.infer<typeof launchThemeSchema>;

export const LAUNCH_ORIENTATION = {
  LANDSCAPE: "landscape",
  PORTRAIT: "portrait",
} as const;
export const launchOrientationSchema = z.enum(LAUNCH_ORIENTATION);
export type LaunchOrientation = z.infer<typeof launchOrientationSchema>;

export type LaunchScreenVariant = LaunchScreen & {
  orientation: LaunchOrientation;
  theme: LaunchTheme;
  pixelWidth: number;
  pixelHeight: number;
};

const THEMES = [LAUNCH_THEME.LIGHT, LAUNCH_THEME.DARK] as const;
const ORIENTATIONS = [
  LAUNCH_ORIENTATION.PORTRAIT,
  LAUNCH_ORIENTATION.LANDSCAPE,
] as const;

/** Each screen in both orientations and both themes, in pixels. */
export const launchScreenVariants = (
  screens: readonly LaunchScreen[] = AOF_LAUNCH_SCREENS
): LaunchScreenVariant[] =>
  screens.flatMap((screen) =>
    ORIENTATIONS.flatMap((orientation) =>
      THEMES.map((theme) => {
        const portrait = orientation === LAUNCH_ORIENTATION.PORTRAIT;
        return {
          ...screen,
          orientation,
          pixelHeight: (portrait ? screen.height : screen.width) * screen.ratio,
          pixelWidth: (portrait ? screen.width : screen.height) * screen.ratio,
          theme,
        };
      })
    )
  );

/** The PNG's file name: its pixel size (orientation follows) and theme. */
export const launchScreenFile = ({
  pixelHeight,
  pixelWidth,
  theme,
}: LaunchScreenVariant) => `${pixelWidth}x${pixelHeight}-${theme}.png`;

export const LAUNCH_SCREEN_PATH = "/launch";

/**
 * `appleWebApp.startupImage` entries. iOS reports `device-width` as the
 * portrait width in both orientations, so it is never swapped. iOS keeps the
 * screen it picked at install: a later theme change shows the old one.
 */
export const AOFLaunchScreenLinks = (basePath = LAUNCH_SCREEN_PATH) =>
  launchScreenVariants().map((variant) => ({
    media: `(device-width: ${variant.width}px) and (device-height: ${variant.height}px) and (-webkit-device-pixel-ratio: ${variant.ratio}) and (orientation: ${variant.orientation}) and (prefers-color-scheme: ${variant.theme})`,
    url: `${basePath}/${launchScreenFile(variant)}`,
  }));
```

- [ ] **Step 4: Implement `aof-launch-screen-route.ts`**

```ts
import { HTTP_STATUS } from "../../http/constants/http";
import {
  launchScreenFile,
  type LaunchScreenVariant,
  launchScreenVariants,
} from "./launch-screens";

type Context = { params: Promise<{ screen: string }> };

/**
 * The App's `app/launch/[screen]/route.tsx` re-exports `GET` and
 * `generateStaticParams` from this; it only says how a screen looks, usually
 * `new ImageResponse(<Mark />, { width: pixelWidth, height: pixelHeight })`.
 * Every listed screen is built at build time.
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
      : new Response(null, { status: HTTP_STATUS.NOT_FOUND });
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

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @allonfire/core test -- src/features/next/metadata && pnpm --filter @allonfire/core check-types`
Expected: PASS, with 20 screens x 4 = 80 files.

- [ ] **Step 6: Checkpoint.** Run `pnpm biome check --write packages/core/src/features/next/metadata packages/core/package.json`.

---

### Task 6: Shared text for the global pages

**Files:**
- Modify: `packages/core/src/features/next/i18n/translations/en.json`, `it.json`

**Interfaces:**
- Produces: `Common.Error.reference` (ICU, `{digest}`) and `Common.Loading.label`, read by Task 11.

- [ ] **Step 1: Add the keys.** `en.json`:

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

- [ ] **Step 2: Verify.** Run `pnpm --filter @allonfire/core i18n:check && pnpm --filter @allonfire/core check-types`. Expected: PASS. `SharedTranslations` is `typeof EN`, so Italian missing a key fails.

---

## Phase 2: Back office wiring (placeholder visuals)

### Task 7: Brand monogram and image fonts in the design package

**Files:**
- Create: `packages/design/src/brand/aof-monogram.ts`
- Create: `packages/design/src/designs/japan/image-fonts.ts`
- Add: `packages/design/src/designs/japan/fonts/atkinson-hyperlegible-next-400.ttf`, `-700.ttf`
- Modify: `packages/design/package.json` (exports), `packages/design/src/designs/japan/fonts/README.md`
- Test: `packages/design/src/brand/tests/aof-monogram.test.ts`

**Interfaces:**
- Produces:
  - `AOF_MONOGRAM_SVG: string`, a `viewBox="0 0 512 512"` SVG with no background and no label.
  - `AOF_MONOGRAM_DATA_URL: string`
  - `loadJapanImageFonts(): Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[]>`

- [ ] **Step 1: Write the failing test**

```ts
// @module-tag unit
import { AOF_MONOGRAM_DATA_URL, AOF_MONOGRAM_SVG } from "../aof-monogram";

describe("AOF monogram", () => {
  it("is the monogram alone: no background, no App label", () => {
    expect(AOF_MONOGRAM_SVG).toContain('viewBox="0 0 512 512"');
    expect(AOF_MONOGRAM_SVG).not.toContain("<rect");
    expect(AOF_MONOGRAM_SVG).not.toContain("<text");
  });

  it("embeds as a data URL any image renderer can load", () => {
    expect(AOF_MONOGRAM_DATA_URL).toBe(
      `data:image/svg+xml;base64,${Buffer.from(AOF_MONOGRAM_SVG).toString("base64")}`
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/design test -- src/brand`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Implement `aof-monogram.ts`.** The markup is Laura's `apps/laura/src/app/icon.svg` without the `#151515` background, the "LAURA" box and their defs. It is re-centred (`translate(244, 256)` instead of `translate(244, 230)`) now that the label is gone. Round 6 restyles it.

```ts
/**
 * The Brand (CONTEXT.md): the AOF monogram, its O lit by the flame, without
 * background or App label. A string, not a .svg file, so an App can answer it
 * as its icon and embed it in generated images without a bundler loader.
 * Drawn from Laura's icon; restyled in the Back office's mark round.
 */
export const AOF_MONOGRAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
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

export const AOF_MONOGRAM_DATA_URL = `data:image/svg+xml;base64,${Buffer.from(AOF_MONOGRAM_SVG).toString("base64")}`;
```

- [ ] **Step 4: Fetch the TTFs.** Satori reads TTF, OTF or WOFF, not WOFF2 or variable fonts. Google Fonts serves static TTF to a client without a modern User-Agent:

```bash
cd packages/design/src/designs/japan/fonts
curl -s "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700" -A "curl" | grep -o 'https://[^)]*\.ttf' > /private/tmp/claude-501/aof-ttf-urls.txt
cat /private/tmp/claude-501/aof-ttf-urls.txt   # expect two URLs: 400 first, 700 second
curl -sL "$(sed -n 1p /private/tmp/claude-501/aof-ttf-urls.txt)" -o atkinson-hyperlegible-next-400.ttf
curl -sL "$(sed -n 2p /private/tmp/claude-501/aof-ttf-urls.txt)" -o atkinson-hyperlegible-next-700.ttf
file atkinson-hyperlegible-next-*.ttf   # expect "TrueType Font data"
```

Add one line to `fonts/README.md`: "`atkinson-hyperlegible-next-{400,700}.ttf`: static TTF instances for generated images (Satori cannot read WOFF2), same OFL licence."

- [ ] **Step 5: Implement `image-fonts.ts`**

```ts
import { readFile } from "node:fs/promises";

const FONT = "Atkinson Hyperlegible Next";

/**
 * The Japan Design's text face for `ImageResponse`. `new URL(..., import.meta.url)`
 * lets the bundler trace the files; images are built at build time, so the
 * runner never reads them.
 */
export const loadJapanImageFonts = async () => [
  {
    data: await readFile(
      new URL("./fonts/atkinson-hyperlegible-next-400.ttf", import.meta.url)
    ),
    name: FONT,
    style: "normal" as const,
    weight: 400 as const,
  },
  {
    data: await readFile(
      new URL("./fonts/atkinson-hyperlegible-next-700.ttf", import.meta.url)
    ),
    name: FONT,
    style: "normal" as const,
    weight: 700 as const,
  },
];
```

If Biome or the Global Constraints flag the `as const` on the literals, use `satisfies` on a typed object: `({ ... }) satisfies { style: "normal"; weight: 400 }`.

Exports in `packages/design/package.json`:

```json
    "./brand/aof-monogram": "./src/brand/aof-monogram.ts",
    "./designs/japan/image-fonts": "./src/designs/japan/image-fonts.ts",
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm --filter @allonfire/design test && pnpm --filter @allonfire/design check-types`
Expected: PASS.

- [ ] **Step 7: Checkpoint.** Run `pnpm biome check --write packages/design/src/brand packages/design/src/designs/japan/image-fonts.ts packages/design/package.json`.

---

### Task 8: Env, Next config, proxy matcher, deploy wiring

**Files:**
- Modify: `apps/back-office/src/environment/environment.ts`, `src/environment/tests/environment.test.ts`, `.env.example`
- Modify: `apps/back-office/next.config.ts`, `apps/back-office/src/proxy.ts`
- Create: `apps/back-office/src/proxy.test.ts`
- Modify: `docker/Dockerfile:28-44`, `.github/workflows/ci.yml` (`build.env`)

**Interfaces:**
- Consumes: `APP_SETTINGS` (Task 2), the `indexing` option (Task 1).
- Produces: `env.BACK_OFFICE_URL: string`, plus a proxy `config.matcher` that skips generated metadata routes.

- [ ] **Step 1: Write the failing tests.** In `environment.test.ts`, add `vi.stubEnv("BACK_OFFICE_URL", "http://localhost:3400");` to `beforeEach` and these cases:

```ts
  it("refuses to start without the Back office's own address", async () => {
    vi.stubEnv("BACK_OFFICE_URL", undefined);
    await expect(import("../environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("refuses an address that is not a URL", async () => {
    vi.stubEnv("BACK_OFFICE_URL", "back-office");
    await expect(import("../environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });
```

`src/proxy.test.ts`:

```ts
// @module-tag unit
// @vitest-environment node
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "./proxy";

vi.mock("@allonfire/auth/features/next/utils/with-session-refresh", () => ({
  withSessionRefresh: (handler: unknown) => handler,
}));
vi.mock("@allonfire/core/features/next/i18n/aof-create-middleware", () => ({
  AOFCreateMiddleware: () => () => undefined,
}));

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it.each(["/", "/sign-in", "/it", "/it/sign-in", "/icons", "/iconic"])(
    "routes the page %s",
    (url) => {
      expect(matches(url)).toBe(true);
    }
  );

  it.each([
    "/icon",
    "/apple-icon",
    "/opengraph-image",
    "/en/opengraph-image",
    "/it/twitter-image",
    "/opengraph-image-abc123",
    "/opengraph-image/card",
    "/it/twitter-image/card",
    "/manifest.webmanifest",
    "/launch/750x1334-light.png",
    "/manifest-icon/512.png",
    "/favicon.ico",
    "/_next/static/chunk.js",
    "/api/health",
  ])("leaves the file %s to Next", (url) => {
    expect(matches(url)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @allonfire/back-office test -- src/proxy.test.ts src/environment`
Expected: FAIL. `/icon`, `/apple-icon` and the image routes match the old matcher, and the env cases resolve instead of throwing.

- [ ] **Step 3: Implement.** In `environment.ts`, add a `server` block:

```ts
  server: {
    /**
     * The Back office's own public address: metadataBase for every absolute
     * URL in its head (link-preview images, og:url, manifest). Read at build
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
# previews, manifest). Read at build and at runtime: keep them equal.
BACK_OFFICE_URL="http://localhost:3400"
```

`proxy.ts`. Next requires a literal matcher, so the exclusions are written out:

```ts
export const config = {
  // Pages only: files with a dot, Next internals, the API, and generated
  // metadata routes (icons, preview images, with or without a locale) skip
  // the proxy, so bots get the file, not a locale redirect or the 404.
  matcher:
    "/((?!api|_next|_vercel|(?:[a-z]{2}/)?(?:apple-icon|icon|opengraph-image|twitter-image)(?:-\\w+)?(?:/\\w+)?$|.*\\..*).*)",
};
```

If Next rejects the pattern (path-to-regexp error at test or build), rewrite the regex until the unchanged test passes. Keep every listed case.

`next.config.ts`:

```ts
import { App } from "@allonfire/database/enums";
import { APP_SETTINGS } from "@allonfire/database/features/auth/access/constants/app-settings";
```

```ts
export default AOFCreateNextConfig(
  withStorageImages(
    // The global 404 for URLs no route matches (dotted paths skip the proxy,
    // so no locale or layout renders them). Experimental in 16.3.6.
    { experimental: { globalNotFound: true } },
    { origin: buildEnv.STORAGE_ENDPOINT }
  ),
  {
    indexing: APP_SETTINGS[App.BACK_OFFICE].indexing,
    intl: { requestConfig: "./src/features/i18n/request.ts" },
    transpile: [ /* unchanged */ ],
  }
);
```

Check first that `withStorageImages` spreads its first argument; open `packages/storage/src/features/image/next/with-storage-images.ts`. If it drops other keys, pass `experimental` on the object it returns.

`docker/Dockerfile`: add `ARG BACK_OFFICE_URL` beside `ARG NEXT_PUBLIC_API_URL`, and `BACK_OFFICE_URL=${BACK_OFFICE_URL} \` to the `ENV` list. Extend the comment: "BACK_OFFICE_URL is the Back office's metadataBase, baked into prerendered pages; it must equal the runtime value."

`.github/workflows/ci.yml` `build.env`: add `BACK_OFFICE_URL: ${{ secrets.BACK_OFFICE_URL }}`.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter @allonfire/back-office test -- src/proxy.test.ts src/environment`
Expected: PASS.

- [ ] **Step 5: Local env.** Add `BACK_OFFICE_URL="http://localhost:3400"` to `apps/back-office/.env.development` (gitignored). Then tell the owner that a running `next dev` must be restarted to read it. Do not restart a dev server you did not start.

- [ ] **Step 6: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/proxy.ts apps/back-office/src/proxy.test.ts apps/back-office/src/environment apps/back-office/next.config.ts`.

---

### Task 9: Theme colors in code and the placeholder mark

**Files:**
- Create: `apps/back-office/src/features/metadata/constants/app.ts`
- Create: `apps/back-office/src/features/metadata/constants/colors.ts`
- Create: `apps/back-office/src/features/metadata/constants/tests/colors.test.ts`
- Create: `apps/back-office/src/features/metadata/components/back-office-mark.tsx`
- Create: `apps/back-office/src/features/metadata/utils/image-fonts.ts`
- Test: `apps/back-office/src/features/metadata/components/tests/back-office-mark.test.tsx`

**Interfaces:**
- Consumes: `AOF_MONOGRAM_DATA_URL`, `loadJapanImageFonts` (Task 7); `LaunchTheme` (Task 5).
- Produces:
  - `APP_NAME = "Back office"`: tab, iOS title, preview site name, manifest, label.
  - `BACK_OFFICE_COLORS = { light: { background, primary, foreground }, dark: {...} }`
  - `BackOfficeMark({ theme: LaunchTheme; size: number; label?: boolean })`: Satori-safe JSX.
  - `imageFonts()`, which re-exports `loadJapanImageFonts` so App files import one place.

- [ ] **Step 1: Write the failing tests.** `colors.test.ts`:

```ts
// @module-tag unit
// @vitest-environment node
import { readFileSync } from "node:fs";
import { BACK_OFFICE_COLORS } from "../colors";

const THEME = readFileSync(
  new URL(
    "../../../../../../../packages/design/src/designs/japan/theme.css",
    import.meta.url
  ),
  "utf8"
);

/** Every value of a token in theme.css order: `:root` first, `.dark` second. */
const tokenValues = (token: string) =>
  [...THEME.matchAll(new RegExp(`--${token}: (#[0-9a-f]{6});`, "g"))].map(
    ([, value]) => value
  );

describe("BACK_OFFICE_COLORS", () => {
  it.each(["background", "primary", "foreground"] as const)(
    "matches the Japan Design's --%s in both themes",
    (token) => {
      expect([
        BACK_OFFICE_COLORS.light[token],
        BACK_OFFICE_COLORS.dark[token],
      ]).toEqual(tokenValues(token));
    }
  );
});
```

`back-office-mark.test.tsx`:

```ts
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { BackOfficeMark } from "../back-office-mark";

describe("BackOfficeMark", () => {
  it("draws the monogram and, when asked, the App's label", () => {
    const html = renderToStaticMarkup(
      <BackOfficeMark label size={512} theme="dark" />
    );
    expect(html).toContain("data:image/svg+xml;base64,");
    expect(html).toContain("Back office");
  });

  it("leaves the label out at icon sizes", () => {
    const html = renderToStaticMarkup(
      <BackOfficeMark size={180} theme="light" />
    );
    expect(html).not.toContain("Back office");
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `grep -n -- "--foreground:" packages/design/src/designs/japan/theme.css` to read the real foreground values, then `pnpm --filter @allonfire/back-office test -- src/features/metadata`.
Expected: FAIL, the modules are not found.

- [ ] **Step 3: Implement.** `app.ts`:

```ts
/** The App's name wherever its head, manifest and mark say it. */
export const APP_NAME = "Back office";
```

`colors.ts` (the background and primary values come from `theme.css` lines 36, 42, 89 and 97; foreground from the grep above):

```ts
import type { LaunchTheme } from "@allonfire/core/features/next/metadata/launch-screens";

/**
 * The Japan Design's colors where CSS variables cannot reach: theme-color,
 * the manifest, generated images. A test fails when theme.css changes them.
 */
export const BACK_OFFICE_COLORS = {
  dark: { background: "#16191d", foreground: "<from grep, .dark>", primary: "#3a9ee0" },
  light: { background: "#f6f7f8", foreground: "<from grep, :root>", primary: "#006fb3" },
} as const satisfies Record<
  LaunchTheme,
  { background: string; foreground: string; primary: string }
>;
```

The two `<from grep>` values are the exact hex strings Step 2's grep prints, `:root` first.

`back-office-mark.tsx` (a placeholder; round 6 designs it):

```tsx
import { AOF_MONOGRAM_DATA_URL } from "@allonfire/design/brand/aof-monogram";
import type { LaunchTheme } from "@allonfire/core/features/next/metadata/launch-screens";
import { APP_NAME } from "../constants/app";
import { BACK_OFFICE_COLORS } from "../constants/colors";

const LABEL_SCALE = 0.09;
const MONOGRAM_SCALE = 0.62;

type BackOfficeMarkProps = {
  theme: LaunchTheme;
  /** Edge of the square it fills, in pixels. */
  size: number;
  /** The App's label under the monogram; off at icon sizes, unreadable there. */
  label?: boolean;
};

/**
 * The Back office's mark: the Brand monogram plus its label. Satori-safe
 * (flex layout, inline styles, an img for the SVG) so ImageResponse renders
 * it; every generated icon, preview and launch screen draws this.
 */
export const BackOfficeMark = ({ label = false, size, theme }: BackOfficeMarkProps) => {
  const colors = BACK_OFFICE_COLORS[theme];
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: size * 0.02,
        justifyContent: "center",
      }}
    >
      <img
        alt=""
        height={size * MONOGRAM_SCALE}
        src={AOF_MONOGRAM_DATA_URL}
        width={size * MONOGRAM_SCALE}
      />
      {label ? (
        <span
          style={{
            color: colors.foreground,
            fontFamily: "Atkinson Hyperlegible Next",
            fontSize: size * LABEL_SCALE,
            fontWeight: 700,
          }}
        >
          {APP_NAME}
        </span>
      ) : null}
    </div>
  );
};
```

Biome's `noImgElement` may flag the `<img>`: Satori cannot render `next/image`, and `next/og`'s own docs use a plain `img`. Do not add `biome-ignore`. If the rule fires, stop and ask the owner whether to turn it off for `src/features/metadata/components/` in `biome.json`.

`utils/image-fonts.ts`:

```ts
export { loadJapanImageFonts as imageFonts } from "@allonfire/design/designs/japan/image-fonts";
```

That is a one-line re-export, not a barrel, so the App's image files depend on one App path. If Biome's `noReExportAll`/barrel rules object, import `loadJapanImageFonts` directly in each image file and delete this file.

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter @allonfire/back-office test -- src/features/metadata`
Expected: PASS.

- [ ] **Step 5: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/features/metadata`.

---

### Task 10: Root layout head, viewport, robots.ts, page titles

**Files:**
- Modify: `apps/back-office/src/app/[locale]/layout.tsx`
- Create: `apps/back-office/src/app/robots.ts`
- Modify: `apps/back-office/src/features/i18n/translations/en.json`, `it.json`
- Modify: `apps/back-office/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `AOFBaseMetadata` (Task 3), `AOFRobots` (Task 4), `AOFLaunchScreenLinks` (Task 5), `env.BACK_OFFICE_URL` (Task 8), `BACK_OFFICE_COLORS` (Task 9), `APP_SETTINGS`.
- Produces: `Metadata.title`, `Metadata.description` and `Metadata.ogAlt` translation keys, used by Task 13.

- [ ] **Step 1: Write the failing e2e test** (append to `e2e/smoke.spec.ts`):

```ts
const BACK_OFFICE_URL = process.env.BACK_OFFICE_URL ?? "http://localhost:3400";

test("gives Sign in a complete head", async ({ page }) => {
  const response = await page.goto("/sign-in");
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  const meta = (selector: string) => page.locator(selector).first();
  await expect(page).toHaveTitle("Sign in · Back office");
  await expect(meta('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(meta('meta[name="description"]')).toHaveAttribute("content", /.+/);
  await expect(meta('meta[property="og:url"]')).toHaveAttribute("content", `${BACK_OFFICE_URL}/sign-in`);
  await expect(meta('meta[property="og:site_name"]')).toHaveAttribute("content", "Back office");
  await expect(meta('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  await expect(meta('meta[property="og:locale:alternate"]')).toHaveAttribute("content", "it_IT");
  await expect(meta('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  await expect(meta('meta[name="color-scheme"]')).toHaveAttribute("content", "light dark");
  await expect(meta('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(meta('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute("content", "default");
  await expect(meta('meta[name="format-detection"]')).toHaveAttribute("content", /telephone=no/);
  await expect(page.locator('link[rel="apple-touch-startup-image"]')).toHaveCount(80);
});

test("localizes the head in Italian", async ({ page }) => {
  await page.goto("/it/sign-in");
  await expect(page.locator('meta[property="og:locale"]').first()).toHaveAttribute("content", "it_IT");
});

test("serves a robots.txt that allows crawling", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toContain("Allow: /");
  expect(body).not.toContain("Disallow: /");
  expect(body).not.toContain("Sitemap");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @allonfire/back-office test:e2e -- -g "head|robots"`
Expected: FAIL. The title is "Sign in", there is no `og:url`, and `/robots.txt` is 404.

- [ ] **Step 3: Translations.** In `en.json`, replace the `"Metadata"` block:

```json
  "Metadata": {
    "title": "Back office",
    "description": "Where the AllOnFire family's content, users and data are managed.",
    "ogAlt": "Back office, AllOnFire"
  },
```

`it.json`:

```json
  "Metadata": {
    "title": "Back office",
    "description": "Dove si gestiscono i contenuti, gli utenti e i dati della famiglia AllOnFire.",
    "ogAlt": "Back office, AllOnFire"
  },
```

- [ ] **Step 4: Layout.** Replace `generateMetadata` and add `viewport` in `[locale]/layout.tsx`:

```ts
import { AOFBaseMetadata } from "@allonfire/core/features/next/metadata/aof-base-metadata";
import { AOFLaunchScreenLinks } from "@allonfire/core/features/next/metadata/launch-screens";
import { App } from "@allonfire/database/enums";
import { APP_SETTINGS } from "@allonfire/database/features/auth/access/constants/app-settings";
import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/features/metadata/constants/app";
import { BACK_OFFICE_COLORS } from "@/features/metadata/constants/colors";
```

```ts
export const generateMetadata = async (): Promise<Metadata> => {
  const [t, locale] = await Promise.all([
    getTranslations("Metadata"),
    getLocale(),
  ]);
  return {
    ...AOFBaseMetadata({
      appName: APP_NAME,
      indexing: APP_SETTINGS[App.BACK_OFFICE].indexing,
      locale: languageSchema.parse(locale),
      locales: routing.locales,
      startupImage: AOFLaunchScreenLinks(),
    }),
    description: t("description"),
    metadataBase: new URL(env.BACK_OFFICE_URL),
    title: { default: t("title"), template: `%s · ${APP_NAME}` },
  };
};

// Installed-app chrome and form controls follow the OS theme. Safari 26+
// tints its tabs from the page background instead, which the Design sets.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { color: BACK_OFFICE_COLORS.light.background, media: "(prefers-color-scheme: light)" },
    { color: BACK_OFFICE_COLORS.dark.background, media: "(prefers-color-scheme: dark)" },
  ],
};
```

Import `languageSchema` from `@allonfire/core/features/i18n/constants/locales`. The old `other: { google: "notranslate" }` now comes from `AOFBaseMetadata`; delete it and its comment from the layout.

`src/app/robots.ts`:

```ts
import { AOFRobots } from "@allonfire/core/features/next/metadata/aof-indexed";
import { App } from "@allonfire/database/enums";
import { APP_SETTINGS } from "@allonfire/database/features/auth/access/constants/app-settings";
import type { MetadataRoute } from "next";
import { env } from "@/environment/environment";

// Crawling stays open so search engines read the pages' noindex.
const robots = (): MetadataRoute.Robots =>
  AOFRobots({
    indexing: APP_SETTINGS[App.BACK_OFFICE].indexing,
    origin: env.BACK_OFFICE_URL,
  });

export default robots;
```

- [ ] **Step 5: Run to verify it passes.** Restart is the owner's call (Task 8 Step 5). With the dev server reading `BACK_OFFICE_URL`, run:
`pnpm --filter @allonfire/back-office test:e2e -- -g "head|robots"`
Expected: PASS.
  - If `og:url` comes out as the bare origin, Next did not resolve `"./"`. Then give each page `openGraph: { ...baseOpenGraph, url: "/sign-in" }` through a shared `pageOpenGraph(path)` helper in `features/metadata/utils/`, spreading `AOFBaseMetadata(...).openGraph`, and rerun.
  - If the home title lacks the template, set it in `[locale]/page.tsx`'s own metadata.
- [ ] **Step 6: Check in the dev tools.** Use the `next-devtools` MCP `get_page_metadata` on `/sign-in` and `/it/sign-in`; every field from the spec's table is present.

- [ ] **Step 7: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/app apps/back-office/e2e && pnpm --filter @allonfire/back-office i18n:check && pnpm --filter @allonfire/back-office check-types`.

---

### Task 11: Error, not-found and loading pages on shared notices

**Files:**
- Create: `apps/back-office/src/features/errors/components/not-found-notice.tsx`, `error-notice.tsx`
- Create: `apps/back-office/src/features/errors/components/tests/notices.test.tsx`
- Modify: `apps/back-office/src/app/[locale]/not-found.tsx`, `[locale]/error.tsx`, `src/app/global-error.tsx`
- Create: `apps/back-office/src/app/global-not-found.tsx`, `apps/back-office/src/app/[locale]/loading.tsx`
- Modify: `apps/back-office/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: the `Common.Error.reference` and `Common.Loading.label` translation keys (Task 6); `globalNotFound` (Task 8).
- Produces:
  - `NotFoundNotice({ title: string; children: ReactNode })`, where `children` is the way back.
  - `ErrorNotice({ title: string; retryLabel: string; onRetry: () => void; reference?: string | undefined })`

- [ ] **Step 1: Write the failing tests.** `notices.test.tsx`:

```tsx
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorNotice } from "../error-notice";
import { NotFoundNotice } from "../not-found-notice";

const noop = () => undefined;

describe("NotFoundNotice", () => {
  it("titles the page and offers the way back it is given", () => {
    const html = renderToStaticMarkup(
      <NotFoundNotice title="Page not found">
        <a href="/">Back to the start</a>
      </NotFoundNotice>
    );
    expect(html).toContain("<h1");
    expect(html).toContain("Page not found");
    expect(html).toContain('<a href="/">Back to the start</a>');
  });
});

describe("ErrorNotice", () => {
  it("shows the reference only when the error has one", () => {
    const withReference = renderToStaticMarkup(
      <ErrorNotice onRetry={noop} reference="Reference 1234" retryLabel="Try again" title="Something went wrong" />
    );
    const without = renderToStaticMarkup(
      <ErrorNotice onRetry={noop} retryLabel="Try again" title="Something went wrong" />
    );
    expect(withReference).toContain("Reference 1234");
    expect(without).not.toContain("Reference");
  });

  it("offers a retry button", () => {
    const html = renderToStaticMarkup(
      <ErrorNotice onRetry={noop} retryLabel="Try again" title="Something went wrong" />
    );
    expect(html).toContain('type="button"');
    expect(html).toContain("Try again");
  });
});
```

Append to `e2e/smoke.spec.ts`:

```ts
test("styles the 404 for a URL no route matches", async ({ page }) => {
  const response = await page.goto("/missing.png");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page).toHaveTitle("Page not found · Back office");
  const background = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor
  );
  // The Japan Design's light --background, #f6f7f8.
  expect(background).toBe("rgb(246, 247, 248)");
});

test("titles the localized 404", async ({ page }) => {
  await page.goto("/it/non-esiste");
  await expect(page).toHaveTitle("Pagina non trovata · Back office");
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @allonfire/back-office test -- src/features/errors` (FAIL, the modules are missing), then `pnpm --filter @allonfire/back-office test:e2e -- -g "404"` (FAIL, the unstyled default 404 and the title).

- [ ] **Step 3: Implement the notices** (placeholders; rounds 1 and 3 design them):

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
export const ErrorNotice = ({ onRetry, reference, retryLabel, title }: ErrorNoticeProps) => (
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

- [ ] **Step 4: Wire the pages.** `[locale]/not-found.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { NotFoundNotice } from "@/features/errors/components/not-found-notice";
import { Link } from "@/features/i18n/navigation";
import { APP_NAME } from "@/features/metadata/constants/app";

// not-found.js takes no metadata exports (only global-not-found does), so
// React 19 hoists this <title> into the head.
const NotFound = async () => {
  const t = await getTranslations("Common.NotFound");
  return (
    <NotFoundNotice title={t("title")}>
      <title>{`${t("title")} · ${APP_NAME}`}</title>
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
import { DEFAULT_LANGUAGE } from "@allonfire/core/features/i18n/constants/locales";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/aof-theme-provider";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import type { Metadata } from "next";
import { NotFoundNotice } from "@/features/errors/components/not-found-notice";
import { APP_NAME } from "@/features/metadata/constants/app";
import "./globals.css";

// No route matched, so no locale and no layout: the shared text in the
// default language, and this file's own html, styles and theme.
const { NotFound: TEXT } = SHARED_TRANSLATIONS[DEFAULT_LANGUAGE].Common;

export const metadata: Metadata = { title: `${TEXT.title} · ${APP_NAME}` };

const GlobalNotFound = () => (
  <html lang={DEFAULT_LANGUAGE} suppressHydrationWarning translate="no">
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

`typedRoutes` may reject a bare `<a href="/">`; it only types `Link`, so a plain `a` passes.

`[locale]/error.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { ErrorNotice } from "@/features/errors/components/error-notice";

type ErrorProps = { error: Error & { digest?: string }; retry: () => void };

// `retry` re-fetches and re-renders the segment (stable since Next 16.3).
const ErrorPage = ({ error, retry }: ErrorProps) => {
  const t = useTranslations("Common.Error");
  return (
    <ErrorNotice
      onRetry={retry}
      reference={error.digest ? t("reference", { digest: error.digest }) : undefined}
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

import { DEFAULT_LANGUAGE } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/aof-theme-provider";
import { createTranslator } from "next-intl";
import { ErrorNotice } from "@/features/errors/components/error-notice";
import { APP_NAME } from "@/features/metadata/constants/app";
import "./globals.css";

// Replaces the root layout, so no locale is known and no next-intl provider
// runs: the shared text in the default language, through a plain translator.
const t = createTranslator({
  locale: DEFAULT_LANGUAGE,
  messages: SHARED_TRANSLATIONS[DEFAULT_LANGUAGE],
  namespace: "Common.Error",
});

type GlobalErrorProps = { error: Error & { digest?: string }; retry: () => void };

const GlobalError = ({ error, retry }: GlobalErrorProps) => (
  <html lang={DEFAULT_LANGUAGE} suppressHydrationWarning translate="no">
    <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
      <title>{`${t("title")} · ${APP_NAME}`}</title>
      <AOFThemeProvider>
        <ErrorNotice
          onRetry={retry}
          reference={error.digest ? t("reference", { digest: error.digest }) : undefined}
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

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm --filter @allonfire/back-office test -- src/features/errors && pnpm --filter @allonfire/back-office test:e2e -- -g "404"`
Expected: PASS. Also open `/` signed out in the browser (via `/iso-browser`): the redirect to Sign in still works, and a forced error shows the notice (throw once from home locally, then revert).

- [ ] **Step 6: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/features/errors apps/back-office/src/app apps/back-office/e2e && pnpm --filter @allonfire/back-office check-types`.

---

### Task 12: Icons, favicon and manifest

**Files:**
- Create: `apps/back-office/src/app/icon.tsx`, `apple-icon.tsx`, `manifest.ts`, `manifest-icon/[icon]/route.tsx`
- Create: `apps/back-office/public/favicon.ico`
- Modify: `apps/back-office/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `AOF_MONOGRAM_SVG` (Task 7), `BackOfficeMark`, `BACK_OFFICE_COLORS`, `imageFonts` (Task 9).
- Produces:
  - `/icon` (SVG)
  - `/apple-icon` (180 PNG)
  - `/manifest-icon/192.png`, `/manifest-icon/512.png`, `/manifest-icon/maskable-512.png`
  - `/manifest.webmanifest`
  - `/favicon.ico`

- [ ] **Step 1: Write the failing e2e test**

```ts
test("serves every icon and the manifest", async ({ page, request }) => {
  for (const [path, type] of [
    ["/icon", "image/svg+xml"],
    ["/apple-icon", "image/png"],
    ["/favicon.ico", "image/"],
    ["/manifest-icon/192.png", "image/png"],
    ["/manifest-icon/512.png", "image/png"],
    ["/manifest-icon/maskable-512.png", "image/png"],
  ] as const) {
    const response = await request.get(path);
    expect({ path, status: response.status() }).toEqual({ path, status: 200 });
    expect(response.headers()["content-type"]).toContain(type);
  }
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({
    display: "browser",
    id: "/",
    name: "Back office",
    scope: "/",
    short_name: "Back office",
    start_url: "/",
  });
  await page.goto("/sign-in");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});
```

- [ ] **Step 2: Run to verify it fails.** Run `pnpm --filter @allonfire/back-office test:e2e -- -g "icon"`. Expected: FAIL with 404s.

- [ ] **Step 3: Implement.** `app/icon.tsx`:

```tsx
import { AOF_MONOGRAM_SVG } from "@allonfire/design/brand/aof-monogram";
import { CONTENT_TYPE, HTTP_HEADER } from "@allonfire/core/features/http/constants/http";

// The tab icon: the monogram alone (a label is unreadable at 16-32px), as
// SVG, which follows the OS theme through its own media query (round 6).
export const contentType = "image/svg+xml";

const Icon = () =>
  new Response(AOF_MONOGRAM_SVG, {
    headers: { [HTTP_HEADER.CONTENT_TYPE]: contentType },
  });

export default Icon;
```

If `CONTENT_TYPE` has no SVG entry, drop that import; `contentType` is the literal Next requires anyway.

`app/apple-icon.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { BackOfficeMark } from "@/features/metadata/components/back-office-mark";
import { BACK_OFFICE_COLORS } from "@/features/metadata/constants/colors";
import { imageFonts } from "@/features/metadata/utils/image-fonts";

const EDGE = 180;
export const size = { height: EDGE, width: EDGE };
export const contentType = "image/png";

// iOS fills transparency with black and prefers this over the manifest's
// icons: opaque, padded.
const AppleIcon = async () =>
  new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: BACK_OFFICE_COLORS.light.background,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <BackOfficeMark size={EDGE} theme="light" />
    </div>,
    { ...size, fonts: await imageFonts() }
  );

export default AppleIcon;
```

`app/manifest-icon/[icon]/route.tsx`:

```tsx
import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import { ImageResponse } from "next/og";
import { BackOfficeMark } from "@/features/metadata/components/back-office-mark";
import { BACK_OFFICE_COLORS } from "@/features/metadata/constants/colors";

/** The manifest's PNGs; maskable keeps the mark inside the 409/512 safe circle. */
const MANIFEST_ICONS = {
  "192.png": { edge: 192, inset: 1 },
  "512.png": { edge: 512, inset: 1 },
  "maskable-512.png": { edge: 512, inset: 0.8 },
} as const satisfies Record<string, { edge: number; inset: number }>;

const isManifestIcon = (name: string): name is keyof typeof MANIFEST_ICONS =>
  name in MANIFEST_ICONS;

export const generateStaticParams = async () =>
  objectKeys(MANIFEST_ICONS).map((icon) => ({ icon }));

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ icon: string }> }
) => {
  const { icon } = await params;
  if (!isManifestIcon(icon)) {
    return new Response(null, { status: HTTP_STATUS.NOT_FOUND });
  }
  const { edge, inset } = MANIFEST_ICONS[icon];
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: BACK_OFFICE_COLORS.light.background,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <BackOfficeMark size={edge * inset} theme="light" />
    </div>,
    { height: edge, width: edge }
  );
};
```

Import `objectKeys` from `@allonfire/core/shared/utils/object`.

`app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";
import { APP_NAME } from "@/features/metadata/constants/app";
import { BACK_OFFICE_COLORS } from "@/features/metadata/constants/colors";

// Only discovered at the app root. `display: "browser"`: Android adds a
// shortcut that opens a tab; iOS 26+ opens its own window by default anyway.
// Members Chrome uses only for installable apps (screenshots, shortcuts,
// display_override) would do nothing here.
const manifest = (): MetadataRoute.Manifest => ({
  background_color: BACK_OFFICE_COLORS.light.background,
  description: "Where the AllOnFire family's content, users and data are managed.",
  dir: "ltr",
  display: "browser",
  icons: [
    { purpose: "any", sizes: "192x192", src: "/manifest-icon/192.png", type: "image/png" },
    { purpose: "any", sizes: "512x512", src: "/manifest-icon/512.png", type: "image/png" },
    { purpose: "maskable", sizes: "512x512", src: "/manifest-icon/maskable-512.png", type: "image/png" },
  ],
  id: "/",
  lang: "en",
  name: APP_NAME,
  scope: "/",
  short_name: APP_NAME,
  start_url: "/",
  theme_color: BACK_OFFICE_COLORS.light.background,
});

export default manifest;
```

`color_scheme_dark` is not in Next 16.3.6's `MetadataRoute.Manifest` type and no browser ships it, so it stays out (spec).

`public/favicon.ico`: generate a 32x32 ICO from the apple icon at build-free time, once:

```bash
cd apps/back-office
curl -s http://localhost:3400/manifest-icon/192.png -o /private/tmp/claude-501/aof-192.png
sips -z 32 32 /private/tmp/claude-501/aof-192.png --out /private/tmp/claude-501/aof-32.png
sips -s format ico /private/tmp/claude-501/aof-32.png --out public/favicon.ico 2>/dev/null \
  || pnpm dlx png-to-ico /private/tmp/claude-501/aof-32.png > public/favicon.ico
file public/favicon.ico   # expect "MS Windows icon resource"
```

`png-to-ico` is a one-off `dlx`, not a dependency. Check that it has at least 200k weekly downloads before running it; if not, ask the owner. Round 6 regenerates the file the same way after the mark changes.

- [ ] **Step 4: Run to verify it passes.** Run `pnpm --filter @allonfire/back-office test:e2e -- -g "icon"`. Expected: PASS.

- [ ] **Step 5: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/app apps/back-office/e2e && pnpm --filter @allonfire/back-office check-types`.

---

### Task 13: Link-preview images and iOS launch screens

**Files:**
- Create: `apps/back-office/src/features/metadata/components/share-card.tsx`, `launch-screen.tsx`
- Create: `apps/back-office/src/app/[locale]/opengraph-image.tsx`, `[locale]/twitter-image.tsx`
- Create: `apps/back-office/src/app/launch/[screen]/route.tsx`
- Test: `apps/back-office/src/features/metadata/components/tests/share-card.test.tsx`
- Modify: `apps/back-office/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `AOFLaunchScreenRoute`, `LaunchScreenVariant` (Task 5), `BackOfficeMark`, `BACK_OFFICE_COLORS`, `imageFonts` (Task 9), the `Metadata.ogAlt` and `Metadata.description` keys (Task 10).
- Produces:
  - `ShareCard({ title: string; description: string; theme: LaunchTheme })`, a 1200x630 Satori layout.
  - `LaunchScreen({ variant: LaunchScreenVariant })`
  - `SHARE_IMAGE = { alt key, size, contentType }`, shared by the two image files.

- [ ] **Step 1: Write the failing tests.** `share-card.test.tsx`:

```tsx
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { ShareCard } from "../share-card";

describe("ShareCard", () => {
  it("carries the page's description beside the mark", () => {
    const html = renderToStaticMarkup(
      <ShareCard description="Where the family's data is managed." theme="light" title="Back office" />
    );
    expect(html).toContain("Where the family&#x27;s data is managed.");
    expect(html).toContain("data:image/svg+xml;base64,");
  });
});
```

e2e:

```ts
test("serves link-preview images in both languages", async ({ page, request }) => {
  for (const path of ["/opengraph-image/card", "/it/opengraph-image/card", "/twitter-image/card", "/it/twitter-image/card"]) {
    const response = await request.get(path);
    expect({ path, status: response.status() }).toEqual({ path, status: 200 });
    expect(response.headers()["content-type"]).toBe("image/png");
    expect((await response.body()).byteLength).toBeLessThan(300_000);
  }
  await page.goto("/sign-in");
  const og = page.locator('meta[property="og:image"]').first();
  await expect(og).toHaveAttribute("content", /^http.*opengraph-image/);
  await expect(page.locator('meta[property="og:image:alt"]').first()).toHaveAttribute("content", "Back office, AllOnFire");
  await expect(page.locator('meta[name="twitter:image"]').first()).toHaveAttribute("content", /twitter-image/);
  const image = await request.get(await og.getAttribute("content") ?? "");
  expect(image.status()).toBe(200);
});

test("serves every linked launch screen", async ({ page, request }) => {
  await page.goto("/sign-in");
  const urls = await page.locator('link[rel="apple-touch-startup-image"]').evaluateAll(
    (links) => links.map((link) => link.getAttribute("href") ?? "")
  );
  for (const url of [urls[0], urls.at(-1)]) {
    const response = await request.get(url ?? "");
    expect({ url, status: response.status() }).toEqual({ url, status: 200 });
  }
  expect((await request.get("/launch/1x1-light.png")).status()).toBe(404);
});
```

- [ ] **Step 2: Run to verify they fail.** Run `pnpm --filter @allonfire/back-office test -- src/features/metadata` and `pnpm --filter @allonfire/back-office test:e2e -- -g "preview|launch"`. Expected: FAIL.

- [ ] **Step 3: Implement the components** (placeholders; rounds 7 and 8 design them):

```tsx
// share-card.tsx
import type { LaunchTheme } from "@allonfire/core/features/next/metadata/launch-screens";
import { BACK_OFFICE_COLORS } from "../constants/colors";
import { BackOfficeMark } from "./back-office-mark";

export const SHARE_SIZE = { height: 630, width: 1200 } as const;
const MARK_EDGE = 360;

type ShareCardProps = { title: string; description: string; theme: LaunchTheme };

/** The link-preview card (Open Graph and X): the mark and what the App is. */
export const ShareCard = ({ description, theme, title }: ShareCardProps) => {
  const colors = BACK_OFFICE_COLORS[theme];
  return (
    <div
      style={{
        alignItems: "center",
        background: colors.background,
        color: colors.foreground,
        display: "flex",
        fontFamily: "Atkinson Hyperlegible Next",
        gap: 48,
        height: "100%",
        padding: 72,
        width: "100%",
      }}
    >
      <BackOfficeMark size={MARK_EDGE} theme={theme} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ fontSize: 72, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 34 }}>{description}</span>
      </div>
    </div>
  );
};
```

```tsx
// launch-screen.tsx
import type { LaunchScreenVariant } from "@allonfire/core/features/next/metadata/launch-screens";
import { BACK_OFFICE_COLORS } from "../constants/colors";
import { BackOfficeMark } from "./back-office-mark";

const MARK_SHARE = 0.4;

/** An iOS launch screen: the mark centred on the theme's ground. */
export const LaunchScreen = ({ variant }: { variant: LaunchScreenVariant }) => (
  <div
    style={{
      alignItems: "center",
      background: BACK_OFFICE_COLORS[variant.theme].background,
      display: "flex",
      height: "100%",
      justifyContent: "center",
      width: "100%",
    }}
  >
    <BackOfficeMark
      label
      size={Math.min(variant.pixelWidth, variant.pixelHeight) * MARK_SHARE}
      theme={variant.theme}
    />
  </div>
);
```

- [ ] **Step 4: Implement the image files.** `[locale]/opengraph-image.tsx`. Route handlers cannot read `next/root-params`, so it translates from `params.locale` with `createTranslator` over the App's JSON plus the shared text:

```tsx
import { languageSchema } from "@allonfire/core/features/i18n/constants/locales";
import { ImageResponse } from "next/og";
import { createTranslator } from "next-intl";
import { ShareCard, SHARE_SIZE } from "@/features/metadata/components/share-card";
import { imageFonts } from "@/features/metadata/utils/image-fonts";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };

const TRANSLATIONS = { en: EN, it: IT } as const;

export const size = SHARE_SIZE;
export const contentType = "image/png";

type ImageProps = { params: Promise<{ locale: string }> };

const translator = async (params: ImageProps["params"]) => {
  const locale = languageSchema.parse((await params).locale);
  return createTranslator({ locale, messages: TRANSLATIONS[locale], namespace: "Metadata" });
};

export const generateImageMetadata = async ({ params }: ImageProps) => {
  const t = await translator(params);
  return [{ alt: t("ogAlt"), contentType, id: "card", size }];
};

const OpenGraphImage = async ({ params }: ImageProps) => {
  const t = await translator(params);
  return new ImageResponse(
    <ShareCard description={t("description")} theme="light" title={t("title")} />,
    { ...size, fonts: await imageFonts() }
  );
};

export default OpenGraphImage;
```

`export const alt` must be a static string, so the localized alt comes from `generateImageMetadata`, which puts the image at `/opengraph-image/card` (`/it/opengraph-image/card`). The proxy matcher from Task 8 already skips those paths.

`[locale]/twitter-image.tsx`: the same file content with `OpenGraphImage` renamed `TwitterImage`. Next requires each metadata file's exports in that file, so it is a copy of about 30 lines, not a re-export. Keep both identical.

`app/launch/[screen]/route.tsx`:

```tsx
import { AOFLaunchScreenRoute } from "@allonfire/core/features/next/metadata/aof-launch-screen-route";
import { ImageResponse } from "next/og";
import { LaunchScreen } from "@/features/metadata/components/launch-screen";
import { imageFonts } from "@/features/metadata/utils/image-fonts";

const route = AOFLaunchScreenRoute(
  async (variant) =>
    new ImageResponse(<LaunchScreen variant={variant} />, {
      fonts: await imageFonts(),
      height: variant.pixelHeight,
      width: variant.pixelWidth,
    })
);

export const GET = route.GET;
export const generateStaticParams = route.generateStaticParams;
```

- [ ] **Step 5: Run to verify they pass.** Run `pnpm --filter @allonfire/back-office test -- src/features/metadata && pnpm --filter @allonfire/back-office test:e2e -- -g "preview|launch"`. Expected: PASS.

- [ ] **Step 6: Build check.** `pnpm --filter @allonfire/back-office build` (needs `STORAGE_ENDPOINT`, `NEXT_PUBLIC_API_URL`, `BACK_OFFICE_URL` in the shell). The output lists `/launch/[screen]` with 80 prerendered paths, the image routes as static, and no "metadataBase is not set" warning.

- [ ] **Step 7: Checkpoint.** Run `pnpm biome check --write apps/back-office/src/app apps/back-office/src/features/metadata apps/back-office/e2e`.

---

## Phase 3: Design rounds

Every round follows the same loop:

1. `/aof-design craft <target> --app back-office` (direct mode). The brief: the spec section for that piece, `packages/design/src/apps/back-office/PRODUCT.md`, the Japan Design, and the reference named in the round.
2. Keep the component's props and the tests from Phase 2 passing, and add pairs to `theme.test.ts` for new text colors.
3. Take one screenshot round via `/iso-browser` (attach to the open window): light and dark, 390px and 1440px wide.
4. **Stop.** Show the owner the screenshots and wait for approval. Do not start the next round until they approve.
5. Checkpoint: `pnpm biome check --write <touched files> && pnpm --filter @allonfire/back-office test`.

### Task 14: Round 1, not found
Target `apps/back-office/src/features/errors/components/not-found-notice.tsx` (look at `/does-not-exist`). It sets the look every later status page reuses: departure-board vocabulary, the hanko, the Line Rule. The way back stays a link.

- [ ] Steps 1-5 of the loop.

### Task 15: Round 2, global not found
Target `apps/back-office/src/app/global-not-found.tsx` (look at `/missing.png`). It must match round 1 exactly, in both themes. A difference means `globals.css` or the theme provider is missing.

- [ ] Steps 1-5 of the loop.

### Task 16: Round 3, error
Target `apps/back-office/src/features/errors/components/error-notice.tsx`. To see it, throw from home locally, then revert. The reference line stays small and copyable (`select-all`).

- [ ] Steps 1-5 of the loop.

### Task 17: Round 4, global error
Target `apps/back-office/src/app/global-error.tsx`. To see it, throw in `[locale]/layout.tsx` locally, then revert. It must match round 3.

- [ ] Steps 1-5 of the loop.

### Task 18: Round 5, loading
Target `apps/back-office/src/app/[locale]/loading.tsx`. Look at home while the Session check is slowed with a local `await new Promise((r) => setTimeout(r, 3000))`, then revert. Respect `prefers-reduced-motion`, and keep `role="status"` and `aria-busy`.

- [ ] Steps 1-5 of the loop.

### Task 19: Round 6, the mark and icons
Targets:
- `packages/design/src/brand/aof-monogram.ts`: restyle it for the Japan Design if the owner wants. Add the `@media (prefers-color-scheme: dark)` style for the tab icon.
- `apps/back-office/src/features/metadata/components/back-office-mark.tsx`: the label in the Japan Design.

References: Laura's `src/app/icon.svg`, `public/allonfire-laura.svg`, `public/allonfire-laura-horizontal.svg`. Screenshots: `/icon` in both OS themes, `/apple-icon`, the three manifest PNGs (check the maskable one in a circle mask). Then regenerate `public/favicon.ico` with the commands from Task 12 Step 3.

- [ ] Steps 1-5 of the loop.

### Task 20: Round 7, link-preview card
Target `apps/back-office/src/features/metadata/components/share-card.tsx`. Screenshot `/opengraph-image/card` and `/it/opengraph-image/card`. Keep each under 300 KB (the e2e test checks it). No App name in the title text beyond `siteName` (Apple TN3156).

- [ ] Steps 1-5 of the loop. Also paste the dev URL (via a tunnel the owner chooses) into WhatsApp or iMessage if the owner wants a real preview; that step is optional.

### Task 21: Round 8, iOS launch screens
Target `apps/back-office/src/features/metadata/components/launch-screen.tsx`. Screenshot `/launch/1179x2556-light.png`, `-dark.png`, `/launch/2752x2064-dark.png` (iPad landscape). The mark must fit inside the shortest edge in landscape.

- [ ] Steps 1-5 of the loop.

---

## Phase 4: Finish

### Task 22: Docs and full verification

**Files:**
- Modify: `CLAUDE.md` (Database Schema Quick Reference: `APP_SETTINGS` and `AppSettings` (`constants/app-settings`: each App's `minRole`, `registration` and `indexing`))

- [ ] **Step 1: Update `CLAUDE.md`.** In the `APP_SETTINGS` sentence, change "each App's `minRole` and `registration`" to "each App's `minRole`, `registration` and `indexing`". Under "Patterns", add one line: "Page information comes from `@allonfire/core/features/next/metadata/*` (`AOFBaseMetadata`, `AOFRobots`, launch screens); an App's Indexing lives in `APP_SETTINGS`."
- [ ] **Step 2: Repo-wide checks.** Run `pnpm turbo run check-types lint test && pnpm i18n:check && pnpm design:sync --check`. Expected: all green. Fix every failure, including ones in files this plan did not touch, if they were caused here.
- [ ] **Step 3: e2e.** Run `pnpm --filter @allonfire/back-office test:e2e`. Expected: all PASS, including the original smoke tests.
- [ ] **Step 4: Deploy prerequisites, for the owner.** Before the deploy, set the GitHub secret `BACK_OFFICE_URL` in the `dev` environment and set `BACK_OFFICE_URL` in Dokploy's Back office runtime env, both to the public address.
- [ ] **Step 5: Device checks, for the owner** (from the spec's Watch out):
  - On iOS 26/27, Add to Home Screen opens its own window, with the launch screen in light and in dark.
  - iOS 18 opening Safari is the accepted outcome.
  - Android: Add to Home screen makes a shortcut that opens in a Chrome tab.
