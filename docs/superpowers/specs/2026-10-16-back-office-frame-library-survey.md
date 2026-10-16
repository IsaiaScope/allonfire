# Back Office frame: library survey

The Back Office signed-in frame needs a desktop sidebar that collapses to icons, a phone top bar with a fixed bottom tab bar (no drawer on phone), and an account menu (name, Role, language, theme, Sign out). The design system is shadcn `base-nova`, built on Base UI, and `sidebar.tsx`, `dropdown-menu.tsx`, `avatar.tsx`, `tooltip.tsx`, `tabs.tsx` and `navigation-menu.tsx` are already generated in `packages/shadcn`. This survey checks eight sources for pieces worth taking, against the owner's taste (restraint, short CSS motion on entry or state change only, no illustrations, blur or glow). Facts were checked on 2026-10-16 against each source's shadcn registry index (`/r/registry.json`), sample item JSON and its site; anything not confirmed is marked "not verified". All eight sources are listed in shadcn's registry directory (`ui.shadcn.com/r/registries.json`), so `npx shadcn@4.21.0 add @<namespace>/<item>` resolves them; a paid one also needs a `registries` entry with a bearer token in `components.json`.

## 1. Official shadcn (ui.shadcn.com)

- **Blocks:** `sidebar-01` to `sidebar-16` (`sidebar-07` "a sidebar that collapses to icons", `sidebar-08` inset with secondary nav, `sidebar-16` with a sticky site header) and `dashboard-01` (sidebar, charts, data table). Links: https://ui.shadcn.com/blocks/sidebar, https://ui.shadcn.com/blocks.
- **Navbar / tab bar:** no navbar block and no bottom tab bar block (a registry search for "bottom" finds nothing). On a phone the `Sidebar` component opens as a `Sheet` drawer; nothing else.
- **Account menu:** `sidebar-07`'s `nav-user.tsx` is an avatar `DropdownMenu` in the sidebar footer (name, email, items, Log out), opening to the right on desktop and below on mobile.
- **Primitive:** Base UI. The `base-nova` builds exist and return 200: `https://ui.shadcn.com/r/styles/base-nova/sidebar-07.json`, `.../dashboard-01.json`, `.../sidebar-16.json`. They use `render={...}` (not `asChild`), and the `sidebar` component imports `@base-ui/react/use-render` and `merge-props`.
- **Price / licence:** free, MIT.
- **Install:** `npx shadcn@4.21.0 add sidebar-07` from `apps/back-office` (with `--view` or `--dry-run` first). It depends on `sidebar`, `breadcrumb`, `separator`, `collapsible`, `dropdown-menu`, `avatar`; no npm dependencies, no motion library. The registry source uses an `IconPlaceholder` that the CLI is expected to rewrite to lucide per `iconLibrary` (not verified here).
- **Fit:** good. Plain, no decoration, motion is the sidebar's own width transition. The block's files (`app-sidebar`, `nav-main`, `nav-user`, `team-switcher`) are demo composition, not components to keep as they are: read them with `--view` and rebuild the parts as AOF components.
- **Verdict:** `use`. It is already the design system, the icon-collapsible sidebar and the account dropdown are exactly what the frame needs, and it is Base UI.

## 2. Shadcn Studio (shadcnstudio.com)

- **Blocks:** free `dashboard-shell-01` (sidebar, breadcrumb header, metrics, tables), `dashboard-sidebar-01`, `dashboard-header-01` (breadcrumbs, profile and language dropdowns), `dashboard-footer-01`, `navbar-component-01` (marketing header). Pro: `Dashboard Shell 10`, `Dashboard Shell 12` (no description on the site). Link: https://shadcnstudio.com/blocks/dashboard-and-application/dashboard-shell.
- **Account menu:** free components `dropdown-menu-07` (avatar trigger, profile actions), `dropdown-menu-08`, `dropdown-menu-12`, and blocks `dashboard-dropdown-01` (language with flags), `dashboard-dropdown-02` (user profile).
- **Tab bar:** none found. The site says the shells use a `Sheet` drawer on mobile.
- **Primitive:** both. The registry is per style (`https://shadcnstudio.com/r/{style}/{name}.json`); the `base-nova` builds of `dashboard-shell-01` and `dropdown-menu-07` use `render={...}`.
- **Price / licence:** free Community tier under MIT plus a Commons Clause (no reselling or redistributing the components, no competing product); paid tiers from $99 one-time (pricing page figures inconsistent, not verified).
- **Install:** `npx shadcn@4.21.0 add @shadcn-studio/dropdown-menu-07`. `dashboard-shell-01` pulls `@tanstack/react-table` and chart code.
- **Fit:** neutral styling, no motion library; the dashboard shell is heavier than the frame needs.
- **Verdict:** `idea only`. Nothing here that official `sidebar-07` lacks; the language dropdown is a menu, where the owner prefers plain links.

