# Next Scaffolding in utils Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every Next App's repeated wiring (Query client and provider, Devtools, theme, nuqs, next-intl request config and proxy, `next.config` base) and the `LOCALE` list into `@allonfire/utils`, one AOF-prefixed piece per file, and switch Back office onto them.

**Status:** implemented (uncommitted) @ 2026-09-30T15:46:47Z

**Architecture:** `packages/utils/src/next/<topic>/` holds the App scaffolding; React, Next and the provider libraries are optional `peerDependencies`, so the API (which imports utils but never `src/next/`) is untouched at runtime. `LOCALE` moves to `packages/utils/src/constants/locales.ts`; the API keeps `DEFAULT_LOCALE` and its catalogue. Back office composes the four providers in its layout and deletes its own copies.

**Tech Stack:** Next 16, React 19, next-intl 4, next-themes, nuqs 2, TanStack Query 5, zod 4, Vitest 4 (globals, `renderToStaticMarkup`, no DOM), Playwright.

**Spec:** `docs/superpowers/specs/2026-09-30-next-scaffolding-design.md` (ADR 0012, `CONTEXT.md` terms **AOF** and **App scaffolding** already written).

## Global Constraints

- `AOF` is always uppercase, in front of the original name: `AOFThemeProvider`, `AOFGetQueryClient`.
- One piece per file, one export line per file in `packages/utils/package.json`; keys mirror the path without `src/` and the extension.
- Every test file's first line is `// @module-tag unit`; type tests (`*.test-d.ts`) take no tag. Vitest globals: no `from "vitest"` import for `describe`/`it`/`expect`/`vi`.
- No `as` casts (tests too); no new `biome-ignore`; never `Object.keys/entries/...` directly.
- Framework libraries are optional peer dependencies of utils (`peerDependenciesMeta.<name>.optional: true`), and devDependencies at Back office's versions.
- The API never imports `@allonfire/utils/next/*`.
- An App's `proxy.ts` keeps its `config.matcher` literal.
- Never commit (the user commits with `/iso-commit`). Finish with `pnpm exec biome check --write <touched files>` only.

## Review Focus

1. `next.config.ts` importing TypeScript source from `@allonfire/utils` at config load: Back office's `pnpm build` must pass (Task 6, Step 5).
2. `AOFGetQueryClient` in the browser returns the first client forever, so options on a later call are ignored: pinned by a test and a doc comment (Task 2).
3. An unknown locale segment (`/xx`) must 404, not render the default language: unit test in Task 4, e2e "unknown path" in Task 6.
4. An App header with a key the security headers also set must win: Next sends the last matching rule, so the App's rules come after the base rule (test in Task 5).
5. A new `LOCALE` in a language missing from `LANGUAGES` must fail type-checking (Task 1).

---

## File Structure

```
packages/utils/
  package.json                                   exports, peers, devDeps
  tsconfig.json                                  jsx + dom lib
  README.md                                      App scaffolding section
  src/constants/locales.ts                       LOCALE ... LANGUAGES (moved from API)
  src/constants/tests/locales.test-d.ts
  src/next/query/aof-get-query-client.ts
  src/next/query/tests/aof-get-query-client.test.ts
  src/next/query/tests/aof-get-query-client.browser.test.ts
  src/next/providers/aof-query-client-provider.tsx
  src/next/providers/aof-react-query-devtools.tsx
  src/next/providers/aof-theme-provider.tsx
  src/next/providers/aof-nuqs-adapter.tsx
  src/next/providers/tests/providers.test.tsx
  src/next/i18n/aof-get-request-config.ts
  src/next/i18n/aof-create-middleware.ts
  src/next/i18n/tests/aof-get-request-config.test.ts
  src/next/i18n/tests/aof-create-middleware.test.ts
  src/next/config/aof-create-next-config.ts
  src/next/config/tests/aof-create-next-config.test.ts
apps/api/src/features/i18n/constants/locales.ts  keeps DEFAULT_LOCALE + catalogue
apps/api/src/...                                 10 importers switch to utils
apps/back-office/                                adopts; deletes components/, lib/
CLAUDE.md                                        two passages
```

---

### Task 1: `LOCALE` moves to utils

**Files:**
- Create: `packages/utils/src/constants/locales.ts`, `packages/utils/src/constants/tests/locales.test-d.ts`
- Modify: `packages/utils/package.json` (one export line), `apps/api/src/features/i18n/constants/locales.ts`, and the API importers listed in Step 5
- Delete: `apps/api/src/features/i18n/tests/locales.test-d.ts`

**Interfaces:**
- Produces: `LOCALE`, `localeSchema`, `type Locale`, `SUPPORTED_LOCALES`, `type Language` (`"en" | "it"`), `LANGUAGES` from `@allonfire/utils/constants/locales`.

- [x] **Step 1: Write the failing type test**

`packages/utils/src/constants/tests/locales.test-d.ts`:
```ts
import type { ElementOf } from "../../helpers/object";
import type { LANGUAGES, Language, Locale, SUPPORTED_LOCALES } from "../locales";

// Every locale has a place in the preference order; a new one without it
// fails here instead of never being matched.
expectTypeOf<
  Exclude<Locale, ElementOf<typeof SUPPORTED_LOCALES>>
>().toBeNever();

// Language is derived from LOCALE; a locale in a new language fails here
// until LANGUAGES lists it.
expectTypeOf<Exclude<Language, ElementOf<typeof LANGUAGES>>>().toBeNever();
expectTypeOf<Language>().toEqualTypeOf<"en" | "it">();
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/utils check-types`
Expected: FAIL, `Cannot find module '../locales'`.

