# Back Office Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put every signed-in Back Office page inside one frame (sidebar on desktop, top bar and tab bar on a phone, an account menu) and add Users and Storage as real, empty Sections beside Home.

**Status:** implemented (uncommitted) @ 2026-10-16T18:28:09+02:00

**Architecture:** The `(signed-in)` route group's layout draws a static frame from one App-owned list of Sections; each page still gates itself with `withAppSession` (ADR 0024). The frame is built from AOF components wrapping shadcn's generated `sidebar`, `empty` and `dropdown-menu`; the sidebar's open state is a typed nuqs param synced on the client, so nothing the server renders depends on the request. The account menu reads the Session in its own `<Suspense>`, through a `getSession` that React's `cache` shares with the page's check. A library survey and a Japan direction, both chosen by the owner, come before the frame is dressed with `/aof-design`.

**Tech Stack:** Next.js 16.3.6 App Router (`cacheComponents`, `typedRoutes`), next-intl 4.14, nuqs 2.10 (`nuqs/adapters/testing` in tests), shadcn base-nova on Base UI 1.8, lucide-react, Vitest 4 (globals; browser tests through `vitest-browser-react`), Playwright e2e on four projects.

**Spec:** `docs/superpowers/specs/2026-10-16-back-office-frame-design.md` (and `docs/adr/0024-the-signed-in-frame-is-static-and-each-page-gates-itself.md`)

## Global Constraints

- Words: the menu's entries are **Sections** (Home, Users, Storage). Code and copy never say "dashboard", "admin panel" or "console".
- Every signed-in page is `export default withAppSession(Page)`; its `generateMetadata` stays static (translations and `pageOpenGraph`, never request-time data).
- The frame (`(signed-in)/layout.tsx`) reads no Session, cookie, header or search param on the server. UI state is a typed nuqs param read on the client.
- Apps import AOF components only (`@allonfire/ui/components/aof-*`), never `@allonfire/shadcn`. `packages/shadcn` is never edited by hand: a missing component is `npx shadcn@4.21.0 add <name>` from `apps/back-office`, then `pnpm --filter @allonfire/shadcn canonicalize`.
- Nothing is installed from a third-party registry unless the owner picked it in Task 1.
- Constants nest in one `as const` object per owner (`BACK_OFFICE.PAGE`, `SECTION`, `NAVIGATION`); a path is never a string literal outside its owner's declaration, tests included.
- Never `Object.keys/values/entries/fromEntries`: `objectKeys`, `objectValues`, `objectEntries`, `objectFromEntries` from `@allonfire/core/shared/utils/object`. No `as` casts except `as const`.
- Every test file's first line is `// @module-tag unit` or `// @module-tag integration` (browser tests are `integration`); Vitest globals, no `from "vitest"`.
- Server Components by default; `"use client"` only on the smallest leaf that needs a hook or a handler. Lucide icons cross into a client leaf as rendered elements, never as component references.
- New strings go into `apps/back-office/src/features/i18n/translations/{en,it}.json`; run `pnpm i18n:check`. A name ("Back Office", "AllOnFire") is a constant, never a translation (the guard test in `features/i18n/tests/translations.test.ts` fails otherwise).
- Mobile-first; both themes; WCAG 2.2 AA. Every corner from the Design's radius (`rounded-sm`..`rounded-xl`), never `rounded-full`.
- Every page design goes through `/aof-design`, never plain `/impeccable`; browser checks through `/iso-browser`, in the owner's tab on `localhost:3400`.
- No commits from the executor: the owner commits with `/iso-commit`. Each task ends with a checkpoint; never `git add`, `git mv`, `git rm`. The pre-commit hook runs Biome, oxlint, `check-types`, unit, browser and e2e tests, so every checkpoint leaves those green.
- Never add `biome-ignore`; fix the code.
- The repo is on exFAT: a test that scans directories skips `._*` files.

## Review Focus

1. **Home marked current on every page.** Home's path is empty (`AUTH.PAGE.HOME`), so a prefix match ("starts with /") would light Home on Users and Storage. Expected: only the Section you are on is current. Pinned by the `sectionHref` and `isCurrentSection` unit tests in Task 6 and the e2e active-link check in Task 10.
2. **Switching language from the account menu** on `/it/users` must land on `/en/users`, not on Home. Pinned by the e2e language test in Task 10.
3. **A hand-edited or stale `?sidebar=` value** (`?sidebar=banana`, `?sidebar=`) must open the sidebar at its default and never throw. Pinned by the browser test in Task 7.
4. **The tab bar covering the page on a phone**, including the iOS home indicator: the last line of a page must stay reachable above it. Pinned by the frame's render test in Task 7 (the inset carries the tab bar's bottom padding) and the phone screenshot in Task 9.
5. **A signed-out visit straight to a new Section** (`/it/storage`) must get a 307 to Sign in before any HTML. Pinned by the guard test in Task 6 (every page is in the list the proxy reads) and the e2e redirect test in Task 10.

---

### Task 1: Library survey (owner gate)

**Files:**
- Create: `docs/superpowers/specs/2026-10-16-back-office-frame-library-survey.md`
- Modify: `docs/superpowers/specs/2026-10-16-back-office-frame-design.md` (record the pick under "Decisions")

**Interfaces:**
- Produces: the owner's pick, which Tasks 4, 5 and 9 follow. With no third-party pick, Tasks 4 and 5 build on shadcn's generated components exactly as written below.

- [x] **Step 1: Read the shadcn skill.** Read `.claude/skills/shadcn/SKILL.md`, `registry.md` and `cli.md`: how a namespaced registry is added to `components.json` and installed (`npx shadcn@4.21.0 add @<namespace>/<item>`), and how `base-nova` differs from Radix styles.

- [x] **Step 2: Survey each source.** Use the shadcn MCP (`search_items_in_registries`, `view_items_in_registries`) for registries it knows, and WebSearch/WebFetch for the rest. Sources, in this order:
  1. Official shadcn: the `sidebar-*` and `dashboard-01` blocks.
  2. Shadcn Studio
  3. Shadcnblocks
  4. React Bits
  5. Ui-Layouts
  6. Shadcn UI Kit (admin dashboards, UI blocks)
  7. Shadcn UI Blocks (shadcnui-blocks)
  8. Aceternity UI

  For each, record: the sidebar, navbar, tab bar and app-shell blocks it offers (names and links); Radix or Base UI; free or paid (and the licence); how it installs (registry namespace and URL, or copy); its fit with the owner's taste (restraint; motion only when it carries meaning; no large illustrations, blur or glow); and a verdict (`use`, `idea only`, `skip`) with one sentence of reason.

- [x] **Step 3: Write the survey file.** One `##` per source, with the fields above as a short list. End with `## Recommendation`: which source's pieces to take for the sidebar, the tab bar and the account menu, defaulting to official shadcn unless another brings something it lacks.

- [x] **Step 4: Ask the owner.** AskUserQuestion with the recommendation first, then each other `use` candidate. Record the answer in the spec's "Decisions" table as a row `| Library pick | <answer> |`. If the owner picks a third-party block, add a step to Task 5 that installs it (registry namespace in `apps/back-office/components.json`, `npx shadcn@4.21.0 add`, then `migrate-radix-to-base` if it is Radix, then `pnpm --filter @allonfire/shadcn canonicalize`) and adapt Task 5's wrapper to the installed file's exports.

- [x] **Step 5: Checkpoint.** No code changed; nothing to run.

---

### Task 2: One Session read per request

**Files:**
- Modify: `packages/auth/src/features/next/utils/session.ts:19-32`
- Create: `packages/auth/src/features/next/tests/session-cache.test.ts`

**Interfaces:**
- Produces: `getSession(): Promise<Session | null>`, now wrapped in React's `cache` (same signature). Task 8's account reads it beside the page's `requireAppSession`.

- [x] **Step 1: Write the failing test**

React's real `cache` memoizes only inside a server request, so the test swaps in a memoizing `cache` and proves `getSession` goes through it. A file of its own: the memo lasts the whole file and would leak into `session.test.ts`.

