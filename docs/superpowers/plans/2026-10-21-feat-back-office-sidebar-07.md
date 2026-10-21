# Back Office sidebar-07 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Back Office's signed-in frame with shadcn's `sidebar-07` (a sidebar that collapses to icons, a drawer on a phone, no tab bar), with an App switcher, a NavUser-style account menu and a breadcrumb header.

**Status:** implemented (uncommitted) @ 2026-10-21T09:30:20Z

**Architecture:** `packages/ui` gains thin AOF wrappers over the shadcn primitives the block uses and loses `AOFTabBar`. The Back Office's `features/navigation` rebuilds `AppFrame` on them: static frame (ADR 0024), the switcher and account menu each read the Session behind their own `<Suspense>`, the open state stays in `?sidebar` (nuqs).

**Tech Stack:** Next 16 App Router, React 19, shadcn `base-nova` (Base UI), Tailwind v4, next-intl, nuqs, Vitest (unit + browser), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-21-back-office-sidebar-07-design.md`

## Global Constraints

- The look is shadcn's own, wearing only the theme's tokens: no Japan dressing, no custom SVG, no arbitrary radius.
- Never edit `packages/shadcn`; never import `@allonfire/shadcn` outside `packages/ui`; AOF components are `AOF`-prefixed in `packages/ui/src/components/aof-<name>.tsx`.
- The frame reads no Session (ADR 0024); the sidebar's state is `?sidebar=false` via `SidebarParam`, never shadcn's cookie.
- Switcher lists only `enterableApps(user)`, each with a known address; `LAURA_URL` optional, empty counts as unset; not added to `docker-compose.prod.yml`.
- Names exact: "Back Office", "Laura", "AllOnFire" (`BRAND.NAME`); a name is never a translation.
- No `as` casts except `as const`; no biome-ignore; `objectValues`/`objectEntries` helpers; lookup tables `as const satisfies Record<K, V>`; cva + `cn`; files ≤300 lines; `"use client"` only on the leaf that needs it.
- Every test file starts `// @module-tag unit` or `// @module-tag integration` (browser tests: `integration`); Vitest globals.
- Never commit; `/iso-commit` only.
- End: scoped `pnpm exec biome check --write`, then `pnpm check-types`, `pnpm lint`, `pnpm test`, Back Office `test:browser` and `test:e2e`.

## Review Focus

1. Phone: tapping a Section in the drawer navigates **and** closes the drawer (Task 5 test).
2. A User allowed into the Back Office only sees one switcher entry, the current App, marked; nothing breaks with `LAURA_URL` unset (Task 2 and 3 tests).
3. Collapsed desktop sidebar: each Section, the switcher and the account trigger stay reachable by keyboard with a tooltip or accessible name (Task 5 test: `getByRole("link", { name })` while `?sidebar=false`).
4. Sign out still submits the layout's form from the account menu inside the phone drawer (Task 6 e2e on `mobile-chrome`/`mobile-safari`).
5. A toast at the bottom (Install hint) on a phone sits at `--gutter-bottom`, not above a missing tab bar (Task 1 test on `AOFToaster` offsets).

---

### Task 1: ui primitives in, tab bar out

**Files:**
- Create: `packages/ui/src/components/aof-breadcrumb.tsx`, `aof-separator.tsx`, `aof-avatar.tsx`, tests `packages/ui/src/components/tests/aof-breadcrumb.test.tsx`, `aof-avatar.test.tsx`
- Modify: `packages/ui/src/components/aof-sidebar.tsx`, `aof-toaster.tsx`, `tests/aof-toaster.test.tsx`, `packages/ui/src/styles/base.css` (lines 23-31), `packages/ui/package.json` (exports)
- Delete: `packages/ui/src/components/aof-tab-bar.tsx`, `tests/aof-tab-bar.test.tsx` (and their export lines)

**Interfaces:**
- Produces: `AOFBreadcrumb`, `AOFBreadcrumbList`, `AOFBreadcrumbItem`, `AOFBreadcrumbLink`, `AOFBreadcrumbPage`, `AOFBreadcrumbSeparator`; `AOFSeparator`; `AOFAvatar`, `AOFAvatarFallback`; from `aof-sidebar`: add `AOFSidebarGroup`, `AOFSidebarRail` to the existing exports. All are shadcn's under AOF names (`ponytail:` comment as in `aof-sidebar.tsx`).