- [x] **Step 3: Write `packages/utils/src/constants/locales.ts`**

```ts
import { z } from "zod";

/**
 * Locales AllOnFire renders in, as full BCP 47 tags. A bare language is never a
 * locale here — `Accept-Language: it` resolves to a regional variant before
 * anything is rendered. Apps route by `Language`, derived below.
 *
 * Key order means nothing here (Biome sorts it); the order the matcher sees is
 * `SUPPORTED_LOCALES`.
 */
export const LOCALE = {
  EN_GB: "en-GB",
  EN_US: "en-US",
  IT_CH: "it-CH",
  IT_IT: "it-IT",
} as const;

export const localeSchema = z.enum(LOCALE);
export type Locale = z.infer<typeof localeSchema>;

/**
 * Every locale, in preference order. The order is a decision, not an accident:
 * CLDR likely-subtags settle a bare `it` (to `it-IT`), but a region CLDR does
 * not know, such as `it-XX`, ties every Italian variant and `match()` takes the
 * first one listed. So the language's main variant comes first.
 */
export const SUPPORTED_LOCALES = [
  LOCALE.EN_US,
  LOCALE.EN_GB,
  LOCALE.IT_IT,
  LOCALE.IT_CH,
] as const satisfies readonly Locale[];

/** The language half of every locale: what an App's URL carries (`/it`). */
export type Language = Locale extends `${infer L}-${string}` ? L : never;

/** Every language, main one first; `tests/locales.test-d.ts` checks it is complete. */
export const LANGUAGES = ["en", "it"] as const satisfies readonly Language[];
```

Add to `packages/utils/package.json` `exports` (keep keys sorted):
```json
"./constants/locales": "./src/constants/locales.ts",
```

- [x] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @allonfire/utils check-types`
Expected: PASS.

- [x] **Step 5: Point the API at utils**

`apps/api/src/features/i18n/constants/locales.ts` becomes:
```ts
import { LOCALE, type Locale } from "@allonfire/utils/constants/locales";
import EN from "../translations/en.json" with { type: "json" };
import IT from "../translations/it.json" with { type: "json" };

// LOCALE, Locale and SUPPORTED_LOCALES live in @allonfire/utils (ADR 0012):
// the Apps read the same list. The default and the messages are the API's.

/** Where an absent, malformed or unsupported `Accept-Language` lands. */
export const DEFAULT_LOCALE: Locale = LOCALE.EN_US;

/** Every message the API renders. Errors are just the keys that exist today. */
export type TranslationKey = keyof typeof EN;

/** Derived from the source language, so no key list or value type is retyped. */
export type Translations = typeof EN;

/**
 * Locale to its messages. Variants share their language's object by reference —
 * a spread would allocate a second copy of every string per variant, and it is
 * the catalogue that grows, not the variant count.
 *
 * `satisfies` is the completeness check: add a locale without a file here and
 * this fails. Keys are computed from `LOCALE` so no tag is typed twice.
 */