```ts
// @module-tag unit
import { getSession } from "../utils/session";

const COOKIE = "better-auth.session_token=token";

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => COOKIE }),
  headers: async () => new Headers({ cookie: COOKIE }),
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
// React's cache memoizes only inside a server request; this one memoizes for
// the whole file, so a second read proves getSession goes through it.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    cache: <Args extends unknown[], Result>(
      read: (...args: Args) => Result
    ) => {
      let memo: { result: Result } | undefined;
      return (...args: Args) => {
        memo ??= { result: read(...args) };
        return memo.result;
      };
    },
  };
});

describe("getSession", () => {
  it("asks the API once per request, however many parts read the Session", async () => {
    const fetch = vi.fn(async () => Response.json(null));
    vi.stubGlobal("fetch", fetch);
    await getSession();
    await getSession();
    expect(fetch).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/auth exec vitest run src/features/next/tests/session-cache.test.ts`
Expected: FAIL, `expected "fetch" to be called once, but got 2 times`.

- [x] **Step 3: Wrap `getSession` in `cache`**

In `session.ts`, add `import { cache } from "react";` and change the declaration (the body stays as it is):

```ts
/**
 * The visitor's Session, read from the API with the browser's cookies; `null`
 * when signed out or the API cannot say. The App's proxy has already renewed
 * the cookies (`refreshSession`), so a renewal the API sends here is a repeat.
 * Read once per request: the page's check and the frame's account menu share
 * it.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  // ...the existing body, unchanged
});
```

`react` is already a devDependency and an optional peer of `@allonfire/auth`.

- [x] **Step 4: Run the auth tests**

Run: `pnpm turbo run check-types test --filter=@allonfire/auth`
Expected: PASS, including `session.test.ts` (the real `cache` outside a request reads every time, so its three cases still see their own `fetch`).

- [x] **Step 5: Checkpoint.** `pnpm exec biome check --write packages/auth`.

---

### Task 3: The sign-in gate takes any App's paths

**Files:**
- Modify: `packages/auth/src/features/next/utils/with-sign-in-gate.ts:5,17-20`
- Modify: `packages/auth/src/features/next/tests/with-sign-in-gate.test.ts`
- Modify: `packages/auth/README.md` (the `with-sign-in-gate` row)

**Interfaces:**
- Produces: `withSignInGate(proxy, { locales: readonly string[]; pages: readonly string[] }): Proxy`. A page is an App path after the locale, `""` for Home. Task 6's proxy passes the Section paths.

- [x] **Step 1: Write the failing test**

Add to `with-sign-in-gate.test.ts`: an App page the auth package does not know. Add a constant near the top and a case in the `describe`:

```ts
/** A page only the App knows: the gate must take it as a plain path. */
const APP_PAGE = { REPORTS: "/reports" } as const;

it("gates any page the App lists, not only the shared ones", async () => {
  const appGate = withSignInGate(proxy, {
    locales: ["en", IT],
    pages: [HOME, APP_PAGE.REPORTS],
  });
  const response = await appGate(
    new NextRequest(`${ORIGIN}/${IT}${APP_PAGE.REPORTS}`)
  );
  expect(response.headers.get(HTTP.HEADER.LOCATION)).toBe(
    `${ORIGIN}/${IT}${SIGN_IN}`
  );
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/auth check-types`
Expected: FAIL, `Type '"/reports"' is not assignable to type '"" | "/sign-in"'`.

- [x] **Step 3: Widen the type**

In `with-sign-in-gate.ts`, delete `import type { AppPath } from "../constants/paths";` and change the options type and its doc:

```ts
/**
 * Wraps an App's proxy so a visit with no Session cookie to one of its
 * signed-in `pages` (the App's paths after the locale, `""` for Home) goes
 * to Sign in (307) before anything renders. ...the rest of the comment as it is
 */
export const withSignInGate = (
  proxy: Proxy,
  { locales, pages }: { locales: readonly string[]; pages: readonly string[] }
): Proxy => {
```

In the README's `with-sign-in-gate` row, after `withSignInGate(proxy, { locales, pages })`, add: `pages` are the App's signed-in paths after the locale, `""` for Home.

- [x] **Step 4: Run the tests**

Run: `pnpm turbo run check-types test --filter=@allonfire/auth --filter=@allonfire/back-office`
Expected: PASS.

- [x] **Step 5: Checkpoint.** `pnpm exec biome check --write packages/auth`.

---

### Task 4: AOFEmpty and AOFDropdownMenu

**Files:**
- Create: `packages/ui/src/components/aof-empty.tsx`
- Create: `packages/ui/src/components/aof-dropdown-menu.tsx`
- Create: `packages/ui/src/components/tests/aof-empty.test.tsx`
- Create: `packages/ui/src/components/tests/aof-dropdown-menu.test.tsx`

**Interfaces:**
- Produces:
  - `AOFEmpty({ icon: ReactNode; title: string; description: string; children?: ReactNode } & ComponentPropsWithoutChildren<"div">)`, a Server Component. `title` renders as an `h2`.
  - `AOFDropdownMenu`, `AOFDropdownMenuTrigger`, `AOFDropdownMenuContent`, `AOFDropdownMenuGroup`, `AOFDropdownMenuLabel`, `AOFDropdownMenuItem`, `AOFDropdownMenuSeparator`, with the same props as shadcn's, client.

- [x] **Step 1: Write the failing tests**

`aof-empty.test.tsx`:

```tsx
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFEmpty } from "../aof-empty";

describe("AOFEmpty", () => {
  it("heads the empty state and says what will fill it", () => {
    const html = renderToStaticMarkup(
      <AOFEmpty description="Arrives later." icon={<svg />} title="Nothing" />
    );
    expect(html).toContain("<h2");
    expect(html).toContain("Nothing");
    expect(html).toContain("Arrives later.");
    expect(html).toContain('data-slot="empty"');
  });

  it("passes the caller's props to the frame", () => {
    const html = renderToStaticMarkup(
      <AOFEmpty
        className="p-2"
        data-state="idle"
        description="d"
        icon={<svg />}
        title="t"
      />
    );
    expect(html).toContain("p-2");
    expect(html).toContain('data-state="idle"');
  });
});
```

`aof-dropdown-menu.test.tsx`:

```tsx
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFDropdownMenu,
  AOFDropdownMenuTrigger,
} from "../aof-dropdown-menu";

describe("AOFDropdownMenu", () => {
  it("renders a closed trigger the menu opens from", () => {
    const html = renderToStaticMarkup(
      <AOFDropdownMenu>
        <AOFDropdownMenuTrigger>Account</AOFDropdownMenuTrigger>
      </AOFDropdownMenu>
    );
    expect(html).toContain("Account");
    expect(html).toContain('aria-expanded="false"');
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-empty.test.tsx src/components/tests/aof-dropdown-menu.test.tsx`
Expected: FAIL, cannot resolve `../aof-empty` and `../aof-dropdown-menu`.

- [x] **Step 3: Write the components**

`aof-empty.tsx`:

```tsx
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@allonfire/shadcn/components/empty";
import type { ReactNode } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";

export type AOFEmptyProps = ComponentPropsWithoutChildren<typeof Empty> & {
  /** What may follow the text: an action, a link. */
  children?: ReactNode;
  /** What the description says will fill the space, in one sentence. */
  description: string;
  /** A pictogram, decoration only. */
  icon: ReactNode;
  /** The heading: what is empty. */
  title: string;
};

/**
 * A Section, or a part of one, with nothing to show yet: a pictogram, a
 * heading (`h2`, under the page's `h1`) and one sentence on what will fill
 * it. Any prop passes to the frame.
 */
export const AOFEmpty = ({
  children,
  description,
  icon,
  title,
  ...props
}: AOFEmptyProps) => (
  <Empty {...props}>
    <EmptyHeader>
      <EmptyMedia aria-hidden variant="icon">
        {icon}
      </EmptyMedia>
      <EmptyTitle render={<h2 />}>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </EmptyHeader>
    {children}
  </Empty>
);
```

