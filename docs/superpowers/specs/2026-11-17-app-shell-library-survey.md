# App shell / sidebar block survey (free only)

Surveyed 2026-11-17. Target: Next.js 16, Tailwind 4, shadcn base-nova (Base UI), strict TS, Tabler icons, phone-first photo app (Laura). Nothing installed; every URL below was checked with curl.
"200" = answered HTTP 200 without a key. "unverified" = could not confirm.

Method notes
- Preview/URL checks: curl -L, status code only.
- Base UI proof: registry JSON of the block read for `@radix-ui` / `@base-ui` imports, or the rendered preview HTML for `base-ui-` ids.
- Icons: base-nova and Shadcn Studio blocks use an `IconPlaceholder` carrying a `tabler="IconX"` prop, so the CLI emits Tabler when `iconLibrary` is tabler (seen in the JSON; the CLI transform itself was not run).
- Phone behaviour for every block built on the shadcn `sidebar` component: the component swaps to a Sheet drawer under the mobile breakpoint, with SidebarTrigger in the header. None of them has a tab bar.

## 1. Official shadcn blocks (ui.shadcn.com)

Correct full-screen preview URL form for base-nova: `https://ui.shadcn.com/preview/base/<block>` (200). The guessed `https://ui.shadcn.com/view/base-nova/<block>` answers 404; `view/new-york-v4/<block>` answers 200 but that is the Radix style.
Registry JSON (Base UI, no Radix imports): `https://ui.shadcn.com/r/styles/base-nova/<block>.json` (200). Install: `pnpm dlx shadcn@latest add sidebar-08` (default registry; also `@shadcn/sidebar-08`). Extra npm packages: none (dashboard-01 adds dnd-kit, tanstack table, zod).
All 16 sidebar-NN plus dashboard-01 exist in the base-nova registry.

| Block | URL (200) | Primitive | Install | Look | Phone | Verdict |
|---|---|---|---|---|---|---|
| sidebar-07 (what AppFrame is today) | https://ui.shadcn.com/preview/base/sidebar-07 | Base UI | `add sidebar-07` | Icon-collapsible rail, breadcrumb header | Sheet drawer, no tab bar | current; baseline |
| sidebar-08 | https://ui.shadcn.com/preview/base/sidebar-08 | Base UI | `add sidebar-08` | Inset: content sits as a rounded card on the sidebar colour, plus a secondary nav group | Sheet drawer | use |
| sidebar-04 | https://ui.shadcn.com/preview/base/sidebar-04 | Base UI | `add sidebar-04` | Floating: detached rounded sidebar with a gap, submenus | Sheet drawer | use |
| sidebar-16 | https://ui.shadcn.com/preview/base/sidebar-16 | Base UI | `add sidebar-16` | Sticky full-width site header above the sidebar and content | Sheet drawer; header stays visible | use (header always on screen helps phone) |
| sidebar-10 | https://ui.shadcn.com/preview/base/sidebar-10 | Base UI | `add sidebar-10` | Sidebar opened from a popover; page actions menu top right | Sheet drawer | idea only (popover nav is a desktop idea) |
| sidebar-13 | https://ui.shadcn.com/preview/base/sidebar-13 | Base UI | `add sidebar-13` | Sidebar inside a dialog (settings-style) | Dialog | skip (settings pattern, not a frame) |
| dashboard-01 | https://ui.shadcn.com/preview/base/dashboard-01 | Base UI | `add dashboard-01` | Inset sidebar plus charts, table, dnd | Sheet drawer | skip (page content, extra deps) |
| sidebar-01..03, 05, 06, 09, 11, 12, 14, 15 | same pattern `/preview/base/sidebar-NN` (only 01 checked, 200) | Base UI | `add sidebar-NN` | Grouped / collapsible / dropdown submenus / file tree / calendar / right side / two sidebars | Sheet drawer | skip (no phone advantage) |

Note: every block carries 2 to 5 `as` casts in its own files (shadcn style), which the repo rule forbids; they need cleanup after install.

## 2. Shadcn Studio (shadcnstudio.com)

Registry style segment is `base-nova` (not `nova`): `https://shadcnstudio.com/r/blocks/base-nova/<name>.json`. Namespace `@ss-blocks/<name>` or `@shadcn-studio/<name>`; components.json needs a `registries` entry (`"@ss-blocks": "https://shadcnstudio.com/r/blocks/{style}/{name}.json"`). Free content needs no key. Scanned names 01..32 of dashboard-shell, dashboard-sidebar, application-shell: only the `-01` of each answers 200; the rest are 401 (license) or 404. The listing page labels dashboard-sidebar-03 "Free" but its JSON answers 401, so treat it as paid.