export const CATALOGUE = {
  [LOCALE.EN_US]: EN,
  [LOCALE.EN_GB]: EN,
  [LOCALE.IT_IT]: IT,
  [LOCALE.IT_CH]: IT,
} as const satisfies Record<Locale, Translations>;
```

In each importer, names `LOCALE`, `Locale`, `localeSchema`, `SUPPORTED_LOCALES` now come from `@allonfire/utils/constants/locales`; `CATALOGUE`, `DEFAULT_LOCALE`, `TranslationKey`, `Translations` stay on the local path:

| File | From utils | Stays local |
|---|---|---|
| `src/features/errors/middleware/error-handler.ts` | `type Locale` | — |
| `src/features/errors/tests/problem-documents.test.ts` | `LOCALE` | — |
| `src/features/i18n/translate.ts` | `type Locale` | `CATALOGUE`, `DEFAULT_LOCALE`, `type TranslationKey` |
| `src/features/i18n/middleware/locale-resolver.ts` | `type Locale`, `localeSchema`, `SUPPORTED_LOCALES` | `DEFAULT_LOCALE` |
| `src/features/i18n/tests/locale-resolver.test.ts` | `LOCALE`, `type Locale`, `SUPPORTED_LOCALES` | `CATALOGUE`, `DEFAULT_LOCALE` |
| `src/features/i18n/tests/translate.test-d.ts` | `LOCALE` | — |
| `src/features/i18n/tests/translate.test.ts` | `LOCALE`, `SUPPORTED_LOCALES` | `CATALOGUE` |
| `src/features/i18n/tests/localization.test.ts` | `LOCALE` | `CATALOGUE`, `DEFAULT_LOCALE` |
| `src/shared/types/bindings.ts` | `type Locale` | — |

`src/features/errors/constants/error-codes.ts` imports only `TranslationKey`: unchanged. Delete `apps/api/src/features/i18n/tests/locales.test-d.ts` (moved in Step 1).

- [x] **Step 6: Verify the API**

Run: `pnpm --filter @allonfire/api check-types && pnpm --filter @allonfire/api test`
Expected: both PASS, same test count as before minus nothing (the type test moved, not lost).

---

### Task 2: utils becomes Next-ready; `AOFGetQueryClient`

**Files:**
- Modify: `packages/utils/package.json`, `packages/utils/tsconfig.json`
- Create: `packages/utils/src/next/query/aof-get-query-client.ts`, `.../query/tests/aof-get-query-client.test.ts`, `.../query/tests/aof-get-query-client.browser.test.ts`

**Interfaces:**
- Produces: `AOFGetQueryClient(options?: { staleTime?: number | undefined }): QueryClient` from `@allonfire/utils/next/query/aof-get-query-client`.

- [x] **Step 1: Dependencies and config**

Run:
```bash
pnpm --filter @allonfire/utils add -D next@^16.3.6 react@^19.3.0 react-dom@^19.3.0 @types/react@^19.3.0 @types/react-dom@^19.3.0 next-intl@^4.14.7 next-themes@^0.4.6 nuqs@^2.10.1 @tanstack/react-query@^5.103.2 @tanstack/react-query-devtools@^5.103.2
```
Then add to `packages/utils/package.json`:
```json
"peerDependencies": {
  "@tanstack/react-query": "^5.0.0",
  "@tanstack/react-query-devtools": "^5.0.0",
  "next": "^16.0.0",
  "next-intl": "^4.0.0",
  "next-themes": "^0.4.0",
  "nuqs": "^2.0.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
},
"peerDependenciesMeta": {
  "@tanstack/react-query": { "optional": true },
  "@tanstack/react-query-devtools": { "optional": true },
  "next": { "optional": true },
  "next-intl": { "optional": true },
  "next-themes": { "optional": true },
  "nuqs": { "optional": true },
  "react": { "optional": true },
  "react-dom": { "optional": true }
}
```
`packages/utils/tsconfig.json`:
```json
{
  "extends": "../config/typescript/node.json",
  // src/next/ holds React components: the App scaffolding (ADR 0012).
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["dom", "dom.iterable", "ES2022"]
  },
  "include": ["src", "vitest.config.ts"]
}
```
Add export: `"./next/query/aof-get-query-client": "./src/next/query/aof-get-query-client.ts",`

- [x] **Step 2: Write the failing tests**

`packages/utils/src/next/query/tests/aof-get-query-client.test.ts`:
```ts
// @module-tag unit
import { dehydrate } from "@tanstack/react-query";
import { AOFGetQueryClient } from "../aof-get-query-client";

describe("AOFGetQueryClient on the server", () => {
  it("gives every call its own client", () => {
    expect(AOFGetQueryClient()).not.toBe(AOFGetQueryClient());
  });

  it("keeps fetched data fresh for 60 s by default", () => {
    expect(AOFGetQueryClient().getDefaultOptions().queries?.staleTime).toBe(
      60_000
    );
  });

  it("takes the App's staleTime", () => {
    expect(
      AOFGetQueryClient({ staleTime: 5000 }).getDefaultOptions().queries
        ?.staleTime
    ).toBe(5000);
  });

  it("dehydrates a query still pending, so the browser streams it in", () => {
    const client = AOFGetQueryClient();
    // Never settles, so the query stays pending.
    const pending = client.prefetchQuery({
      queryFn: () => new Promise(() => undefined),
      queryKey: ["slow"],
    });
    expect(pending).toBeInstanceOf(Promise);
    expect(dehydrate(client).queries.map((query) => query.queryKey)).toEqual([
      ["slow"],
    ]);
  });
});
```
`packages/utils/src/next/query/tests/aof-get-query-client.browser.test.ts`:
```ts
// @module-tag unit
import { AOFGetQueryClient } from "../aof-get-query-client";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));

describe("AOFGetQueryClient in the browser", () => {
  it("returns one client for the whole page, ignoring later options", () => {
    const first = AOFGetQueryClient();
    const second = AOFGetQueryClient({ staleTime: 1 });
    expect(second).toBe(first);
    expect(second.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });
});
```

- [x] **Step 3: Run them to verify they fail**

Run: `pnpm --filter @allonfire/utils test -- src/next/query`
Expected: FAIL, cannot resolve `../aof-get-query-client`.

- [x] **Step 4: Write `packages/utils/src/next/query/aof-get-query-client.ts`**

```ts
import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryClient,
} from "@tanstack/react-query";

/** Above zero, so the browser does not refetch what the server just sent. */
const DEFAULT_STALE_TIME_MS = 60_000;

export type AOFQueryClientOptions = { staleTime?: number | undefined };

