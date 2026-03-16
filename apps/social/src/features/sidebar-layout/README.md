# Sidebar Layout Feature

Responsive sidebar navigation system for the AllOnFire Social dashboard. Handles desktop sidebar with drag-resize, tablet collapsed mode, mobile top bar + sheet overlay, and horizontal pill badges — all driven by a single shared state provider.

## Directory Structure

```
sidebar-layout/
├── constants/
│   └── sidebar-constants.ts    # Dimensions, cookie name, SidebarState type, parser
├── hooks/
│   ├── use-sidebar.ts          # Core state machine (toggle, resize, sheet, persist)
│   └── use-sidebar-context.ts  # Context consumer hook (thin wrapper)
├── providers/
│   └── sidebar-provider.tsx    # React context + LazyMotion wrapper
└── components/
    ├── desktop-sidebar.tsx     # Animated sidebar with collapse/expand (md+)
    ├── sidebar-nav.tsx         # Navigation links + logo (shared by desktop & mobile)
    ├── sidebar-resize-handle.tsx # Drag-to-resize handle (lg+ only, expanded only)
    ├── mobile-top-bar.tsx      # Sticky header with logo + menu button (<md)
    ├── mobile-sheet-nav.tsx    # Right-side sheet overlay (<md)
    ├── quick-nav-badges.tsx    # Horizontal scrollable pill badges (<md)
    └── user-menu.tsx           # Avatar + dropdown (shared by desktop & mobile)
```

## Component Hierarchy

```
DashboardLayout (server)
 └ SidebarProvider
    ├ MobileTopBar          < md
    ├ QuickNavBadges        < md
    ├ DesktopSidebar        md+
    │  ├ SidebarLogo
    │  ├ Toggle             lg+ only
    │  ├ SidebarNav
    │  └ UserMenu
    ├ SidebarResizeHandle   lg+, expanded only
    ├ MobileSheetNav        < md, on demand
    │  ├ UserMenu
    │  ├ SidebarNav
    │  ├ Settings link
    │  └ Sign out
    └ main (page content)
```

## Responsive Behavior

| Viewport        | Breakpoint    | Visible Components                                      | Sidebar State        |
|-----------------|---------------|--------------------------------------------------------|----------------------|
| **Mobile**      | `< 768px`     | MobileTopBar, QuickNavBadges, MobileSheetNav (on open) | Hidden               |
| **Tablet**      | `768–1023px`  | DesktopSidebar (force-collapsed, 60px)                 | Always collapsed     |
| **Desktop**     | `≥ 1024px`    | DesktopSidebar (expandable), SidebarResizeHandle       | User-controlled      |

Key CSS: `md:hidden` hides mobile components at 768px+; `hidden md:flex` shows desktop sidebar at 768px+; `hidden lg:block` shows resize handle and toggle button at 1024px+; `max-lg:max-w-[60px]` force-collapses the sidebar between md and lg.

## State Management Flow

```
cookie → parseCookieState() → defaultState
  → SidebarProvider → useSidebar(defaultState)
    → SidebarContext → useSidebarContext() → components

Exposed: isCollapsed, width, isMobileSheetOpen, isCollapseAnimationDone
Actions: toggle(), setWidth(), openSheet(), closeSheet()
```

## Data Flow: User Interactions

**Toggle:** click → toggle() → flip isCollapsed → persist → animate width → onComplete → tooltips visible

**Resize:** mousedown (capture start) → mousemove → setWidth(clamped) → persist → mouseup (cleanup)

**Sheet:** tap Menu → openSheet() → sheet slides in. Closes on: route change (useEffect), tap outside (onOpenChange)

## Animation Details

| Element         | Property   | Duration | Easing     | Library       |
|-----------------|-----------|----------|------------|---------------|
| Sidebar width   | `width`   | 200ms    | `easeOut`  | Framer Motion |
| Logo size       | `width/height` | 200ms | `easeOut` | Framer Motion |
| Nav labels      | `opacity/width` | 150ms | default   | Framer Motion |
| Icon hover      | `scale`   | 150ms    | default    | CSS transition|
| Mobile sheet    | `translateX` | —     | default    | Sheet (Radix) |

All animations use `<LazyMotion features={domAnimation}>` for tree-shaking. Components use the `m` import (not `motion`) for reduced bundle size.

## Persistence

**Dual strategy:** cookie + localStorage

- **Cookie:** `sidebar_state` — URL-encoded JSON `{"isCollapsed":false,"width":230}`, max-age 1 year, SameSite=Lax
- **localStorage:** same key and value as fallback

The cookie is read server-side in `layout.tsx` via `cookies()` and parsed with `parseCookieState()`, which validates and clamps values. This prevents layout flash on SSR — the server renders the correct width on the first paint.

## Key Constants

| Constant         | Value   | Purpose                                   |
|------------------|---------|-------------------------------------------|
| `MIN_WIDTH`      | `230`   | Minimum sidebar width when expanded (px)  |
| `MAX_WIDTH`      | `320`   | Maximum sidebar width when expanded (px)  |
| `DEFAULT_WIDTH`  | `230`   | Initial width for new users (px)          |
| `COLLAPSED_WIDTH`| `60`    | Width when collapsed (px)                 |
| `COOKIE_NAME`    | `"sidebar_state"` | Cookie/localStorage key          |

## Navigation Items

Defined in `sidebar-nav.tsx` as `navItems` (exported for reuse by `QuickNavBadges`):

| Route        | Label     | Icon            | Admin Only |
|-------------|-----------|-----------------|------------|
| `/`          | Overview  | LayoutDashboard | No         |
| `/discover`  | Discover  | Compass         | No         |
| `/generate`  | Generate  | Sparkles        | No         |
| `/drafts`    | Drafts    | FileText        | No         |
| `/schedule`  | Schedule  | Calendar        | No         |
| `/users`     | Users     | Users           | Yes        |

Settings is handled separately in `MobileSheetNav` and `QuickNavBadges` (not in the `navItems` array).

## Import Patterns

From pages or other features:

```ts
// Provider (used only in dashboard layout)
import { SidebarProvider } from "@/features/sidebar-layout/providers/sidebar-provider";

// Components (used in dashboard layout)
import { DesktopSidebar } from "@/features/sidebar-layout/components/desktop-sidebar";
import { MobileTopBar } from "@/features/sidebar-layout/components/mobile-top-bar";
import { MobileSheetNav } from "@/features/sidebar-layout/components/mobile-sheet-nav";
import { QuickNavBadges } from "@/features/sidebar-layout/components/quick-nav-badges";
import { SidebarResizeHandle } from "@/features/sidebar-layout/components/sidebar-resize-handle";

// Constants (used in dashboard layout for cookie parsing)
import { COOKIE_NAME, parseCookieState } from "@/features/sidebar-layout/constants/sidebar-constants";

// Context hook (used by components within the feature)
import { useSidebarContext } from "@/features/sidebar-layout/hooks/use-sidebar-context";
```

No barrel `index.ts` files — always import directly from the specific file.