## 3. Shadcnblocks (shadcnblocks.com)

- **Blocks:** about 50 `application-shell*` and 19 `sidebar*` blocks. Relevant: `application-shell30` (icon-collapsible sidebar on desktop, bottom tab bar on mobile with Home, Inbox, Tasks, More and a raised round Create button, a mobile header with logo, section and avatar, safe-area inset and content padding), `application-shell13` (top nav with mobile bottom navigation), `application-shell2` (inset sidebar collapsing to icons, user dropdown footer), `navbar1` to `navbar35` (marketing headers; `navbar24` is a bottom dock with spring scaling). Link: https://www.shadcnblocks.com/block/application-shell30.
- **Primitive:** the block page lists Radix UI, Base UI and React Aria. The docs say blocks are written for Radix and ported to Base UI; the `{style}` URL (`https://www.shadcnblocks.com/r/{style}/{name}`) serves the `base-nova` port when one exists, the plain `/r/{name}` URL always serves Radix. Whether `application-shell30` has a Base UI port: listed on its page, not verified by fetching (needs a key).
- **Price / licence:** the shells are Pro. Pro is $149 one-time, single user, lifetime, unlimited end products, no reselling. No free tier of blocks found.
- **Install:** add `"@shadcnblocks": { "url": "https://www.shadcnblocks.com/r/{style}/{name}", "headers": { "Authorization": "Bearer ${...}" } }`, then `npx shadcn@4.21.0 add @shadcnblocks/application-shell30`. No motion library listed for `application-shell30`.
- **Fit:** `application-shell30` is the closest match in the survey to the frame's layout. The raised Create button and the "More" menu would go.
- **Verdict:** `idea only`. It is the only source with the exact desktop-sidebar plus phone-tab-bar shell, but it is paid and the tab bar is a few links in a fixed `<nav>`; take its safe-area and content-padding details, not the code.

## 4. React Bits (reactbits.dev)

- **Pieces:** `Dock` (macOS dock, magnification, launch bounce, badges), `PillNav`, `GooeyNav`, `CardNav`, `StaggeredMenu` and `BubbleMenu` (GSAP), `FlowingMenu`, `LineSidebar` (cursor-proximity list). No app shell, no account menu.
- **Primitive:** framework-agnostic React; none of these use Radix or Base UI. Variants per JS/TS and CSS/Tailwind (`Dock-TS-TW`). Some need `gsap` or `@hugeicons/react`.
- **Price / licence:** free, MIT plus Commons Clause (use in products, no reselling the components).
- **Install:** `npx shadcn@4.21.0 add @react-bits/Dock-TS-TW`.
- **Fit:** poor. Every piece is a show (magnification, goo, staggered reveals), the opposite of short, once-only motion; no keyboard or ARIA story from a primitive.
- **Verdict:** `skip`. Decorative navigation effects the owner's taste rules out.

## 5. Ui-Layouts (ui-layouts.com)

- **Pieces:** `responsive-header`, `liquid-glass-sidebar-menu`, `magnified-doc` and `magnified-tab` (dock-like tabs), `tabs`, `animated-tabs`, `bottom-directional-drawer`, `motion-drawer`. Pro "Blocks" are marketing sections (hero, features, pricing, footer); no sidebar, app shell or bottom tab bar found.
- **Primitive:** Motion (`motion` package) for everything above; `magnified-*` also use `@radix-ui/react-tooltip`. No Base UI.
- **Price / licence:** components free, repo MIT (`ui-layouts/uilayouts`); Pro blocks price not verified.
- **Install:** `npx shadcn@4.21.0 add @ui-layouts/responsive-header` (adds `motion`, `lucide-react`).
- **Fit:** poor. Liquid glass and magnification are the blur and show the owner rejected; it would add `motion` to the App for nothing.
- **Verdict:** `skip`. No frame pieces, and the style is effect-led.

## 6. Shadcn UI Kit (shadcnuikit.com)