Before writing, open `packages/shadcn/src/components/empty.tsx`: if `EmptyTitle` does not take Base UI's `render` prop, wrap the title in `<h2>` inside it instead (`<EmptyTitle><h2 className="contents">{title}</h2></EmptyTitle>`), and keep the test as it is.

`aof-dropdown-menu.tsx`:

```tsx
"use client";

// ponytail: shadcn's menu under AOF names, nothing added yet; the account
// menu is its one user. Add behaviour here, never in packages/shadcn.
export {
  DropdownMenu as AOFDropdownMenu,
  DropdownMenuContent as AOFDropdownMenuContent,
  DropdownMenuGroup as AOFDropdownMenuGroup,
  DropdownMenuItem as AOFDropdownMenuItem,
  DropdownMenuLabel as AOFDropdownMenuLabel,
  DropdownMenuSeparator as AOFDropdownMenuSeparator,
  DropdownMenuTrigger as AOFDropdownMenuTrigger,
} from "@allonfire/shadcn/components/dropdown-menu";
```

- [x] **Step 4: Run the ui tests**

Run: `pnpm turbo run check-types test --filter=@allonfire/ui`
Expected: PASS.

- [x] **Step 5: Checkpoint.** `pnpm exec biome check --write packages/ui/src/components`.

---

### Task 5: AOFSidebar and AOFTabBar

**Files:**
- Create: `packages/ui/src/components/aof-sidebar.tsx`
- Create: `packages/ui/src/components/aof-tab-bar.tsx`
- Create: `packages/ui/src/components/tests/aof-sidebar.test.tsx`
- Create: `packages/ui/src/components/tests/aof-tab-bar.test.tsx`

