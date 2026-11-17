# Extract the App Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every piece the Back Office has that a second App also needs into `packages/ui`, `packages/core` and `packages/auth`, parametrised by one App descriptor and by Design slots, and put the Back Office back on top of it with no change in behaviour.

**Architecture:** An App describes itself once (`AppDescriptor`: name, Sections tuple with per-Section `minRole`, entries of the other Apps, logo, share-card line). Shared server pieces take the descriptor as a prop; shared client pieces take only serialisable props or ReactNode slots, and the few that need a function slot (a Design's notice frame, a crumb mark) are bound once in a thin client file of the App. A Design changes a shared piece through slots (ReactNode or a component the App binds), `cva` class strings the App passes in, and theme tokens, never through a copy of the markup (ADR 0022, ADR 0033).

**Tech Stack:** Next 16 (Cache Components), next-intl 4, TanStack Query 5, nuqs, Hono client (`hc`), Base UI over shadcn, Vitest (node and Chromium/WebKit browser), Playwright e2e, Biome, knip, jscpd. No new dependency.

**Spec:** docs/superpowers/specs/2026-11-17-laura-rebuild-design.md (Phase 1, plus "Section role" and "Parity rule"). ADR 0033.

## Global Constraints

- Tests first. A test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`. A constant's type comes from zod (`xSchema = z.enum(X)`, `type X = z.infer<typeof xSchema>`); a lookup table is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`, `localStorage`/`sessionStorage`: use core's helpers.
- Constants are one nested object per owner (`API`, `AUTH`, `IMAGE`, ...). A path or an error code is never a string literal, tests included. A Tailwind class list is never a constant: `cva`, or inline in `cn`.
- An env var starts with its owner: `STORAGE_`, `DATABASE_`, `AUTH_`, `API_`.
- A package never imports an App. Files go in `src/{environment,shared,features}`. A package's logic never names an App (ADR 0033).
- Server Components by default; `"use client"` only for hooks, event handlers, browser APIs or client libraries.
- Every form with fields is an AOF form (`useAOFForm`), never bare `useForm`. Components shared by Apps live in `packages/ui`, named `AOF...`; `packages/shadcn` is written only by the shadcn CLI. Pages are built through `/aof-design`, never plain `/impeccable` (this phase moves code; it designs no page).
- A page of any Next App that reads or writes the API follows the data checklist in `docs/guides/next-apps.md`. This phase adds no page; each task that moves a page piece says which points the Back Office tests already pin.
- A page that waits has a skeleton at the loaded page's sizes with a browser test that compares heights: a moved skeleton moves with its test, and the test stays green in the same task.
- Database changes are Liquibase changesets (none here). A new file's export key mirrors its path without `src/` and `.ts`, one line per file, and only a file an App, another package, a script or a config imports gets one.
- exFAT drive: a new scanner ignores `**/._*`.
- Docs are plain English prose, no emoji, and the word for possibility is "might", for permission "can" or "is allowed to"; text diagrams use arrows and indentation.
- `design:sync` and `lint-staged` lines are out of scope (Phase 3 and Phase 7).

## Review Focus

1. **Back Office behaviour drift.** A moved dressed piece (frame, notices, sign-in pages, install hint) changes pixels or copy. Pinned task by task by the Back Office's own browser tests that stay untouched, and by the e2e specs `frame`, `head`, `pwa`, `sign-in`, `password-reset`, `safe-area`, `instant` run at Tasks 12, 15 and 19.
2. **A package names or imports an App, or a package cycle appears** (ui now depends on `@allonfire/auth` and `@allonfire/database`; neither depends on ui). Pinned by Task 0's guard test `packages-name-no-app.test.ts` (a ratchet: it fails on any new offender) and Biome's `noRestrictedImports`.
3. **A function crossing the server to client boundary** (a slot component or a cva function passed from a Server Component into a Client Component fails at render). Pinned by the rule "client shared pieces take strings and ReactNodes only", each App binding file in the File structure, and the production-build e2e at Tasks 12, 15 and 19.
4. **`minRole` read in one place but not another.** The proxy gate, the page check, the frame's menu and the guard test must agree, and the API stays the judge. Pinned by Task 8 (auth tests), Task 7 (guard-test helper asserts the page declares the same `minRole` as its Section) and Task 12 (menu row visible only to a sufficient Role).
5. **Copy moved without its twin or its placeholders.** Shared strings go to core's `Common` namespace in `en` and `it` with `{app}` where the Back Office name stood. Pinned by each task's translation assertions, `pnpm static:i18n` and the Back Office's `translations.test.ts`.

---

## Survey (every non-feature and shared file of `apps/back-office/src`, with its fate)

Paths are under `apps/back-office/src/`. "Moves" means the file is deleted from the Back Office after its replacement is in place and every importer is re-pointed. Names of destination files follow `docs/guides/package-layout.md`: the deepest feature that contains every reader; two top-level readers go to `shared/`.

### features/api

| File | Fate | Destination (export key mirrors the path) |
|---|---|---|
| `utils/api.ts`, `utils/server-api.ts` | Stay as a 2-file binding (they read the App's `env`); their logic moves | factory `aofCreateApi` in `packages/core/src/features/next/api/utils/aof-create-api.ts`; `utils/api-url.ts` (`apiUrlFor`), `constants/api-url.ts` (`API_URL.LOCAL_HOSTS`) and `utils/tests/api-url.test.ts` move with it (the browser's API address is chosen by the host its page was opened on: local on this machine, `NEXT_PUBLIC_API_REMOTE_URL` off it, Local only, for the phone on the tailnet) |
| `utils/api-refusal.ts` (`refusalOf`, `textOf`) | Moves, generic over the API's codes (it imports `@allonfire/api` today, which a package must not) | `packages/core/src/features/next/api/utils/aof-refusal.ts` (`aofRefusal`, `textOf`) |
| `tests/fake-api.ts` | Moves (test helper, generic over the API type) | `packages/core/src/features/next/api/tests/fake-api.ts` (export key, knip `ignoreIssues`) |
| `utils/tests/api.browser.test.ts` | Stays (tests the App's own `api` binding) | |
| core `features/next/api/visitor-headers.ts` | Moves into the kind folder (it now has peers) | `.../api/utils/visitor-headers.ts`; importers: every file `git grep -ln "api/visitor-headers" -- apps packages` lists (auth `session.ts`, `session-from-request.ts`, `password-reset.ts`, `sign-in.ts`, `sign-out.ts` and the tests that mock the path: `session.test.ts`, `session-cache.test.ts`, `session-request-mocks.ts`, `sign-out.test.ts`; the Back Office `server-api.ts`) |

### features/auth

| File | Fate | Destination |
|---|---|---|
| `components/sign-in.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `email-verified.tsx` | Move (pages, Server Components) | ui `features/auth/components/aof-sign-in.tsx`, `aof-forgot-password.tsx`, `aof-reset-password.tsx`, `aof-email-verified.tsx` |
| `components/sign-in-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`, `email-verified-note.tsx` | Move (Client) | `aof-sign-in-form.tsx`, `aof-forgot-password-form.tsx`, `aof-reset-password-form.tsx`, `aof-email-verified-note.tsx` |
| `components/gate-note.tsx`, `gate-submit.tsx` | Move; `GateSubmit`'s kanji becomes a `mark` ReactNode and its class the dressing's `className` | `aof-gate-note.tsx`, `aof-gate-submit.tsx` |
| `utils/sign-in-schema.ts`, `reset-schema.ts`, `verified-landing.ts` (+ their tests) | Move | ui `features/auth/utils/` |
| `components/ticket-gate.tsx`, `departure-board.tsx`, `station-sign.tsx`, `language-switch.tsx`, `back-to-sign-in.tsx` (+ tests), `constants/sign-in.ts`, `constants/reset.ts` | Stay: Japan Design only (the gate frame and its signage). They become the Back Office's `AUTH_DRESSING` | `features/auth/constants/dressing.tsx` (new, Task 15) |

### features/errors, features/home, features/i18n

| File | Fate | Destination |
|---|---|---|
| `errors/components/error-notice.tsx`, `not-found-notice.tsx` (+ tests) | Move; the `StationNotice` they draw becomes the `Frame` slot | ui `features/feedback/components/aof-error-notice.tsx`, `aof-not-found-notice.tsx` |
| `errors/constants/error-signage.ts` | Stays (Japan signage, read by the Back Office's frame) | |
| `home/components/home-section.tsx` | Stays: Home cards are Back Office content; Laura has no Home overview (revisit if it gains one) | |
| `i18n/navigation.ts`, `i18n/routing.ts` | Become one-line re-exports of core's base routing and navigation | core `features/next/i18n/utils/aof-base-routing.ts` |
| `i18n/request.ts`, `translations/{en,it}.json` | Stay (the App's loaders and its own copy); the shared copy leaves the JSON for core's `Common` (Tasks 9 to 15) | core `features/next/i18n/translations/{en,it}.json` |
| `i18n/tests/translations.test.ts` | Stays (reads the Back Office copy) | |

### features/metadata, features/navigation, features/pwa

| File | Fate | Destination |
|---|---|---|
| `metadata/utils/base-metadata.ts`, `page-metadata.ts`, `page-open-graph.ts`, `metadata-text.ts` | Move into one factory | core `features/next/metadata/utils/aof-app-metadata.ts` (`aofAppMetadata`) |
| `metadata/utils/icon-image.tsx`, `share-image.tsx` | Move into one factory (logo, line, look, fonts are slots) | ui `features/image/utils/aof-app-images.tsx` (`aofAppImages`) |
| `metadata/utils/image-fonts.ts` | Stays (the Japan Design's fonts, the `fonts` slot; `"use cache"` lives in the App) | |
| `navigation/components/app-frame.tsx` | Moves as `AOFAppFrame` (`variant`, `collapsible`, slots) | ui `features/navigation/components/aof-app-frame.tsx` |
| `app-switcher.tsx`, `app-switcher-menu.tsx`, `current-app-mark.tsx` | Move (descriptor-driven) | `aof-app-switcher.tsx`, `aof-app-switcher-menu.tsx`, `aof-current-app-mark.tsx` |
| `account.tsx`, `account-menu.tsx` | Move (role seal is a slot) | `aof-account.tsx`, `aof-account-menu.tsx` |
| `section-link.tsx`, `close-drawer-on-navigate.tsx`, `sidebar-param.tsx`, `section-page.tsx`, `frame-breadcrumb.tsx` | Move (the row look and the crumb mark are slots) | `aof-section-link.tsx`, `aof-close-drawer-on-navigate.tsx`, `aof-sidebar-param.tsx`, `aof-section-page.tsx`, `aof-frame-breadcrumb.tsx` |
| `header-kanji.tsx`, `sidebar-kanji.tsx`, `station-number.tsx`, `section-loading.tsx` | Stay: Japan Design only; they fill the frame's slots | |
| `constants/navigation.ts` | Splits: `NAVIGATION` and `sidebarParam` move to ui; `ROLE_SEAL` stays (the Japan seals) | ui `features/navigation/constants/navigation.ts` |
| `constants/sections.ts` | Types move; the Back Office's rows stay as `BACK_OFFICE.sections` | ui `features/navigation/types/app-descriptor.ts` |
| `utils/sections.ts`, `utils/switcher-apps.ts`, `utils/signed-in-page.tsx` (+ tests) | Move, take the descriptor; `signedInPage` stays a one-line binding of auth's `withAppSession` (it already lives in auth) with the App's loading screen and the new `minRole` option | ui `features/navigation/utils/sections.ts`, `switcher-apps.ts` |
| `tests/sections.test.ts` (guard test) | Its logic moves to a helper both Apps call | ui `features/navigation/tests/section-guards.ts` |
| `pwa/components/install-hint.tsx`, `offline-banner.tsx`, `offline-notice.tsx`, `reload-button.tsx` (+ tests) | Move (the card and the notice frame are slots) | ui `features/pwa/components/aof-install-hint.tsx`, `aof-offline-banner.tsx`, `aof-offline-notice.tsx`, `aof-reload-button.tsx` |
| `pwa/components/install-hint-card.tsx`, `offline-card.tsx`, `constants/pwa-signage.ts` | Stay: Japan-dressed cards (`bg-line`, `led-panel`, 圏外) | |

### shared

| File | Fate | Destination |
|---|---|---|
| `components/app-tile.tsx`, `constants/apps.ts` (`APP_ENTRY`) | Tile moves as `AOFAppTile` (takes an entry); the table stays per App (my call: it holds two rows, and a package must not name Apps) | ui `features/navigation/components/aof-app-tile.tsx` |
| `components/user-avatar.tsx` (+ tests) | Moves as `AOFUserAvatar`; the initial's tint is a prop (`initialClassName`) | ui `features/image/components/aof-user-avatar.tsx` |
| `components/form-alert.tsx`, `form-skeleton.tsx`, `password-rules.tsx`, `utils/password-checks.ts` (+ tests) | Move | ui `features/form/components/aof-form-alert.tsx`, `aof-form-skeleton.tsx`, `aof-password-rules.tsx`; `features/form/utils/password-checks.ts` |
| `components/resource-view.tsx` | Moves as `AOFResourceQueryView`; the Back Office keeps a binding | ui `features/query/components/aof-resource-query-view.tsx` |
| `utils/optimistic-mutation.ts`, `optimistic-update.ts`, `retry.ts`, `page-without.ts` (+ tests, `hydrate-newer-copy.test.ts` stays with the Users hydration it checks) | Move | core `features/next/query/utils/optimistic-mutation.ts`, `optimistic-update.ts`, `retry.ts`, `page-without.ts` |
| `utils/skeleton-ink.ts` | Moves | ui `shared/utils/skeleton-ink.ts` (`ink`) |
| `hooks/use-list-view.ts`, `use-list-table.ts`, `use-row-selection.ts`, `use-selectable-rows.tsx`, `use-range-picker.ts`, `use-day-format.ts`, `use-bulk-delete-flow.ts`, `use-toast-then-list.ts`, `use-step-back-past-end.ts` (+ its browser test); `utils/list-params.ts`, `table-pagination.ts`, `pagination-labels.tsx`, `bulk-delete.ts`, `deletion-message.ts`, `card-badge.ts`, `card-checkbox.ts` (+ their tests) | Move (the undressed list kit) | ui `features/data-table/{hooks,utils}/` |
| `components/list-filter-panel.tsx`, `list-panels.tsx`, `list-notice.tsx`, `list-skeleton.tsx`, `list-table.tsx`, `toolbar-action.tsx`, `search-toolbar.tsx`, `bulk-delete-control.tsx`, `filter-kanji.tsx`, `form-actions.tsx`, `station-alert.tsx` | Stay: kanji-dressed; Laura has no list in v1. Contradicts the spec's candidate list (`ListSkeleton`, filter panel) on purpose: a Design-specific piece that no other Design needs stays (ADR 0033); when a Laura list arrives its Design dresses the same ui kit | |
| `components/brush-kanji.tsx`, `eki-stamp.tsx`, `hanko.tsx`, `torii.tsx`, `station-notice.tsx`, `station-toaster.tsx`, `notice-title.tsx`, `card-frame.tsx`, `sign-card.tsx`, `copy-text.tsx`, `overview-*.tsx`, `constants/action-kanji.ts`, `constants/copy.ts`, `utils/use-created.ts` | Stay: Japan Design only or Back Office content | |
| `constants/back-office.ts` | Becomes the `BACK_OFFICE` descriptor (name, logo, line, sections, entries) | |
| `constants/query.ts`, `constants/mutation.ts` | Stay: the pattern (`QUERY.X.ALL/ONE/PAGE`, `MUTATION.X`), one object per owner in each App; documented in Task 18 | |
| `tests/render-in-app.tsx` | Moves as `renderInUi` (messages are a parameter); the Back Office keeps `renderInApp` as a one-line binding | ui `shared/tests/render-in-ui.tsx` |
| `tests/fetch-stub.ts`, `toast-timing.ts`, `link-mock.tsx`, `navigation-mock.tsx`, `next-cache-mock.ts`, `session-cookie-mock.ts`, `image-mock.tsx`, `aof-image-mock.tsx`, `message-length.ts` | Move when they import nothing of the Back Office (reconcile: read each) | ui `shared/tests/` |
| `tests/height-at.tsx` (`heightAt(width, view)`: the body `width` wide inside an `@container`, as the real page is drawn; read by every skeleton height test) | Moves as `heightAtIn`, over `renderInUi`; the Back Office keeps `heightAt` as a one-line binding so its skeleton tests stay untouched | ui `shared/tests/height-at.tsx` (Task 6) |
| `tests/msw/handlers.ts`, `environment-mock.ts`, `translators.ts`, `overview-states.tsx`, `list-sort-view-*` | Stay (the Back Office's API, copy and lists) | |

### Root of src and app/

| File | Fate |
|---|---|
| `environment/environment.ts` | Stays; its API variables come from core's `nextApiEnv` (Task 3). `BACK_OFFICE_URL`, `LAURA_URL` stay (per App) |
| `proxy.ts` | Stays (3 lines); `proxy.test.ts` matcher cases move to a core suite both Apps call (Task 17) |
| `instrumentation.ts`, `instrumentation-client.ts` | Stay: already re-bound core exports |
| `app/[locale]/layout.tsx` | Becomes a binding of `AOFLocaleDocument` (Task 17) |
| `app/[locale]/(signed-in)/layout.tsx` | Becomes a binding of `AOFAppFrame` and `AOFSignOutForm` |
| `[locale]/error.tsx`, `global-error.tsx`, `[locale]/not-found.tsx`, `(signed-in)/not-found.tsx`, `[locale]/offline/page.tsx`, `sign-in`, `forgot-password`, `reset-password`, `email-verified` pages | Stay as thin files over the shared notices and pages |
| `app/manifest.ts`, `robots.ts`, `icon.tsx`, `apple-icon.tsx`, `launch/[screen]/route.tsx`, `logo/[file]/route.ts`, `manifest-icon/[icon]/route.ts`, `[locale]/opengraph-image.tsx`, `twitter-image.tsx` | Stay as thin files (Next reads each file's exports from the file itself) over `aofManifest`, `aofAppImages`, core's routes |
| `globals.css`, `components.json`, `next.config.ts`, `public/` | Stay (the App's) |
| `e2e/*` | Stay: the proof. A shared e2e kit for the frame and sign-in is left to Phase 3 |

## Contracts this plan fixes (later phases cite these names)

### The App descriptor (ui `features/navigation/types/app-descriptor.ts`)

```ts
import type { App, Role } from "@allonfire/database/enums";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import type { TablerIcon } from "@tabler/icons-react";

export type AppMark = { icon: TablerIcon } | { logo: AppLogo };
export type AppEntry = { mark: AppMark; name: string };

/** A Section's own page, listed under it in the sidebar. */
export type AppSubPage = { icon: TablerIcon; label: string; path: string };

/** `label` and each page's `label` are keys of the App's own `Navigation` translations. */
export type AppSection = {
  icon: TablerIcon;
  label: string;
  path: string; // after the locale; Home is AUTH.PAGE.HOME (""), always sections[0]
  /** Above the App's floor (`ACCESS.APP_SETTINGS[app].minRole`): the proxy gate, the page check, the menu and the guard test read it; the API enforces it again. Absent: the App's floor. */
  minRole?: Role;
  pages?: readonly AppSubPage[];
};

export type AppDescriptor = {
  app: App;                           // which App this is (auth's AUTH_APP names the same)
  name: string;                       // never translated
  sections: readonly AppSection[];    // the menu's order, an explicit tuple, Home first
  entries: Record<App, AppEntry>;     // how this App draws every App in its switcher
  logo: AppLogo;                      // the Brand logo (tab icon, tile, share card, launch screens)
  line: string;                       // the share card's top band colour
  shareImageAlt: string;
};
```

`BACK_OFFICE` (`apps/back-office/src/shared/constants/back-office.ts`) is an `AppDescriptor` plus its own extras (`PAGE`, `CHOSEN`, `LOGO` stays an alias of `logo` until Task 16 re-points it). `LAURA` is Phase 3's instance. `SECTION` (named rows) and `SECTIONS` (the tuple) stay in the Back Office as `BACK_OFFICE.sections`' source.

### AppFrame (ui `features/navigation/components/aof-app-frame.tsx`, a Server Component, static)

```ts
export type AOFAppFrameProps = {
  app: AppDescriptor;
  variant?: "sidebar" | "floating" | "inset";      // default "sidebar" (shadcn sidebar-07); Laura: "floating" (sidebar-04)
  collapsible?: "icon" | "offcanvas" | "none";     // default "icon"; a phone is a drawer in every variant
  account: ReactNode;                              // AOFAccount inside the App's Suspense
  switcher: ReactNode;                             // AOFAppSwitcher inside the App's Suspense
  breadcrumb: ReactNode;                           // the App's FrameBreadcrumb binding (client, holds the crumb mark)
  rowClassName: { current: string; idle: string }; // the Section row's look, cva results from the App
  slots?: {
    sidebarWall?: ReactNode;   // painted behind the sidebar rows (Japan: SidebarKanji)
    headerWall?: ReactNode;    // painted behind the page header's end (Japan: HeaderKanji)
    headerEnd?: ReactNode;     // the header's far end (Japan: Torii)
  };
  classNames?: { sidebarHeader?: string; frameHeader?: string }; // the Design's rule under the header (Japan: border-line/50 border-b-2)
  children: ReactNode;
};
```

A Section whose `minRole` is above the App's floor is drawn inside its own `<Suspense fallback={null}>` by an async `AOFRoleGatedSection` that reads `requireAppSession()` (the page check's own cached read, no extra API call) and renders the row only when the Role reaches it. The rest of the frame stays in the static shell. Known and accepted: a gated row (Upload is last in Laura's menu) appears after the shell paints.

### Slot rules (why a slot is a ReactNode, a string or a bound component)

- Server shared piece rendered by an App's Server Component: any prop (component, function, object).
- Client shared piece (`AOFSidebarSectionLink`, `AOFAccountMenu`, `AOFFrameBreadcrumb`, the auth forms, the PWA hooks): strings and ReactNodes only. A Design function (a crumb mark, a notice `Frame`) reaches it through a thin `"use client"` binding file in the App, which imports the descriptor and the Design pieces itself.
- Bindings of the Back Office (each one a file under 25 lines): `features/navigation/components/frame-breadcrumb.tsx`, `features/pwa/components/install-hint.tsx`, `features/pwa/components/offline-banner.tsx`, `shared/components/resource-view.tsx`, `features/errors/components/error-notice.tsx`, `features/errors/components/not-found-notice.tsx`, `features/pwa/components/offline-notice.tsx`.

### Notice frame and action dressing (ui)

```ts
// features/feedback/types/notice.ts
export type AOFNoticeKind = "error" | "notFound" | "offline";
export type AOFNoticeFrameProps = {
  kind: AOFNoticeKind;                // the Design looks up its own signage by kind
  heading?: string; description?: string; children?: ReactNode; action?: ReactNode;
  page?: ComponentType<AOFPageProps>; scope?: "page" | "part"; entrance?: boolean;
};
export type AOFNoticeFrame = ComponentType<AOFNoticeFrameProps>;

// shared/constants/action.ts and shared/types/action-dressing.ts
export const AOF_ACTION = { BACK: "back", ENTER: "enter", RETRY: "retry", SAVE: "save", SEND: "send" } as const;
export const aofActionSchema = z.enum(AOF_ACTION); export type AOFAction = z.infer<typeof aofActionSchema>;
/** How a Design dresses an action button: its class (cva result) and a mark per action (Japan: the brushed kanji). */
export type AOFActionDressing = { className: string; marks: Record<AOFAction, ReactNode> };
```

The Back Office's `StationNoticeFrame` (a thin `AOFNoticeFrame` over `StationNotice` that maps `kind` to `ERROR_SIGNAGE.ERROR`, `ERROR_SIGNAGE.NOT_FOUND`, `PWA_SIGNAGE.OFFLINE`) and `ACTION_DRESSING` (`kanjiAction()` plus the `ACTION_KANJI` marks) live in `features/errors/` and `shared/constants/` of the Back Office.

### Sign-in page set (ui `features/auth/`)

```ts
export type AOFGateProps = { children: ReactNode; page: AppPath; status: string }; // the Design's signed-out frame (Japan: TicketGate)
export type AOFAuthDressing = {
  Gate: ComponentType<AOFGateProps>;
  actions: AOFActionDressing;         // enter (Sign in), send (Forgot), save (Reset), retry/back (Email verified)
  back: ReactNode;                    // the way back to Sign in (Japan: BackToSignIn)
};
// Server pages: <AOFSignIn appUrl dressing />, <AOFForgotPassword appUrl dressing />, <AOFResetPassword dressing />, <AOFEmailVerified dressing />
```

An App's page is `<AOFSignIn appUrl={env.<APP>_URL} dressing={AUTH_DRESSING} />`; Laura writes its own `AUTH_DRESSING` for its Design (Gate and marks), no registration link anywhere (the App's `APP_SETTINGS.registration` is `null`).

### API client factory (core `features/next/api/utils/aof-create-api.ts`)

```ts
export const aofCreateApi = <Api extends Hono>(urls: { browser: { local: string; remote: string | undefined }; server: string }) => ({
  api: hc<Api>(apiUrlFor(globalThis.location?.hostname, urls.browser), { init: { credentials: "include" } }),
  serverApi: async () => hc<Api>(urls.server, { headers: await readVisitorHeaders() }),
  sessionApi: (sessionCookie: string) => hc<Api>(urls.server, { headers: { [HTTP.HEADER.COOKIE]: sessionCookie } }),
});
```

`apiUrlFor(hostname, { local, remote })` (core `features/next/api/utils/api-url.ts`, with `API_URL.LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"]` in `.../api/constants/api-url.ts`, both moved from the Back Office as they stand) answers `remote` only when `remote` is set and `hostname` is a page that is not on this machine, otherwise `local`: Production sets no `remote`, so it is always the one API address, and the server (no `location`) is always `local`. This is what lets a phone on the tailnet call the API's own tailnet address (ADR 0021, root `README.md` Local steps 8 and 9); Laura gets it from the same factory.

`hono` becomes an optional peer of core (`package-layout.md`: a framework adapter takes the framework as an optional peer). The App keeps `export type ApiClient = typeof api` and its two binding files, since only it knows `ApiType` (from `@allonfire/api/client`) and its `env`.

### Query and image pieces Laura reuses without a task of its own

- Hydration: not factorable (`"use cache: private"` needs its literal directive and the feature's `CACHE` in the function). The pattern stays `xHydration` per feature over `aofCreateApi`'s `sessionApi`, `readSessionCookie`, `AOFGetQueryClient`, `AOFHydratedBoundary`; Task 18 writes it into `next-apps.md` with the Back Office's `storageOverviewHydration` as the example. A hydrated infinite feed is left to Phase 4 (it needs its own plan).
- `optimisticMutation`, `optimisticUpdate`, `invalidateAll`, `retryUnlessRefused`, `rowsWithout`, `perPageIn` (core `features/next/query/utils/`), `AOFQueryProvider`, `aofErrorMeta`, `AOFHydratedBoundary`, `AOFResourceView` (already in ui and core).
- Stored pictures: `AOFStorageImage`, `AOFImage`, `AOFPictureGuard` (ui `shared/components/`), `srcSetLoader` (`shared/utils/image-server-loader`), `tileBlur` (`features/image/utils/tile-blur`) already exist; this phase adds `AOFUserAvatar` and moves `heicToJpeg` and `isHeic` to ui `shared/utils/heic-to-jpeg.ts` (read by two top-level ui features, form and, in Phase 5, image upload).

## How every move task runs (the recipe)

Each move task lists its own files and new assertions; the steps are these, in this order, so the Back Office passes after every task:

1. Move the existing tests first (`git mv` into the destination package's `tests/`), re-point their imports to the destination and add the new assertions the task lists. The moved test is the failing test.
2. Run the destination test: it fails because the module is not there yet.
3. Move the implementation (`git mv`), then change it only as the task's Interfaces say (generalise to the descriptor, replace an App import by a parameter, `lucide` by Tabler in an AOF component). Add its export key to the package's `package.json` `exports`, one line per file.
4. Run the destination test: it passes.
5. Re-point every Back Office importer (`git grep -ln '<old path>' apps`), then run the Back Office bundle: `pnpm --filter @allonfire/back-office check-types`, `pnpm --filter @allonfire/back-office test`, `pnpm --filter @allonfire/back-office test:browser`. All stay green; no Back Office test is edited except for an import path or a mock path.
6. Prove the original is gone: `git grep -n '<old path>' apps packages` prints nothing, and the original file is deleted.

Commands: ui `pnpm --filter @allonfire/ui exec vitest run <path>` and `pnpm --filter @allonfire/ui exec vitest run --config vitest.browser.config.ts <path>`; core `pnpm --filter @allonfire/core exec vitest run <path>`; auth `pnpm --filter @allonfire/auth exec vitest run <path>`; Back Office `pnpm --filter @allonfire/back-office exec vitest run <path>` and `... --config vitest.browser.config.ts <path>`. Reconcile before each task: re-read the listed files, since the Back Office might have changed after this plan was written (`git status`, `git log -5 -- apps/back-office`); Phase 0 (Viewer removed) lands first, so read `Role` from `@allonfire/database/enums` as it then is.

## File structure

Created (new packages' files; the moved ones are named in the Survey):

- `packages/config/local/tests/packages-name-no-app.test.ts` guard (Task 0)
- core: `features/next/i18n/utils/aof-base-routing.ts`; `features/next/api/utils/{aof-create-api,aof-refusal,visitor-headers}.ts`, `features/next/api/tests/fake-api.ts`; `environment/next-api-environment.ts`; `features/next/query/utils/{optimistic-mutation,optimistic-update,retry,page-without}.ts`; `features/next/metadata/utils/{aof-app-metadata,aof-manifest}.ts`; `features/next/i18n/tests/proxy-matcher-suite.ts`; shared copy in `features/next/i18n/translations/{en,it}.json`
- auth: `features/next/utils/has-section-role.ts`; `requireAppSession`, `withAppSession`, `withSignInGate` gain `minRole`
- ui: the `features/navigation`, `features/auth`, `features/feedback`, `features/pwa`, `features/query`, `features/data-table`, `features/form`, `features/image`, `features/app` and `shared` files listed in the Survey and below; `package.json` gains `@allonfire/auth`, `@allonfire/database` dependencies and `nuqs` peer
- Back Office: `features/errors/components/station-notice-frame.tsx`, `features/auth/constants/dressing.tsx`, `shared/constants/action-dressing.tsx` (Design slots), plus the binding files named under "Slot rules"

Deleted from the Back Office: every file marked "Moves" in the Survey.

---

### Task 0: Baseline and the no-App guard

**Files:**
- Create: `packages/config/local/tests/packages-name-no-app.test.ts`
- Modify: `biome.jsonc` (only if the step 3 run shows a gap)

**Interfaces:** Produces the guard every later task keeps green. Consumes `REPO` from `packages/config/local/repo.ts`.

- [ ] Step 1: Record the baseline. Run `pnpm --filter @allonfire/back-office check-types`, `pnpm --filter @allonfire/back-office test`, `pnpm --filter @allonfire/back-office test:browser`, `pnpm --filter @allonfire/ui test`, `pnpm --filter @allonfire/ui test:browser`, `pnpm static:dupes`, `pnpm static:knip`, `pnpm static:knip-production`; write the pass counts in the task's notes. Any red here is fixed or reported before the work starts.
- [ ] Step 2: Write the failing guard test (first line `// @module-tag unit`). It reads every `packages/*/src/**/*.{ts,tsx}` (skipping `tests/`, `*.test.*`, `generated/`, `._*`) and fails when a file outside `ALLOWED` contains `App.BACK_OFFICE`, `App.LAURA`, a `"BACK_OFFICE"` or `"LAURA"` literal, `@allonfire/back-office`, `@allonfire/laura` or a path into `apps/`:
  ```ts
  /** Files that catalogue per App on purpose (package-layout.md), each with its reason. */
  const ALLOWED = [
    "packages/database/src/features/auth/access/", // the Role and App rules
    "packages/database/src/features/seed/",        // fixtures per App
    "packages/database/src/features/apps/",        // `database/apps/laura`
    "packages/design/src/apps/",                   // per-App Design files
    "packages/auth/src/features/hono/guards/middleware/require-app.ts", // reconcile: read why it names one
  ] as const;
  it("names no App outside the catalogue folders", () => {
    expect(offenders).toEqual([]);
  });
  ```
- [ ] Step 3: Run `pnpm --filter @allonfire/config exec vitest run local/tests/packages-name-no-app.test.ts`: it fails listing the real offenders. Read each: a catalogue goes to `ALLOWED` with its reason, anything else is fixed in the task that moves it (record which task) and is listed in `ALLOWED` until then with `// moves in Task N`.
- [ ] Step 4: Run it again: passes. Check Biome's two `noRestrictedImports` overrides (`packages/**`, `packages/ui/**`) already forbid `@allonfire/api`, `@allonfire/back-office`, `@allonfire/laura`, `**/apps/**`; add nothing unless a gap shows (a package importing `@allonfire/laura` by a relative path is the case to try).
- [ ] Step 5: Verify: `pnpm static:lint` is green.

### Task 1: Base routing and navigation in core

**Files:**
- Create: `packages/core/src/features/next/i18n/utils/aof-base-routing.ts`, `packages/core/src/features/next/i18n/tests/aof-base-routing.test.ts`
- Modify: `packages/core/package.json` (export key `./features/next/i18n/utils/aof-base-routing`), `apps/back-office/src/features/i18n/routing.ts`, `apps/back-office/src/features/i18n/navigation.ts`
- Test: `apps/back-office/src/shared/tests/navigation-mock.tsx` (mock path)

**Interfaces:** Produces `aofBaseRouting = AOFDefineRouting(I18N.BASE_LANGUAGES)` and `aofBaseNavigation = AOFCreateNavigation(aofBaseRouting)` (`Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`, `languageLinks`). A shared ui piece imports these, never an App's `@/features/i18n/navigation`. An App routing other languages keeps its own and is outside this phase (note in Task 18).

- [ ] Step 1: Test in `aof-base-routing.test.ts`: `expect(aofBaseRouting.locales).toEqual(I18N.BASE_LANGUAGES)`, `expect(aofBaseRouting.defaultLocale).toBe(I18N.DEFAULT_LANGUAGE)`, `expect(aofBaseNavigation.languageLinks("/users", "en")[1]?.attributes.href).toBe("/it/users")` (the `it` link is always prefixed).
- [ ] Step 2: Run `pnpm --filter @allonfire/core exec vitest run src/features/next/i18n/tests/aof-base-routing.test.ts`: fails (module missing).
- [ ] Step 3: Create the file with the two exports. Back Office `routing.ts` becomes `export { aofBaseRouting as routing } from ...`; `navigation.ts` re-exports the six names from `aofBaseNavigation`. Knip: both re-exports are read by the App.
- [ ] Step 4: Run the core test: passes.
- [ ] Step 5: Update the mock helpers that mocked `@/features/i18n/navigation` (`navigation-mock.tsx`, `link-mock.tsx`) so a test of a moved piece can mock the core path: `vi.mock("@allonfire/core/features/next/i18n/utils/aof-base-routing", () => import("@/shared/tests/navigation-mock"))`, where the mock exports `aofBaseNavigation = { Link, usePathname, ... }`. Run the Back Office bundle (recipe step 5).

### Task 2: API client factory and refusal

**Files:**
- Create: `packages/core/src/features/next/api/utils/aof-create-api.ts`, `packages/core/src/features/next/api/utils/api-url.ts`, `packages/core/src/features/next/api/constants/api-url.ts`, `packages/core/src/features/next/api/tests/api-url.test.ts` (the Back Office's `api-url.test.ts` moved: reconcile, re-read it first, it arrived with the tailnet work), `packages/core/src/features/next/api/utils/aof-refusal.ts`, `packages/core/src/features/next/api/tests/aof-create-api.test.ts`, `packages/core/src/features/next/api/tests/aof-refusal.test.ts`
- Move: `packages/core/src/features/next/api/visitor-headers.ts` to `.../api/utils/visitor-headers.ts`; `apps/back-office/src/features/api/tests/fake-api.ts` to `packages/core/src/features/next/api/tests/fake-api.ts`
- Modify: `apps/back-office/src/features/api/utils/api.ts`, `server-api.ts`; `packages/core/package.json` (keys, `hono` optional peer); `knip.jsonc` (`fake-api.ts` in `ignoreIssues`: "a test helper other packages' tests import"); every importer of `visitor-headers` (`git grep -ln "api/visitor-headers" -- apps packages`: auth `session.ts`, `session-from-request.ts`, `password-reset.ts`, `sign-in.ts`, `sign-out.ts` and the tests and mocks that name the path, `sign-out.test.ts` among them); every importer of `refusalOf`/`textOf` (`git grep -ln "api-refusal" apps`)

**Interfaces:** Produces `apiUrlFor(hostname: string | undefined, { local, remote }): string` and `API_URL.LOCAL_HOSTS` (names and behaviour unchanged, moved); `aofCreateApi<Api extends Hono>({ browser: { local, remote }, server })` returning `{ api, serverApi, sessionApi }` (signature in Contracts); `aofRefusal({ codes, status })` returning `{ refusalOf, textOf }` where `codes` is the API's `API.ERROR.CODE` and `status` its `API.ERROR.STATUS`, so core never imports `@allonfire/api`; `refusalOf` keeps its current behaviour (code first, then status, then `REFUSED` for 401/403, else `FAILED`). The Back Office binds: `export const { api, serverApi, sessionApi } = aofCreateApi<ApiType>({ browser: { local: env.NEXT_PUBLIC_API_URL, remote: env.NEXT_PUBLIC_API_REMOTE_URL }, server: env.API_URL })` and `export const { refusalOf, textOf } = aofRefusal({ codes: API.ERROR.CODE, status: API.ERROR.STATUS })`. Consumes `API` (App) only inside the Back Office file.

- [ ] Step 1: `api-url.test.ts` is the Back Office's, moved as it stands (a page on `localhost`, `127.0.0.1` or `[::1]` calls `local`; any other host calls `remote`; no `remote` always calls `local`; no page, the server, calls `local`). `aof-create-api.test.ts` with a stubbed global `fetch`: with `location.hostname` stubbed to a tailnet host and `remote` set, `api` calls `remote`; on `localhost` it calls `local`; `api` requests carry `credentials: "include"`; `sessionApi("a=b")` sends header `HTTP.HEADER.COOKIE` equal to `"a=b"` and no other cookie; `serverApi()` sends the headers `readVisitorHeaders` returns (mock `next/headers`). `aof-refusal.test.ts`: a 409 with body code in `codes` answers the mapped value; an unknown code on a 403 answers `REFUSED`; a 500 answers `FAILED`; a code named `constructor` finds nothing.
- [ ] Step 2: Run both: fail.
- [ ] Step 3: Implement as in Contracts (`hc` from `hono/client`); recipe steps 3 to 6 for the Back Office files. The Back Office `api.browser.test.ts` stays and must stay green.
- [ ] Step 4: Run core tests: pass. Run recipe step 5. Then run the type check of auth and core (`pnpm turbo run check-types --filter=@allonfire/core --filter=@allonfire/auth`): the generic `hc<Api>` must not blow tsc's memory; if it does, type the factory's return with `ReturnType<typeof hc<Api>>` explicitly and report.

### Task 3: Next API environment in core

**Files:**
- Create: `packages/core/src/environment/next-api-environment.ts`, `packages/core/src/environment/tests/next-api-environment.test.ts`
- Modify: `packages/core/package.json`, `apps/back-office/src/environment/environment.ts`, `apps/back-office/src/environment/tests/environment.test.ts`

**Interfaces:** Produces `nextApiEnv` (`createEnv` extension: client `NEXT_PUBLIC_API_URL: z.url()` and `NEXT_PUBLIC_API_REMOTE_URL: z.url().optional()` (Local only: the API's address for a page opened off this machine, baked in at build), server `API_URL: z.url()`, `emptyStringAsUndefined: true`) that an App adds to `extends: [nextAuthEnv, telemetryEnv, nextApiEnv]`. `BACK_OFFICE_URL`, `LAURA_URL` stay in the App (per-App public addresses, env names start with their owner as today).

- [ ] Step 1: Test: parsing `{ NEXT_PUBLIC_API_URL: "not a url" }` fails with the var's name; both set parses; `NEXT_PUBLIC_API_REMOTE_URL` unset or empty parses, a value that is not a URL fails with its name. Mirror how `environment.test.ts` of the Back Office tests its env (reconcile: read it; the browser define in `vitest.browser.config.ts` keeps `NEXT_PUBLIC_API_URL` working).
- [ ] Step 2: Run: fails. Step 3: implement; remove `NEXT_PUBLIC_API_URL` and `API_URL` from the Back Office schema and add `nextApiEnv` to `extends`; `experimental__runtimeEnv` keeps the `process.env.NEXT_PUBLIC_API_URL` and `process.env.NEXT_PUBLIC_API_REMOTE_URL` mappings in the App (Next inlines only literal reads; `turbo.json` already lists both in `build.env`). Step 4: run core and Back Office env tests, then recipe step 5. Check `apps/back-office/.env.example` and `packages/config/local/tests/env-examples.test.ts` still pass (`pnpm --filter @allonfire/config test`).

### Task 4: Query kit (optimistic update and mutation, retry, page patch, skeleton ink)

**Files:**
- Move (with tests): `apps/back-office/src/shared/utils/{optimistic-update,optimistic-mutation,retry,page-without}.ts` to `packages/core/src/features/next/query/utils/`; tests `optimistic-update.test.ts`, `optimistic-mutation.test.ts`, `retry.test.ts`, `page-without.test.ts` to `packages/core/src/features/next/query/tests/`
- Move: `apps/back-office/src/shared/utils/skeleton-ink.ts` to `packages/ui/src/shared/utils/skeleton-ink.ts` (no test today: add `skeleton-ink.test.ts` asserting the three tones' class output names `bg-destructive/10`, `bg-foreground/10`, `bg-primary/30`... as the file defines them)
- Modify: `packages/core/package.json`, `packages/ui/package.json`, every importer (`git grep -ln "shared/utils/\(optimistic\|retry\|page-without\|skeleton-ink\)" apps`)

**Interfaces:** Produces, at `@allonfire/core/features/next/query/utils/<file>`: `optimisticMutation`, `invalidateAll`, type `PatchCache` (`optimistic-mutation`); `optimisticUpdate`, type `Rollback` (`optimistic-update`); `retryUnlessRefused(max)` (`retry`, imports `DetailedError` from `hono/client`: the optional peer); `rowsWithout`, `perPageIn` (`page-without`). At `@allonfire/ui/shared/utils/skeleton-ink`: `ink`. Names unchanged on purpose (the docs and the owner's parity rule cite them).

- [ ] Steps: recipe, with no new assertions (the moved tests are the specification). Core needs `@tanstack/react-query` (already a peer). After step 5 also run `pnpm --filter @allonfire/ui test` (ink's test) and the skeleton height tests of the Back Office (`pnpm --filter @allonfire/back-office exec vitest run --config vitest.browser.config.ts src/features/images/components/tests/image-skeletons.browser.test.tsx src/features/services/components/tests/services-skeleton.browser.test.tsx src/features/users/components/tests/users-list-skeleton.browser.test.tsx`): they must stay green untouched.

### Task 5: The undressed list kit into ui

**Files:**
- Move to `packages/ui/src/features/data-table/hooks/` (`use-list-view.ts`, `use-list-table.ts`, `use-row-selection.ts`, `use-selectable-rows.tsx`, `use-range-picker.ts`, `use-day-format.ts`, `use-bulk-delete-flow.ts`, `use-toast-then-list.ts`, `use-step-back-past-end.ts`) and `utils/` (`list-params.ts`, `table-pagination.ts`, `pagination-labels.tsx`, `bulk-delete.ts`, `deletion-message.ts`, `card-badge.ts`, `card-checkbox.ts`); their tests (`use-day-format`, `use-list-view`, `use-toast-then-list`, `use-step-back-past-end` browser tests; `bulk-delete`, `card-badge`, `deletion-message`, `list-params` unit tests) to `packages/ui/src/features/data-table/tests/`; `shared/tests/list-sort-view.browser.test.tsx` and its harness stay in the Back Office (they exercise the dressed `ListFilterPanel`); the per-feature wrappers `useStepBackPastEnd` in `features/{images,users}/hooks/use-*-table-state.ts` stay (they own the App's `page` param) and are re-pointed to the moved generic hook, and `features/images/components/tests/images-delete-last-page.browser.test.tsx` stays (reconcile: these arrived with the pager work, re-read all three before moving)
- Modify: `packages/ui/package.json` (keys; `nuqs` peer), every importer under `apps/back-office/src`

**Interfaces:** Produces `@allonfire/ui/features/data-table/hooks/use-list-view` (`useListView`), `.../use-list-table` (`useListTable`), `.../use-row-selection`, `.../use-selectable-rows`, `.../use-range-picker`, `.../use-day-format`, `.../use-bulk-delete-flow`, `.../use-toast-then-list`, `.../use-step-back-past-end` (`useStepBackPastEnd({ firstPage, page, pageCount, stepTo })`: a page past the last one that exists steps back through `stepTo`, to the last page or to `firstPage` when nothing is left; nothing is judged while `pageCount` is `undefined`); `.../utils/list-params` (`codecParser`, `pageParser`, `sortingOf`, `sortOf`, `visibilityOf`, `hiddenOf`), `.../table-pagination`, `.../pagination-labels`, `.../bulk-delete` (`bulkDeleteMutation`), `.../deletion-message`, `.../card-badge` (`cardBadge`), `.../card-checkbox`. `useToastThenList` takes the router from core's `aofBaseNavigation` (Task 1). `bulkDeleteMutation` imports `optimisticMutation` from core (Task 4).

- [ ] Steps: recipe. New assertion (step 1) for the one behaviour that changed: `use-toast-then-list` still `router.push`es the list after the toast, now through the mocked `aofBaseNavigation.useRouter` (`vi.mock("@allonfire/core/features/next/i18n/utils/aof-base-routing", ...)`). In step 5 also run the Back Office's `list-sort-view.browser.test.tsx`, `users-table-sort`, `images-table-sort` and `images-delete-last-page.browser.test.tsx` browser tests untouched (the Users list no longer shows a past-the-end notice: like Images it steps back in place, so no such notice travels anywhere).

### Task 6: Shared test kit into ui

**Files:**
- Create: `packages/ui/src/shared/tests/render-in-ui.tsx`
- Move (only those with no Back Office import; reconcile: read each): `fetch-stub.ts`, `toast-timing.ts`, `link-mock.tsx`, `navigation-mock.tsx`, `next-cache-mock.ts`, `session-cookie-mock.ts`, `image-mock.tsx`, `aof-image-mock.tsx`, `message-length.ts` from `apps/back-office/src/shared/tests/` to `packages/ui/src/shared/tests/`; create `packages/ui/src/shared/tests/height-at.tsx` from `apps/back-office/src/shared/tests/height-at.tsx` (reconcile: it arrived with the skeleton work, re-read it and its readers `image-skeletons`, `edit-user-skeleton`, `services-skeleton` browser tests)
- Modify: `apps/back-office/src/shared/tests/render-in-app.tsx` (becomes `export const renderInApp = (options) => renderInUi({ messages: EN, ...options })`), `apps/back-office/src/shared/tests/height-at.tsx` (becomes `export const heightAt = (width, view) => heightAtIn({ messages: EN, view, width })`), `packages/ui/package.json` (test-helper keys), `knip.jsonc` (`ignoreIssues` for each new test-helper export, reason "test helpers other packages' tests import, through export keys; production mode leaves every test out", beside the existing `computed-style` entries)

**Interfaces:** Produces `@allonfire/ui/shared/tests/render-in-ui` with `renderInUi({ children, language?, messages, onUrlUpdate?, search? })` (same body as today's `renderInApp`, `messages` required: the App's copy), `@allonfire/ui/shared/tests/height-at` with `heightAtIn({ messages, view, width }): Promise<number | undefined>` (the helper every Laura skeleton height test of Phases 3 to 6 calls, at 900, 520 and 360 px), plus the moved helpers at `@allonfire/ui/shared/tests/<name>`.

- [ ] Step 1: Test `packages/ui/src/shared/tests/render-in-ui.browser.test.tsx`: renders a component calling `useTranslations("Common.Request")` and reading `failed`; asserts the shared text appears, then re-renders with `language: "it"` and asserts the Italian text from `SHARED_TRANSLATIONS.it`; `height-at.browser.test.tsx` (in ui): `heightAtIn` of a 100 px tall `div` at width 360 answers 100, and a child set to `width: 100%` is 360 px wide (the `@container` wrapper is the width given). Step 2: fails. Step 3 to 6: recipe; every Back Office test that mocked a moved helper by its `@/shared/tests/...` path is re-pointed (a path only).

### Task 7: The App descriptor, Section utilities, descriptor-driven switcher and the guard-test helper

**Files:**
- Create: `packages/ui/src/features/navigation/types/app-descriptor.ts`, `packages/ui/src/features/navigation/tests/section-guards.ts`, `packages/ui/src/features/navigation/tests/section-guards.test.ts`
- Move (with tests): `apps/back-office/src/features/navigation/utils/sections.ts`, `switcher-apps.ts` and `utils/tests/sections.test.ts`, `switcher-apps.test.ts` to `packages/ui/src/features/navigation/utils/` and `.../tests/`; `constants/navigation.ts` (`NAVIGATION`, `sidebarParam`) to `packages/ui/src/features/navigation/constants/navigation.ts` (without `ROLE_SEAL`, which stays in the Back Office's `features/navigation/constants/role-seal.ts`)
- Modify: `apps/back-office/src/features/navigation/constants/sections.ts` (types from ui; rows stay), `apps/back-office/src/shared/constants/back-office.ts` (becomes the descriptor), `apps/back-office/src/shared/constants/apps.ts` (`APP_ENTRY` keeps both rows and feeds `BACK_OFFICE.entries`), `apps/back-office/src/features/navigation/tests/sections.test.ts` (calls the helper), `packages/ui/package.json` (`@allonfire/auth`, `@allonfire/database` dependencies; keys), `apps/back-office/e2e/frame.spec.ts` (import paths only)

**Interfaces:** Produces `AppDescriptor`, `AppSection`, `AppSubPage`, `AppEntry`, `AppMark` (Contracts); `NAVIGATION` (`FORM.SIGN_OUT`, `PARAM.SIDEBAR`, `APP_NUMBER: "00"`), `sidebarParam`; in `utils/sections.ts`: `sectionNumber(app, section)` (was `stationNumber`: its place in `app.sections`, two digits, Home 01), `subPageNumber(section, page)`, `sectionHref(path)`, `isCurrentSection(pathname, path)`, `sectionEntry(section)`, `currentSubPage(section, pathname)`, `currentSection(app, pathname)` (falls back to `app.sections[0]`), `sectionAllowed(section, role, floor)` (true when no `minRole`, else `ACCESS.ROLE_RANK[role] >= ACCESS.ROLE_RANK[section.minRole]`); `switcherApps(app, enterable, addresses): SwitcherApp[]` where `SwitcherApp = { app: App; host: string; href: string; name: string }`, in `App` order, excluding `app.app`, naming each from `app.entries[x].name`. In `section-guards.ts`: `sectionGuards({ app, signedInDir })` registers three `it`s: every signed-in page is under a Section and every Section has its page (as today); every page's source contains `export default signedInPage(`; and for each Section with `minRole`, its page source contains `minRole: Role.<X>` equal to the Section's (string check, like `GATED`).

- [ ] Step 1: In `section-guards.test.ts` use a temp directory with three fake pages: a gated one declaring the right `minRole`, one declaring another, one with none: the helper's check fails for the last two (assert the thrown message names the file). Moved tests gain: `sectionNumber(BACK_OFFICE, SECTION.USERS)` is `"02"`; `sectionAllowed({ ...SECTION.USERS, minRole: Role.ADMIN }, Role.USER, ...)` is `false` and `Role.ADMIN` is `true`; `switcherApps` draws the Laura name from `entries`, not from a table the package owns.
- [ ] Step 2: Run `pnpm --filter @allonfire/ui exec vitest run src/features/navigation`: fails. Step 3: implement; `BACK_OFFICE` gains `app: App.BACK_OFFICE`, `sections: SECTIONS`, `entries: APP_ENTRY`, `logo`, `line`, `shareImageAlt`. Step 4: run: passes. Step 5: recipe step 5 (the e2e `frame.spec.ts` is type-checked by `check-types`). Step 6: recipe.

### Task 8: Section role in auth (proxy gate, page check)

**Files:**
- Create: `packages/auth/src/features/next/utils/has-section-role.ts`, `packages/auth/src/features/next/tests/has-section-role.test.ts`
- Modify: `packages/auth/src/features/next/utils/session.ts` (`requireAppSession`), `.../components/with-app-session.tsx`, `.../utils/with-sign-in-gate.ts`; their tests `session.test.ts`, `with-app-session.test.tsx`, `with-sign-in-gate.test.ts`; `packages/auth/README.md`

**Interfaces:** Produces `hasSectionRole(session: Session | null, minRole: Role | undefined): boolean` (true when `minRole` is undefined; else the Session's User holds at least it in `nextAuthEnv.AUTH_APP`, through `hasRoleIn(accessUserFrom(user), AUTH_APP, minRole)`, never naming an App). `requireAppSession(options?: { minRole?: Role })`: after `entersApp`, a Session whose Role does not reach `minRole` is redirected Home (`redirectTo(locale, AUTH.PAGE.HOME)`; my call: no 403 page exists, and the API answers 403 again), still `use cache: private` (the options are part of the key). `withAppSession(Page, fallback, options?: { minRole?: Role })` passes it to its gate. `withSignInGate(proxy, { locales, pages, gated?: readonly { path: string; minRole: Role }[] })`: a visit to a `gated` path or under it (`<path>/`, never Home) by a visitor with a Session cookie asks the API (`sessionFromRequest`, as `entersAppNow` does) and answers 307 to that locale's Home when `!hasSectionRole(...)`; a signed-out visit still goes to Sign in first, and a path with no `minRole` asks nothing extra. The App's proxy builds `gated` from `SECTIONS` rows that have `minRole`.

- [ ] Step 1: Tests (first line `// @module-tag unit`): `hasSectionRole(userSession, undefined)` is `true`; `hasSectionRole(userSession, Role.ADMIN)` is `false`; `hasSectionRole(adminSession, Role.ADMIN)` is `true`; `hasSectionRole(null, Role.USER)` is `false`. `with-sign-in-gate.test.ts`: with `gated: [{ path: "/upload", minRole: Role.ADMIN }]`, a User's cookie visit to `/it/upload` and `/upload/x` answers 307 to `/it` and `/`; an Admin's passes to `proxy`; `/users` (not gated) never calls the session read. `with-app-session.test.tsx`: `withAppSession(Page, null, { minRole: Role.ADMIN })` redirects a User, renders for an Admin. `session.test.ts`: `requireAppSession({ minRole })` redirects Home on a low Role and its cache key differs from the call without options.
- [ ] Step 2: Run `pnpm --filter @allonfire/auth exec vitest run src/features/next/tests`: fail. Step 3: implement. Step 4: run: pass. Step 5: `pnpm turbo run check-types test --filter=@allonfire/auth --filter=@allonfire/back-office` (the Back Office passes no options yet, so nothing changes there). Step 6: document the option in `packages/auth/README.md` (one paragraph under the Next side).

### Task 9: User avatar, app tile and the HEIC converter

**Files:**
- Move: `apps/back-office/src/shared/components/user-avatar.tsx` to `packages/ui/src/features/image/components/aof-user-avatar.tsx`; tests `user-avatar.test.tsx`, `user-avatar.browser.test.tsx` to `packages/ui/src/features/image/tests/`
- Move: `apps/back-office/src/shared/components/app-tile.tsx` to `packages/ui/src/features/navigation/components/aof-app-tile.tsx`
- Move: `packages/ui/src/features/form/avatar-field/utils/heic-to-jpeg.ts` (and its test, if any) to `packages/ui/src/shared/utils/heic-to-jpeg.ts`, `.../shared/tests/heic-to-jpeg.test.ts`; update `aof-avatar-field.tsx`'s relative import
- Modify: `packages/ui/package.json` (keys `./features/image/components/aof-user-avatar`, `./features/navigation/components/aof-app-tile`, `./shared/utils/heic-to-jpeg`); Back Office importers; create the Back Office binding `apps/back-office/src/shared/components/user-avatar.tsx` (`UserAvatar` = `AOFUserAvatar` with `initialClassName={initial({ tone })}`, keeping the Japan `line` and `primary` tints)

**Interfaces:** Produces `AOFUserAvatar` (props as `UserAvatarProps` today minus `tone`, plus `initialClassName?: string`, default the primary tint), `AOFAppTile({ entry: AppEntry; size?: "lg" | "md" | "sm" })` (draws `entry.mark`: an icon or the logo images; no `APP_ENTRY` import), `isHeic`, `heicToJpeg` at `@allonfire/ui/shared/utils/heic-to-jpeg`. The Back Office's tile call sites pass `entry={APP_ENTRY[app]}`.

- [ ] Steps: recipe. Step 1 adds: `AOFUserAvatar` with a stored avatar and `blurDataUrl` under 40 px side shows no placeholder (existing assertion, kept) and with `initialClassName="bg-red-500"` the initial tile carries it. Step 5 also runs the Users and Images browser tests that render avatars and the account-menu browser test.

### Task 10: App switcher and account menu

**Files:**
- Move (with tests `app-switcher-menu.browser.test.tsx`, `account-menu.browser.test.tsx`): `apps/back-office/src/features/navigation/components/{app-switcher,app-switcher-menu,current-app-mark,account,account-menu}.tsx` to `packages/ui/src/features/navigation/components/aof-{app-switcher,app-switcher-menu,current-app-mark,account,account-menu}.tsx`
- Create: `packages/ui/src/features/navigation/components/aof-sign-out-form.tsx`
- Modify: `packages/core/src/features/next/i18n/translations/{en,it}.json` (`Common.Navigation`: `menu`, `toggleMenu`, `breadcrumb`, `apps`, `switchApp`, `account`, `language`, `theme`, `themeLight`, `themeDark`, `signOut`, `role.<Role>`), `apps/back-office/src/features/i18n/translations/{en,it}.json` (those keys leave `Navigation`, which keeps only the Section and page labels), `apps/back-office/e2e/frame.spec.ts`, `apps/back-office/e2e/pages.ts` and every test reading `enT("Navigation.<moved key>")` (now `Common.Navigation.<key>`), `packages/ui/package.json`

**Interfaces:** Produces (server) `AOFAppSwitcher({ app: AppDescriptor; addresses: Partial<Record<App, string | undefined>> })` (reads `requireAppSession()`, lists `switcherApps(app, enterableApps(accessUserFrom(session.user)), addresses)`, else `AOFCurrentApp`), `AOFCurrentApp({ app })`, `aofSwitcherButton` (the cva), `AOFAccount({ app: AppDescriptor; seal?: (role: Role) => ReactNode })`, `AOFAccountPlaceholder`, `AOFSignOutForm()` (a `<form id={NAVIGATION.FORM.SIGN_OUT} action={signOut.bind(null, locale)}>`, from `useLocale`); (client) `AOFAppSwitcherMenu`, `AOFAccountMenu` (props as today, `seal` a ReactNode, `role` the translated string, the avatar `AOFUserAvatar`). Translations are read from `Common.Navigation`; Section and page labels stay in the App's own `Navigation` (a documented contract: one key per Section and page `label`).

- [ ] Step 1: Moved tests re-point to `renderInUi` with `messages` holding the Back Office copy for `Navigation` (the Section labels) over core's `Common`. New assertion in `aof-account.test.tsx`: with `seal={() => <span>SEAL</span>}` and an Admin Session the account menu content contains `SEAL`, and without `seal` it contains none; `AOFAppSwitcher` with `addresses: {}` renders `AOFCurrentApp` (no menu button).
- [ ] Step 2 to 6: recipe. Translation steps: add each key to core's `en.json` and `it.json` with the Back Office's current words (no `{app}` needed here), delete it from the Back Office JSONs, run `pnpm static:i18n` and `pnpm --filter @allonfire/back-office exec vitest run src/features/i18n/tests/translations.test.ts`. Then re-point the Back Office layout (`(signed-in)/layout.tsx`) to render `<AOFSignOutForm />`, `<AOFAccount app={BACK_OFFICE} seal={roleSeal} />` and `<AOFAppSwitcher app={BACK_OFFICE} addresses={{ [App.LAURA]: env.LAURA_URL }} />` inside its two `Suspense`s, with `roleSeal = (role) => <Hanko seal={ROLE_SEAL[role]} size="sm" stamp={false} />`.

### Task 11: Sidebar pieces (section link, breadcrumb, drawer closer, sidebar param, section page)

**Files:**
- Move (with tests `section-link`, `frame-breadcrumb`, `sidebar-param`, `section-page` browser tests): `apps/back-office/src/features/navigation/components/{section-link,frame-breadcrumb,close-drawer-on-navigate,sidebar-param,section-page}.tsx` to `packages/ui/src/features/navigation/components/aof-{section-link,frame-breadcrumb,close-drawer-on-navigate,sidebar-param,section-page}.tsx`
- Create: `apps/back-office/src/features/navigation/components/frame-breadcrumb.tsx` (client binding), `apps/back-office/src/features/navigation/constants/section-row.ts` (the `sectionRow` cva, the Japan tactile-yellow bar, moved out of `section-link.tsx`)
- Modify: `packages/ui/package.json`

**Interfaces:** Produces `AOFSidebarSectionLink({ children, label, path, pages?, rowClassName: { current: string; idle: string } })` (client; strings and nodes only; `Link`, `usePathname` from `aofBaseNavigation`), `AOFFrameBreadcrumb({ app: AppDescriptor; crumbMark?: (position: string) => ReactNode })` (client: only a client binding passes it), `AOFCloseDrawerOnNavigate`, `AOFSidebarParam`, `AOFSectionPage` (props and `width` variants as `SectionPage`). Breadcrumb reads the Section labels from the App's `Navigation` and `Common.Navigation.breadcrumb`; the crumb numbers come from `sectionNumber` and `subPageNumber`. The Back Office binding is `"use client"`, imports `BACK_OFFICE` and `StationNumber`, and renders `<AOFFrameBreadcrumb app={BACK_OFFICE} crumbMark={(number) => <StationNumber number={number} />} />`.

- [ ] Steps: recipe; moved tests keep their assertions (the Back Office's `frame-breadcrumb.browser.test.tsx` becomes ui's with the descriptor passed, and a second copy of the breadcrumb scenarios stays in the Back Office against its binding: one test that the station numbers draw). New assertion: `aof-section-link.browser.test.tsx` with `rowClassName={{ current: "CUR", idle: "IDLE" }}` finds `CUR` on the current row and `IDLE` on the others, and the sub-menu rows follow the same rule.

### Task 12: AOFAppFrame (variant, collapsible, role-gated rows) and the Back Office layout

**Files:**
- Move (with test `app-frame.test.tsx`, `section-loading.test.tsx` stays): `apps/back-office/src/features/navigation/components/app-frame.tsx` to `packages/ui/src/features/navigation/components/aof-app-frame.tsx`
- Create: `packages/ui/src/features/navigation/components/aof-role-gated-section.tsx`, `packages/ui/src/features/navigation/tests/aof-app-frame.test.tsx`
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/layout.tsx` (binds `AOFAppFrame` with the slots), `packages/ui/package.json`, `apps/back-office/e2e/frame.spec.ts` (only if a selector text moved)

**Interfaces:** Produces `AOFAppFrame` and `AOFAppFrameProps` exactly as in Contracts, `AOFRoleGatedSection({ app, section, children })` (async Server Component: reads `requireAppSession()`, `roleIn(accessUserFrom(session.user), app.app)`, renders `children` when `sectionAllowed(section, role)`, never throws, `null` otherwise). `variant` and `collapsible` go to `AOFSidebar` (it already forwards shadcn's `Sidebar` props and defaults `collapsible="icon"`); the frame sets `data-frame-variant` on its provider wrapper so a test and the e2e can read it. The Back Office layout passes `slots={{ sidebarWall: <SidebarKanji />, headerWall: <HeaderKanji />, headerEnd: <Torii className="ml-auto h-10.5 w-12.5" /> }}`, `classNames={{ sidebarHeader: "border-line/50 border-b-2", frameHeader: "border-line/50 border-b-2" }}`, `rowClassName={{ current: sectionRow({ current: true }), idle: sectionRow({ current: false }) }}`, `breadcrumb={<FrameBreadcrumb />}`.

- [ ] Step 1: `aof-app-frame.test.tsx` (unit, `renderToStaticMarkup`-style like the moved `app-frame.test.tsx`; reconcile: copy its harness): `variant="floating"` yields `data-frame-variant="floating"` and the sidebar's `data-variant="floating"`; default is `sidebar` and `collapsible="icon"`; every Section without `minRole` draws a row and the frame reads no cookies (mock `next/headers` and assert it was not called: the frame is static). In a second test with a descriptor whose last Section has `minRole: Role.ADMIN`, `AOFRoleGatedSection` renders its row for an Admin Session and renders nothing for a User (mock `requireAppSession`).
- [ ] Step 2: Run `pnpm --filter @allonfire/ui exec vitest run src/features/navigation/tests`: fail. Step 3: move and generalise (`app.sections.map`, the Section's label from `Navigation`, `Common.Navigation.menu` for the labels). Step 4: pass.
- [ ] Step 5: Back Office bundle (recipe step 5) plus the production-build e2e that proves the Review Focus 1 and 3 items: `pnpm test:services` then `pnpm e2e:run` filtered to the Back Office specs `frame`, `head`, `instant`, `safe-area`, `keyboard` (`pnpm --filter @allonfire/back-office exec playwright test e2e/frame.spec.ts e2e/instant.spec.ts e2e/safe-area.spec.ts e2e/keyboard.spec.ts`; the e2e builds the App itself). All green with no spec edited beyond an import path.
- [ ] Step 6: recipe step 6; `src/features/navigation/components` of the Back Office holds only `frame-breadcrumb.tsx`, `header-kanji.tsx`, `sidebar-kanji.tsx`, `station-number.tsx`, `section-loading.tsx` and their tests.

### Task 13: Notice frame, error, not-found and offline notices, resource view

**Files:**
- Create: `packages/ui/src/features/feedback/types/notice.ts`, `packages/ui/src/shared/constants/action.ts`, `packages/ui/src/shared/types/action-dressing.ts`, `apps/back-office/src/features/errors/components/station-notice-frame.tsx`, `apps/back-office/src/shared/constants/action-dressing.tsx`
- Move (with tests `error-notice.test.tsx`, `error-notice.browser.test.tsx`, `offline-notice.test.tsx`): `apps/back-office/src/features/errors/components/{error-notice,not-found-notice}.tsx` to `packages/ui/src/features/feedback/components/aof-{error-notice,not-found-notice}.tsx`; `apps/back-office/src/features/pwa/components/{offline-notice,reload-button}.tsx` to `packages/ui/src/features/pwa/components/aof-{offline-notice,reload-button}.tsx`; `apps/back-office/src/shared/components/resource-view.tsx` (and `resource-view.browser.test.tsx`) to `packages/ui/src/features/query/components/aof-resource-query-view.tsx`
- Modify: the Back Office files that render them (`app/global-error.tsx`, `app/[locale]/error.tsx`, `not-found.tsx`, `(signed-in)/not-found.tsx`, `offline/page.tsx`, the Users and Images edit components), `packages/ui/package.json`; recreate in the Back Office the bindings `features/errors/components/{error-notice,not-found-notice}.tsx`, `features/pwa/components/offline-notice.tsx`, `shared/components/resource-view.tsx` (each under 25 lines, `"use client"` where the slot is a function)

**Interfaces:** Produces `AOFNoticeKind`, `AOFNoticeFrameProps`, `AOFNoticeFrame`, `AOF_ACTION`, `AOFAction`, `AOFActionDressing` (Contracts); `AOFErrorNotice({ error, retry, t, Frame, actions })`, `AOFNotFoundNotice({ Frame, actions, page? })` (the back link goes to `METADATA.PATH.ROOT` through `aofBaseNavigation.Link`), `AOFOfflineNotice({ Frame, actions })`, `AOFReloadButton` (takes the dressing's class), `AOFResourceQueryView({ query, children, loading, Frame, actions })` (core's `AOFResourceView` plus `AOFErrorNotice` for a non-404 refusal; the Section's 404 stays `notFound()`). The Back Office: `StationNoticeFrame: AOFNoticeFrame` renders `StationNotice` with `signage` chosen by `kind` (`ERROR_SIGNAGE.ERROR`, `ERROR_SIGNAGE.NOT_FOUND`, `PWA_SIGNAGE.OFFLINE`); `ACTION_DRESSING: AOFActionDressing = { className: kanjiAction(), marks: { back: <ActionKanji kanji={ACTION_KANJI.BACK} />, retry: <ActionKanji kanji={ACTION_KANJI.RETRY} />, enter/send/save: the SIGN_IN and RESET kanji } }`. Words come from core's `Common.Error`, `Common.NotFound`, `Common.Offline` (already shared). Moved components draw Tabler icons (`IconRefresh`, `IconArrowBackUp`, `IconWifiOff` replaces `lucide`'s `WifiOff` only inside moved files).

- [ ] Step 1: The moved tests render with a stub frame: `const Frame: AOFNoticeFrame = ({ kind, heading, action, children }) => <section data-kind={kind}><h1>{heading}</h1>{children}{action}</section>`. Assertions: `AOFErrorNotice` shows `t("title")`, a `Reference <digest>` line only when the error has a digest, and a Retry button whose `onClick` is `retry` and that contains `actions.marks.retry`; `AOFNotFoundNotice` renders `data-kind="notFound"` and a link to `/`; `AOFOfflineNotice` renders `data-kind="offline"` and its reload button calls `location.reload` once (stub). The Back Office keeps one browser test per binding proving the station stamp and 迷子/運休/圏外 still draw (the existing `station-notice` tests stay).
- [ ] Step 2 to 6: recipe. In step 5 also run `pnpm --filter @allonfire/back-office exec vitest run --config vitest.browser.config.ts src/features/users/components/tests/edit-user.browser.test.tsx src/features/users/components/tests/edit-user-skeleton.browser.test.tsx src/features/images/components/tests/edit-image.browser.test.tsx` (they render `ResourceView`; the Users editor now passes `loading={<EditUserSkeleton />}`, so `AOFResourceQueryView`'s `loading` slot keeps its contract and its moved test asserts a given `loading` node shows while the query is pending).

### Task 14: Install hint and offline banner

**Files:**
- Move (with tests `install-hint.browser.test.tsx`, `offline-banner.browser.test.tsx`): `apps/back-office/src/features/pwa/components/{install-hint,offline-banner}.tsx` to `packages/ui/src/features/pwa/components/aof-{install-hint,offline-banner}.tsx`
- Create: Back Office bindings `features/pwa/components/install-hint.tsx` and `offline-banner.tsx` (`"use client"`, each renders the shared piece with its dressed card)
- Modify: `apps/back-office/src/app/[locale]/layout.tsx` imports, `packages/ui/package.json`

**Interfaces:** Produces `AOFInstallHint({ appName: string; Card: ComponentType<AOFInstallHintCardProps> })` and `AOFOfflineBanner({ Card: ComponentType<{ description: string; title: string }> })` (client; `useInstallHint` and `useOffline` stay core's and Next's; toast ids `PWA.TOAST.INSTALL_HINT` and `PWA.TOAST.OFFLINE`; options `AOF_TOAST.PERSISTENT` with positions bottom-center and top-center), and the exported type `AOFInstallHintCardProps` (the props `InstallHintCard` takes today, defined in ui so both sides read one). The Back Office `InstallHintCard` and `OfflineCard` stay and satisfy those types.

- [ ] Steps: recipe, moved tests unchanged in what they assert (the toast appears once, never on a first visit, dismissal is remembered, the offline toast leaves when the network returns) with a stub `Card`; the case added with the iOS fix, "shows the whole card, its steps included" (the toast's box is at least as tall as the card inside it at a phone's size: Sonner wraps a custom toast's card in its title element, and a line clamp there cut the card short in WebKit), moves with the component and stays green: the clamp now applies only to Sonner's own toasts (`data-styled`), which `AOFToaster` already carries. In step 5 run the e2e `pwa.spec.ts` (Chromium-only tag): `pnpm --filter @allonfire/back-office exec playwright test e2e/pwa.spec.ts --project=chromium`.

### Task 15: Form pieces and the sign-in page set

**Files:**
- Move (with tests): `shared/components/{form-alert,form-skeleton,password-rules}.tsx` and `shared/utils/password-checks.ts` (`password-checks.test.ts`) to `packages/ui/src/features/form/components/aof-{form-alert,form-skeleton,password-rules}.tsx` and `features/form/utils/password-checks.ts`; `features/auth/components/{sign-in,forgot-password,reset-password,email-verified,sign-in-form,forgot-password-form,reset-password-form,email-verified-note,gate-note,gate-submit}.tsx` to `packages/ui/src/features/auth/components/aof-<same>.tsx`; `features/auth/utils/{sign-in-schema,reset-schema,verified-landing}.ts` with tests to `packages/ui/src/features/auth/utils/` and `.../tests/`; browser tests `sign-in-form`, `password-pages`, `email-verified`, `gate-submit`, `sign-in.test.tsx` to `packages/ui/src/features/auth/tests/` (rewritten against a stub `Gate`)
- Create: `apps/back-office/src/features/auth/constants/dressing.tsx` (`AUTH_DRESSING`)
- Modify: `packages/core/src/features/next/i18n/translations/{en,it}.json` (`Common.Auth.SignIn`, `ForgotPassword`, `ResetPassword`, `EmailVerified`, the password-rules words; the Back Office name becomes `{app}`: `SignIn.error.forbidden` reads "This account cannot enter {app}."), the Back Office JSONs (keys removed), the four pages under `apps/back-office/src/app/[locale]/{sign-in,forgot-password,reset-password,email-verified}/page.tsx`, the Users form files that import `PasswordRules` or `passwordChecks`, `packages/ui/package.json`, `apps/back-office/e2e/{sign-in,password-reset}.spec.ts` (copy keys: `EN.SignIn` to `EN.Common.Auth.SignIn` or `enT(...)`)

**Interfaces:** Produces `AOFFormAlert`, `AOFFormSkeleton`, `AOFPasswordRules`, `passwordChecks`; `AOFGateProps`, `AOFAuthDressing`, `AOFSignIn({ appName, appUrl?, dressing })`, `AOFForgotPassword({ appName, appUrl, dressing })`, `AOFResetPassword({ appName, dressing })`, `AOFEmailVerified({ appName, dressing })` (server), `AOFSignInForm`, `AOFForgotPasswordForm`, `AOFResetPasswordForm`, `AOFEmailVerifiedNote`, `AOFGateNote`, `AOFGateSubmit({ mark: ReactNode, icon, pending, pendingLabel, ... })` (client; the dressing arrives as `className` and `mark` strings and nodes), `signInSchema`, `forgotSchema`, `resetSchema`, `verifiedLanding(appUrl, locale)`. Icons become Tabler (`IconMail`, `IconKey`, `IconNfc`, `IconLogin`, `IconSend`, `IconLoader2`, `IconArrowLeft` as the closest Tabler names; reconcile: check each exists in `@tabler/icons-react` and keep the same glyph where it does). The sign-in page set holds no registration link and no App name literal: `appName` fills `{app}`. The sign-in actions stay auth's (`@allonfire/auth/features/next/actions/*`). `AUTH_DRESSING = { Gate: TicketGate, actions: ACTION_DRESSING, back: <BackToSignIn /> }`.

- [ ] Step 1: Tests with a stub `Gate` that renders `data-page={page}` and `status`: `AOFSignIn` renders the gate with `page={AUTH.PAGE.SIGN_IN}` and `status` the shared `Common.Auth.SignIn.submit`; with `appUrl` set, the form posts a hidden `callbackURL` equal to `verifiedLanding(appUrl, "en")`; the forbidden error reads `Common.Auth.SignIn.error.forbidden` with `appName` filled (assert through `enT`-style `createTranslator`, never a retyped string); `AOFForgotPassword` posts `resetPage` as `${appUrl}/${locale}${AUTH.PAGE.RESET_PASSWORD}`; `AOFResetPasswordForm` blocks a weak password in the browser and shows the rules; `AOFEmailVerifiedNote` redirects to Sign in when the address carries neither `AUTH.MAIL.VERIFIED_PARAM` nor `AUTH.MAIL.ERROR_PARAM`. A schema test per moved schema (existing).
- [ ] Step 2 to 6: recipe. The Back Office keeps `sign-in.test.tsx`-level coverage in one test that renders `AOFSignIn` with `AUTH_DRESSING` and finds the ticket gate (the station sign and the departure board). Then run the e2e `pnpm --filter @allonfire/back-office exec playwright test e2e/sign-in.spec.ts e2e/password-reset.spec.ts e2e/safe-area.spec.ts` and `pnpm static:i18n`; the Back Office `translations.test.ts` passes (its toast-key list and message lengths now read both JSONs: reconcile that test to read the merged copy through `aofMessages`).

### Task 16: Page information factories

**Files:**
- Create: `packages/core/src/features/next/metadata/utils/aof-app-metadata.ts`, `aof-manifest.ts` and their tests under `.../metadata/tests/`; `packages/ui/src/features/image/utils/aof-app-images.tsx` and `.../tests/aof-app-images.test.tsx`
- Delete from the Back Office: `features/metadata/utils/{base-metadata,page-metadata,page-open-graph,metadata-text,icon-image,share-image}.ts(x)` and `tests/page-open-graph.test.ts` (moves to core's test)
- Create: `apps/back-office/src/shared/constants/page-information.ts` (the one binding: `export const { baseMetadata, pageMetadata, pageOpenGraph, metadataText, layoutMetadata } = aofAppMetadata({ ... })` and `export const { iconImage, shareImage } = aofAppImages({ ... })`)
- Modify: `apps/back-office/src/app/[locale]/layout.tsx`, `manifest.ts`, `apple-icon.tsx`, `launch/[screen]/route.tsx`, `manifest-icon/[icon]/route.ts`, `[locale]/opengraph-image.tsx`, `twitter-image.tsx`, every `pageMetadata` importer; `packages/core/package.json`, `packages/ui/package.json`

**Interfaces:** Produces `aofAppMetadata({ name, indexing, shareImageAlt, routing, getPathname, translations: Record<Language, { Metadata: { description: string } }>, startupImage })` returning `{ baseMetadata(locale), pageOpenGraph(pathname, locale), pageMetadata, metadataText(locale), layoutMetadata({ locale, origin }): Metadata }` (`metadataText` falls back to `I18N.DEFAULT_LANGUAGE` for a placeholder locale, as today; `baseMetadata` is `react` `cache`d per locale; `og:url` from `getPathname`, Home's empty path is `METADATA.PATH.ROOT`); `aofManifest({ name, description, ground })` returning a `MetadataRoute.Manifest` with `display: "standalone"` (ADR 0025), `id` and `scope` the root, icons `AOFManifestIcons()`; `aofAppImages({ logo, line, shareCardLook, ground, fonts, translations })` returning `{ iconImage(icon), shareImage({ params }), launchScreen(scheme) }` over `AOFIconImage`, `AOFShareCard`, `AOFBrandLogo`, `AOFLaunchScreenRoute`'s callback. `fonts` is the Design slot: the Back Office passes its `imageFonts` (the `"use cache"` function stays in the Back Office). `ground` and `shareCardLook` come from `JAPAN_IMAGE_COLOR` and `JAPAN_SHARE_CARD` in the Back Office binding.

- [ ] Step 1: Core tests: `pageOpenGraph("", "en").url` is `getPathname({ href: "/", locale: "en" })` (a stub), `pageOpenGraph("/users", "it").url` is the `/it/users` form, the images list is carried (Next replaces `openGraph` whole); `layoutMetadata` returns `title.template` `pageTitle("%s", name)`, `metadataBase` the origin and `description` the locale's text; `aofManifest({ ... }).display` is `"standalone"` and `.name` is the App name. ui test: `shareImage` resolves to an `ImageResponse` of `METADATA.SHARE_IMAGE.SIZE` (stub `next/og`), with the card's `band` the line and `headline` the App name.
- [ ] Step 2 to 6: recipe. In step 5 run the e2e `pnpm --filter @allonfire/back-office exec playwright test e2e/head.spec.ts` (title, `og:image`, icons per page) untouched.

### Task 17: Locale document shell and the proxy matcher suite

**Files:**
- Create: `packages/ui/src/features/app/components/aof-locale-document.tsx`, `packages/ui/src/features/app/tests/aof-locale-document.test.tsx`, `packages/core/src/features/next/i18n/tests/proxy-matcher-suite.ts`
- Modify: `apps/back-office/src/app/[locale]/layout.tsx`, `apps/back-office/src/proxy.ts` (builds `gated` from `SECTIONS` rows with `minRole`), `apps/back-office/src/proxy.test.ts` (calls the suite), `packages/ui/package.json`, `packages/core/package.json`, `knip.jsonc` (the suite file in `ignoreIssues`, same reason)

**Interfaces:** Produces `AOFLocaleDocument({ locale, children, toaster, hint, banner, pwaEnabled })` (server: `<html lang suppressHydrationWarning translate="no"><body className="min-h-dvh bg-background font-sans text-foreground antialiased">` with `NextIntlClientProvider`, `AOFQueryProvider`, `AOFThemeProvider`, `AOFNuqsAdapter`, `toaster` (the App's `StationToaster`), `AOFEdgeTint` (ui `features/feedback/components/aof-edge-tint`, already shared: the strip that keeps iOS Safari's toolbar the page's colour, never a slot, so the Back Office layout drops its own mount), then `AOFPwa` around `children` (core's `AOFPwa` already mounts `AOFDevResume` in every non-production build, so Laura's phone-on-the-tailnet reload on resume comes free); `generateStaticParams`, `generateMetadata` and `viewport` stay in the App's layout file because Next reads those exports from it) and `proxyMatcherSuite({ config, pages })` registering the matcher cases of the Back Office's `proxy.test.ts` (routed pages, skipped metadata routes with and without a locale, the Offline page, dotted files) with `unstable_doesMiddlewareMatch`, so Laura's `proxy.test.ts` is one call. The matcher regex stays a literal in each App's `proxy.ts` (Next reads it statically).

- [ ] Step 1: Tests: `aof-locale-document.test.tsx` renders the document with stub slots and asserts `lang`, `translate="no"`, that `toaster`, `hint` and `banner` appear, that exactly one `aria-hidden` edge-tint strip is rendered (it is not a slot), and `children` sit inside `AOFPwa`. The suite is exercised by the Back Office's own `proxy.test.ts` (the moved cases, same expectations).
- [ ] Step 2 to 6: recipe; in step 5 also run `pnpm --filter @allonfire/back-office exec vitest run src/proxy.test.ts`.

### Task 18: Docs, knip entries, dupes

**Files:**
- Modify: `docs/guides/package-layout.md`, `docs/guides/next-apps.md`, `docs/guides/back-office.md`, `docs/guides/design-system.md`, `docs/guides/testing.md`, `docs/guides/tooling.md` (only if a tool line moved), `packages/core/README.md`, `packages/auth/README.md`, `CONTEXT.md` (App scaffolding entry: add "App descriptor"), `knip.jsonc`, `.jscpd.json` (only if a new scanned folder is needed: none), `packages/ui/package.json`

**Interfaces:** none produced; this task makes the docs and the tool configs say what Tasks 1 to 17 did.

- [ ] Step 1: Find every stale pointer: `git grep -n "apps/back-office/src/\(shared\|features/\(navigation\|pwa\|errors\|auth\|api\|metadata\)\)" docs packages/*/README.md AGENTS.md CLAUDE.md .claude` and `git grep -n "optimisticMutation\|sectionNumber\|stationNumber\|signedInPage\|TicketGate\|StationNotice"` in `docs/guides`. List each hit with its new home.
- [ ] Step 2: Update the docs with one pointer line per moved piece, never a copy of code (`writing.md`): `next-apps.md` (data checklist point 2 names core's `optimisticMutation`, `optimisticUpdate`; the hydration pattern with `storageOverviewHydration` as the example and `aofCreateApi`'s `sessionApi`; the signed-in page section gains `signedInPage(Page, { minRole })` and the proxy `gated` list; "Page information" names `aofAppMetadata` and `aofAppImages`; the Back Office frame names `AOFAppFrame` and its `variant`/`collapsible`), `back-office.md` (frame, Sections and sign-in pages now say "dressed in the Back Office's slots"; the descriptor), `package-layout.md` (the shared scaffold map: which package holds which piece, the slot rules, "a shared client piece takes strings and nodes only", routing note: an App that routes other languages than `I18N.BASE_LANGUAGES` keeps its own routing and passes it), `design-system.md` (action dressing and the notice frame as the Design slots; `AOFUserAvatar`), `testing.md` (`renderInUi` and the shared test helpers' home, the matcher suite), `packages/core/README.md` and `packages/auth/README.md` (their new exports and `minRole`), `CONTEXT.md` (App descriptor: one object per App that the shared scaffold reads).
- [ ] Step 3: knip. Run `pnpm static:knip` and `pnpm static:knip-production`; read each hit by finding its readers (`git grep -w <name> -- apps packages`). Expected hits and their fix: an export key only a Laura phase will read (for example `AOFRoleGatedSection`'s sibling exports, `AOFAuthDressing` type) is either `@internal` (read by tests only) or removed from the key list until Phase 3; test helpers other packages import get an `ignoreIssues` entry with the existing reason; never a folder glob (`knip-config.test.ts` fails on one). Confirm `pnpm --filter @allonfire/config exec vitest run local/tests/knip-config.test.ts` passes.
- [ ] Step 4: jscpd expectation: `pnpm static:dupes` reports no clone. The Back Office's bindings are short and different; if a clone shows between a binding and its shared piece, merge it into the piece. The rule for Laura (Phase 3): a Laura file that clones a Back Office file means the piece belongs in a package.
- [ ] Step 5: Verify: `pnpm static:knip`, `pnpm static:knip-production`, `pnpm static:dupes` all exit 0.

### Task 19: Review checkpoint

**Files:** none new; this task only runs the checks and fixes what they show.

- [ ] Step 1: `pnpm static:fix` (Ultracite and the Back Office's Tailwind rewrite: moved classes might need canonical spelling against ui's base).
- [ ] Step 2: `pnpm static:dupes`, `pnpm static:knip`, `pnpm static:knip-production`, `pnpm static:lint`, `pnpm static:i18n`, `pnpm static:tailwind`.
- [ ] Step 3: `pnpm turbo run check-types test --filter=@allonfire/core --filter=@allonfire/auth --filter=@allonfire/ui --filter=@allonfire/back-office --filter=@allonfire/config` and `pnpm turbo run test:browser --filter=@allonfire/ui --filter=@allonfire/back-office`.
- [ ] Step 4: Proof of "no behaviour change": `pnpm test:services`, then `pnpm e2e:run` for the Back Office (`pnpm turbo run test:e2e --filter=@allonfire/back-office`): every spec green on chromium, webkit, mobile-chrome and mobile-safari, no spec edited beyond import paths and the moved copy keys.
- [ ] Step 5: Boundary proof: the Task 0 guard passes with `ALLOWED` unchanged except for entries removed; `git grep -n "@/features/i18n/navigation" packages` prints nothing; `git grep -n "BACK_OFFICE" packages/ui packages/core packages/auth` prints nothing outside tests and comments that Task 18 reworded.
- [ ] Step 6: Docs touched are listed in Task 18; `git status` shows only intended files; the owner reviews the diff before any commit (no commit here).

## Left to later phases (named so no one re-derives it)

- Phase 2: Laura's logo and colours (until then `LAURA`'s entry in the Back Office's `APP_ENTRY` keeps its `IconLibraryPhoto` mark); the Design's `AOFNoticeFrame`, `AOFActionDressing`, `AUTH_DRESSING`, `rowClassName`, `slots` for the floating frame.
- Phase 3: `LAURA` descriptor (`sections` with Upload's `minRole: Role.ADMIN`), the visual pass of `variant="floating"`, Laura's bindings (the same files as the Back Office's, each under 25 lines), a shared e2e kit for frame and sign-in, `design:sync` and `lint-staged` lines.
- Phase 4: the hydrated infinite feed (first page inside one `"use cache: private"` read, later pages through `useInfiniteQuery`, refresh after an Admin's change) and its `QUERY.GALLERY` keys; a masonry grid takes `AOFStorageImage` with `placeholder="blur"`.
- Phase 5: the upload dropzone reads `heicToJpeg` and `isHeic` from `@allonfire/ui/shared/utils/heic-to-jpeg`.
- Later, when a Laura list appears: its Design dresses the same ui list kit (`useListView`, `AOFDataTable`, `AOFFilterPanel`); `ListFilterPanel`, `ListSkeleton` and `ToolbarAction` stay Back Office files until then.