const makeQueryClient = ({
  staleTime = DEFAULT_STALE_TIME_MS,
}: AOFQueryClientOptions) =>
  new QueryClient({
    defaultOptions: {
      dehydrate: {
        // Pending queries go to the client too: a server component can
        // prefetch without awaiting and the browser picks the result up.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      queries: { staleTime },
    },
  });

let browserQueryClient: QueryClient | undefined;

/**
 * A new client per server request; one client for the page in the browser.
 * The browser keeps the first client it built, so `options` on a later call
 * are ignored there.
 */
export const AOFGetQueryClient = (
  options: AOFQueryClientOptions = {}
): QueryClient => {
  if (isServer) {
    return makeQueryClient(options);
  }
  browserQueryClient ??= makeQueryClient(options);
  return browserQueryClient;
};
```

- [x] **Step 5: Run them to verify they pass, and the API is unaffected**

Run: `pnpm --filter @allonfire/utils test -- src/next/query && pnpm --filter @allonfire/utils check-types && pnpm --filter @allonfire/api check-types`
Expected: 5 tests PASS; both type checks PASS.

---

### Task 3: The four providers

**Files:**
- Create: `packages/utils/src/next/providers/aof-query-client-provider.tsx`, `aof-react-query-devtools.tsx`, `aof-theme-provider.tsx`, `aof-nuqs-adapter.tsx`, `tests/providers.test.tsx`
- Modify: `packages/utils/package.json` (four export lines)

**Interfaces:**
- Consumes: `AOFGetQueryClient` (Task 2).
- Produces: `AOFQueryClientProvider({ children, staleTime? })`, `AOFReactQueryDevtools()`, `AOFThemeProvider(props: ThemeProviderProps)`, `AOFNuqsAdapter({ children })`, each from `@allonfire/utils/next/providers/<file>`.

- [x] **Step 1: Write the failing tests**

`packages/utils/src/next/providers/tests/providers.test.tsx`:
```tsx
// @module-tag unit
import { useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFNuqsAdapter } from "../aof-nuqs-adapter";
import { AOFQueryClientProvider } from "../aof-query-client-provider";
import { AOFReactQueryDevtools } from "../aof-react-query-devtools";
import { AOFThemeProvider } from "../aof-theme-provider";

const StaleTime = () => (
  <span>{String(useQueryClient().getDefaultOptions().queries?.staleTime)}</span>
);

describe("AOFQueryClientProvider", () => {
  it("gives its children a client with the default staleTime", () => {
    expect(
      renderToStaticMarkup(
        <AOFQueryClientProvider>
          <StaleTime />
        </AOFQueryClientProvider>
      )
    ).toBe("<span>60000</span>");
  });

  it("passes the App's staleTime on", () => {
    expect(
      renderToStaticMarkup(
        <AOFQueryClientProvider staleTime={5000}>
          <StaleTime />
        </AOFQueryClientProvider>
      )
    ).toBe("<span>5000</span>");
  });
});

describe("AOFReactQueryDevtools", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders nothing outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(AOFReactQueryDevtools()).toBeNull();
  });

  it("renders the lazy Devtools in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(AOFReactQueryDevtools()).not.toBeNull();
  });
});

describe("AOFThemeProvider", () => {
  it("follows the OS through a class by default", () => {
    const element = AOFThemeProvider({ children: "x" });
    expect(isValidElement(element) && element.type).toBe(ThemeProvider);
    expect(isValidElement(element) && element.props).toMatchObject({
      attribute: "class",
      children: "x",
      defaultTheme: "system",
      disableTransitionOnChange: true,
      enableSystem: true,
    });
  });

  it("lets every prop override the default", () => {
    const element = AOFThemeProvider({
      attribute: "data-theme",
      children: "x",
      defaultTheme: "dark",
    });
    expect(isValidElement(element) && element.props).toMatchObject({
      attribute: "data-theme",
      defaultTheme: "dark",
    });
  });
});