| Block | URL (200) | Registry JSON (200, no key) | Primitive | Look | Phone | Verdict |
|---|---|---|---|---|---|---|
| Application Shell 1 | https://shadcnstudio.com/preview/blocks/base/dashboard-and-application/application-shell/application-shell-01 (listing: https://shadcnstudio.com/blocks/dashboard-and-application/application-shell) | https://shadcnstudio.com/r/blocks/base-nova/application-shell-01.json | Base UI (shadcn sidebar plus `render=` prop) | Classic fixed sidebar, badge counts, profile and language dropdowns | Sheet drawer | idea only (plain sidebar, nothing beyond sidebar-07) |
| Dashboard Sidebar 1 | https://shadcnstudio.com/preview/blocks/base/dashboard-and-application/dashboard-sidebar/dashboard-sidebar-01 (listing: .../dashboard-sidebar) | https://shadcnstudio.com/r/blocks/base-nova/dashboard-sidebar-01.json | Base UI | Social-analytics themed sidebar (grouped nav) | Sheet drawer | skip (analytics theme) |
| Dashboard Shell 1 | https://shadcnstudio.com/preview/blocks/base/dashboard-and-application/dashboard-shell/dashboard-shell-01 (anchor: https://shadcnstudio.com/blocks/dashboard-and-application/dashboard-shell#dashboard-shell-1) | https://shadcnstudio.com/r/blocks/base-nova/dashboard-shell-01.json | Base UI (`base-ui-` ids in HTML) | Sidebar plus breadcrumb header plus cards, charts, table; adds @tanstack/react-table | Sheet drawer | skip (dashboard content, not a frame) |

Pro ones, one line: Dashboard Shell 10/12, Application Shell 25/26/30, Dashboard Sidebar 9/11 are paid; their looks were not stated on the listing.

## 3. Shadcnblocks (shadcnblocks.com)

Install `pnpm dlx shadcn@latest add @shadcnblocks/<slug>`; the block JSON `https://www.shadcnblocks.com/r/<slug>.json` answers 401 for Pro. Scanned application-shell1..50, sidebar1..50, navbar, dashboard: the only free (200) items are application-shell1, application-shell3 (top nav), sidebar1, navbar1/5/35. All free ones import `lucide-react` (swap to Tabler by hand) and `motion`; the primitives come from the project's own shadcn ui.

| Block | URL (200) | Registry JSON | Primitive | Look | Phone | Verdict |
|---|---|---|---|---|---|---|
| Application Shell 1 | https://www.shadcnblocks.com/block/application-shell1 | https://www.shadcnblocks.com/r/application-shell1.json (200) | Follows project (shadcn sidebar) | Collapsible sidebar, grouped nav with submenus, user dropdown, breadcrumb header; deps `motion`, `cn` | Sheet drawer | idea only |
| Sidebar 1 | https://www.shadcnblocks.com/block/sidebar1 | https://www.shadcnblocks.com/r/sidebar1.json (200) | Follows project | Plain sidebar with logo, groups, footer links, toggle | Sheet drawer | skip (same as shadcn sidebar-01) |
| Application Shell 3 | https://www.shadcnblocks.com/block/application-shell3 | https://www.shadcnblocks.com/r/application-shell3.json (200) | Follows project | Top navigation bar shell (listing text; the JSON was not opened) | unverified | idea only (top nav, not phone-first) |

