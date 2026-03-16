# Sidebar Layout — Claude Guide

## Feature Scope

**Owns:** Dashboard navigation shell — sidebar, mobile nav, sheet overlay, pill badges, user menu, resize handle, sidebar state persistence.

**Does not own:** Page content, auth logic (uses `@/lib/auth-client` for sign-out only), route definitions, theme switching.

## File Responsibilities

| File | Purpose |
|------|---------|
| `constants/sidebar-constants.ts` | Dimension constants, `SidebarState` type, cookie parser |
| `hooks/use-sidebar.ts` | Core state hook: toggle, resize, sheet open/close, dual persistence (cookie + localStorage) |
| `hooks/use-sidebar-context.ts` | Thin context consumer — throws if used outside `SidebarProvider` |
| `providers/sidebar-provider.tsx` | Wires `useSidebar` into React context, wraps children in `LazyMotion` |
| `components/desktop-sidebar.tsx` | Animated sidebar container (md+), force-collapses on tablet (md–lg) |
| `components/sidebar-nav.tsx` | Nav links with animated labels + `SidebarLogo` — shared by desktop and mobile |
| `components/sidebar-resize-handle.tsx` | Drag handle for sidebar width (lg+ only, hidden when collapsed) |
| `components/mobile-top-bar.tsx` | Sticky header with logo, +button, menu button (< md only) |
| `components/mobile-sheet-nav.tsx` | Right-side sheet overlay with nav + sign-out (< md, opened via `openSheet`) |
| `components/quick-nav-badges.tsx` | Horizontal scrollable pill badges (< md only) |
| `components/user-menu.tsx` | Avatar dropdown with Settings link and Sign out — used by desktop sidebar and mobile sheet |

## Modification Guide

### Add a new navigation item

1. Add entry to `navItems` array in `components/sidebar-nav.tsx`
2. Provide `href`, `label`, `icon` (from lucide-react), and optionally `adminOnly: true`
3. It automatically appears in desktop sidebar, mobile sheet, and quick nav badges

### Add a mobile-only component

1. Create the component in `components/`
2. Use `useSidebarContext()` for state access
3. Add it to `app/(dashboard)/layout.tsx` inside the `SidebarProvider`
4. Use `md:hidden` to restrict to mobile viewport

### Change breakpoints

Breakpoints are defined in `@allonfire/hooks/breakpoints` (Tailwind defaults: md=768, lg=1024). CSS classes (`md:flex`, `lg:block`, `max-lg:max-w-[60px]`) must stay aligned with these values. The `useIsDesktop()` hook in `desktop-sidebar.tsx` drives the tablet force-collapse behavior.

### Adjust sidebar dimensions

Edit constants in `constants/sidebar-constants.ts`. `parseCookieState()` clamps persisted values to `[MIN_WIDTH, MAX_WIDTH]`, so existing cookies auto-correct.

## Gotchas

- **Tooltip deferral:** Tooltips only render when `isCollapseAnimationDone && collapsed`. On initial load with a collapsed cookie state, `useEffect` in `useSidebar` sets `isCollapseAnimationDone = true` after first paint. During toggle animation, it's set to `false` then `true` on `onAnimationComplete`. Without this, tooltips flash before the collapse animation finishes.

- **Tablet force-collapse:** `desktop-sidebar.tsx` computes `effectiveCollapsed = isDesktop ? isCollapsed : true`. The toggle button is hidden with `hidden lg:inline-flex`. The CSS `max-lg:max-w-[60px]` provides an additional constraint. All three must agree.

- **Cookie SSR hydration:** `parseCookieState()` runs server-side in the async layout. The parsed `defaultState` is passed to `SidebarProvider` → `useSidebar` as the initial `useState` value. This prevents layout shift. If the cookie is missing/corrupt, it falls back to expanded at `DEFAULT_WIDTH`.

- **biome-ignore on document.cookie:** `use-sidebar.ts` has a sanctioned `biome-ignore lint/suspicious/noDocumentCookie` comment because direct cookie access is intentional here for SSR hydration (no need for a cookie library).

- **Sheet auto-close:** `mobile-sheet-nav.tsx` watches `pathname` in a `useEffect` and calls `setMobileSheetOpen(false)`. The biome exhaustive-deps warning is suppressed because `setMobileSheetOpen` is intentionally omitted (stable ref from `useCallback`).

- **navItems export:** `sidebar-nav.tsx` exports `navItems` as a named export so `quick-nav-badges.tsx` can reuse the same array. Keep both files in sync if you change the nav item type.

## Dependencies

| Package | Why |
|---------|-----|
| `framer-motion` | Sidebar width animation, label enter/exit, logo size transitions (`LazyMotion` + `m` for tree-shaking) |
| `@allonfire/hooks` | `useIsDesktop()` for breakpoint detection in `desktop-sidebar.tsx` |
| `@allonfire/ui` | Button, Avatar, Dropdown, Sheet, Separator, Tooltip, ScrollArea, cn utility |
| `lucide-react` | All nav icons and UI icons |
| `next/image` | Logo rendering with optimization |
| `next/navigation` | `usePathname`, `useRouter` for active state and sign-out redirect |
| `@/lib/auth-client` | `authClient.signOut()` in mobile sheet and user menu |