**Interfaces:**
- Produces:
  - `AOFSidebarProvider` (shadcn's `SidebarProvider`, uncontrolled, `defaultOpen` true), `AOFSidebar` (collapses to icons on desktop; on a phone it renders nothing visible, since the tab bar replaces it), `AOFSidebarHeader`, `AOFSidebarContent`, `AOFSidebarFooter`, `AOFSidebarMenu`, `AOFSidebarMenuItem`, `AOFSidebarMenuButton`, `AOFSidebarTrigger`, `AOFSidebarInset`, and the hook `useAOFSidebar()` (`{ open, setOpen, state, isMobile }`). All client.
  - `AOFTabBar({ label: string; children: ReactNode } & ComponentPropsWithoutChildren<"nav">)`, a Server Component: a `<nav>` fixed to the bottom, phone only (`md:hidden`), padded for the iOS home indicator.
  - `AOF_TAB_BAR_CLEARANCE`: the class a page area adds so its last line clears the tab bar (Task 7).

- [x] **Step 1: Write the failing tests**

`aof-sidebar.test.tsx`:

```tsx
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFSidebar,
  AOFSidebarContent,
  AOFSidebarInset,
  AOFSidebarProvider,
} from "../aof-sidebar";

describe("AOFSidebar", () => {
  it("opens expanded and collapses to icons", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebar>
          <AOFSidebarContent>Sections</AOFSidebarContent>
        </AOFSidebar>
        <AOFSidebarInset>Page</AOFSidebarInset>
      </AOFSidebarProvider>
    );
    expect(html).toContain('data-state="expanded"');
    expect(html).toContain('data-collapsible=""');
    expect(html).toContain("Sections");
    expect(html).toContain("<main");
  });
});
```

`aof-tab-bar.test.tsx`:

```tsx
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOF_TAB_BAR_CLEARANCE, AOFTabBar } from "../aof-tab-bar";

describe("AOFTabBar", () => {
  it("is a named navigation fixed to the bottom, on a phone only", () => {
    const html = renderToStaticMarkup(
      <AOFTabBar label="Main menu">
        <a href="#home">Home</a>
      </AOFTabBar>
    );
    expect(html).toContain('<nav aria-label="Main menu"');
    expect(html).toContain("fixed");
    expect(html).toContain("md:hidden");
    expect(html).toContain("safe-area-inset-bottom");
  });

  it("names the clearance a page adds above it, on a phone only", () => {
    expect(AOF_TAB_BAR_CLEARANCE).toContain("md:pb-0");
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-sidebar.test.tsx src/components/tests/aof-tab-bar.test.tsx`
Expected: FAIL, cannot resolve `../aof-sidebar` and `../aof-tab-bar`.

- [x] **Step 3: Write the components**

`aof-sidebar.tsx`:

```tsx
"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@allonfire/shadcn/components/sidebar";
import type { ComponentProps } from "react";

/**
 * The desktop main menu: shadcn's sidebar, collapsing to its icons. On a
 * phone shadcn would open it as a drawer; the App's tab bar replaces it
 * there, so nothing opens it. Its state lives in the App (a URL param), not
 * in shadcn's cookie, which nothing reads.
 */
export const AOFSidebar = ({
  collapsible = "icon",
  ...props
}: ComponentProps<typeof Sidebar>) => (
  <Sidebar collapsible={collapsible} {...props} />
);

// ponytail: the other parts are shadcn's under AOF names, nothing added yet.
export {
  SidebarContent as AOFSidebarContent,
  SidebarFooter as AOFSidebarFooter,
  SidebarHeader as AOFSidebarHeader,
  SidebarInset as AOFSidebarInset,
  SidebarMenu as AOFSidebarMenu,
  SidebarMenuButton as AOFSidebarMenuButton,
  SidebarMenuItem as AOFSidebarMenuItem,
  SidebarProvider as AOFSidebarProvider,
  SidebarTrigger as AOFSidebarTrigger,
  useSidebar as useAOFSidebar,
};
```

If Task 1 picked a third-party sidebar, export its parts under the same AOF names here instead, so Tasks 7 and 8 stay unchanged.

`aof-tab-bar.tsx`:

```tsx
import type { ReactNode } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";

/**
 * The padding a page area adds on a phone so its last line clears the tab
 * bar and the iOS home indicator under it.
 */
export const AOF_TAB_BAR_CLEARANCE =
  "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0";

export type AOFTabBarProps = ComponentPropsWithoutChildren<"nav"> & {
  /** The links, one per Section. */
  children: ReactNode;
  /** The navigation's accessible name. */
  label: string;
};

/**
 * The phone's main menu: one link per Section, fixed to the bottom within a
 * thumb's reach, above the iOS home indicator. Hidden from `md` up, where
 * the sidebar takes over.
 */
export const AOFTabBar = ({
  children,
  className,
  label,
  ...props
}: AOFTabBarProps) => (
  <nav
    aria-label={label}
    className={cn(
      "fixed inset-x-0 bottom-0 z-20 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-stretch justify-around border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden",
      className
    )}
    {...props}
  >
    {children}
  </nav>
);
```

- [x] **Step 4: Run the ui tests**

Run: `pnpm turbo run check-types test --filter=@allonfire/ui`
Expected: PASS. If `data-collapsible=""` fails, read the rendered markup: shadcn sets `data-collapsible` to `""` when expanded and `"icon"` when collapsed; assert what the generated file renders and keep `data-state="expanded"`.

- [x] **Step 5: Checkpoint.** `pnpm exec biome check --write packages/ui/src/components`.

---

### Task 6: Sections, the Users and Storage pages, the proxy and the guard

**Files:**
- Modify: `apps/back-office/src/shared/constants/back-office.ts` (add `PAGE`)
- Create: `apps/back-office/src/features/navigation/constants/sections.ts`
- Create: `apps/back-office/src/features/navigation/tests/sections.test.ts`
- Create: `apps/back-office/src/app/[locale]/(signed-in)/users/page.tsx`
- Create: `apps/back-office/src/app/[locale]/(signed-in)/storage/page.tsx`
- Modify: `apps/back-office/src/proxy.ts:10-13`
- Modify: `apps/back-office/src/features/i18n/translations/en.json`, `it.json`

**Interfaces:**
- Consumes: `withSignInGate` with plain paths (Task 3), `AOFEmpty` (Task 4).
- Produces:
  - `BACK_OFFICE.PAGE.USERS`, `BACK_OFFICE.PAGE.STORAGE`.
  - `SECTION` (`HOME`, `USERS`, `STORAGE`), each `{ icon: LucideIcon; label: SectionLabel; path: string }`; `SECTIONS` (the list, in menu order); `sectionHref(path: string): string` (`""` becomes `/`); `isCurrentSection(pathname: string, path: string): boolean`.
  - Translations `Navigation.{home,users,storage,menu,toggleMenu,account,language,theme,signOut}`, `Navigation.role.{ADMIN,USER,VIEWER}`, `Users.empty.{title,description}`, `Storage.empty.{title,description}`.

- [x] **Step 1: Write the failing guard test**

`features/navigation/tests/sections.test.ts`:

```ts
// @module-tag unit
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import {
  isCurrentSection,
  SECTION,
  SECTIONS,
  sectionHref,
} from "../constants/sections";

const SIGNED_IN = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../app/[locale]/(signed-in)"
);
const PAGE_FILE = "page.tsx";
const GATED = "export default withAppSession(";

/** Every page under (signed-in), as the path it serves after the locale. */
const signedInPages = () =>
  readdirSync(SIGNED_IN, { encoding: "utf8", recursive: true })
    .filter((file) => basename(file) === PAGE_FILE)
    .map((file) => ({
      file: join(SIGNED_IN, file),
      path: dirname(file) === "." ? "" : `/${dirname(file)}`,
    }));

describe("Sections", () => {
  it("lists every signed-in page, and nothing else", () => {
    expect(signedInPages().map(({ path }) => path).sort()).toEqual(
      SECTIONS.map(({ path }) => path).sort()
    );
  });

  it("gates every signed-in page itself", () => {
    for (const { file } of signedInPages()) {
      expect(readFileSync(file, "utf8"), file).toContain(GATED);
    }
  });

  it("links Home to the root", () => {
    expect(sectionHref(SECTION.HOME.path)).toBe(METADATA.PATH.ROOT);
    expect(sectionHref(SECTION.USERS.path)).toBe(SECTION.USERS.path);
  });

  it("marks only the Section you are on, Home included", () => {
    const users = sectionHref(SECTION.USERS.path);
    expect(isCurrentSection(users, SECTION.USERS.path)).toBe(true);
    expect(isCurrentSection(users, SECTION.HOME.path)).toBe(false);
    expect(isCurrentSection(METADATA.PATH.ROOT, SECTION.HOME.path)).toBe(true);
  });
});
```

(`basename(file) === PAGE_FILE` already skips exFAT's `._page.tsx` sidecars.)

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/back-office exec vitest run src/features/navigation/tests/sections.test.ts`
Expected: FAIL, cannot resolve `../constants/sections`.

- [x] **Step 3: Add the paths and translations**

In `back-office.ts`, add to `BACK_OFFICE` (keys stay alphabetical):

```ts
  /** The Back Office's own Sections' paths, after the locale. */
  PAGE: {
    STORAGE: "/storage",
    USERS: "/users",
  },
```

In `en.json`, replace `"Home": { "description": ..., "signOut": ... }` with `"Home": { "description": "Nothing here yet." }` (Sign out moves to the account menu in Task 8) and add:

```json
"Navigation": {
  "account": "Account",
  "home": "Home",
  "language": "Language",
  "menu": "Main menu",
  "role": { "ADMIN": "Admin", "USER": "User", "VIEWER": "Viewer" },
  "signOut": "Sign out",
  "storage": "Storage",
  "theme": "Switch theme",
  "toggleMenu": "Collapse or expand the menu",
  "users": "Users"
},
"Storage": {
  "empty": {
    "description": "Images and other files arrive here with Storage's API.",
    "title": "No files yet"
  }
},
"Users": {
  "empty": {
    "description": "The list of Users and their Roles arrives with the Users API.",
    "title": "No Users yet"
  }
}
```

In `it.json`, the same keys:

```json
"Navigation": {
  "account": "Account",
  "home": "Home",
  "language": "Lingua",
  "menu": "Menu principale",
  "role": { "ADMIN": "Admin", "USER": "Utente", "VIEWER": "Visualizzatore" },
  "signOut": "Esci",
  "storage": "Archivio",
  "theme": "Cambia tema",
  "toggleMenu": "Comprimi o espandi il menu",
  "users": "Utenti"
},
"Storage": {
  "empty": {
    "description": "Immagini e altri file arriveranno qui con l'API di Archivio.",
    "title": "Ancora nessun file"
  }
},
"Users": {
  "empty": {
    "description": "L'elenco degli Utenti e dei loro Ruoli arriverà con l'API degli Utenti.",
    "title": "Ancora nessun Utente"
  }
}
```

Keep `it.json`'s `Home.description` and drop its `Home.signOut`. Run `pnpm i18n:check`: expected PASS.

- [x] **Step 4: Write the Sections list**

`features/navigation/constants/sections.ts`:

```ts
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { HardDrive, House, type LucideIcon, Users } from "lucide-react";
import type EN from "@/features/i18n/translations/en.json";
import { BACK_OFFICE } from "@/shared/constants/back-office";

/** A Section's name in `Navigation` (its menu label and page title). */
type SectionLabel = keyof Pick<
  (typeof EN)["Navigation"],
  "home" | "storage" | "users"
>;

type Section = { icon: LucideIcon; label: SectionLabel; path: string };

/**
 * The Back Office's Sections, in menu order: the sidebar, the tab bar and the
 * proxy's sign-in gate all read this one list, and a test checks that every
 * page under `(signed-in)` is in it and gates itself. A path follows the
 * locale; Home's is empty (`AUTH.PAGE.HOME`).
 */
export const SECTION = {
  HOME: { icon: House, label: "home", path: AUTH.PAGE.HOME },
  USERS: { icon: Users, label: "users", path: BACK_OFFICE.PAGE.USERS },
  STORAGE: { icon: HardDrive, label: "storage", path: BACK_OFFICE.PAGE.STORAGE },
} as const satisfies Record<string, Section>;

export const SECTIONS = objectValues(SECTION);

/** What a link to a Section points at: Home's empty path is the root. */
export const sectionHref = (path: string) => path || METADATA.PATH.ROOT;

/**
 * Whether `pathname` (next-intl's, without the locale) is that Section.
 * ponytail: exact match; a prefix match once a Section has pages under it,
 * never for Home, whose root would match everything.
 */
export const isCurrentSection = (pathname: string, path: string) =>
  pathname === sectionHref(path);
```

Before writing: check `objectValues` keeps declaration order (it is `Object.values` typed); the menu order is the object's key order.

- [x] **Step 5: Write the two pages**

`(signed-in)/users/page.tsx`:

```tsx
import { withAppSession } from "@allonfire/auth/features/next/components/with-app-session";
import { AOFEmpty } from "@allonfire/ui/components/aof-empty";
import { AOFPage } from "@allonfire/ui/components/aof-page";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { pageOpenGraph } from "@/features/metadata/utils/page-open-graph";
import { SECTION } from "@/features/navigation/constants/sections";

export const generateMetadata = async (): Promise<Metadata> => {
  const [t, locale] = await Promise.all([
    getTranslations("Navigation"),
    getLocale(),
  ]);
  return {
    openGraph: pageOpenGraph(SECTION.USERS.path, locale),
    title: t(SECTION.USERS.label),
  };
};

const UsersPage = () => {
  const t = useTranslations();
  return (
    <AOFPage as="section" className="gap-6 p-6">
      <h1 className="font-semibold text-2xl">
        {t(`Navigation.${SECTION.USERS.label}`)}
      </h1>
      <AOFEmpty
        description={t("Users.empty.description")}
        icon={<Users />}
        title={t("Users.empty.title")}
      />
    </AOFPage>
  );
};

export default withAppSession(UsersPage);
```

`(signed-in)/storage/page.tsx`: the same file with `HardDrive` for `Users`, `SECTION.STORAGE` for `SECTION.USERS`, `StoragePage` for `UsersPage`, and `Storage.empty.*` for `Users.empty.*`.

`AOFPage`'s `min-h-dvh` is the full window; inside the frame Task 7 lets the inset own the height, and Task 9 settles the page spacing.

- [x] **Step 6: Point the proxy at the list**

In `proxy.ts`, replace `import { AUTH } ...` (if nothing else uses it) and the `pages` option:

```ts
import { SECTIONS } from "./features/navigation/constants/sections";

// Routes the locale, renews the Session cookies, and sends a signed-out visit
// to a Section to Sign in before anything renders.
export default withSessionRefresh(
  withSignInGate(AOFCreateMiddleware(routing), {
    locales: routing.locales,
    pages: SECTIONS.map(({ path }) => path),
  })
);
```

- [x] **Step 7: Run the App's checks**

Run: `pnpm turbo run check-types test --filter=@allonfire/back-office` and `pnpm i18n:check`
Expected: PASS, the guard test included. The existing Home render test (if any reads `Home.signOut`) fails until Task 8; if one does, move its Sign out assertion into Task 8's account menu test now and delete it here.

- [x] **Step 8: Checkpoint.** `pnpm exec biome check --write apps/back-office/src`.

---

### Task 7: The frame

**Files:**
- Create: `apps/back-office/src/features/navigation/constants/navigation.ts`
- Create: `apps/back-office/src/features/navigation/components/sidebar-param.tsx`
- Create: `apps/back-office/src/features/navigation/components/section-link.tsx`
- Create: `apps/back-office/src/features/navigation/components/app-frame.tsx`
- Create: `apps/back-office/src/app/[locale]/(signed-in)/layout.tsx`
- Create: `apps/back-office/src/features/navigation/components/tests/sidebar-param.browser.test.tsx`
- Create: `apps/back-office/src/features/navigation/components/tests/app-frame.test.tsx`

**Interfaces:**
- Consumes: `AOFSidebar*`, `useAOFSidebar`, `AOFTabBar`, `AOF_TAB_BAR_CLEARANCE` (Task 5); `SECTIONS`, `sectionHref`, `isCurrentSection` (Task 6).
- Produces: `AppFrame({ account: ReactNode; children: ReactNode })` (server); `NAVIGATION.PARAM.SIDEBAR` and `sidebarParam` (the nuqs parser); `SidebarSectionLink` and `TabSectionLink` (client leaves: `{ href: string; path: string; label: string; children: ReactNode }`).

- [x] **Step 1: Write the failing browser test for the sidebar param**

`sidebar-param.browser.test.tsx`:

```tsx
// @module-tag integration
import {
  AOFSidebar,
  AOFSidebarProvider,
  AOFSidebarTrigger,
} from "@allonfire/ui/components/aof-sidebar";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { render } from "vitest-browser-react";
import { NAVIGATION } from "../../constants/navigation";
import { SidebarParam } from "../sidebar-param";

const TRIGGER = "Menu";

const renderAt = (search: string, onUrlUpdate = vi.fn()) =>
  render(
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate} searchParams={search}>
      <AOFSidebarProvider>
        <SidebarParam />
        <AOFSidebar>Sections</AOFSidebar>
        <AOFSidebarTrigger>{TRIGGER}</AOFSidebarTrigger>
      </AOFSidebarProvider>
    </NuqsTestingAdapter>
  );

const sidebarState = () =>
  document.querySelector("[data-state][data-collapsible]")?.getAttribute(
    "data-state"
  );

describe("SidebarParam", () => {
  it("opens the sidebar collapsed when the address says so", async () => {
    await renderAt(`?${NAVIGATION.PARAM.SIDEBAR}=false`);
    await expect.poll(sidebarState).toBe("collapsed");
  });

  it("writes the state to the address when the menu toggles", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const screen = await renderAt("", onUrlUpdate);
    await screen.getByRole("button", { name: TRIGGER }).click();
    await expect
      .poll(() => onUrlUpdate.mock.lastCall?.[0].queryString)
      .toBe(`?${NAVIGATION.PARAM.SIDEBAR}=false`);
  });

  it("falls back to open on a value it cannot read", async () => {
    await renderAt(`?${NAVIGATION.PARAM.SIDEBAR}=banana`);
    await expect.poll(sidebarState).toBe("expanded");
  });
});
```

The browser test runs at the Vitest browser's default viewport (desktop), so the sidebar renders as the desktop panel; if `data-collapsible` sits on a different element in the generated `sidebar.tsx`, select it by `[data-slot="sidebar"]` instead.

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/back-office exec vitest run --config vitest.browser.config.ts src/features/navigation/components/tests/sidebar-param.browser.test.tsx`
Expected: FAIL, cannot resolve `../../constants/navigation` and `../sidebar-param`.