describe("AOFNuqsAdapter", () => {
  it("wraps its children in nuqs' App Router adapter", () => {
    const element = AOFNuqsAdapter({ children: "x" });
    expect(isValidElement(element) && element.type).toBe(NuqsAdapter);
    expect(isValidElement(element) && element.props).toMatchObject({
      children: "x",
    });
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/utils test -- src/next/providers`
Expected: FAIL, cannot resolve `../aof-nuqs-adapter`.

- [x] **Step 3: Write the providers**

`aof-query-client-provider.tsx`:
```tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AOFGetQueryClient } from "../query/aof-get-query-client";

export const AOFQueryClientProvider = ({
  children,
  staleTime,
}: {
  children: ReactNode;
  staleTime?: number | undefined;
}) => (
  <QueryClientProvider client={AOFGetQueryClient({ staleTime })}>
    {children}
  </QueryClientProvider>
);
```
`aof-react-query-devtools.tsx`:
```tsx
"use client";

import { lazy, Suspense } from "react";

// Loaded only in development: production bundles never download it.
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((module) => ({
    default: module.ReactQueryDevtools,
  }))
);

/** Sits inside AOFQueryClientProvider; renders nothing outside development. */
export const AOFReactQueryDevtools = () =>
  process.env.NODE_ENV === "development" ? (
    <Suspense fallback={null}>
      <ReactQueryDevtools />
    </Suspense>
  ) : null;
```
`aof-theme-provider.tsx`:
```tsx
"use client";

import { ThemeProvider, type ThemeProviderProps } from "next-themes";

/** Follows the OS through the `.dark` class every Design's theme.css targets. */
export const AOFThemeProvider = (props: ThemeProviderProps) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    disableTransitionOnChange
    enableSystem
    {...props}
  />
);
```
`aof-nuqs-adapter.tsx`:
```tsx
"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

export const AOFNuqsAdapter = ({ children }: { children: ReactNode }) => (
  <NuqsAdapter>{children}</NuqsAdapter>
);
```
Add exports:
```json
"./next/providers/aof-nuqs-adapter": "./src/next/providers/aof-nuqs-adapter.tsx",
"./next/providers/aof-query-client-provider": "./src/next/providers/aof-query-client-provider.tsx",
"./next/providers/aof-react-query-devtools": "./src/next/providers/aof-react-query-devtools.tsx",
"./next/providers/aof-theme-provider": "./src/next/providers/aof-theme-provider.tsx",
```

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/utils test -- src/next/providers && pnpm --filter @allonfire/utils check-types`
Expected: 7 tests PASS; type check PASS.

---

### Task 4: i18n — `AOFGetRequestConfig` and `AOFCreateMiddleware`

**Files:**
- Create: `packages/utils/src/next/i18n/aof-get-request-config.ts`, `aof-create-middleware.ts`, `tests/aof-get-request-config.test.ts`, `tests/aof-create-middleware.test.ts`
- Modify: `packages/utils/package.json` (two export lines)

**Interfaces:**
- Produces:
  - `AOFGetRequestConfig<L extends string>({ routing: { locales: readonly L[] }, locale: () => Promise<string | undefined>, messages: (locale: L) => Promise<AbstractIntlMessages> })` — the App's default export for next-intl's request config. The App passes `locale` from `next/root-params` (that module's exports are generated per App, so utils cannot import it).
  - `AOFCreateMiddleware(routing, { guard? })` returning `(request: NextRequest) => Promise<Response>`; `guard: (request: NextRequest) => Response | undefined | Promise<Response | undefined>`.

- [x] **Step 1: Write the failing tests**

`tests/aof-get-request-config.test.ts`:
```ts
// @module-tag unit
import { AOFGetRequestConfig } from "../aof-get-request-config";

vi.mock("next-intl/server", () => ({
  getRequestConfig: <T>(create: T) => create,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const routing = { locales: ["en", "it"] as const };
const config = (locale: string | undefined) =>
  AOFGetRequestConfig({
    locale: async () => locale,
    messages: async (language) => ({ hello: language }),
    routing,
  })({ requestLocale: Promise.resolve(undefined) });

describe("AOFGetRequestConfig", () => {
  it("loads the messages of a locale the App routes", async () => {
    await expect(config("it")).resolves.toEqual({
      locale: "it",
      messages: { hello: "it" },
    });
  });

  it.each(["xx", undefined])("404s on locale %s", async (locale) => {
    await expect(config(locale)).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
```
`tests/aof-create-middleware.test.ts`:
```ts
// @module-tag unit
import { NextRequest } from "next/server";
import { AOFCreateMiddleware } from "../aof-create-middleware";

vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response("intl"),
}));

const routing = { defaultLocale: "en", locales: ["en", "it"] };
const request = new NextRequest("http://localhost/it");

describe("AOFCreateMiddleware", () => {
  it("hands every request to next-intl when there is no guard", async () => {
    const response = await AOFCreateMiddleware(routing)(request);
    expect(await response.text()).toBe("intl");
  });

  it("answers with the guard's Response when it returns one", async () => {
    const proxy = AOFCreateMiddleware(routing, {
      guard: () => new Response("guard"),
    });
    expect(await (await proxy(request)).text()).toBe("guard");
  });

  it("falls through to next-intl when the guard returns nothing", async () => {
    const proxy = AOFCreateMiddleware(routing, {
      guard: async () => undefined,
    });
    expect(await (await proxy(request)).text()).toBe("intl");
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/utils test -- src/next/i18n`
Expected: FAIL, cannot resolve `../aof-get-request-config`.

- [x] **Step 3: Write the two files**

`aof-get-request-config.ts`:
```ts
import { notFound } from "next/navigation";
import { type AbstractIntlMessages, hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

type Options<L extends string> = {
  routing: { locales: readonly L[] };
  /** `locale` from `next/root-params`, whose exports each App generates. */
  locale: () => Promise<string | undefined>;
  messages: (locale: L) => Promise<AbstractIntlMessages>;
};

/** next-intl's request config: the root-param locale, 404 on one not routed. */
export const AOFGetRequestConfig = <L extends string>({
  routing,
  locale,
  messages,
}: Options<L>) =>
  getRequestConfig(async () => {
    const requested = await locale();
    if (!hasLocale(routing.locales, requested)) {
      notFound();
    }
    return { locale: requested, messages: await messages(requested) };
  });
```
`aof-create-middleware.ts`:
```ts
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

type Guard = (
  request: NextRequest
) => Response | undefined | Promise<Response | undefined>;

/**
 * An App's proxy: `guard` runs first and may answer (a sign-in redirect);
 * otherwise next-intl routes the locale. The App's `config.matcher` stays a
 * literal in its proxy.ts: Next reads it statically.
 */
export const AOFCreateMiddleware = (
  routing: Parameters<typeof createMiddleware>[0],
  { guard }: { guard?: Guard | undefined } = {}
) => {
  const intl = createMiddleware(routing);
  return async (request: NextRequest): Promise<Response> =>
    (await guard?.(request)) ?? intl(request);
};
```
Add exports:
```json
"./next/i18n/aof-create-middleware": "./src/next/i18n/aof-create-middleware.ts",
"./next/i18n/aof-get-request-config": "./src/next/i18n/aof-get-request-config.ts",
```

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/utils test -- src/next/i18n && pnpm --filter @allonfire/utils check-types`
Expected: 6 tests PASS; type check PASS.

---

### Task 5: `AOFCreateNextConfig`

**Files:**
- Create: `packages/utils/src/next/config/aof-create-next-config.ts`, `tests/aof-create-next-config.test.ts`
- Modify: `packages/utils/package.json` (one export line)

**Interfaces:**
- Produces: `AOFCreateNextConfig(config?: NextConfig, options?: { transpile?: string[] | undefined; intl?: { requestConfig: string } | undefined }): NextConfig` from `@allonfire/utils/next/config/aof-create-next-config`.

- [x] **Step 1: Write the failing tests**

```ts
// @module-tag unit
import { SECURITY_HEADERS } from "../../../constants/security-headers";
import { AOFCreateNextConfig } from "../aof-create-next-config";

vi.mock("next-intl/plugin", () => ({
  default: (requestConfig: string) => (config: object) => ({
    ...config,
    env: { INTL_REQUEST_CONFIG: requestConfig },
  }),
}));

const APP_HEADER = { key: "X-Frame-Options", value: "SAMEORIGIN" };

describe("AOFCreateNextConfig", () => {
  it("sets the AllOnFire base", () => {
    expect(AOFCreateNextConfig()).toMatchObject({
      cacheComponents: true,
      output: "standalone",
      reactCompiler: true,
      transpilePackages: ["@allonfire/utils"],
      typedRoutes: true,
    });
  });

  it("merges the App's packages to transpile without duplicates", () => {
    const config = AOFCreateNextConfig(
      { transpilePackages: ["@allonfire/ui"] },
      { transpile: ["@allonfire/design", "@allonfire/ui", "@allonfire/utils"] }
    );
    expect(config.transpilePackages).toEqual([
      "@allonfire/utils",
      "@allonfire/design",
      "@allonfire/ui",
    ]);
  });

  it("lets the App's values win over the base", () => {
    expect(AOFCreateNextConfig({ typedRoutes: false }).typedRoutes).toBe(false);
  });

  it("sends the security headers first and the App's after, so the App's win", async () => {
    const config = AOFCreateNextConfig({
      headers: async () => [{ headers: [APP_HEADER], source: "/embed" }],
    });
    expect(await config.headers?.()).toEqual([
      { headers: SECURITY_HEADERS, source: "/(.*)" },
      { headers: [APP_HEADER], source: "/embed" },
    ]);
  });

  it("adds next-intl's plugin only when asked", () => {
    expect(AOFCreateNextConfig().env).toBeUndefined();
    expect(
      AOFCreateNextConfig({}, { intl: { requestConfig: "./request.ts" } }).env
    ).toEqual({ INTL_REQUEST_CONFIG: "./request.ts" });
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/utils test -- src/next/config`
Expected: FAIL, cannot resolve `../aof-create-next-config`.

- [x] **Step 3: Write `aof-create-next-config.ts`**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { SECURITY_HEADERS } from "../../constants/security-headers";

/** utils ships TypeScript source, so every App transpiles it. */
const BASE_TRANSPILE = ["@allonfire/utils"];

type Options = {
  transpile?: string[] | undefined;
  /** Path to the App's next-intl request config; no `intl`, no plugin. */
  intl?: { requestConfig: string } | undefined;
};

/**
 * The Next config every App starts from. The App's own values win; its
 * headers come after the security headers, and Next sends the last rule that
 * sets a key, so an App header overrides a base one on the paths it matches.
 */
export const AOFCreateNextConfig = (
  config: NextConfig = {},
  { transpile = [], intl }: Options = {}
): NextConfig => {
  const merged: NextConfig = {
    cacheComponents: true,
    output: "standalone",
    reactCompiler: true,
    typedRoutes: true,
    ...config,
    headers: async () => [
      { headers: SECURITY_HEADERS, source: "/(.*)" },
      ...((await config.headers?.()) ?? []),
    ],
    transpilePackages: [
      ...new Set([
        ...BASE_TRANSPILE,
        ...transpile,
        ...(config.transpilePackages ?? []),
      ]),
    ],
  };
  return intl ? createNextIntlPlugin(intl.requestConfig)(merged) : merged;
};
```
Add export: `"./next/config/aof-create-next-config": "./src/next/config/aof-create-next-config.ts",`

- [x] **Step 4: Run them to verify they pass, then the whole package**

Run: `pnpm --filter @allonfire/utils test && pnpm --filter @allonfire/utils check-types`
Expected: every utils test PASS (5 new here); type check PASS.

---

### Task 6: Back office adopts the scaffolding; docs

**Files:**
- Modify: `apps/back-office/package.json`, `apps/back-office/next.config.ts`, `apps/back-office/src/proxy.ts`, `apps/back-office/src/features/i18n/routing.ts`, `apps/back-office/src/features/i18n/request.ts`, `apps/back-office/src/app/[locale]/layout.tsx`, `packages/utils/README.md`, `CLAUDE.md`
- Delete: `apps/back-office/src/components/providers.tsx`, `apps/back-office/src/lib/get-query-client.ts`, `apps/back-office/src/lib/tests/get-query-client.test.ts` (moved to utils in Task 2)

**Interfaces:**
- Consumes: every export of Tasks 1–5.

- [x] **Step 1: Wire it**

`apps/back-office/package.json` dependencies: add `"@allonfire/utils": "workspace:*"`, then `pnpm install`.

`next.config.ts`:
```ts
import { AOFCreateNextConfig } from "@allonfire/utils/next/config/aof-create-next-config";

// Turbopack's file cache stays on (the default). On the exFAT drive macOS writes
// a `._*` sidecar next to each cache file and Turbopack fails to open the cache,
// so `dev` and `build` delete them under `.next` first; a no-op elsewhere.
export default AOFCreateNextConfig(
  {},
  {
    // next-intl reads the request config from src/features/i18n, next to the translations.
    intl: { requestConfig: "./src/features/i18n/request.ts" },
    transpile: ["@allonfire/design", "@allonfire/shadcn", "@allonfire/ui"],
  }
);
```
`src/features/i18n/routing.ts`:
```ts
import { LANGUAGES } from "@allonfire/utils/constants/locales";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  defaultLocale: "en",
  localePrefix: "as-needed",
  locales: LANGUAGES,
});
```
`src/features/i18n/request.ts`:
```ts
import { AOFGetRequestConfig } from "@allonfire/utils/next/i18n/aof-get-request-config";
import { locale } from "next/root-params";
import { routing } from "./routing";

export default AOFGetRequestConfig({
  locale,
  messages: async (language) =>
    (await import(`./translations/${language}.json`)).default,
  routing,
});
```
`src/proxy.ts`:
```ts
import { AOFCreateMiddleware } from "@allonfire/utils/next/i18n/aof-create-middleware";
import { routing } from "./features/i18n/routing";

// Locale only. Sign-in checks arrive with the auth plan (ADR 0009) as a guard.
export default AOFCreateMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
```
`src/app/[locale]/layout.tsx`: replace the `Providers` import with the four, and the body with:
```tsx
<NextIntlClientProvider>
  <AOFQueryClientProvider>
    <AOFThemeProvider>
      <AOFNuqsAdapter>{children}</AOFNuqsAdapter>
    </AOFThemeProvider>
    <AOFReactQueryDevtools />
  </AOFQueryClientProvider>
</NextIntlClientProvider>
```
imports:
```tsx
import { AOFNuqsAdapter } from "@allonfire/utils/next/providers/aof-nuqs-adapter";
import { AOFQueryClientProvider } from "@allonfire/utils/next/providers/aof-query-client-provider";
import { AOFReactQueryDevtools } from "@allonfire/utils/next/providers/aof-react-query-devtools";
import { AOFThemeProvider } from "@allonfire/utils/next/providers/aof-theme-provider";
```
Delete the three files listed above and the now-empty `src/components/` and `src/lib/` folders.

- [x] **Step 2: Nothing in the App still reads the deleted files**

Run: `grep -rn "components/providers\|get-query-client" apps/back-office/src`
Expected: no output.

- [x] **Step 3: The API never imports the Next scaffolding**

Run: `grep -rn "utils/next/" apps/api/src`
Expected: no output.

- [x] **Step 4: Types and unit tests across the repo**

Run: `pnpm turbo check-types test`
Expected: every task PASS.

- [x] **Step 5: Build and e2e**

Run: `pnpm --filter @allonfire/back-office build && pnpm --filter @allonfire/back-office test:e2e`
Expected: build PASS; e2e 3/3 PASS (English at `/`, Italian at `/it`, 404 on an unknown path). Then `curl -sI http://localhost:<port>/` against `pnpm --filter @allonfire/back-office start` shows `x-frame-options: DENY`.

- [x] **Step 6: Docs**

`packages/utils/README.md`: add a section after the existing API reference:
```md
### App scaffolding (`./next/*`)

The wiring every Next App composes, one piece per file (ADR 0012). React, Next
and the provider libraries are optional peer dependencies: the API never
imports these.

| Export | Wraps | Notes |
|--------|-------|-------|
| `./next/providers/aof-query-client-provider` | `QueryClientProvider` | client from `AOFGetQueryClient`; `staleTime` prop |
| `./next/providers/aof-react-query-devtools` | `ReactQueryDevtools` | lazy, development only; inside the Query provider |
| `./next/providers/aof-theme-provider` | next-themes `ThemeProvider` | `class`, `system`; every prop overrides |
| `./next/providers/aof-nuqs-adapter` | `NuqsAdapter` | App Router adapter |
| `./next/query/aof-get-query-client` | `getQueryClient` | per request on the server, one in the browser |
| `./next/i18n/aof-get-request-config` | `getRequestConfig` | root-param locale, 404 on one not routed |
| `./next/i18n/aof-create-middleware` | next-intl `createMiddleware` | optional `guard` runs first |
| `./next/config/aof-create-next-config` | `NextConfig` | base config, security headers, next-intl plugin |

An App composes the providers in its `[locale]/layout.tsx` and drops any it does
not need:

    <AOFQueryClientProvider>
      <AOFThemeProvider>
        <AOFNuqsAdapter>{children}</AOFNuqsAdapter>
      </AOFThemeProvider>
      <AOFReactQueryDevtools />
    </AOFQueryClientProvider>
```
Add a `./constants/locales` row to the constants table: `LOCALE`, `SUPPORTED_LOCALES`, `Language`, `LANGUAGES` — shared with the API.

`CLAUDE.md`, Package Layout: replace
`either: `packages/utils` is just `environment/`, `constants/` and `helpers/``
with
`either: `packages/utils` is `environment/`, `constants/`, `helpers/` and `next/`, the App scaffolding by topic (`config/`, `i18n/`, `query/`, `providers/`; ADR 0012)`.

`CLAUDE.md`, API section, replace the bullet starting "**Locales and the catalogue live in `features/i18n/constants/locales.ts`**" through "fails if a locale is missing from it." with:
```md
- **`LOCALE` lives in `@allonfire/utils/constants/locales`**, shared with the
  Apps (ADR 0012), which route by its derived `Language`. `SUPPORTED_LOCALES`
  there is the explicit preference order `match()` sees, main variant of each
  language first; `src/constants/tests/locales.test-d.ts` fails if a locale is
  missing from it or a language from `LANGUAGES`. The API's
  `features/i18n/constants/locales.ts` keeps `DEFAULT_LOCALE` and the catalogue.
```

- [x] **Step 7: Lint and format the touched files**

Run: `pnpm lint` then `pnpm exec biome check --write <every file this plan touched>`
Expected: `pnpm lint` exit 0.

### Task 7: Shared routing, navigation and messages

Added after Task 6 at the user's request: an App's `features/i18n/` shrinks to
one line per file, and text every App shows lives once in utils under the
reserved `Common` namespace.

**Files:**
- Create: `packages/utils/src/next/i18n/aof-define-routing.ts`, `aof-create-navigation.ts`, `shared-messages.ts`, `translations/en.json`, `translations/it.json`, `tests/aof-define-routing.test.ts`, `tests/aof-define-routing.test-d.ts`, `tests/aof-create-navigation.test.ts`, `tests/shared-messages.test.ts`, `packages/utils/src/next/tests/scaffolded-apps.ts`
- Modify: `packages/utils/src/next/i18n/aof-get-request-config.ts` (+ its test), `packages/utils/src/next/tests/peer-versions.test.ts` (uses the helper), `packages/utils/package.json` (exports, `i18n:check`, `@lingual/i18n-check`), `turbo.json` (`i18n:check` inputs), `apps/back-office/src/features/i18n/{routing,navigation}.ts`, `apps/back-office/src/features/i18n/translations/{en,it}.json`, `apps/back-office/src/app/[locale]/{not-found,error}.tsx`, `packages/utils/README.md`, spec, ADR 0012

**Interfaces:**
- Produces:
  - `AOFDefineRouting(options?: { defaultLocale?: Language; localeCookie?; alternateLinks?; localeDetection? })`: next-intl routing with `locales: LANGUAGES`, `localePrefix: "as-needed"`, `defaultLocale` `"en"` unless overridden. Localized `pathnames` and `domains` are left out until an App needs them.
  - `AOFCreateNavigation`: next-intl's `createNavigation`, so `Link` and the rest are typed from the App's routing.
  - `SHARED_MESSAGES: Record<Language, { Common: ... }>`; `AOFGetRequestConfig` now constrains `L extends Language` and returns `{ ...SHARED_MESSAGES[locale], ...appMessages }`.
  - `scaffoldedApps(): string[]` (test helper): App folders whose `next.config.ts` calls `AOFCreateNextConfig`.

- [x] **Step 1: Write the failing tests**

`tests/aof-define-routing.test.ts`: `AOFDefineRouting()` equals `{ defaultLocale: "en", localePrefix: "as-needed", locales: ["en", "it"] }`; `AOFDefineRouting({ defaultLocale: "it", localeCookie: false })` matches both overrides and keeps `locales`.
`tests/aof-define-routing.test-d.ts`: `// @ts-expect-error` on `defaultLocale: "de"` and on passing `locales`.
`tests/aof-create-navigation.test.ts`: the result of `AOFCreateNavigation(AOFDefineRouting())` has functions `getPathname`, `redirect`, `usePathname`, `useRouter`, and a `Link`.
`tests/shared-messages.test.ts`: every Language has a `Common` namespace; no scaffolded App's `src/features/i18n/translations/*.json` defines `Common`.
`tests/aof-get-request-config.test.ts`: the known-locale case now expects `{ ...SHARED_MESSAGES.it, hello: "it" }`.

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/utils test -- src/next && pnpm --filter @allonfire/utils check-types`
Expected: FAIL, missing modules; Back office's translations still define `NotFound`/`Error` but not `Common`, so the App check passes until Step 3's move.

- [x] **Step 3: Implement and wire Back office**

- The three utils files and the two JSON files (`Common.NotFound.{title,back}`, `Common.Error.{title,retry}`, moved verbatim from Back office's `en.json`/`it.json`), the merge in `AOFGetRequestConfig`, the exports, `"i18n:check": "i18n-check --locales src/next/i18n/translations --source en"`, and `turbo.json` `i18n:check` inputs `["src/**/i18n/translations/**"]`.
- Back office: `routing.ts` is `export const routing = AOFDefineRouting();`; `navigation.ts` is `AOFCreateNavigation(routing)`; `NotFound` and `Error` leave its JSON; `not-found.tsx` reads `getTranslations("Common.NotFound")`, `error.tsx` reads `useTranslations("Common.Error")`.

- [x] **Step 4: Verify**

Run: `pnpm --filter @allonfire/utils test && pnpm turbo check-types i18n:check && pnpm lint && pnpm --filter @allonfire/back-office build && pnpm --filter @allonfire/back-office test:e2e`
Expected: all PASS; e2e 3/3 (the 404 page still reads "Page not found").

## Implementation Log
- Implemented: 2026-09-30T14:46:29Z
- Workspace: current-branch — feat/design-package
- Committed: no — awaiting user review
- Task 7 (shared routing, navigation, messages) added and implemented: 2026-09-30T15:46:47Z
- Back office env moved to src/environment/environment.ts on utils NODE_ENV/nodeEnvSchema (user request): 2026-09-30T15:55:52Z