Paid, one line each (the closest matches to a phone-first photo app): Application Shell 30 (https://www.shadcnblocks.com/block/application-shell30, Pro) is "sidebar on desktop, bottom tab bar on mobile with a raised centre Create button"; Application Shell 46 (https://www.shadcnblocks.com/block/application-shell46, Pro) is "photo library with selection mode and timeline"; Application Shell 5 / 15 are floating sidebars and 2 / 17 are inset (all Pro, JSON 401).

## 4. React Bits (reactbits.dev)

No sidebar. Navigation pieces only. Not built on Base UI or Radix (plain React plus optional gsap). Install `pnpm dlx shadcn@latest add @react-bits/<Name>-TS-TW` (namespace verified by the page; JSON `https://reactbits.dev/r/<Name>-TS-TW.json` answers 200 for all names below). License is MIT plus Commons Clause (allowed inside an app, not for reselling the component). Tabler is not used; icons are passed in as ReactNode.

| Component | URL (200) | Install / deps | Look | Phone | Verdict |
|---|---|---|---|---|---|
| Dock | https://reactbits.dev/components/dock | `@react-bits/Dock-TS-TW`; deps: react-dom only; `side` prop accepts bottom/top/left/right | macOS-style dock with magnification, launch bounce, badges, context menus; can sit at the screen bottom | Magnification is pointer-driven; touch behaviour unverified; no safe-area handling in the code | idea only (best free bottom-bar starting point, needs phone testing and safe-area padding) |
| Pill Nav | https://reactbits.dev/components/pill-nav | `@react-bits/PillNav-TS-TW`; no deps | Pill-shaped top bar, fill rises through each link on hover, sliding active dot | Has a matchMedia branch; mobile look unverified | idea only |
| Bubble Menu | https://reactbits.dev/components/bubble-menu | `@react-bits/BubbleMenu-TS-TW`; dep gsap | Floating circular button that expands into staggered bubbles | Pointer/click based; mobile look unverified | idea only (playful, fits an ocean theme; no active-route state seen) |
| Staggered Menu, Card Nav, Gooey Nav, Flowing Menu | pages 200: https://reactbits.dev/components/staggered-menu , /card-nav , /gooey-nav , /flowing-menu | `@react-bits/<Name>-TS-TW` | Full-screen or hamburger menus with animation | unverified | skip (marketing-site nav, not an app frame) |

## 5. Ui-Layouts (ui-layouts.com)

Note: ui-layouts.com redirects (307) to www.ui-layouts.com. No sidebar or app shell exists (`/components/sidebar` is 404). Pro blocks live at pro.ui-layouts.com (paid, not checked).

| Component | URL (200) | Primitive / install | Look | Phone | Verdict |
|---|---|---|---|---|---|
| Magnified Doc | https://www.ui-layouts.com/components/magnified-doc | Copy-paste, TS; npm `motion`; tooltip is Radix (`@radix-ui/react-tooltip`) | Dock-style magnifying tab bar | Not stated | idea only (Radix tooltip needs swapping to Base UI) |
| Responsive Header | https://www.ui-layouts.com/components/responsive-header | Copy-paste, TS; npm `motion`, `vaul`; example uses lucide | Header whose menu opens as a top drawer; drag-to-close on phone, dialog-like on desktop | Drag to close under 768 px | idea only (adds vaul; the sample has a stray console.log) |
| Tabs | https://www.ui-layouts.com/components/tabs | Copy-paste | Animated tabs | unverified | skip |

## 6. Shadcn UI Kit (shadcnuikit.com, Bundui)

Everything that is a frame is Pro. `https://shadcnuikit.com/r/registry.json` is public (it lists dashboard-shell1..9, sidebar-layout, dashboard-page-layout1..3) but each item JSON answers 401 without an API key. The page says all components support both Radix and Base UI.

| Block | URL (200) | JSON | Look | Verdict |
|---|---|---|---|---|
| Dashboard Shell 1..9 | https://shadcnuikit.com/blocks/dashboard-ui/dashboard-shell | 401 (https://shadcnuikit.com/r/dashboard-shell8.json) | classic, double sidebar with icon rail, narrow labelled rail, slim icon rail, top navbars, floating sidebar (7), floating sidebar that collapses to icons (8) | skip (paid) |
| Sidebar Layout 1, Page Layout 1..3 | https://shadcnuikit.com/blocks/dashboard-ui/sidebar-layouts | 401 | edge-to-edge sidebar, inset sidebar page frame, top-nav frames; sheet on phone | skip (paid) |

## 7. Shadcn UI Blocks (shadcnui-blocks.com)

Free, copy-paste. The block list (31 categories) has no sidebar, app shell or dashboard layout; only Navbar (marketing). `https://shadcnui-blocks.com/blocks` answers 200. Primitive library not stated. Verdict: skip (no app frame). Same author runs basecn.dev (Base UI port of shadcn, https://basecn.dev answers 200, its blocks not surveyed).

## 8. Aceternity UI (ui.aceternity.com)

Namespace `@aceternity/<name>`; registry JSON `https://ui.aceternity.com/registry/<name>.json` answers 200 without a key for all three below (the `/r/` path is 404). The component pages say nothing about price; the JSON being open means no key is needed. Not Radix and not Base UI (plain React, `motion`). Tabler icons: yes (`@tabler/icons-react` is a dependency of the sidebar and the dock). Aceternity Pro (templates and blocks) is paid; not checked.

| Component | URL (200) | Install / deps | Look | Phone | Verdict |
|---|---|---|---|---|---|
| Sidebar | https://ui.aceternity.com/components/sidebar | `add @aceternity/sidebar`; deps `motion`, `@tabler/icons-react`; one file `components/ui/sidebar.tsx` | 60 px icon rail that expands to 300 px on hover; sidebar colour is a flat neutral panel | `MobileSidebar`: a 40 px top bar with a hamburger that opens a full-screen overlay; no tab bar. Hover expansion does not suit touch | idea only (its own provider replaces shadcn sidebar; one `as` cast; hover-only expand) |
| Floating Dock | https://ui.aceternity.com/components/floating-dock | `add @aceternity/floating-dock`; deps `motion`, `@tabler/icons-react`; zero casts | Desktop: macOS dock with magnification. Mobile: a small button that fans the icons out as a vertical stack | Built-in mobile variant; file comment suggests bottom right | idea only (closest free thing to a phone floating nav; it is a fan-out, not a tab bar) |
| Floating Navbar | https://ui.aceternity.com/components/floating-navbar | `add @aceternity/floating-navbar`; dep `motion` | Pill nav bar that hides on scroll down and returns on scroll up | Pill is responsive; mobile look unverified | idea only |

## 9. coss (coss.com/origin and coss.com/ui)

coss.com/origin is the legacy Origin UI snapshot (Base UI, copy-paste). Its component list has Navbar, Tabs, Stepper, Tree but no sidebar or shell (https://coss.com/origin answers 200, https://coss.com/origin/navbar 200). The active library is coss ui (https://coss.com/ui), Base UI, with its own full primitive set.

| Component | URL | Install / deps | Look | Phone | Verdict |
|---|---|---|---|---|---|
| Sidebar (coss ui) | docs page `https://coss.com/ui/docs/components/sidebar` answers 404 (listed in llms.txt; unverified); registry JSON https://coss.com/ui/r/sidebar.json answers 200 | Namespace `@coss/...` (`npx shadcn@latest add @coss/ui`); registryDependencies are `@coss/button`, `@coss/sheet`, `@coss/tooltip`, `@coss/use-media-query` etc., so it pulls the coss primitives next to the shadcn ones; imports `lucide-react`, `@base-ui/react`; 5 `as` casts | Collapsible side panel, shadcn-like API | Sheet on phone (via `@coss/sheet` plus a media-query hook) | idea only (second primitive set clashes with base-nova) |
| Mobile menu drawer, swipe-area drawer | JSON https://coss.com/ui/r/p-drawer-11.json (200, "mobile menu drawer from the left"), https://coss.com/ui/r/p-drawer-14.json (200, "left drawer with swipe area") | `@coss/p-drawer-11` style names (unverified exact form) | Left drawer, swipeable | Phone-first | idea only (borrow the swipe pattern) |

## 10. Dice UI (diceui.com)

Free, Radix or Base UI. Catalog (https://diceui.com answers 200) has no sidebar, shell, dock, tabs or navbar. Verdict: skip.

## Ranking for a phone-first photo app (Laura)

See the final message. Summary: nothing free ships a real bottom tab bar as a finished frame. The only finished "sidebar on desktop, tab bar on phone" block (Shadcnblocks Application Shell 30) and the "photo library" shell (Application Shell 46) are paid. Free route: pick a shadcn sidebar look (sidebar-08 inset, sidebar-04 floating, sidebar-16 sticky header) for desktop and add a bottom bar from React Bits Dock or Aceternity Floating Dock.

## Not verified

- Visual rendering of any preview (no browser was opened); looks are from descriptions and source code.
- Touch/safe-area behaviour of React Bits Dock and Pill Nav, Aceternity Floating Navbar.
- shadcn sidebar-01, 02, 03, 05, 06, 09, 11, 12, 14, 15 preview URLs (only 01 curl-checked; the registry list confirms they exist).
- coss.com/ui sidebar docs page (404); install name of coss drawer blocks.
- Shadcn Studio blocks beyond the first 32 numbers per category; other Shadcn Studio categories.
- Shadcnblocks and Shadcn UI Kit Base UI vs Radix per block (the sites say all supported; free JSON files follow the project's shadcn ui).
- Bonus, not in the requested list and not reviewed: shadcnspace.com (https://shadcnspace.com/blocks/dashboard-ui/dashboard-shell answers 200, advertises Base UI and a free Dashboard Shell 01).