- [x] **Step 3: Write the param and its sync**

`constants/navigation.ts`:

```ts
import { parseAsBoolean } from "nuqs";

/** The frame's state in the address. */
export const NAVIGATION = {
  PARAM: {
    /** `false` when the desktop sidebar is collapsed to its icons. */
    SIDEBAR: "sidebar",
  },
} as const;

/**
 * Open by default; the default never shows in the address, and a value it
 * cannot read counts as the default. Replaces the history entry: toggling
 * the menu is not a step Back should undo.
 */
export const sidebarParam = parseAsBoolean
  .withDefault(true)
  .withOptions({ clearOnDefault: true, history: "replace" });
```

`components/sidebar-param.tsx`:

```tsx
"use client";

import { useAOFSidebar } from "@allonfire/ui/components/aof-sidebar";
import { useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
import { NAVIGATION, sidebarParam } from "../constants/navigation";

/**
 * Keeps the sidebar and the address in step: on arrival the address opens or
 * collapses it, then each toggle writes the address. A leaf of its own, in
 * its own `<Suspense>`: reading the address renders on the client only, and
 * the frame around it stays in the static shell.
 * ponytail: the address leads only on arrival; Back after a toggle does not
 * move the sidebar, since toggles replace their history entry.
 */
export const SidebarParam = () => {
  const [param, setParam] = useQueryState(
    NAVIGATION.PARAM.SIDEBAR,
    sidebarParam
  );
  const { open, setOpen } = useAOFSidebar();
  const arrived = useRef(false);
  // The last value the address holds, so the second effect needs no `param`.
  const written = useRef(param);

  useEffect(() => {
    if (arrived.current) {
      return;
    }
    arrived.current = true;
    written.current = param;
    setOpen(param);
  }, [param, setOpen]);

  useEffect(() => {
    if (arrived.current && open !== written.current) {
      written.current = open;
      setParam(open);
    }
  }, [open, setParam]);

  return null;
};
```

- [x] **Step 4: Run the browser test**

Run: the Step 2 command. Expected: PASS on chromium and webkit.

- [x] **Step 5: Write the failing frame test**

