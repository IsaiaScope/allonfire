# PWA: Offline Page, Static Precache and Install Hint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every AllOnFire App gets a Workbox service worker that precaches Next's static files and shows a localized Offline page when a page cannot load, Next's `useOffline` with a banner for drops mid-session, and an Install hint, all from one shared core PWA feature, worn first by the Back Office.

**Status:** implemented (uncommitted) @ 2026-10-16T15:04:44Z

**Architecture:** One core feature, `@allonfire/core/features/next/pwa/`, holds every PWA behaviour: the build step (`workbox-build`'s `generateSW` after `next build`, writing `public/sw.js`), the worker registration (`workbox-window`), platform detection and the Install hint state. `@allonfire/ui` holds only the two visible pieces (`AOFOfflineBanner`, `AOFInstallHint`). The Back Office adds its Offline page (a `StationNotice`), mounts the pieces in its locale layout and runs the build step.

**Tech Stack:** Next 16.3 (App Router, Cache Components, `experimental.useOffline`, `next/offline`), Workbox 7.4 (`workbox-build`, `workbox-window`), next-intl, Vitest (node and browser), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-pwa-offline-install-design.md` (ADR 0023; CONTEXT.md **Offline page**, **Install hint**)

## Global Constraints

- `display` stays `"browser"`; no push notifications; no page or data is ever cached (ADR 0023).
- New npm dependencies need at least 200k downloads a week: `workbox-build` 7.4.1 and `workbox-window` 7.4.1 (about 9.6M each).
- No `as` casts except `as const`; no biome-ignore; `objectKeys`/`objectValues`/`objectEntries`/`objectFromEntries` and `parseJson`/`stringifyJson` from core, never the bare `Object.*`/`JSON.*`.
- Constants: one nested object per owner (`PWA`), types from zod (`z.enum(...)`, `z.infer`); paths are never string literals, tests included: compose from `PWA.PATH` and `METADATA.PATH`.
- Every test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals (no `from "vitest"`); integration tests are `*.integration.test.ts`; browser tests `*.browser.test.tsx`.
- Files at most 300 lines (tests exempt); visual states through `cva`, classes joined with `cn`.
- Packages never import an App; `packages/design` gains no component (ADR 0022).
- Never commit: the owner commits with `/iso-commit`. Each task ends green, not committed.
- End of every task: `pnpm exec biome check --write <touched files>`, then the touched packages' `check-types` and `test`.

## Review Focus

1. A browser whose language differs from the URL's (an Italian browser on `/sign-in`): the Offline page follows the URL, never `Accept-Language`, and the precache never stores a redirect. Pinned in Task 3 (fallback by first segment) and Task 9 (e2e reload of `/sign-in` and `/it/sign-in`).
2. `localStorage` throwing (Safari private mode, blocked site data): the Install hint still shows and dismisses, it just forgets. Pinned in Task 2.
3. The fallback plugin losing its closure when Workbox copies its source into `sw.js`: it must read only `globalThis.AOF_PWA`, `caches` and `URL`. Pinned in Task 3 (the plugin re-created from its own source text).
4. A URL whose first segment is not a language (`/does-not-exist`, `/sign-in`) loaded offline: the default language's Offline page, not nothing. Pinned in Task 3.
5. iPadOS Safari, which reports a Mac user agent: the Install hint shows iOS's Share steps, not macOS's Add to Dock. Pinned in Task 1 (the `touch` input).

---

## File Structure

| File | Responsibility |
|---|---|
| `packages/core/src/features/next/pwa/constants/pwa.ts` | `PWA` (paths, output file, Install hint storage key and quiet days, platforms), `installPlatformSchema`, `InstallPlatform` |
| `packages/core/src/features/next/pwa/install-platform.ts` | `installPlatform({ userAgent, standalone, touch })`: whose add-to-home-screen steps apply |
| `packages/core/src/features/next/pwa/install-hint-state.ts` | `hintQuiet`, `readDismissed`, `writeDismissed`: the 30-day memory, storage injected |
| `packages/core/src/features/next/pwa/use-install-hint.ts` | `useInstallHint()`: `{ platform, dismiss }` after mount |
| `packages/core/src/features/next/pwa/offline-fallback.ts` | `offlineFallback`: the Workbox `handlerDidError` plugin, self-contained |
| `packages/core/src/features/next/pwa/build-service-worker.ts` | `serviceWorkerOptions`, `buildServiceWorker`: `generateSW` plus the `AOF_PWA` prelude |
| `packages/core/src/features/next/pwa/cli.ts` | `pwa:build` entry: reads `--app`, `--languages`, `.next/BUILD_ID` |
| `packages/core/src/features/next/pwa/aof-service-worker.tsx` | `AOFServiceWorker`: registers `/sw.js` through `workbox-window` when `enabled` |
| `packages/core/src/features/next/pwa/types/aof-pwa.d.ts` | `globalThis.AOF_PWA` declaration |
| `packages/core/src/features/next/config/aof-create-next-config.ts` | `experimental.useOffline`, `/sw.js` headers |
| `packages/core/src/features/next/i18n/translations/{en,it}.json` | `Common.Offline`, `Common.Install` |
| `packages/ui/src/components/aof-offline-banner.tsx` | `AOFOfflineBanner` |
| `packages/ui/src/components/aof-install-hint.tsx` | `AOFInstallHint` |
| `apps/back-office/src/app/[locale]/offline/page.tsx` | the Offline page |
| `apps/back-office/src/features/pwa/components/reload-button.tsx` | the Offline page's Retry (client leaf) |
| `apps/back-office/src/features/errors/constants/error-signage.ts` | `ERROR_SIGNAGE.OFFLINE` |
| `apps/back-office/src/proxy.ts` | matcher skips `/<lang>/offline` |
| `apps/back-office/src/app/[locale]/layout.tsx` | mounts the three pieces |
| `apps/back-office/package.json`, `turbo.json`, `.gitignore` | build step, `public/sw.js` as a build output, ignored |
| `apps/back-office/e2e/pwa.spec.ts` | worker, Offline page, precache, banner |

---

### Task 1: PWA constants and platform detection

**Files:**
- Create: `packages/core/src/features/next/pwa/constants/pwa.ts`
- Create: `packages/core/src/features/next/pwa/install-platform.ts`
- Test: `packages/core/src/features/next/pwa/tests/install-platform.test.ts`
- Modify: `packages/core/package.json` (exports)

**Interfaces:**
- Produces: `PWA`, `InstallPlatform` (`"ios" | "android" | "chrome" | "edge" | "mac-safari"`), `installPlatformSchema`, `installPlatform(input: { userAgent: string; standalone: boolean; touch: boolean }): InstallPlatform | null`.

- [x] **Step 1: Write the constants**

```ts
// packages/core/src/features/next/pwa/constants/pwa.ts
import { z } from "zod";

/** Where an App serves the PWA's files. */
const PATH = {
  /** The Offline page, under each language: `/en/offline`, `/it/offline`. */
  OFFLINE: "/offline",
  /** The service worker, generated into the App's `public/` at build. */
  SERVICE_WORKER: "/sw.js",
} as const;

/** Whose add-to-home-screen steps the Install hint shows. */
const PLATFORM = {
  ANDROID: "android",
  CHROME: "chrome",
  EDGE: "edge",
  IOS: "ios",
  MAC_SAFARI: "mac-safari",
} as const;

/** What every App's PWA shares: its paths, the worker's file, the Install hint. */
export const PWA = {
  INSTALL_HINT: {
    /** Days the Install hint stays away once dismissed. */
    QUIET_DAYS: 30,
    /** `localStorage` key holding the dismissal's time, in ms. */
    STORAGE_KEY: "aof:install-hint-dismissed",
  },
  /** The worker's file, relative to the App's folder. */
  OUTPUT: `public${PATH.SERVICE_WORKER}`,
  PATH,
  PLATFORM,
} as const;

export const installPlatformSchema = z.enum(PLATFORM);
export type InstallPlatform = z.infer<typeof installPlatformSchema>;
```

- [x] **Step 2: Write the failing test**

```ts
// packages/core/src/features/next/pwa/tests/install-platform.test.ts
// @module-tag unit
import { PWA } from "../constants/pwa";
import { installPlatform } from "../install-platform";

const UA = {
  ANDROID_CHROME:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  ANDROID_SAMSUNG:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  DESKTOP_CHROME:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  DESKTOP_EDGE:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  DESKTOP_FIREFOX:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0",
  INSTAGRAM:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.0.0",
  IPHONE_CHROME:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
  IPHONE_SAFARI:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  MAC_SAFARI:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
} as const;

const on = (userAgent: string, { standalone = false, touch = false } = {}) =>
  installPlatform({ standalone, touch, userAgent });

describe("installPlatform", () => {
  it.each([
    [UA.IPHONE_SAFARI, PWA.PLATFORM.IOS],
    [UA.IPHONE_CHROME, PWA.PLATFORM.IOS],
    [UA.ANDROID_CHROME, PWA.PLATFORM.ANDROID],
    [UA.DESKTOP_EDGE, PWA.PLATFORM.EDGE],
    [UA.DESKTOP_CHROME, PWA.PLATFORM.CHROME],
    [UA.MAC_SAFARI, PWA.PLATFORM.MAC_SAFARI],
  ])("names the steps for %s", (userAgent, platform) => {
    expect(on(userAgent)).toBe(platform);
  });

  it("reads iPadOS, which reports a Mac, as iOS by its touch screen", () => {
    expect(on(UA.MAC_SAFARI, { touch: true })).toBe(PWA.PLATFORM.IOS);
  });

  it.each([UA.DESKTOP_FIREFOX, UA.ANDROID_SAMSUNG, UA.INSTAGRAM])(
    "names none where the hint has no steps to give: %s",
    (userAgent) => {
      expect(on(userAgent)).toBeNull();
    }
  );

  it("names none for a page already opened from the home screen", () => {
    expect(on(UA.IPHONE_SAFARI, { standalone: true })).toBeNull();
  });
});
```

- [x] **Step 3: Run it to see it fail**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/pwa/tests/install-platform.test.ts`
Expected: FAIL, `Cannot find module '../install-platform'`.

- [x] **Step 4: Implement**

```ts
// packages/core/src/features/next/pwa/install-platform.ts
import { type InstallPlatform, PWA } from "./constants/pwa";

/** In-app browsers (Instagram, Facebook, LINE) offer no add to home screen. */
const IN_APP = /Instagram|FBAN|FBAV|Line\//;
const IOS = /iPhone|iPad|iPod/;
const MAC = /Macintosh/;
const ANDROID = /Android/;
/** Chromium browsers that are not Chrome, each with menus of its own. */
const OTHER_CHROMIUM = /SamsungBrowser|OPR\/|EdgA\//;
const EDGE = /Edg\//;
const CHROME = /Chrome\//;
const SAFARI = /Version\/[\d.]+.*Safari\//;

type Visitor = {
  userAgent: string;
  /** `display-mode: standalone`: opened from the home screen already. */
  standalone: boolean;
  /** A touch screen (`navigator.maxTouchPoints > 1`): an iPad reports a Mac. */
  touch: boolean;
};

/**
 * Whose add-to-home-screen steps the Install hint shows, or null where the
 * browser offers none (Firefox desktop, in-app browsers) or the App is
 * already open from the home screen.
 */
export const installPlatform = ({
  standalone,
  touch,
  userAgent,
}: Visitor): InstallPlatform | null => {
  if (standalone || IN_APP.test(userAgent)) {
    return null;
  }
  if (IOS.test(userAgent) || (MAC.test(userAgent) && touch)) {
    return PWA.PLATFORM.IOS;
  }
  if (ANDROID.test(userAgent)) {
    return CHROME.test(userAgent) && !OTHER_CHROMIUM.test(userAgent)
      ? PWA.PLATFORM.ANDROID
      : null;
  }
  if (EDGE.test(userAgent)) {
    return PWA.PLATFORM.EDGE;
  }
  if (CHROME.test(userAgent) && !OTHER_CHROMIUM.test(userAgent)) {
    return PWA.PLATFORM.CHROME;
  }
  if (MAC.test(userAgent) && SAFARI.test(userAgent)) {
    return PWA.PLATFORM.MAC_SAFARI;
  }
  return null;
};
```

- [x] **Step 5: Add the exports**

In `packages/core/package.json` `exports`, beside the other `features/next` lines, in order:

```json
"./features/next/pwa/constants/pwa": "./src/features/next/pwa/constants/pwa.ts",
"./features/next/pwa/install-platform": "./src/features/next/pwa/install-platform.ts",
```

- [x] **Step 6: Run the test and checks**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/pwa/tests/install-platform.test.ts && pnpm exec biome check --write packages/core/src/features/next/pwa packages/core/package.json && pnpm --filter @allonfire/core check-types`
Expected: 9 tests PASS, Biome clean, no type errors.

---

### Task 2: Install hint state and hook

**Files:**
- Create: `packages/core/src/features/next/pwa/install-hint-state.ts`
- Create: `packages/core/src/features/next/pwa/use-install-hint.ts`
- Test: `packages/core/src/features/next/pwa/tests/install-hint-state.test.ts`
- Modify: `packages/core/package.json` (exports)

**Interfaces:**
- Consumes: `PWA.INSTALL_HINT`, `installPlatform`, `InstallPlatform` (Task 1); `UNIT` (`@allonfire/core/shared/constants/units`).
- Produces: `hintQuiet(dismissedAt: number | null, now: number): boolean`, `readDismissed(storage: Pick<Storage, "getItem">): number | null`, `writeDismissed(storage: Pick<Storage, "setItem">, at: number): void`, `useInstallHint(): { platform: InstallPlatform | null; dismiss: () => void }`.

- [x] **Step 1: Write the failing test**

```ts
// packages/core/src/features/next/pwa/tests/install-hint-state.test.ts
// @module-tag unit
import { UNIT } from "../../../../shared/constants/units";
import { PWA } from "../constants/pwa";
import { hintQuiet, readDismissed, writeDismissed } from "../install-hint-state";

const MS_PER_DAY = UNIT.SECONDS_PER_DAY * UNIT.MS_PER_SECOND;
const NOW = Date.UTC(2026, 9, 16);
const daysAgo = (days: number) => NOW - days * MS_PER_DAY;
const blocked = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("SecurityError");
  },
};

