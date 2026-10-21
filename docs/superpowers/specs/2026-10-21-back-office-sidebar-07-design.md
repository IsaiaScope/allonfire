# Back Office navigation: shadcn's sidebar-07 (design)

## Intent

The owner does not like the signed-in frame's current design (the tree
lines beside the links, the phone's top bar and bottom tab bar) and wants it
removed and replaced with shadcn's `sidebar-07` block, "a sidebar that
collapses to icons" (https://ui.shadcn.com/blocks/sidebar#sidebar-07), on
every screen size. On a phone there is no bottom bar: the same sidebar opens
as a drawer from the header's menu button, as the block does.

The look is shadcn's own, wearing only the Japan Design's tokens (colours,
`--radius`) through the theme: "exactly like shadcn for now, then we build
on top". No station furniture, no custom dressing.

## Goals

- The frame is `sidebar-07`'s layout: `Sidebar collapsible="icon"` with a
  header (App switcher), content (the Sections), footer (the account menu)
  and `SidebarRail`; a `SidebarInset` whose header holds `SidebarTrigger`, a
  vertical `Separator` and a `Breadcrumb`.
- **App switcher** (the block's `TeamSwitcher`), in the sidebar's header:
  the trigger shows the current App (the Back Office's square logo, its
  name, and `BRAND.NAME` "AllOnFire" as the second line, where the block
  shows the plan) with the `ChevronsUpDown` icon; the menu lists the
  AllOnFire Apps the signed-in User is allowed into (`enterableApps(user)`),
  each a plain link to that App's address, the current one marked. Opens to
  the right on desktop, below on a phone (`isMobile`). No "Add team" item,
  no keyboard shortcuts.
- **Sections** (the block's `NavMain`, without `Collapsible`): one
  `SidebarGroup` with Home, Users and Storage from `SECTIONS`, each a
  `SidebarMenuButton` link with its icon and `tooltip` (its name, shown when
  collapsed), the current one `isActive` and `aria-current="page"`. The
  group stays inside the `<nav aria-label={t("menu")}>`. No group label
  (the block's "Platform" label is left out, owner-agreed).
- **Account menu** (the block's `NavUser`), in the sidebar's footer: a
  `size="lg"` `SidebarMenuButton` trigger with an `Avatar` whose fallback is
  the name's initial, the name and, as the second line, the email (as the
  block), and `ChevronsUpDown`. The menu keeps today's content: the identity
  label (avatar, name, email, and the User's Role in the Back Office under
  them), language links, the theme switch, Sign out (the layout's form). Opens right on
  desktop, below on a phone.
- **Header**: `SidebarTrigger`, a vertical `Separator`, then the
  `Breadcrumb`: "Back Office" (a link to Home) › the current Section's name
  (`BreadcrumbPage`); on a phone only the Section's name, as the block hides
  the first crumb below `md`. On Home the trail is the one crumb "Home"
  (my call). The breadcrumb is a small client leaf reading `usePathname`,
  as `SidebarSectionLink` does, so the frame stays static. The header shrinks from `h-16` to `h-12` when the sidebar is
  collapsed, as in the block.
- **Phone**: shadcn's own mobile sidebar (a `Sheet`), opened by the header's
  `SidebarTrigger`. shadcn's `Sheet` does not close when a link is tapped
  (only the trigger calls `setOpenMobile`), so a small client step closes it
  on navigation.

## Removed

- `AOFTabBar`, `AOF_TAB_BAR_CLEARANCE` and their test
  (`packages/ui/src/components/aof-tab-bar.tsx`, `tests/aof-tab-bar.test.tsx`).
- `base.css`'s `--tab-bar-height` and the `--toast-bottom` rule that lifts
  toasts above the tab bar; `AOFToaster`'s bottom offset goes back to
  `var(--gutter-bottom, 1.5rem)`.
- `TabSectionLink` and the `Branch` tree-line SVG in `section-link.tsx`.
- The phone's top bar with its own account button; the account menu now
  renders once (the sidebar's footer), so the comment about rendering it
  twice goes.

## Kept

- The frame stays static (ADR 0024): it reads no Session; each page checks
  it. The switcher and the account menu read the Session at request time,
  each behind its own `<Suspense>`, like the account menu does now. The
  switcher's fallback is the static current-App trigger (logo, name, brand
  line) with no menu, so the header never jumps; the account menu's
  fallback is a placeholder the size of its `size="lg"` button, so the
  footer never jumps either (my call).
- The sidebar's open state stays in the address (`?sidebar=false`, nuqs,
  `SidebarParam`), never shadcn's cookie, which would make the frame dynamic.
  The owner agreed: "stick with it".
- The Sections list (`SECTIONS`), the sign-in gate, `isCurrentSection`, the
  translations under `Navigation`.

## App addresses

The switcher links to each App's address, Local or Production by
environment ("local address locally, production address in production").
Nothing in the repo knows Laura's address yet.

- The Back Office reads `LAURA_URL` (a var pointing at another service
  carries that service's name, like `API_AUTH_URL`): `http://localhost:3200`
  (`LOCAL.URL.LAURA`) in `.env.example`. My call: optional, an empty
  string counting as unset, and an App with no address is not listed, so a
  deploy without it still starts. It stays out of `docker-compose.prod.yml`
  until Laura is deployed (a blank entry would fail `z.url()`).
- The Back Office's own entry links to its root (it is the current App; no
  address needed).
- Each App's display name and icon live in one Back Office constant keyed by
  `App` (`satisfies Record<App, ...>`, so a new App fails until listed):
  Back Office uses its square logo, Laura a lucide icon in the block's
  `bg-sidebar-primary` tile (`Images`, owner-agreed; a Brand logo comes with Laura's rebuild). Names are exact: "Laura",
  "Back Office".

## Components and packages

- shadcn primitives come from `packages/shadcn` (already generated:
  `sidebar`, `breadcrumb`, `separator`, `avatar`, `dropdown-menu`); never
  the block's demo files, never edited by hand. `collapsible` is not needed.
- `packages/ui` gains AOF wrappers for what the App now uses and lacks:
  `AOFBreadcrumb*`, `AOFSeparator`, `AOFAvatar*`, plus `AOFSidebarGroup`,
  `AOFSidebarRail` and anything else from shadcn's sidebar the frame needs,
  in `aof-sidebar.tsx`. Its comment about the tab bar replacing the drawer
  is rewritten.
- The switcher and the account menu are Back Office components in
  `features/navigation/components/`; the client part stays the smallest leaf
  (the dropdowns need `useSidebar().isMobile`).

## Docs

- ADR 0024 names "the phone tab bar": reword it to the sidebar and its
  phone drawer (the decision itself does not change).
- CLAUDE.md's signed-in frame line, if it names the tab bar.
- The earlier frame design (`2026-10-16-back-office-frame-design.md`) stays
  as history.

## Tests

- Unit (`app-frame.test.tsx`): the frame renders the Sections in the
  `nav`, the trigger, the breadcrumb; no tab bar.
- Browser: the switcher lists only the Apps given and marks the current one;
  the account menu keeps its language, theme and Sign out behaviour
  (`account-menu.browser.test.tsx`); `sidebar-param` unchanged.
- e2e (`frame.spec.ts`): `menuOf` on a phone opens the drawer through the
  trigger first; moving between Sections, language switching and Sign out
  pass on every project; the switcher shows the Back Office for the Admin
  Fixture.

## Non-goals

- No Japan dressing of the frame (later, "build on top").
- No collapsible groups or sub-pages until a Section has pages under it.
- No search, no notifications, no "Add App".
- Laura's own frame and its link back to the Back Office.

## Watch out

- The navigation files were written by another session; they are committed
  (`dc492c4`). `section-link.tsx` holds an uncommitted canonical-class
  rewrite from the Tailwind canonicalize run, which this change replaces.
- `LAURA_URL` Production value is pending until Laura is deployed.