`app-frame.test.tsx` (the frame is a Server Component using `useTranslations`; render it under `NextIntlClientProvider`, as the loading test does, with the App's navigation mocked):

```tsx
// @module-tag unit
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { SECTIONS } from "../../constants/sections";
import { AppFrame } from "../app-frame";

vi.mock("@/features/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => "/",
}));

const renderFrame = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={EN}>
      <AppFrame account={<span>Account</span>}>
        <p>Page</p>
      </AppFrame>
    </NextIntlClientProvider>
  );

describe("AppFrame", () => {
  it("names both menus and lists every Section in each", () => {
    const html = renderFrame();
    expect(html.match(new RegExp(`aria-label="${EN.Navigation.menu}"`, "g")))
      .toHaveLength(2);
    for (const { label } of SECTIONS) {
      expect(html.split(EN.Navigation[label]).length - 1).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the page clear of the phone's tab bar", () => {
    expect(renderFrame()).toContain("env(safe-area-inset-bottom)");
  });

  it("marks Home current on the root, and only Home", () => {
    expect(renderFrame().match(/aria-current="page"/g)).toHaveLength(2);
  });
});
```

Run: `pnpm --filter @allonfire/back-office exec vitest run src/features/navigation/components/tests/app-frame.test.tsx`
Expected: FAIL, cannot resolve `../app-frame`.

- [x] **Step 6: Write the Section links**

`components/section-link.tsx`:

```tsx
"use client";

import { AOFSidebarMenuButton } from "@allonfire/ui/components/aof-sidebar";
import type { ReactNode } from "react";
import { Link, usePathname } from "@/features/i18n/navigation";
import { isCurrentSection } from "../constants/sections";

export type SectionLinkProps = {
  /** The pictogram, rendered on the server: an element, not a component. */
  children: ReactNode;
  href: string;
  label: string;
  path: string;
};

/** A Section in the desktop sidebar; its label is the tooltip when collapsed. */
export const SidebarSectionLink = ({
  children,
  href,
  label,
  path,
}: SectionLinkProps) => {
  const current = isCurrentSection(usePathname(), path);
  return (
    <AOFSidebarMenuButton
      isActive={current}
      render={
        <Link aria-current={current ? "page" : undefined} href={href} />
      }
      tooltip={label}
    >
      {children}
      <span>{label}</span>
    </AOFSidebarMenuButton>
  );
};

/** A Section in the phone's tab bar: pictogram over label. */
export const TabSectionLink = ({
  children,
  href,
  label,
  path,
}: SectionLinkProps) => {
  const current = isCurrentSection(usePathname(), path);
  return (
    <Link
      aria-current={current ? "page" : undefined}
      className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:text-foreground [&_svg]:size-5"
      href={href}
    >
      {children}
      {label}
    </Link>
  );
};
```

`href` is a plain string: next-intl's `Link` under `typedRoutes` may ask for its route type. If `check-types` refuses `string`, type `href` with the `Link`'s own prop type (`ComponentProps<typeof Link>["href"]`) here and in `sectionHref`'s return, never a cast.

- [x] **Step 7: Write the frame and the layout**

`components/app-frame.tsx`:

```tsx
import {
  AOFSidebar,
  AOFSidebarContent,
  AOFSidebarFooter,
  AOFSidebarHeader,
  AOFSidebarInset,
  AOFSidebarMenu,
  AOFSidebarMenuItem,
  AOFSidebarProvider,
  AOFSidebarTrigger,
} from "@allonfire/ui/components/aof-sidebar";
import {
  AOF_TAB_BAR_CLEARANCE,
  AOFTabBar,
} from "@allonfire/ui/components/aof-tab-bar";
import { cn } from "@allonfire/ui/lib/utils";
import { useTranslations } from "next-intl";
import { type ReactNode, Suspense } from "react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { SECTIONS, sectionHref } from "../constants/sections";
import { SidebarParam } from "./sidebar-param";
import { SidebarSectionLink, TabSectionLink } from "./section-link";

export type AppFrameProps = {
  /** The account menu, rendered in the sidebar's footer and the top bar. */
  account: ReactNode;
  children: ReactNode;
};

/**
 * Every signed-in page's frame (ADR 0024): the sidebar on desktop, the top
 * bar and tab bar on a phone, both menus drawn from the one Sections list.
 * Static: it reads nothing of the request, so it is in the shell; the page
 * area under it checks the Session.
 */
export const AppFrame = ({ account, children }: AppFrameProps) => {
  const t = useTranslations("Navigation");
  return (
    <AOFSidebarProvider>
      <Suspense fallback={null}>
        <SidebarParam />
      </Suspense>
      <AOFSidebar>
        <AOFSidebarHeader>{BACK_OFFICE.NAME}</AOFSidebarHeader>
        <AOFSidebarContent>
          <nav aria-label={t("menu")}>
            <AOFSidebarMenu>
              {SECTIONS.map(({ icon: Icon, label, path }) => (
                <AOFSidebarMenuItem key={label}>
                  <SidebarSectionLink
                    href={sectionHref(path)}
                    label={t(label)}
                    path={path}
                  >
                    <Icon aria-hidden />
                  </SidebarSectionLink>
                </AOFSidebarMenuItem>
              ))}
            </AOFSidebarMenu>
          </nav>
        </AOFSidebarContent>
        <AOFSidebarFooter className="max-md:hidden">{account}</AOFSidebarFooter>
      </AOFSidebar>
      <AOFSidebarInset className={cn(AOF_TAB_BAR_CLEARANCE)}>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <AOFSidebarTrigger aria-label={t("toggleMenu")} className="max-md:hidden" />
          <span className="font-semibold md:hidden">{BACK_OFFICE.NAME}</span>
          <div className="ml-auto md:hidden">{account}</div>
        </header>
        {children}
      </AOFSidebarInset>
      <AOFTabBar label={t("menu")}>
        {SECTIONS.map(({ icon: Icon, label, path }) => (
          <TabSectionLink
            href={sectionHref(path)}
            key={label}
            label={t(label)}
            path={path}
          >
            <Icon aria-hidden />
          </TabSectionLink>
        ))}
      </AOFTabBar>
    </AOFSidebarProvider>
  );
};
```

`(signed-in)/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { AppFrame } from "@/features/navigation/components/app-frame";

// The frame is static and holds no data; each page checks the Session
// itself (ADR 0024). The account menu arrives in Task 8.
const SignedInLayout = ({ children }: { children: ReactNode }) => (
  <AppFrame account={null}>{children}</AppFrame>
);

export default SignedInLayout;
```

- [x] **Step 8: Run the checks**

Run: `pnpm turbo run check-types test test:browser --filter=@allonfire/back-office`
Expected: PASS. Then in the owner's running `pnpm dev`, open `/en` (signed in): the frame shows; `/en/users` and `/en/storage` show their empty states.

- [x] **Step 9: Checkpoint.** `pnpm exec biome check --write apps/back-office/src`.

---

### Task 8: The account menu, and Home without its Sign out

**Files:**
- Create: `apps/back-office/src/features/navigation/components/account.tsx`
- Create: `apps/back-office/src/features/navigation/components/account-menu.tsx`
- Create: `apps/back-office/src/features/navigation/components/tests/account-menu.browser.test.tsx`
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/layout.tsx`
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/page.tsx`

**Interfaces:**
- Consumes: `getSession` (Task 2), `AOFDropdownMenu*` (Task 4), `LanguageSwitch`'s link logic (`getPathname({ forcePrefix: true, href, locale })`), `AOFThemeToggle`, `signOut`.
- Produces: `Account()` (async Server Component); `AccountMenu({ name: string; role: string; labels: { account, language, theme, signOut }; signOutForm: string })` (client); the constant `NAVIGATION.FORM.SIGN_OUT` (the hidden form's id).

- [x] **Step 1: Write the failing browser test**

`account-menu.browser.test.tsx`:

```tsx
// @module-tag integration
import { NextIntlClientProvider } from "next-intl";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { AccountMenu } from "../account-menu";

vi.mock("@/features/i18n/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/i18n/navigation")>()),
  usePathname: () => "/users",
}));

const t = EN.Navigation;
const NAME = "Someone";

const renderMenu = () =>
  render(
    <NextIntlClientProvider locale="en" messages={EN}>
      <AccountMenu
        labels={{
          account: t.account,
          language: t.language,
          signOut: t.signOut,
          theme: t.theme,
        }}
        name={NAME}
        role={t.role.ADMIN}
        signOutForm="sign-out"
      />
    </NextIntlClientProvider>
  );

describe("AccountMenu", () => {
  it("opens from the keyboard and shows who is signed in", async () => {
    const screen = await renderMenu();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("menu")).toBeVisible();
    await expect.element(screen.getByText(t.role.ADMIN)).toBeVisible();
  });

  it("links each language to the same Section", async () => {
    const screen = await renderMenu();
    await screen.getByRole("button", { name: t.account }).click();
    await expect
      .element(screen.getByRole("menuitem", { name: "IT" }))
      .toHaveAttribute("href", "/it/users");
  });

  it("closes on Escape and gives focus back to its button", async () => {
    const screen = await renderMenu();
    const trigger = screen.getByRole("button", { name: t.account });
    await trigger.click();
    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("menu")).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it("signs out through the page's own form", async () => {
    const screen = await renderMenu();
    await screen.getByRole("button", { name: t.account }).click();
    await expect
      .element(screen.getByRole("menuitem", { name: t.signOut }))
      .toHaveAttribute("form", "sign-out");
  });
});
```

Run: `pnpm --filter @allonfire/back-office exec vitest run --config vitest.browser.config.ts src/features/navigation/components/tests/account-menu.browser.test.tsx`
Expected: FAIL, cannot resolve `../account-menu`.

- [x] **Step 2: Write the menu**

Add to `NAVIGATION` in `constants/navigation.ts`:

```ts
  FORM: {
    /** The account menu's Sign out submits this form, outside its popup. */
    SIGN_OUT: "sign-out",
  },
```

and use `NAVIGATION.FORM.SIGN_OUT` for `"sign-out"` in the test above.

`components/account-menu.tsx`:

```tsx
"use client";

import { AOFButton } from "@allonfire/ui/components/aof-button";
import {
  AOFDropdownMenu,
  AOFDropdownMenuContent,
  AOFDropdownMenuGroup,
  AOFDropdownMenuItem,
  AOFDropdownMenuLabel,
  AOFDropdownMenuSeparator,
  AOFDropdownMenuTrigger,
} from "@allonfire/ui/components/aof-dropdown-menu";
import { AOFThemeToggle } from "@allonfire/ui/components/aof-theme-toggle";
import { useLocale } from "next-intl";
import { getPathname, usePathname } from "@/features/i18n/navigation";
import { routing } from "@/features/i18n/routing";

export type AccountMenuProps = {
  labels: { account: string; language: string; signOut: string; theme: string };
  name: string;
  /** The User's Role in the Back Office, translated. */
  role: string;
  /** The id of the Sign out form the server rendered beside the menu. */
  signOutForm: string;
};

/**
 * Who is signed in, the language and theme, and Sign out, in one menu. Each
 * language is a plain link to the same Section (one server render, always
 * prefixed: see LanguageSwitch). Sign out submits a form the server rendered
 * outside the popup, so it works like any Server Action form.
 */
export const AccountMenu = ({
  labels,
  name,
  role,
  signOutForm,
}: AccountMenuProps) => {
  const pathname = usePathname();
  const locale = useLocale();
  return (
    <AOFDropdownMenu>
      <AOFDropdownMenuTrigger
        render={<AOFButton aria-label={labels.account} variant="ghost" />}
      >
        {name}
      </AOFDropdownMenuTrigger>
      <AOFDropdownMenuContent align="end">
        <AOFDropdownMenuGroup>
          <AOFDropdownMenuLabel>
            <span className="block font-medium text-foreground">{name}</span>
            <span className="block text-muted-foreground">{role}</span>
          </AOFDropdownMenuLabel>
        </AOFDropdownMenuGroup>
        <AOFDropdownMenuSeparator />
        <AOFDropdownMenuGroup>
          <AOFDropdownMenuLabel>{labels.language}</AOFDropdownMenuLabel>
          {routing.locales.map((language) => (
            <AOFDropdownMenuItem
              key={language}
              render={
                <a
                  aria-current={language === locale ? "true" : undefined}
                  href={getPathname({
                    forcePrefix: true,
                    href: pathname,
                    locale: language,
                  })}
                  lang={language}
                />
              }
            >
              {language.toUpperCase()}
            </AOFDropdownMenuItem>
          ))}
        </AOFDropdownMenuGroup>
        <AOFDropdownMenuItem
          closeOnClick={false}
          render={<AOFThemeToggle label={labels.theme} />}
        />
        <AOFDropdownMenuSeparator />
        <AOFDropdownMenuItem
          render={<button form={signOutForm} type="submit" />}
        >
          {labels.signOut}
        </AOFDropdownMenuItem>
      </AOFDropdownMenuContent>
    </AOFDropdownMenu>
  );
};
```

If the menu item rejects `closeOnClick`, check Base UI's `Menu.Item` props in `node_modules/@base-ui/react` and use its name for keeping the menu open; the theme item is the only one that stays open.

- [x] **Step 3: Run the browser test**

Run: the Step 1 command. Expected: PASS on chromium and webkit.

- [x] **Step 4: Write the server part and wire it**

`components/account.tsx`:

```tsx
import { getSession } from "@allonfire/auth/features/next/utils/session";
import {
  accessUserFrom,
  roleIn,
} from "@allonfire/database/features/auth/access/access";
import { App } from "@allonfire/database/enums";
import { getTranslations } from "next-intl/server";
import { NAVIGATION } from "../constants/navigation";
import { AccountMenu } from "./account-menu";

/**
 * The signed-in User's menu, read at request time behind the frame's own
 * `<Suspense>`: the same Session read as the page's check (`getSession` is
 * cached per request). Nothing for a visitor without one; the page redirects
 * them. Sign out submits the layout's form (`NAVIGATION.FORM.SIGN_OUT`): the
 * frame renders this menu twice (sidebar footer, phone top bar), and a form
 * here would repeat its id.
 */
export const Account = async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }
  const t = await getTranslations("Navigation");
  const role = roleIn(accessUserFrom(session.user), App.BACK_OFFICE);
  return (
    <AccountMenu
      labels={{
        account: t("account"),
        language: t("language"),
        signOut: t("signOut"),
        theme: t("theme"),
      }}
      name={session.user.name}
      role={role ? t(`role.${role}`) : ""}
      signOutForm={NAVIGATION.FORM.SIGN_OUT}
    />
  );
};
```

The Sign out form lives once in the layout. Final `(signed-in)/layout.tsx`:

```tsx
import { signOut } from "@allonfire/auth/features/next/actions/sign-out";
import { useLocale } from "next-intl";
import { type ReactNode, Suspense } from "react";
import { Account } from "@/features/navigation/components/account";
import { AppFrame } from "@/features/navigation/components/app-frame";
import { NAVIGATION } from "@/features/navigation/constants/navigation";

// The frame is static and holds no data; each page checks the Session
// itself, and the account menu reads it behind its own Suspense (ADR 0024).
const SignedInLayout = ({ children }: { children: ReactNode }) => {
  // Server Actions cannot read the route's locale yet; the form binds it.
  const signOutHere = signOut.bind(null, useLocale());
  return (
    <>
      <form action={signOutHere} id={NAVIGATION.FORM.SIGN_OUT} />
      <AppFrame
        account={
          <Suspense fallback={null}>
            <Account />
          </Suspense>
        }
      >
        {children}
      </AppFrame>
    </>
  );
};

export default SignedInLayout;
```

- [x] **Step 5: Trim Home**

In `(signed-in)/page.tsx` remove the Sign out form, `signOut`, `useLocale` and `AOFButton`; Home keeps its `h1` (`BACK_OFFICE.NAME`) and `t("description")`. Change `<AOFPage layout="centered">` to `<AOFPage as="section" layout="centered">` (the frame's inset is the `<main>`). Same `as="section"` stays in Users and Storage.

- [x] **Step 6: Run the checks**

Run: `pnpm turbo run check-types test test:browser --filter=@allonfire/back-office` and `pnpm i18n:check`
Expected: PASS. In the owner's `pnpm dev`, signed in: the account menu shows the name and "Admin"; IT switches to `/it/<same Section>`; Sign out lands on Sign in.

- [x] **Step 7: Checkpoint.** `pnpm exec biome check --write apps/back-office/src`.

---

### Task 9: Dress the frame with /aof-design (owner gates)

**Files:**
- Modify: `packages/ui/src/components/aof-sidebar.tsx`, `aof-tab-bar.tsx`, `aof-empty.tsx` (variants only, if the direction needs them)
- Modify: `apps/back-office/src/features/navigation/components/*.tsx`
- Modify: `apps/back-office/src/app/[locale]/(signed-in)/{page,loading}.tsx`, `users/page.tsx`, `storage/page.tsx`
- Modify: `packages/design/src/designs/japan/theme.css` (tokens only, if new ones are needed) and `packages/design/src/designs/japan/tests/theme.test.ts` (each new text-on-surface pair)

**Interfaces:**
- Consumes: everything from Tasks 4 to 8. Structure, props and tests stay; this task changes how they look.

- [x] **Step 1: Direction.** Run `/aof-design shape apps/back-office/src/features/navigation/components/app-frame.tsx --app back-office`. Before building anything, give the owner two or three previews (AskUserQuestion with `preview` ASCII mockups) of how the frame wears the Japan Design: for example the sidebar as a line map with each Section a station on the Back Office's line colour (`BACK_OFFICE.LINE`), the tab bar as platform signs, the top bar as the station sign band. Respect the owner's taste in `.claude/skills/aof-design/SKILL.md` (restraint, no large illustration, motion only on entry or state change, every corner from `--radius`). Record the pick in the spec's "Decisions" table.

- [x] **Step 2: Build.** Apply the picked direction to the frame, the Section links, the account menu, the empty states and the three pages, through `/aof-design` (direct mode). Loading (`(signed-in)/loading.tsx`) now renders inside the frame's page area: make it fill the inset, not the window.

- [x] **Step 3: One screenshot round.** Through `/iso-browser` in the owner's tab on `localhost:3400`: Home, Users and Storage at 390 wide and desktop, light and dark, the sidebar expanded and collapsed, the account menu open. Confirm the tab bar never covers the last line of a page on the phone. Fix what the round shows, reset the emulation, stop.

- [x] **Step 4: Run the checks**

Run: `pnpm design:sync --check`, `pnpm --filter @allonfire/design test`, `pnpm turbo run check-types test test:browser --filter=@allonfire/ui --filter=@allonfire/back-office`
Expected: PASS.

- [x] **Step 5: Checkpoint.** `pnpm exec biome check --write` on the touched files.

---

### Task 10: End to end, docs, and the final checks

**Files:**
- Modify: `apps/back-office/e2e/pages.ts`
- Create: `apps/back-office/e2e/frame.spec.ts`
- Modify: `apps/back-office/e2e/sign-in.spec.ts:76-86` (Sign out moved to the account menu)
- Modify: `CLAUDE.md` (the Back Office bullets under "Server-Side Rendering First")
- Modify: `.claude/skills/aof-design/SKILL.md` (the Japan Design's frame, once Task 9 settles it)
- Modify: `apps/back-office/README.md` (routes) if it lists them

**Interfaces:**
- Consumes: the whole frame.

- [x] **Step 1: Write the e2e spec**

Extract `signIn` from `sign-in.spec.ts` into `e2e/pages.ts` (export it beside `SIGN_IN_URL`) and import it in both specs. Then `frame.spec.ts`:

```ts
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { expect, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { SECTION } from "../src/features/navigation/constants/sections";
import { SIGN_IN_URL, signIn } from "./pages";

const t = EN.Navigation;

test("moves between the Sections and marks the one you are on", async ({
  page,
}) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  const menu = page.getByRole("navigation", { name: t.menu }).filter({
    visible: true,
  });
  for (const section of [SECTION.USERS, SECTION.STORAGE, SECTION.HOME]) {
    await menu.getByRole("link", { name: t[section.label] }).click();
    await expect(page).toHaveURL(new RegExp(`${section.path}$`));
    await expect(
      menu.getByRole("link", { name: t[section.label] })
    ).toHaveAttribute("aria-current", "page");
    await expect(menu.locator('[aria-current="page"]')).toHaveCount(1);
  }
});

test("switching language stays on the Section", async ({ page }) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await page.goto(SECTION.USERS.path);
  await page.getByRole("button", { name: t.account }).filter({ visible: true }).click();
  await page.getByRole("menuitem", { name: "IT" }).click();
  await expect(page).toHaveURL(new RegExp(`/it${SECTION.USERS.path}$`));
});

test("signs out from the account menu", async ({ page }) => {
  await signIn(page, FIXTURE.USER.BACK_OFFICE.ADMIN);
  await page.getByRole("button", { name: t.account }).filter({ visible: true }).click();
  await page.getByRole("menuitem", { name: t.signOut }).click();
  await expect(page).toHaveURL(SIGN_IN_URL);
});

test("a signed-out visit to a Section is sent to Sign in before any page", async ({
  request,
}) => {
  for (const section of [SECTION.USERS, SECTION.STORAGE]) {
    const response = await request.get(`/it${section.path}`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(HTTP.STATUS.TEMPORARY_REDIRECT);
  }
});
```

The first test uses whichever menu is visible (sidebar on the desktop projects, tab bar on the phone ones), so one test covers both. In `sign-in.spec.ts`, change the Sign out test to open the account menu and click `t.signOut` as above.

- [ ] **Step 2: Run e2e** (not run: port 3410 was held by another session's server; the owner chose to run it later)

Run: `pnpm --filter @allonfire/back-office test:e2e`
Expected: PASS on `chromium`, `webkit`, `mobile-chrome` and `mobile-safari`.

- [x] **Step 3: Docs**

In `CLAUDE.md`, under the Back Office bullets, add:

```md
  - the signed-in frame is `(signed-in)/layout.tsx` (ADR 0024): static, drawn from the App's Sections (`features/navigation/constants/sections`), which the proxy's sign-in gate and a guard test also read. A new Section is one row there plus its page, `export default withAppSession(Page)`; its UI state is a typed nuqs param read on the client, never a cookie the server reads
```

In `.claude/skills/aof-design/SKILL.md`'s "Japan Design (Back Office)" list, add one line describing the frame as Task 9 built it.

- [x] **Step 4: Final checks**

Run, from the repo root:
- `pnpm exec biome check --write <every file this plan touched>`
- `pnpm turbo run check-types test test:browser`
- `pnpm lint`
- `pnpm i18n:check`
- `pnpm design:sync --check`
- `pnpm --filter @allonfire/back-office build` with `.env.development` exported: the build lists `/en/users` and `/en/storage` as partial prerenders (◐) with the frame in their shell (`grep 'aria-label="Main menu"' .next/server/app/en/users.html`).

Expected: all PASS.

- [x] **Step 5: Checkpoint.** Report to the owner what changed and what the build shows. The owner commits with `/iso-commit`.

## Implementation Log
- Implemented: 2026-10-16T18:28:09+02:00
- Workspace: current-branch — feat/back-office-special-pages (alongside the PWA session, by the owner's choice)
- Committed: no — awaiting user review
- Deviations from the plan:
  - Library pick (Task 1): official shadcn; the survey's paid blocks dropped, Shadcn Studio's free tier looked at and dropped. `aof-design` gained a "Library survey" section (free only, every candidate opened in the owner's browser).
  - Direction (Task 9): the owner pointed at React Bits' Branched Menu; the sidebar is drawn as the App's line (trunk, curved branches, the way to the current Section drawn in Line Green, 410ms), built in the App with links and a focus ring, not installed. The phone's current tab is marked by the line along its top.
  - `loading.tsx` is gone: a route group's boundary sits above where sibling Sections diverge, so a soft navigation between them waited on the Session check outside any `<Suspense>` (the dev validation error on `/[locale]/storage`). `withAppSession(Page, fallback)` now wraps each page in its own boundary; the App's `signedInPage(Page)` passes `SectionLoading`.
  - nuqs's `parseAsBoolean` reads any unknown value as `false`; the sidebar param uses a strict parser (Review Focus 3 caught it).
  - Biome sorts object keys, so `SECTIONS` is an explicit tuple (the menu came out Home, Storage, Users).
  - The auth session tests mock `readVisitorHeaders`: the PWA work gives `packages/core` its own copy of `next`, which the `next/headers` mock does not reach. `sign-out.test.ts` (2 cases) still fails for that reason, outside this plan.
- Not verified here: e2e (`e2e/frame.spec.ts`, the updated Sign out test in `sign-in.spec.ts`); the PWA install banner covers the phone tab bar and needs to sit above it.