- [x] **Step 1: Failing tests.** `aof-breadcrumb.test.tsx`: "renders a trail with the current page marked": render List > Item > Link `href="/"` "Back Office", Separator, Item > Page "Users"; expect `getByRole("navigation", { name: "breadcrumb" })`, link "Back Office", `getByText("Users")` with `aria-current="page"`. `aof-avatar.test.tsx`: "shows the fallback initial": `<AOFAvatar><AOFAvatarFallback>A</AOFAvatarFallback></AOFAvatar>` shows "A". `aof-toaster.test.tsx`: add "offsets the bottom by the page's edge only": the rendered region's style/`mobileOffset` bottom is `var(--gutter-bottom, 1.5rem)` (assert on the `--mobile-offset-bottom` / `--offset-bottom` custom property Sonner writes on the `ol`).
- [x] **Step 2:** `pnpm --filter @allonfire/ui test` — Expected: FAIL (modules missing; toaster offset still `--toast-bottom`).
- [x] **Step 3:** Add the three wrapper files and the two sidebar exports; set `AOFToaster`'s `EDGES.bottom` to `"var(--gutter-bottom, 1.5rem)"` and drop its tab-bar comment; delete `--tab-bar-height` and the `:has([data-slot="tab-bar"])` block from `base.css`; delete `aof-tab-bar.tsx` and its test; rewrite `AOFSidebar`'s comment (on a phone shadcn opens it as a drawer from `AOFSidebarTrigger`). Add one export line per new file in `packages/ui/package.json`, remove the tab bar's.
- [x] **Step 4:** `pnpm --filter @allonfire/ui test && pnpm --filter @allonfire/ui check-types` — Expected: PASS. (`apps/back-office` will not compile until Task 5; that is expected.)

### Task 2: App catalogue and `LAURA_URL`

**Files:**
- Create: `apps/back-office/src/features/navigation/constants/apps.ts`, `apps/back-office/src/features/navigation/tests/apps.test.ts`
- Modify: `apps/back-office/src/environment/environment.ts`, `apps/back-office/.env.example`, `packages/config/local/tests/local-files.test.ts` (the Back Office `.env.example` row, near line 46)