- **Blocks:** `dashboard-shell1` to `dashboard-shell9`. Relevant: `dashboard-shell8` (floating sidebar that collapses to icons, avatar menu), `dashboard-shell3` and `dashboard-shell4` (narrow icon rails), `dashboard-shell9` (top nav, sidebar sheet on phones). Account menus: `dashboard-dropdown1` (name and email header, a Light/Dark/System segmented theme control, settings, red Log out), `dashboard-dropdown6` (status submenu, icon theme toggle, Sign out), `dashboard-dropdown8` (language menu). No bottom tab bar found. Link: https://shadcnuikit.com.
- **Primitive:** mostly built on the shadcn `sidebar` and `dropdown-menu` items; 22 of 1,228 items name `@base-ui/react` and 53 name Radix. The registry URL has no `{style}`, and the docs never mention Base UI or `base-nova`: whether the shells render Base UI or Radix is not verified (fetching needs a key).
- **Price / licence:** these blocks are Pro (the registry answers 401 without a key). Pro $79 one-time sale price ($129 list), single user, unlimited projects, not usable in public open-source projects.
- **Install:** `"@shadcnuikit": { "url": "https://shadcnuikit.com/r/{name}.json", "headers": { "Authorization": "Bearer ${REGISTRY_TOKEN}" } }`, then `npx shadcn@4.21.0 add @shadcnuikit/dashboard-dropdown1`.
- **Fit:** the account menu with a segmented theme control inside it is close to what the frame asks for, and the styling is plain.
- **Verdict:** `idea only`. Worth copying the layout of `dashboard-dropdown1` (identity header, theme as a segmented control, Sign out last), but it is paid and its Base UI status is unconfirmed; the official `dropdown-menu` plus the existing theme toggle does the same.

## 7. Shadcn UI Blocks (shadcnui-blocks.com)

- **Blocks:** `navbar-01` to `navbar-05` (marketing headers with a `Sheet` on mobile), `profile-01` to `profile-04`, `dropdown-menu-01` to `-08` (`-08` a workspace switcher). No sidebar, app shell or bottom tab bar category.
- **Primitive:** both. The directory URL `/r/{name}.json` serves Radix (`asChild`, `@radix-ui/react-visually-hidden`); `https://www.shadcnui-blocks.com/r/base/{name}.json` serves the Base UI port (`render={...}`), not under `base-nova`.
- **Price / licence:** free, repo MIT (`akash3444/shadcn-ui-blocks`); no paid tier found.
- **Install:** `npx shadcn@4.21.0 add @shadcnui-blocks/navbar-01` (Radix), or the `/r/base/` URL directly for Base UI.
- **Fit:** fine visually, but marketing-site pieces.
- **Verdict:** `skip`. Nothing for an app frame.

## 8. Aceternity UI (ui.aceternity.com)

- **Pieces:** free components `sidebar` (desktop rail that widens on hover from 60px to 300px, full-screen overlay on mobile), `floating-dock` (magnifying icon dock, mobile variant), `floating-navbar`, `navbar-menu`, `resizable-navbar`. Pro blocks: `collapsible-sidebar`, `grouped-sidebar`, `simple-sidebar-with-hover`, `navbar-classic`, `navbar-pill`, and others (401 without a token).
- **Primitive:** Motion (`motion/react`) and `@tabler/icons-react`; no Radix or Base UI, hand-rolled `div`s with mouse handlers.
- **Price / licence:** components free; Pro $199 lifetime or $169 a year. One licence for all items: commercial use allowed, no redistribution or resale.
- **Install:** `npx shadcn@4.21.0 add @aceternity/sidebar` (adds `motion`, `@tabler/icons-react`).
- **Fit:** poor. Hover-to-expand and magnifying docks are continuous motion driven by the pointer, the mobile sidebar is the drawer the frame rules out, and accessibility is not built in.
- **Verdict:** `skip`. Landing-page effects, a second icon set and a motion library, none of which the frame wants.

## Recommendation

Take every piece from official shadcn, which is already generated in `packages/shadcn` on Base UI:

- **Desktop sidebar:** the generated `sidebar.tsx` with `collapsible="icon"`, laid out after `sidebar-07` (`npx shadcn@4.21.0 add sidebar-07 --view` from `apps/back-office` to read it), rebuilt as AOF components rather than adding the block's demo files. Render it from `md` up only; on a phone place no `SidebarTrigger`, so its `Sheet` never opens.
- **Phone bottom tab bar:** no source offers one that is free, Base UI and restrained. Build it as an AOF component: a fixed `<nav>` of Next links (icon over label), padded by `env(safe-area-inset-bottom)` with matching bottom padding on the content, the active state as a `cva` variant set by a small client leaf reading the pathname. Shadcnblocks `application-shell30` is the reference for the layout and the safe-area handling, without its raised Create button; it is not worth $149 for a few links.
- **Phone top bar:** an AOF header with the App mark, the current section and the account trigger, from the same shadcn pieces; no block needed.
- **Account menu:** the generated `dropdown-menu.tsx`, following `sidebar-07`'s `nav-user` (avatar trigger, identity in a `DropdownMenuLabel`, groups, Sign out last), opening to the right from the sidebar footer and below from the phone top bar. Add the Role under the name, language as links, and the theme as one item or a small segmented control in the manner of Shadcn UI Kit `dashboard-dropdown1`. Sign out stays its own `<form action>`.

Nothing from React Bits, Ui-Layouts, Aceternity UI or Shadcn UI Blocks, and no new npm dependency (`motion`, `gsap`, `@tabler/icons-react`) is needed.