describe("hintQuiet", () => {
  it("keeps the hint away for 30 days after a dismissal", () => {
    expect(hintQuiet(daysAgo(PWA.INSTALL_HINT.QUIET_DAYS - 1), NOW)).toBe(true);
  });

  it("shows it again once the 30 days are over", () => {
    expect(hintQuiet(daysAgo(PWA.INSTALL_HINT.QUIET_DAYS), NOW)).toBe(false);
  });

  it("shows it when it was never dismissed", () => {
    expect(hintQuiet(null, NOW)).toBe(false);
  });
});

describe("dismissal storage", () => {
  it("reads back the time it wrote", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    writeDismissed(storage, NOW);
    expect(readDismissed(storage)).toBe(NOW);
  });

  it("reads a value that is not a time as never dismissed", () => {
    expect(readDismissed({ getItem: () => "soon" })).toBeNull();
  });

  // Safari's private mode and blocked site data throw on access.
  it("forgets instead of throwing when storage is blocked", () => {
    expect(readDismissed(blocked)).toBeNull();
    expect(() => writeDismissed(blocked, NOW)).not.toThrow();
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/pwa/tests/install-hint-state.test.ts`
Expected: FAIL, `Cannot find module '../install-hint-state'`.

- [x] **Step 3: Implement the state**

```ts
// packages/core/src/features/next/pwa/install-hint-state.ts
import { UNIT } from "../../../shared/constants/units";
import { PWA } from "./constants/pwa";

const QUIET_MS =
  PWA.INSTALL_HINT.QUIET_DAYS * UNIT.SECONDS_PER_DAY * UNIT.MS_PER_SECOND;

/** Whether a dismissal at `dismissedAt` still keeps the Install hint away. */
export const hintQuiet = (dismissedAt: number | null, now: number) =>
  dismissedAt !== null && now - dismissedAt < QUIET_MS;

/**
 * When the visitor last dismissed the hint, or null. Storage that throws
 * (a private window, blocked site data) reads as never dismissed.
 */
export const readDismissed = (storage: Pick<Storage, "getItem">) => {
  try {
    const at = Number(storage.getItem(PWA.INSTALL_HINT.STORAGE_KEY));
    return Number.isFinite(at) && at > 0 ? at : null;
  } catch {
    return null;
  }
};

/** Remembers a dismissal; storage that throws just forgets it. */
export const writeDismissed = (storage: Pick<Storage, "setItem">, at: number) => {
  try {
    storage.setItem(PWA.INSTALL_HINT.STORAGE_KEY, String(at));
  } catch {
    // ponytail: nothing to keep it in; the hint comes back next visit.
  }
};
```

`Number(null)` is `0`, so a missing key reads as null through `at > 0`.

- [x] **Step 4: Run the test**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/pwa/tests/install-hint-state.test.ts`
Expected: 6 tests PASS.

- [x] **Step 5: Write the hook**

```ts
// packages/core/src/features/next/pwa/use-install-hint.ts
"use client";

import { useEffect, useState } from "react";
import type { InstallPlatform } from "./constants/pwa";
import { hintQuiet, readDismissed, writeDismissed } from "./install-hint-state";
import { installPlatform } from "./install-platform";

const STANDALONE = "(display-mode: standalone)";
/** More than one touch point: a touch screen, so an iPad reporting a Mac. */
const TOUCH_POINTS = 1;

/**
 * The Install hint's state: whose steps to show, null on the server, before
 * mount, where none apply or for 30 days after a dismissal. Deciding after
 * mount keeps the server's HTML and the first client render the same.
 */
export const useInstallHint = () => {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  useEffect(() => {
    if (hintQuiet(readDismissed(localStorage), Date.now())) {
      return;
    }
    setPlatform(
      installPlatform({
        standalone: matchMedia(STANDALONE).matches,
        touch: navigator.maxTouchPoints > TOUCH_POINTS,
        userAgent: navigator.userAgent,
      })
    );
  }, []);
  const dismiss = () => {
    writeDismissed(localStorage, Date.now());
    setPlatform(null);
  };
  return { dismiss, platform };
};
```

Its behaviour in a real browser is covered by Task 8's browser test, which renders `AOFInstallHint` in Chromium and WebKit.

- [x] **Step 6: Exports and checks**

Add to `packages/core/package.json` `exports`:

```json
"./features/next/pwa/install-hint-state": "./src/features/next/pwa/install-hint-state.ts",
"./features/next/pwa/use-install-hint": "./src/features/next/pwa/use-install-hint.ts",
```

Run: `pnpm exec biome check --write packages/core/src/features/next/pwa packages/core/package.json && pnpm --filter @allonfire/core check-types && pnpm --filter @allonfire/core test`
Expected: clean, all core tests PASS.

---

### Task 3: The service worker build

**Files:**
- Create: `packages/core/src/features/next/pwa/types/aof-pwa.d.ts`
- Create: `packages/core/src/features/next/pwa/offline-fallback.ts`
- Create: `packages/core/src/features/next/pwa/build-service-worker.ts`
- Create: `packages/core/src/features/next/pwa/cli.ts`
- Test: `packages/core/src/features/next/pwa/tests/offline-fallback.test.ts`
- Test: `packages/core/src/features/next/pwa/tests/build-service-worker.integration.test.ts`
- Modify: `packages/core/package.json` (`devDependencies` `workbox-build`, script `pwa:build`, exports)

**Interfaces:**
- Consumes: `PWA` (Task 1); `I18N` (`features/i18n/constants/locales`); `stringifyJson` (`shared/utils/json`); `UNIT`.
- Produces: `offlineFallback({ request }: { request: Request }): Promise<Response | undefined>`; `serviceWorkerOptions(build: ServiceWorkerBuild): GenerateSWOptions`; `buildServiceWorker(build: ServiceWorkerBuild): Promise<void>`; `type ServiceWorkerBuild = { appDir: string; buildId: string; languages: readonly string[] }` (default language first); the script `pnpm --filter @allonfire/core pwa:build --app <abs path> [--languages en,it]`.

- [x] **Step 1: Add the dependency**

Run: `pnpm --filter @allonfire/core add -D workbox-build@7.4.1`
Expected: `workbox-build` in core's `devDependencies`, lockfile updated. It only runs at build, in the Docker builder stage, which installs dev dependencies.

- [x] **Step 2: Declare the worker's settings**

```ts
// packages/core/src/features/next/pwa/types/aof-pwa.d.ts
/**
 * What the build prepends to `sw.js` (`self.AOF_PWA = {...}`): the worker's
 * plugins read it here, since Workbox copies their source without their
 * imports.
 */
declare global {
  var AOF_PWA:
    | {
        /** The language whose Offline page answers a URL with no language. */
        defaultLanguage: string;
        /** `PWA.PATH.OFFLINE`. */
        offline: string;
      }
    | undefined;
}

export {};
```

- [x] **Step 3: Write the failing fallback test**

```ts
// packages/core/src/features/next/pwa/tests/offline-fallback.test.ts
// @module-tag unit
import { PWA } from "../constants/pwa";
import { offlineFallback } from "../offline-fallback";

const ORIGIN = "https://example.test";
const EN_PAGE = new Response("en");
const IT_PAGE = new Response("it");
const cached = new Map([
  [`/en${PWA.PATH.OFFLINE}`, EN_PAGE],
  [`/it${PWA.PATH.OFFLINE}`, IT_PAGE],
]);

beforeEach(() => {
  globalThis.AOF_PWA = { defaultLanguage: "en", offline: PWA.PATH.OFFLINE };
  vi.stubGlobal("caches", {
    match: async (url: string) => cached.get(url),
  });
});

afterEach(() => {
  globalThis.AOF_PWA = undefined;
  vi.unstubAllGlobals();
});

const failedLoad = (path: string) =>
  offlineFallback({ request: new Request(`${ORIGIN}${path}`) });

describe("offlineFallback", () => {
  it("answers with the Offline page of the URL's language", async () => {
    expect(await failedLoad("/it/sign-in")).toBe(IT_PAGE);
  });

  it("answers a URL with no language with the default language's", async () => {
    expect(await failedLoad("/sign-in")).toBe(EN_PAGE);
    expect(await failedLoad(PWA.PATH.OFFLINE)).toBe(EN_PAGE);
  });

  it("answers an unknown first segment with the default language's", async () => {
    expect(await failedLoad("/does-not-exist/deeper")).toBe(EN_PAGE);
  });

  it("answers nothing before the build's settings are there", async () => {
    globalThis.AOF_PWA = undefined;
    expect(await failedLoad("/it/sign-in")).toBeUndefined();
  });

  // Workbox writes the plugin's source text into sw.js, without its module:
  // a reference to an import would be undefined there.
  it("works from its own source text, as the generated worker runs it", async () => {
    const copy = new Function(`return (${offlineFallback.toString()});`)();
    expect(
      await copy({ request: new Request(`${ORIGIN}/it/sign-in`) })
    ).toBe(IT_PAGE);
  });
});
```

- [x] **Step 4: Run it to see it fail**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/pwa/tests/offline-fallback.test.ts`
Expected: FAIL, `Cannot find module '../offline-fallback'`.

- [x] **Step 5: Implement the fallback**

```ts
// packages/core/src/features/next/pwa/offline-fallback.ts

/**
 * The worker's answer to a page load the network failed: the precached
 * Offline page of the URL's language (its first segment), else the default
 * language's. Workbox copies this function's source into `sw.js` without
 * its module, so it reads only `globalThis.AOF_PWA`, `caches` and `URL`.
 * `ignoreSearch`: the precache keys carry Workbox's revision parameter.
 */
export const offlineFallback = async ({ request }: { request: Request }) => {
  const settings = globalThis.AOF_PWA;
  if (!settings) {
    return undefined;
  }
  const [, first] = new URL(request.url).pathname.split("/");
  const own = await caches.match(`/${first}${settings.offline}`, {
    ignoreSearch: true,
  });
  return (
    own ??
    caches.match(`/${settings.defaultLanguage}${settings.offline}`, {
      ignoreSearch: true,
    })
  );
};
```

- [x] **Step 6: Run the fallback test**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/pwa/tests/offline-fallback.test.ts`
Expected: 5 tests PASS. If the source-text test fails with `__name is not defined`, the transpiler kept function names: rewrite `offlineFallback` as `async function offlineFallback(...)` declared with `export`, run again.

- [x] **Step 7: Write the failing build test**

```ts
// packages/core/src/features/next/pwa/tests/build-service-worker.integration.test.ts
// @module-tag integration
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PWA } from "../constants/pwa";
import { buildServiceWorker } from "../build-service-worker";

const BUILD_ID = "build-123";
const CHUNK = "chunks/app.js";
let appDir = "";

beforeEach(async () => {
  appDir = await mkdtemp(join(tmpdir(), "aof-pwa-"));
  await mkdir(join(appDir, ".next/static/chunks"), { recursive: true });
  await mkdir(join(appDir, "public"));
  await writeFile(join(appDir, ".next/static", CHUNK), "console.log(1);");
  // exFAT's AppleDouble sidecars are never precached.
  await writeFile(join(appDir, ".next/static/chunks/._app.js"), "junk");
});

afterEach(() => rm(appDir, { force: true, recursive: true }));

const worker = async () => {
  await buildServiceWorker({ appDir, buildId: BUILD_ID, languages: ["en", "it"] });
  return readFile(join(appDir, PWA.OUTPUT), "utf8");
};

describe("buildServiceWorker", () => {
  it("opens the worker with the settings its fallback reads", async () => {
    expect((await worker()).startsWith(
      'self.AOF_PWA = {"defaultLanguage":"en","offline":"/offline"};'
    )).toBe(true);
  });

  it("precaches Next's static files and each language's Offline page", async () => {
    const source = await worker();
    expect(source).toContain(`/_next/static/${CHUNK}`);
    expect(source).not.toContain("._app.js");
    expect(source).toContain(`"/en${PWA.PATH.OFFLINE}"`);
    expect(source).toContain(`"/it${PWA.PATH.OFFLINE}"`);
    expect(source).toContain(BUILD_ID);
  });

  it("routes page loads to the network with the Offline page on failure", async () => {
    const source = await worker();
    expect(source).toContain("navigate");
    expect(source).toContain("handlerDidError");
    expect(source).toContain("AOF_PWA");
  });
});
```

- [x] **Step 8: Run it to see it fail**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/pwa/tests/build-service-worker.integration.test.ts`
Expected: FAIL, `Cannot find module '../build-service-worker'`.

- [x] **Step 9: Implement the build**

```ts
// packages/core/src/features/next/pwa/build-service-worker.ts
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type GenerateSWOptions, generateSW } from "workbox-build";
import { UNIT } from "../../../shared/constants/units";
import { stringifyJson } from "../../../shared/utils/json";
import { PWA } from "./constants/pwa";
import { offlineFallback } from "./offline-fallback";

/** What a build needs: the App's folder, Next's build id, its languages (the default first). */
export type ServiceWorkerBuild = {
  appDir: string;
  buildId: string;
  languages: readonly string[];
};

/** Next's hashed files: what the worker precaches. */
const STATIC_DIR = ".next/static";
const STATIC_URL = "/_next/static/";
/** A file bigger than this is left to the network (a source map, a huge chunk). */
const LARGEST_PRECACHED = 5 * UNIT.BYTES_PER_MIB;

/**
 * Workbox's options for an App: precache Next's static files and each
 * language's Offline page; page loads go to the network, the Offline page
 * answering when it fails; nothing else is routed. A new build's worker
 * takes over on the next visit, never mid-session.
 */
export const serviceWorkerOptions = ({
  appDir,
  buildId,
  languages,
}: ServiceWorkerBuild): GenerateSWOptions => ({
  additionalManifestEntries: languages.map((language) => ({
    revision: buildId,
    url: `/${language}${PWA.PATH.OFFLINE}`,
  })),
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  globDirectory: join(appDir, STATIC_DIR),
  globIgnores: ["**/._*"],
  globPatterns: ["**/*"],
  inlineWorkboxRuntime: true,
  maximumFileSizeToCacheInBytes: LARGEST_PRECACHED,
  modifyURLPrefix: { "": STATIC_URL },
  runtimeCaching: [
    {
      handler: "NetworkOnly",
      options: { plugins: [{ handlerDidError: offlineFallback }] },
      urlPattern: ({ request }) => request.mode === "navigate",
    },
  ],
  skipWaiting: false,
  sourcemap: false,
  swDest: join(appDir, PWA.OUTPUT),
});

/** Writes the App's `public/sw.js`, opened with the settings its fallback reads. */
export const buildServiceWorker = async (build: ServiceWorkerBuild) => {
  const options = serviceWorkerOptions(build);
  await generateSW(options);
  const [defaultLanguage = ""] = build.languages;
  const settings = stringifyJson({ defaultLanguage, offline: PWA.PATH.OFFLINE });
  const source = await readFile(options.swDest, "utf8");
  await writeFile(options.swDest, `self.AOF_PWA = ${settings};\n${source}`);
};
```

- [x] **Step 10: Run the build test**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/pwa/tests/build-service-worker.integration.test.ts`
Expected: 3 tests PASS. If `generateSW` rejects the `plugins` entry with a validation error, read `node_modules/workbox-build/build/schema/GenerateSWOptions.json` for the accepted plugin shape, adjust `runtimeCaching`, and run again; the test pins the outcome, not the option spelling.

- [x] **Step 11: Write the CLI**

```ts
// packages/core/src/features/next/pwa/cli.ts
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { I18N } from "../../i18n/constants/locales";
import { buildServiceWorker } from "./build-service-worker";

/**
 * `pnpm --filter @allonfire/core pwa:build --app <path> [--languages en,it]`,
 * run by an App's `build` after `next build`: writes its `public/sw.js`.
 * The languages default to the Host's, the default one first.
 */
const { values } = parseArgs({
  options: {
    app: { type: "string" },
    languages: { type: "string" },
  },
});
if (!values.app) {
  throw new Error("pwa:build needs --app <the App's folder>");
}
const appDir = resolve(values.app);
const buildId = (await readFile(join(appDir, ".next/BUILD_ID"), "utf8")).trim();
const languages = values.languages?.split(",") ?? [
  I18N.DEFAULT_LANGUAGE,
  ...I18N.BASE_LANGUAGES.filter((language) => language !== I18N.DEFAULT_LANGUAGE),
];
await buildServiceWorker({ appDir, buildId, languages });
console.log(`pwa:build wrote ${join(appDir, "public/sw.js")}`);
```

Add to `packages/core/package.json` `scripts`: `"pwa:build": "tsx src/features/next/pwa/cli.ts"`. Add exports:

```json
"./features/next/pwa/build-service-worker": "./src/features/next/pwa/build-service-worker.ts",
"./features/next/pwa/offline-fallback": "./src/features/next/pwa/offline-fallback.ts",
```

If Biome flags the `console.log`, drop it: the generated file is the output.

- [x] **Step 12: Checks**

Run: `pnpm exec biome check --write packages/core/src/features/next/pwa packages/core/package.json && pnpm --filter @allonfire/core check-types && pnpm --filter @allonfire/core test`
Expected: clean, all core tests PASS.

---

### Task 4: Registration and the Next config

**Files:**
- Create: `packages/core/src/features/next/pwa/aof-service-worker.tsx`
- Test: `packages/core/src/features/next/pwa/tests/aof-service-worker.test.tsx`
- Modify: `packages/core/src/features/next/config/aof-create-next-config.ts`
- Test: `packages/core/src/features/next/config/tests/aof-create-next-config.test.ts`
- Modify: `packages/core/src/features/http/constants/http.ts` (a `JAVASCRIPT` content type and a `NO_CACHE` value, if missing)
- Modify: `packages/core/package.json` (`dependencies` `workbox-window`, export)

**Interfaces:**
- Consumes: `PWA.PATH.SERVICE_WORKER` (Task 1).
- Produces: `AOFServiceWorker({ enabled }: { enabled: boolean })`, rendering nothing; `AOFCreateNextConfig` returning `experimental.useOffline: true` and a `/sw.js` header rule.

- [x] **Step 1: Add the dependency**

Run: `pnpm --filter @allonfire/core add workbox-window@7.4.1`

- [x] **Step 2: Write the failing registration test**

```tsx
// packages/core/src/features/next/pwa/tests/aof-service-worker.test.tsx
// @module-tag unit
// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PWA } from "../constants/pwa";
import { AOFServiceWorker } from "../aof-service-worker";

const register = vi.fn();
const Workbox = vi.fn(() => ({ register }));
vi.mock("workbox-window", () => ({ Workbox }));

const mount = async (enabled: boolean) => {
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<AOFServiceWorker enabled={enabled} />));
  root.unmount();
};

beforeEach(() => {
  vi.stubGlobal("navigator", { ...navigator, serviceWorker: {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AOFServiceWorker", () => {
  it("registers the App's worker when enabled", async () => {
    await mount(true);
    expect(Workbox).toHaveBeenCalledWith(PWA.PATH.SERVICE_WORKER);
    expect(register).toHaveBeenCalledOnce();
  });

  // A worker under `next dev` would serve stale HMR files.
  it("registers nothing when disabled", async () => {
    await mount(false);
    expect(Workbox).not.toHaveBeenCalled();
  });
});
```

If core has no `jsdom` dev dependency, check `packages/core/package.json` and the other core tests' environments first; use the environment they use for React (`providers.test.tsx`), and copy its render helper instead of `createRoot`.

- [x] **Step 3: Run it to see it fail**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/pwa/tests/aof-service-worker.test.tsx`
Expected: FAIL, `Cannot find module '../aof-service-worker'`.

- [x] **Step 4: Implement**

```tsx
// packages/core/src/features/next/pwa/aof-service-worker.tsx
"use client";

import { useEffect } from "react";
import { Workbox } from "workbox-window";
import { PWA } from "./constants/pwa";

/**
 * Registers the App's service worker (`PWA.PATH.SERVICE_WORKER`, built by
 * `pwa:build`). The layout passes `enabled` for a production build only: a
 * worker under `next dev` caches HMR files. A new build's worker takes over
 * on the next visit. Renders nothing.
 */
export const AOFServiceWorker = ({ enabled }: { enabled: boolean }) => {
  useEffect(() => {
    if (enabled && "serviceWorker" in navigator) {
      new Workbox(PWA.PATH.SERVICE_WORKER).register();
    }
  }, [enabled]);
  return null;
};
```

- [x] **Step 5: Run the test**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/pwa/tests/aof-service-worker.test.tsx`
Expected: 2 tests PASS.

- [x] **Step 6: Write the failing config test**

Append to `packages/core/src/features/next/config/tests/aof-create-next-config.test.ts`, inside `describe("AOFCreateNextConfig", ...)`, importing `PWA` from `"../../pwa/constants/pwa"`:

```ts
  it("keeps a failed navigation pending until the network is back", () => {
    expect(AOFCreateNextConfig().experimental).toMatchObject({
      useOffline: true,
    });
  });

  // Next's PWA guide: the browser must fetch a new worker on every visit.
  it("serves the service worker uncached, as JavaScript", async () => {
    const rules = (await AOFCreateNextConfig().headers?.()) ?? [];
    expect(
      rules.find(({ source }) => source === PWA.PATH.SERVICE_WORKER)?.headers
    ).toEqual([
      { key: HTTP.HEADER.CACHE_CONTROL, value: HTTP.CACHE_CONTROL.NO_CACHE },
      { key: HTTP.HEADER.CONTENT_TYPE, value: HTTP.CONTENT_TYPE.JAVASCRIPT },
    ]);
  });
```

- [x] **Step 7: Run it to see it fail**

Run: `pnpm --filter @allonfire/core exec vitest run src/features/next/config`
Expected: FAIL: `useOffline` missing, `HTTP.CACHE_CONTROL` or `JAVASCRIPT` undefined.

- [x] **Step 8: Implement**

In `packages/core/src/features/http/constants/http.ts`: add `JAVASCRIPT: "application/javascript; charset=utf-8"` to `CONTENT_TYPES` (alphabetical), and, if no `Cache-Control` values exist yet, a `CACHE_CONTROL` group in `HTTP` beside `HEADER`:

```ts
/** `Cache-Control` values: `NO_CACHE` asks the server again on every use. */
const CACHE_CONTROL = {
  NO_CACHE: "no-cache, no-store, must-revalidate",
} as const;
```

and `CACHE_CONTROL` in the exported `HTTP` object. If a cache-control group already exists (the storage proxy sets `immutable`), add `NO_CACHE` to it instead.

In `aof-create-next-config.ts`, import `PWA` from `"../pwa/constants/pwa"`; inside `merged`, after `...config`:

```ts
    /** Dev and production: a navigation or Server Action the network fails waits and retries (`useOffline`) instead of throwing. */
    experimental: { ...config.experimental, useOffline: true },
```

and add a header rule after the security headers' rule, before the App's own:

```ts
      {
        headers: [
          { key: HTTP.HEADER.CACHE_CONTROL, value: HTTP.CACHE_CONTROL.NO_CACHE },
          { key: HTTP.HEADER.CONTENT_TYPE, value: HTTP.CONTENT_TYPE.JAVASCRIPT },
        ],
        source: PWA.PATH.SERVICE_WORKER,
      },
```

- [x] **Step 9: Exports and checks**

Add `"./features/next/pwa/aof-service-worker": "./src/features/next/pwa/aof-service-worker.tsx",` to core's exports.

Run: `pnpm exec biome check --write packages/core && pnpm --filter @allonfire/core check-types && pnpm --filter @allonfire/core test`
Expected: clean, all PASS.

---

### Task 5: Shared translations

**Files:**
- Modify: `packages/core/src/features/next/i18n/translations/en.json`
- Modify: `packages/core/src/features/next/i18n/translations/it.json`

**Interfaces:**
- Produces: `Common.Offline.{title,description,retry,banner}`, `Common.Install.{title,dismiss,ios,android,chrome,edge,mac-safari}`. The `Common.Install` step keys are the `PWA.PLATFORM` values.

- [x] **Step 1: Add the English text**

Inside `"Common"` in `en.json`:

```json
  "Offline": {
    "title": "No connection",
    "description": "This page needs the network. Check your connection and try again.",
    "retry": "Try again",
    "banner": "No connection. You can carry on once you are back online."
  },
  "Install": {
    "title": "Keep it one tap away",
    "dismiss": "Not now",
    "ios": "Tap Share, then Add to Home Screen.",
    "android": "Open the browser menu, then Add to Home screen.",
    "chrome": "Open the browser menu, then Cast, save and share, then Create shortcut.",
    "edge": "Open the browser menu, then Apps, then Install this site as an app.",
    "mac-safari": "Choose File, then Add to Dock."
  }
```

- [x] **Step 2: Add the Italian text**

Inside `"Common"` in `it.json`:

```json
  "Offline": {
    "title": "Nessuna connessione",
    "description": "Questa pagina ha bisogno della rete. Controlla la connessione e riprova.",
    "retry": "Riprova",
    "banner": "Nessuna connessione. Puoi continuare appena torni online."
  },
  "Install": {
    "title": "Tienilo a portata di tocco",
    "dismiss": "Non ora",
    "ios": "Tocca Condividi, poi Aggiungi alla schermata Home.",
    "android": "Apri il menu del browser, poi Aggiungi a schermata Home.",
    "chrome": "Apri il menu del browser, poi Trasmetti, salva e condividi, poi Crea scorciatoia.",
    "edge": "Apri il menu del browser, poi App, poi Installa questo sito come app.",
    "mac-safari": "Scegli File, poi Aggiungi al Dock."
  }
```

- [x] **Step 3: Checks**

Run: `pnpm i18n:check && pnpm --filter @allonfire/core test && pnpm --filter @allonfire/back-office test`
Expected: no missing keys, all PASS (the Back Office's translation test reads core's shared text).

---

### Task 6: The visible pieces in ui

**Files:**
- Create: `packages/ui/src/components/aof-offline-banner.tsx`
- Create: `packages/ui/src/components/aof-install-hint.tsx`
- Test: `packages/ui/src/components/tests/aof-offline-banner.test.tsx`
- Test: `packages/ui/src/components/tests/aof-install-hint.test.tsx`
- Modify: `packages/ui/package.json` (exports)

**Interfaces:**
- Consumes: `useInstallHint` (Task 2), `InstallPlatform` (Task 1), `useOffline` from `next/offline`, `AOFButton`.
- Produces: `AOFOfflineBanner({ label, className })`; `AOFInstallHint({ title, dismissLabel, steps, className })` where `steps: Record<InstallPlatform, string>`.

- [x] **Step 1: Write the failing tests**

```tsx
// packages/ui/src/components/tests/aof-offline-banner.test.tsx
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFOfflineBanner } from "../aof-offline-banner";

const offline = vi.hoisted(() => ({ value: false }));
vi.mock("next/offline", () => ({ useOffline: () => offline.value }));

const LABEL = "No connection";

describe("AOFOfflineBanner", () => {
  it("says nothing while online", () => {
    offline.value = false;
    expect(renderToStaticMarkup(<AOFOfflineBanner label={LABEL} />)).toBe("");
  });

  it("reports the lost connection as a status while offline", () => {
    offline.value = true;
    const html = renderToStaticMarkup(<AOFOfflineBanner label={LABEL} />);
    expect(html).toContain('role="status"');
    expect(html).toContain(LABEL);
  });
});
```

```tsx
// packages/ui/src/components/tests/aof-install-hint.test.tsx
// @module-tag unit
import {
  type InstallPlatform,
  PWA,
} from "@allonfire/core/features/next/pwa/constants/pwa";
import { objectFromEntries, objectValues } from "@allonfire/core/shared/utils/object";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFInstallHint } from "../aof-install-hint";

const hint = vi.hoisted((): { platform: InstallPlatform | null } => ({
  platform: null,
}));
vi.mock("@allonfire/core/features/next/pwa/use-install-hint", () => ({
  useInstallHint: () => ({ dismiss: () => undefined, platform: hint.platform }),
}));

const STEPS = objectFromEntries(
  objectValues(PWA.PLATFORM).map((platform) => [platform, `steps for ${platform}`])
);
const render = () =>
  renderToStaticMarkup(
    <AOFInstallHint dismissLabel="Not now" steps={STEPS} title="Keep it close" />
  );

describe("AOFInstallHint", () => {
  it("renders nothing until a platform's steps apply", () => {
    hint.platform = null;
    expect(render()).toBe("");
  });

  it("shows the visitor's platform's steps and a dismiss button", () => {
    hint.platform = PWA.PLATFORM.IOS;
    const html = render();
    expect(html).toContain(STEPS[PWA.PLATFORM.IOS]);
    expect(html).not.toContain(STEPS[PWA.PLATFORM.ANDROID]);
    expect(html).toContain("Not now");
  });
});
```

- [x] **Step 2: Run them to see them fail**

Run: `pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-offline-banner.test.tsx src/components/tests/aof-install-hint.test.tsx`
Expected: FAIL, modules missing.

- [x] **Step 3: Implement the banner**

```tsx
// packages/ui/src/components/aof-offline-banner.tsx
"use client";

import { useOffline } from "next/offline";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";

export type AOFOfflineBannerProps = ComponentPropsWithoutChildren<"div"> & {
  /** What the banner says while offline (`Common.Offline.banner`). */
  label: string;
};

/**
 * A thin bar across the top while the network is gone: Next keeps a failed
 * navigation or Server Action pending and retries it once the connection is
 * back (`experimental.useOffline`), so there is nothing to press. A status,
 * so a screen reader announces it.
 */
export const AOFOfflineBanner = ({
  className,
  label,
  ...props
}: AOFOfflineBannerProps) =>
  useOffline() ? (
    <div
      className={cn(
        "motion-safe:fade-in motion-safe:slide-in-from-top-2 fixed inset-x-0 top-0 z-50 bg-foreground px-4 py-2 text-center text-background text-sm motion-safe:animate-in motion-safe:duration-300",
        className
      )}
      role="status"
      {...props}
    >
      {label}
    </div>
  ) : null;
```

- [x] **Step 4: Implement the hint**

```tsx
// packages/ui/src/components/aof-install-hint.tsx
"use client";

import type { InstallPlatform } from "@allonfire/core/features/next/pwa/constants/pwa";
import { useInstallHint } from "@allonfire/core/features/next/pwa/use-install-hint";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";
import { AOFButton } from "./aof-button";

export type AOFInstallHintProps = ComponentPropsWithoutChildren<"aside"> & {
  dismissLabel: string;
  /** Each platform's steps (`Common.Install.<platform>`). */
  steps: Record<InstallPlatform, string>;
  title: string;
};

/**
 * The Install hint: how to add the App to the home screen, dock or desktop
 * in this browser, until dismissed (then 30 days away). Nothing on the
 * server or where no steps apply: core's `useInstallHint` decides after
 * mount.
 */
export const AOFInstallHint = ({
  className,
  dismissLabel,
  steps,
  title,
  ...props
}: AOFInstallHintProps) => {
  const { dismiss, platform } = useInstallHint();
  if (!platform) {
    return null;
  }
  return (
    <aside
      aria-label={title}
      className={cn(
        "motion-safe:fade-in motion-safe:slide-in-from-bottom-2 fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-md items-start gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground text-sm shadow-lg motion-safe:animate-in motion-safe:duration-500",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-bold">{title}</p>
        <p className="text-muted-foreground">{steps[platform]}</p>
      </div>
      <AOFButton onClick={dismiss} size="sm" type="button" variant="ghost">
        {dismissLabel}
      </AOFButton>
    </aside>
  );
};
```

Check `AOFButton`'s variant and size names in `aof-button.tsx` and use the existing ghost and small ones.

- [x] **Step 5: Run the tests**

Run: `pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-offline-banner.test.tsx src/components/tests/aof-install-hint.test.tsx`
Expected: 4 tests PASS.

- [x] **Step 6: Exports and checks**

Add to `packages/ui/package.json` `exports`:

```json
"./components/aof-install-hint": "./src/components/aof-install-hint.tsx",
"./components/aof-offline-banner": "./src/components/aof-offline-banner.tsx",
```

Run: `pnpm exec biome check --write packages/ui && pnpm --filter @allonfire/ui check-types && pnpm --filter @allonfire/ui test`
Expected: clean, all PASS.

---

### Task 7: The Back Office's Offline page

**Files:**
- Modify: `apps/back-office/src/features/errors/constants/error-signage.ts`
- Create: `apps/back-office/src/features/pwa/components/reload-button.tsx`
- Create: `apps/back-office/src/app/[locale]/offline/page.tsx`
- Test: `apps/back-office/src/app/[locale]/offline/tests/offline-page.test.tsx`
- Modify: `apps/back-office/src/proxy.ts`, `apps/back-office/src/proxy.test.ts`
- Modify: `packages/design/src/designs/japan/fonts/yuji-syuku-subset.woff2`, `packages/design/src/designs/japan/fonts/README.md`

**Interfaces:**
- Consumes: `StationNotice`, `STATION_NOTICE_ACTION`, `StationNoticeKanji` (`@/shared/components/station-notice`); `PWA.PATH.OFFLINE`; `Common.Offline` (Task 5); `pageOpenGraph`.
- Produces: the page at `/<lang>/offline`; `ERROR_SIGNAGE.OFFLINE`; `ReloadButton`.

- [x] **Step 1: Add the signage**

In `error-signage.ts`, inside `ERROR_SIGNAGE`, after `NOT_FOUND`:

```ts
  OFFLINE: {
    /** The eki stamp's figure: 断, cut. */
    CODE: "断",
    /** 不通, line cut: what a board shows when a line is severed. */
    KANA: "不通",
    /** 再, again: brushed in the button that reloads. */
    RETRY_KANJI: "再",
    /** 圏外, out of range: what a phone shows with no signal, brushed huge. */
    WALL_KANJI: "圏外",
  },
```

- [x] **Step 2: Extend the brush subset**

Re-download Yuji Syuku with `改札入迷子戻到着運休再圏外` as `fonts/README.md` describes (`family=Yuji+Syuku&text=<url-encoded characters>`, then the `woff2` URL the CSS names), replace `yuji-syuku-subset.woff2`, and update the README's kanji list to `改札入迷子戻到着運休再圏外`. Run `pnpm design:sync --check`.

- [x] **Step 3: Write the failing page test**

```tsx
// apps/back-office/src/app/[locale]/offline/tests/offline-page.test.tsx
// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { ERROR_SIGNAGE } from "@/features/errors/constants/error-signage";
import { OfflineNotice } from "../page";

const TEXT = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common.Offline;

const render = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={I18N.DEFAULT_LANGUAGE}
      messages={SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE]}
    >
      <OfflineNotice />
    </NextIntlClientProvider>
  );

describe("Offline page", () => {
  it("says there is no connection, with 圏外 brushed across the wall", () => {
    const html = render();
    expect(html).toContain(TEXT.title);
    expect(html).toContain(TEXT.description);
    expect(html).toContain(`>${ERROR_SIGNAGE.OFFLINE.WALL_KANJI}<`);
  });

  it("offers a retry of the address that failed", () => {
    expect(render()).toContain(TEXT.retry);
  });
});
```

- [x] **Step 4: Run it to see it fail**

Run: `pnpm --filter @allonfire/back-office exec vitest run "src/app/[locale]/offline"`
Expected: FAIL, `Cannot find module '../page'`.

- [x] **Step 5: Write the reload button**

```tsx
// apps/back-office/src/features/pwa/components/reload-button.tsx
"use client";

import { AOFButton } from "@allonfire/ui/components/aof-button";
import type { ReactNode } from "react";
import { STATION_NOTICE_ACTION } from "@/shared/components/station-notice";

/**
 * Reloads the address the visitor was opening: the worker serves the
 * Offline page at the address that failed, so a reload is the retry.
 */
export const ReloadButton = ({ children }: { children: ReactNode }) => (
  <AOFButton
    className={STATION_NOTICE_ACTION}
    onClick={() => location.reload()}
    type="button"
  >
    {children}
  </AOFButton>
);
```

- [x] **Step 6: Write the page**

```tsx
// apps/back-office/src/app/[locale]/offline/page.tsx
import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ERROR_SIGNAGE } from "@/features/errors/constants/error-signage";
import { pageOpenGraph } from "@/features/metadata/utils/page-open-graph";
import { ReloadButton } from "@/features/pwa/components/reload-button";
import {
  StationNotice,
  StationNoticeKanji,
} from "@/shared/components/station-notice";

export const generateMetadata = async (): Promise<Metadata> => {
  const [t, locale] = await Promise.all([
    getTranslations("Common.Offline"),
    getLocale(),
  ]);
  return {
    openGraph: pageOpenGraph(PWA.PATH.OFFLINE, locale),
    title: t("title"),
  };
};

/**
 * The Offline page: the service worker precaches it per language and shows
 * it at any address that failed to load for lack of network. 断 and 不通 on
 * the stamp, 圏外 (out of range) across the wall, and a retry that reloads.
 */
export const OfflineNotice = () => {
  const t = useTranslations("Common.Offline");
  return (
    <StationNotice
      action={
        <ReloadButton>
          <StationNoticeKanji kanji={ERROR_SIGNAGE.OFFLINE.RETRY_KANJI} />
          {t("retry")}
        </ReloadButton>
      }
      description={t("description")}
      heading={t("title")}
      signage={ERROR_SIGNAGE.OFFLINE}
    />
  );
};

const OfflinePage = () => <OfflineNotice />;

export default OfflinePage;
```

`StationNotice` already renders the tab `<title>` from `heading`; `generateMetadata` sets it too, as every page does. If the doubled title shows in the head, pass no `heading`-derived title: keep `generateMetadata` and check the rendered head in Task 8's screenshot round.

- [x] **Step 7: Run the page test**

Run: `pnpm --filter @allonfire/back-office exec vitest run "src/app/[locale]/offline"`
Expected: 2 tests PASS.

- [x] **Step 8: Let the precache reach the page without a redirect**

In `proxy.test.ts`, import `PWA` from `"@allonfire/core/features/next/pwa/constants/pwa"`, and add to the "leaves the file %s to Next" list:

```ts
    // The worker precaches each language's Offline page at its prefixed
    // address; the locale proxy would redirect `/en/offline` to `/offline`.
    `/en${PWA.PATH.OFFLINE}`,
    `${IT}${PWA.PATH.OFFLINE}`,
```

Run: `pnpm --filter @allonfire/back-office exec vitest run src/proxy.test.ts`
Expected: FAIL for the two new cases.

In `proxy.ts`, extend the matcher literal with `[a-z]{2}/offline$|` before `.*\\..*`:

```ts
    "/((?!api|_next|_vercel|(?:[a-z]{2}/)?(?:apple-icon|icon|opengraph-image|twitter-image)(?:-\\w+)?(?:/\\w+)?$|[a-z]{2}/offline$|.*\\..*).*)",
```

and add to its comment: "each language's Offline page, which the service worker precaches at its prefixed address,". Run the proxy test again: PASS. `/offline` itself (no language) still goes through the proxy, which serves it in the visitor's language.

- [x] **Step 9: Checks**

Run: `pnpm exec biome check --write apps/back-office/src packages/design/src/designs/japan/fonts && pnpm --filter @allonfire/back-office exec tsc --noEmit && pnpm --filter @allonfire/back-office test`
Expected: clean, all PASS.

---

### Task 8: Wire the Back Office and dress the pieces

**Files:**
- Modify: `apps/back-office/src/app/[locale]/layout.tsx`
- Modify: `apps/back-office/package.json` (`build`)
- Modify: `turbo.json` (build outputs)
- Modify: `.gitignore`
- Test: `apps/back-office/src/features/pwa/components/tests/install-hint.browser.test.tsx`

**Interfaces:**
- Consumes: `AOFServiceWorker` (Task 4), `AOFOfflineBanner`, `AOFInstallHint` (Task 6), `Common.Offline`, `Common.Install` (Task 5), `pwa:build` (Task 3).

- [x] **Step 1: Write the failing browser test**

```tsx
// apps/back-office/src/features/pwa/components/tests/install-hint.browser.test.tsx
// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { AOFInstallHint } from "@allonfire/ui/components/aof-install-hint";
import { render } from "vitest-browser-react";

const TEXT = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common.Install;
const STEPS = {
  [PWA.PLATFORM.ANDROID]: TEXT.android,
  [PWA.PLATFORM.CHROME]: TEXT.chrome,
  [PWA.PLATFORM.EDGE]: TEXT.edge,
  [PWA.PLATFORM.IOS]: TEXT.ios,
  [PWA.PLATFORM.MAC_SAFARI]: TEXT["mac-safari"],
};
const hint = () => (
  <AOFInstallHint dismissLabel={TEXT.dismiss} steps={STEPS} title={TEXT.title} />
);

beforeEach(() => localStorage.clear());

describe("Install hint", () => {
  // Playwright's Chromium and WebKit both report a desktop browser with
  // steps (Chrome's, macOS Safari's): the hint shows.
  it("shows once mounted, and stays away after a dismissal", async () => {
    const screen = await render(hint());
    await expect.element(screen.getByText(TEXT.title)).toBeVisible();
    await screen.getByRole("button", { name: TEXT.dismiss }).click();
    await expect.element(screen.getByText(TEXT.title)).not.toBeInTheDocument();
    screen.unmount();
    const again = await render(hint());
    await expect.element(again.getByText(TEXT.title)).not.toBeInTheDocument();
  });
});
```

If WebKit's Playwright user agent matches no platform (it reports Safari without `Version/`), the first assertion fails there: then stub `navigator.userAgent` with `Object.defineProperty(navigator, "userAgent", { value: <the MAC_SAFARI string from Task 1>, configurable: true })` in `beforeEach`.

- [x] **Step 2: Run it**

Run: `pnpm --filter @allonfire/back-office test:browser`
Expected: the new test PASSES in Chromium and WebKit (the components exist since Task 6). A failure here is a bug in Task 2 or 6: fix it there.

- [x] **Step 3: Mount the pieces**

In `[locale]/layout.tsx`, import `AOFServiceWorker`, `AOFOfflineBanner`, `AOFInstallHint`, `ENV` (`@allonfire/core/shared/constants/env`), `PWA`, `objectFromEntries`/`objectValues`, and `getTranslations`. In `LocaleLayout`:

```tsx
  const [offline, install] = await Promise.all([
    getTranslations("Common.Offline"),
    getTranslations("Common.Install"),
  ]);
```

and inside `<AOFNuqsAdapter>`, after `{children}`:

```tsx
                {children}
                <AOFOfflineBanner label={offline("banner")} />
                <AOFInstallHint
                  dismissLabel={install("dismiss")}
                  steps={objectFromEntries(
                    objectValues(PWA.PLATFORM).map((platform) => [
                      platform,
                      install(platform),
                    ])
                  )}
                  title={install("title")}
                />
                <AOFServiceWorker
                  enabled={env.NODE_ENV === ENV.NODE.PRODUCTION}
                />
```

If `install(platform)` does not type-check because next-intl wants a literal key, map with a `switch`-free lookup: `{ [PWA.PLATFORM.IOS]: install("ios"), ... }` written out for the five platforms.

- [x] **Step 4: Run the build step after `next build`**

`apps/back-office/package.json`:

```json
"build": "find .next -name '._*' -delete 2>/dev/null; next build && pnpm --filter @allonfire/core pwa:build --app \"$PWD\"",
```

`turbo.json`, the `build` task's `outputs`: add `"public/sw.js"`, so a replayed build restores the worker.

`.gitignore`, beside the assets recap:

```
# The service worker, generated by `pwa:build` after every `next build`.
apps/*/public/sw.js
```

Run: `pnpm --filter @allonfire/back-office build && head -c 120 apps/back-office/public/sw.js`
Expected: the build passes and `sw.js` starts with `self.AOF_PWA = {"defaultLanguage":"en","offline":"/offline"};`.

- [x] **Step 5: Dress them in the Japan Design**

Run `/aof-design polish --target apps/back-office/src/app/[locale]/layout.tsx` for the banner and the hint only: the banner a thin LED strip across the top (`led-board`), the hint a small card above the language and theme capsule; neither ever covers a form or the capsule. Changes go through each component's `className` from the layout, never into `packages/ui` defaults. One build, one screenshot round (phone 390 wide and desktop, dark and light), through `/iso-browser` attached to the owner's open window. To see the banner, emulate offline in that tab after the page has loaded; to see the hint, clear `aof:install-hint-dismissed` in the tab's `localStorage`. Restore both afterwards.

- [x] **Step 6: Checks**

Run: `pnpm exec biome check --write apps/back-office turbo.json && pnpm check-types && pnpm --filter @allonfire/back-office test && pnpm --filter @allonfire/back-office test:browser`
Expected: all PASS.

---

### Task 9: End to end

**Files:**
- Create: `apps/back-office/e2e/pwa.spec.ts`

**Interfaces:**
- Consumes: everything above, through the production build `test:e2e` runs.

- [x] **Step 1: Write the spec**

```ts
// apps/back-office/e2e/pwa.spec.ts
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { expect, type Page, test } from "@playwright/test";

const { en: EN, it: IT } = SHARED_TRANSLATIONS;

const IT_SIGN_IN = `/it${AUTH.PAGE.SIGN_IN}`;

/** Loads a page and waits until the worker controls it, its precache filled. */
const withWorker = async (page: Page, path: string) => {
  await page.goto(path);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
};

test("serves the service worker uncached", async ({ request }) => {
  const response = await request.get(PWA.PATH.SERVICE_WORKER);
  expect(response.status()).toBe(HTTP.STATUS.OK);
  expect(response.headers()[HTTP.HEADER.CACHE_CONTROL]).toBe(
    HTTP.CACHE_CONTROL.NO_CACHE
  );
});

test("shows the Offline page in the URL's language when a load fails", async ({
  context,
  page,
}) => {
  await withWorker(page, IT_SIGN_IN);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: IT.Common.Offline.title })
  ).toBeVisible();
  await page.goto(AUTH.PAGE.SIGN_IN);
  await expect(
    page.getByRole("heading", { name: EN.Common.Offline.title })
  ).toBeVisible();
  await context.setOffline(false);
});

test("retries the address that failed once the network is back", async ({
  context,
  page,
}) => {
  await withWorker(page, IT_SIGN_IN);
  await context.setOffline(true);
  await page.reload();
  await context.setOffline(false);
  await page.getByRole("button", { name: IT.Common.Offline.retry }).click();
  await expect(page).toHaveURL(new RegExp(`${IT_SIGN_IN}$`));
  await expect(
    page.getByRole("heading", { name: IT.Common.Offline.title })
  ).toHaveCount(0);
});

test("reports a lost connection mid-session without leaving the page", async ({
  context,
  page,
}) => {
  await page.goto(IT_SIGN_IN);
  await context.setOffline(true);
  await expect(page.getByText(IT.Common.Offline.banner)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText(IT.Common.Offline.banner)).toHaveCount(0);
});
```

If `useOffline` reports offline only after a failed request, trigger one in the last test after `setOffline(true)`: click the language switch link (a soft navigation), then assert the banner.

- [x] **Step 2: Run it**

Run: `pnpm --filter @allonfire/back-office test:e2e -- e2e/pwa.spec.ts`
Expected: PASS in every project. Playwright supports service workers fully in Chromium; if a test fails only in `webkit` or `mobile-safari` because the worker never controls the page there, mark that test `test.skip(({ browserName }) => browserName !== "chromium", "Playwright drives service workers in Chromium only")` with that reason, and say so in the hand-off.

- [x] **Step 3: The whole suite**

Run: `pnpm turbo run test:e2e --filter=@allonfire/back-office`
Expected: all PASS.

---

### Task 10: Docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `packages/core/README.md`, `packages/ui/README.md`

- [x] **Step 1: CLAUDE.md**

In the page-information bullet list of "Server-Side Rendering First" (the Back Office paragraph), add:

```md
  - the PWA comes from core's `features/next/pwa` (ADR 0023): `pwa:build` runs after `next build` and writes `public/sw.js` (Workbox: Next's static files and each language's Offline page precached, page loads network only with the Offline page as fallback, nothing else cached); the layout mounts `AOFServiceWorker` (production only), ui's `AOFOfflineBanner` (`experimental.useOffline`) and `AOFInstallHint`; the Offline page is `[locale]/offline`, which the proxy skips at `/<lang>/offline` so the precache meets no redirect
```

- [x] **Step 2: READMEs**

Add the new exports to the export tables of `packages/core/README.md` (`features/next/pwa/*`, the `pwa:build` script) and `packages/ui/README.md` (`AOFOfflineBanner`, `AOFInstallHint`), in each table's existing style.

- [x] **Step 3: Final checks**

Run: `pnpm exec biome check --write CLAUDE.md packages/core/README.md packages/ui/README.md; pnpm check-types && pnpm lint && pnpm test`
Expected: all PASS. Nothing is committed: the owner runs `/iso-commit`.

## Implementation Log
- Implemented: 2026-10-16T15:04:44Z
- Workspace: current-branch — feat/back-office-special-pages
- Committed: no — awaiting user review
- Revised after the owner's review: no standalone from the hint, App-drawn hint and banner (core `AOFPwa` slots), never on a first visit, core `storageItem` (see the spec's revision section)