**Interfaces:**
- Produces:
  - `APP_ENTRY` — `as const satisfies Record<App, { icon: LucideIcon | null; name: string }>`: `BACK_OFFICE: { icon: null, name: BACK_OFFICE.NAME }` (null: drawn with the Back Office's square logo), `LAURA: { icon: Images, name: "Laura" }`.
  - `type SwitcherApp = { app: App; current: boolean; href: string; icon: LucideIcon | null; name: string }`
  - `switcherApps(apps: readonly App[], addresses: Partial<Record<App, string>>, current: App): SwitcherApp[]` — keeps `apps` order of `objectValues(App)`, drops an App with no address unless it is `current`, whose `href` is `METADATA.PATH.ROOT`.
  - `env.LAURA_URL: string | undefined`.

- [x] **Step 1: Failing test** `apps.test.ts` (`// @module-tag unit`):
  - "lists only the Apps given, the current one at the root": `switcherApps([App.BACK_OFFICE, App.LAURA], { [App.LAURA]: LOCAL.URL.LAURA }, App.BACK_OFFICE)` equals two entries; Back Office `{ current: true, href: METADATA.PATH.ROOT }`, Laura `{ current: false, href: LOCAL.URL.LAURA, name: "Laura" }`.
  - "drops an App with no address": same with `{}` → only Back Office.
  - "drops an App the User cannot enter": `switcherApps([App.BACK_OFFICE], { [App.LAURA]: LOCAL.URL.LAURA }, App.BACK_OFFICE)` → only Back Office.
  - `local-files.test.ts`: the Back Office `.env.example` row also expects `` `LAURA_URL="${LOCAL.URL.LAURA}"` ``.
- [x] **Step 2:** `pnpm --filter @allonfire/back-office test -- apps && pnpm --filter @allonfire/config test` — Expected: FAIL (module missing; line missing).
- [x] **Step 3:** Write `apps.ts`; in `environment.ts` add `LAURA_URL: z.url().optional()` under `server` with a doc comment (Laura's public address, for the App switcher; unset hides Laura) and `emptyStringAsUndefined: true` on `createEnv`; add `LAURA_URL="http://localhost:3200"` with a comment to `.env.example`.
- [x] **Step 4:** same command — Expected: PASS.

### Task 3: App switcher

**Files:**
- Create: `apps/back-office/src/features/navigation/components/app-switcher.tsx` (server: reads the Session), `app-switcher-menu.tsx` (`"use client"`), `app-tile.tsx` (the logo or icon tile, server-safe), `tests/app-switcher-menu.browser.test.tsx`
- Modify: `apps/back-office/src/features/i18n/translations/en.json`, `it.json` (`Navigation.apps`: "Apps" / "App"; `Navigation.switchApp`: "Switch App" / "Cambia App")

**Interfaces:**
- Consumes: `switcherApps`, `SwitcherApp`, `APP_ENTRY` (Task 2); `AOFDropdownMenu*`, `AOFSidebarMenu`, `AOFSidebarMenuItem`, `AOFSidebarMenuButton`, `useAOFSidebar` (Task 1 / existing).
- Produces:
  - `AppSwitcher` (async Server Component, no props): `getSession()`, `enterableApps(accessUserFrom(session.user))`, `switcherApps(..., { [App.LAURA]: env.LAURA_URL }, App.BACK_OFFICE)`; `null` session renders `<CurrentApp />`.
  - `CurrentApp` (Server Component, exported from `app-switcher.tsx`): the static trigger look (tile, `BACK_OFFICE.NAME`, `BRAND.NAME`), no menu — the `<Suspense>` fallback.
  - `AppSwitcherMenu({ apps: SwitcherApp[]; labels: { apps: string; switchApp: string } })`: the block's `TeamSwitcher` — `size="lg"` trigger with `aria-label={labels.switchApp}`, tile, name, `BRAND.NAME`, `ChevronsUpDown`; content `side={isMobile ? "bottom" : "right"}` `align="start"`, a `labels.apps` label, one `AOFDropdownMenuItem render={<a href />}` per App, the current one `aria-current="page"`.
  - `AppTile({ app: App; size: "sm" | "md" })`: cva variant `size-6`/`size-8`; logo `AOFImage` pair (the `LOGOS` light/dark logic moved from `app-frame.tsx`) when `icon` is null, else the lucide icon in a `bg-sidebar-primary text-sidebar-primary-foreground rounded-lg` tile.

- [x] **Step 1: Failing browser test** (`// @module-tag integration`, wrapped in `NextIntlClientProvider` with `en.json` and `AOFSidebarProvider`):
  - "opens from the keyboard and lists the Apps given": focus the `Switch App` button, press Enter; menuitems "Back Office" and "Laura"; Laura's `href` is `LOCAL.URL.LAURA`.
  - "marks the current App": "Back Office" item has `aria-current="page"`, Laura none.
  - "shows only the current App when it is the only one": `apps` = Back Office only → one menuitem.
- [x] **Step 2:** `pnpm --filter @allonfire/back-office test:browser -- app-switcher` — Expected: FAIL (module missing).
- [x] **Step 3:** Implement the three files and the translations; `pnpm i18n:check`.
- [x] **Step 4:** same command — Expected: PASS, Chromium and WebKit.

### Task 4: Account menu as NavUser

**Files:**
- Modify: `apps/back-office/src/features/navigation/components/account-menu.tsx`, `account.tsx`, `tests/account-menu.browser.test.tsx`

**Interfaces:**
- Consumes: `AOFAvatar`, `AOFAvatarFallback` (Task 1); `AOFSidebarMenu*`, `useAOFSidebar`.
- Produces: `AccountMenuProps` gains `email: string`; `AccountPlaceholder` (exported from `account.tsx`): a `size="lg"`-tall empty `AOFSidebarMenuButton`-sized block (`h-12`), the `<Suspense>` fallback.

- [x] **Step 1: Failing test** — update "opens from the keyboard and shows who is signed in": the trigger shows the name and the email (`FIXTURE.USER.BACK_OFFICE.ADMIN`'s, from the test's props); the opened menu's label shows name, email and Role "Admin". Keep the language, Escape and Sign out tests unchanged.
- [x] **Step 2:** `pnpm --filter @allonfire/back-office test:browser -- account-menu` — Expected: FAIL (no email).
- [x] **Step 3:** Rebuild the trigger as the block's `NavUser` (`AOFSidebarMenu` > `Item` > `DropdownMenuTrigger render={<AOFSidebarMenuButton size="lg" className="aria-expanded:bg-muted" aria-label={labels.account} />}`, `AOFAvatar` with the initial, name over email, `ChevronsUpDown`); content `side={isMobile ? "bottom" : "right"}` `align="end"`; the label gains the avatar, the email and the Role. Drop the `max-md:` classes and the "renders twice" comment; `account.tsx` passes `session.user.email`.
- [x] **Step 4:** same command — Expected: PASS.

### Task 5: The frame

**Files:**
- Create: `apps/back-office/src/features/navigation/components/frame-breadcrumb.tsx` (`"use client"`), `close-drawer-on-navigate.tsx` (`"use client"`), `tests/frame-breadcrumb.browser.test.tsx`
- Modify: `app-frame.tsx` (rewrite), `section-link.tsx` (keep only `SidebarSectionLink`, plain), `tests/app-frame.test.tsx`, `apps/back-office/src/app/[locale]/(signed-in)/layout.tsx`

**Interfaces:**
- Consumes: Tasks 1, 3, 4.
- Produces:
  - `AppFrame({ account: ReactNode; switcher: ReactNode; children: ReactNode })`: the block's `page.tsx` + `app-sidebar.tsx` — `AOFSidebarProvider` > `SidebarParam` (in its `<Suspense>`), `CloseDrawerOnNavigate`, `AOFSidebar` (header: `switcher`; content: `AOFSidebarGroup` > `<nav aria-label={t("menu")}>` > `AOFSidebarMenu` of `SidebarSectionLink`; footer: `account`; `AOFSidebarRail`), `AOFSidebarInset` > `header` (`flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12`, `AOFSidebarTrigger aria-label={t("toggleMenu")} className="-ml-1"`, vertical `AOFSeparator`, `FrameBreadcrumb`) then `children`. No `AOF_TAB_BAR_CLEARANCE`.
  - `SidebarSectionLink({ children, label, path })`: `AOFSidebarMenuButton isActive tooltip={label} render={<Link aria-current href />}`, icon then `<span>{label}</span>`; no `last`, no `Branch`.
  - `FrameBreadcrumb({ home: string; labels: Record<SectionLabel, string> })`: reads `usePathname()`; trail `BACK_OFFICE.NAME` (link to `sectionHref(SECTION.HOME.path)`, `hidden md:block`, with its separator) › current Section's label as `AOFBreadcrumbPage`; on Home the single crumb `labels.home`.
  - `CloseDrawerOnNavigate()`: on `usePathname()` change calls `setOpenMobile(false)` from `useAOFSidebar`; renders null.
  - Layout passes `switcher={<Suspense fallback={<CurrentApp />}><AppSwitcher /></Suspense>}` and `account`'s fallback `<AccountPlaceholder />`.

- [x] **Step 1: Failing tests.**
  - `app-frame.test.tsx` (unit): "names the menu and lists every Section once" (one `navigation` named `t.menu`, one link per Section); "has the menu button and no tab bar" (button `t.toggleMenu`; no element `[data-slot="tab-bar"]`); keep "marks Home current on the root, and only Home"; delete "keeps the page clear of the phone's tab bar".
  - `frame-breadcrumb.browser.test.tsx`: "shows the App then the Section" on `/users` (link "Back Office", current "Users"); "shows one crumb on Home"; "keeps every Section reachable while collapsed" — render `AppFrame` with the sidebar collapsed, each Section `getByRole("link", { name })` present; "closes the phone drawer on navigation" — at 390px width, open with the trigger, click "Users", the drawer (`role="dialog"`) is gone.
- [x] **Step 2:** `pnpm --filter @allonfire/back-office test -- app-frame && pnpm --filter @allonfire/back-office test:browser -- frame-breadcrumb` — Expected: FAIL.
- [x] **Step 3:** Implement; move the `LOGOS` logic out of `app-frame.tsx` (now in `app-tile.tsx`); wire the layout.
- [x] **Step 4:** same command, then `pnpm --filter @allonfire/back-office check-types` — Expected: PASS.

### Task 6: e2e and docs

**Files:**
- Modify: `apps/back-office/e2e/frame.spec.ts`, `docs/adr/0024-the-signed-in-frame-is-static-and-each-page-gates-itself.md`, `CLAUDE.md` (the signed-in frame bullet), `packages/ui` README if it lists `AOFTabBar` (none found; skip if absent)

- [x] **Step 1: e2e.** `menuOf(page)`: when the menu button is visible and the sidebar `nav` is not, click `t.toggleMenu` first (the phone's drawer). Add "the App switcher shows the Back Office" (open `Switch App`, menuitem "Back Office" with `aria-current="page"`). Existing tests stay; Sign out runs from the drawer on the phone projects.
- [x] **Step 2:** `pnpm --filter @allonfire/back-office test:e2e -- frame` — Expected: PASS on `chromium`, `webkit`, `mobile-chrome`, `mobile-safari` (dev server on 3400 is the owner's; e2e uses 3410).
- [x] **Step 3: Docs.** ADR 0024: "the main menu, the top bar and the phone tab bar" becomes "the main menu (a sidebar that collapses to icons, a drawer on a phone) and the header"; the account menu and App switcher each read the Session behind their own `<Suspense>`. CLAUDE.md frame bullet: add "shadcn's `sidebar-07`: App switcher, Sections, account menu; no tab bar". CONTEXT.md already carries **App switcher**.
- [x] **Step 4: Final checks.** Scoped `pnpm exec biome check --write <touched files>`, `pnpm --filter @allonfire/back-office tailwind:fix`, then `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm --filter @allonfire/back-office test:browser` — Expected: all green. One screenshot round in the owner's tab (`localhost:3400`, phone 390 and desktop, light and dark) through `/iso-browser`.

## Implementation Log
- Implemented: 2026-10-21T09:30:20Z
- Workspace: no-branch — dev
- Committed: no — awaiting user review
