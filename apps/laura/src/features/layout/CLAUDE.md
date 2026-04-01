# Layout Feature -- Claude Guide

## Feature Scope

**Owns:** Top bar header, desktop dropdown navigation, mobile sheet navigation, auto-hide navbar behavior, navigation data/links, page container wrapper, scroll container selector constant.

**Does not own:** Auth logic (uses `@allonfire/auth/client` for sign-out in mobile nav only), role provider (consumes `UserRoleProvider` from `@/components/`), theme toggling (uses shared `ThemeToggle`), page content, i18n config.

## File Responsibilities

| File | Purpose |
|------|---------|
| `constants.ts` | Exports `SCROLL_CONTAINER_SELECTOR` used by auto-hide hook to find the scroll target |
| `hooks/use-auto-hide-navbar.ts` | Scroll-driven show/hide state for gallery pages; tracks direction, threshold, idle timer |
| `components/top-bar.tsx` | Main header: renders logo, DesktopNav, mobile menu button, ThemeToggle; manages mobile sheet and auto-hide state |
| `components/desktop-nav.tsx` | NavigationMenu with dropdown sections; renders static placeholder before mount for SSR safety |
| `components/mobile-nav.tsx` | Right-side Sheet with avatar, nav sections, sign-out; uses role hooks to disable restricted links |
| `components/nav-links.ts` | `navSections` data array, `NavLink`/`NavSection` types, `isLinkActive()` helper |
| `components/nav-link-content.tsx` | Shared presentational component for a nav link (icon, label, active checkmark, description) |
| `components/page-container.tsx` | Server Component wrapper with `mx-auto w-full max-w-4xl` centering |

## Modification Guide

### Add a new navigation link

1. Add entry to the appropriate section in `navSections` array in `components/nav-links.ts`
2. Provide `href`, `labelKey`, `descriptionKey`, `icon`, and optionally `viewerRestricted: true` or `adminOnly: true`
3. Add translation keys for `labelKey` and `descriptionKey` to the `Nav` namespace in all locale JSON files
4. The link automatically appears in both desktop dropdowns and mobile sheet

### Add a new navigation section

1. Add a new object to the `navSections` array in `components/nav-links.ts` with `labelKey`, `icon`, and `links` array
2. Add the section `labelKey` translation to all locale JSON files
3. Both desktop and mobile nav render sections dynamically from this array

### Change auto-hide behavior

1. Edit thresholds in `hooks/use-auto-hide-navbar.ts`: `SCROLL_DELTA_THRESHOLD` (50px direction change buffer) and `IDLE_HIDE_DELAY_MS` (3s inactivity timer)
2. To change which pages auto-hide, edit the `isGallery` check in `components/top-bar.tsx`

### Add a page that uses auto-hide

1. Expand the `isGallery` condition in `components/top-bar.tsx` to include the new pathname
2. Ensure the page's scroll container has the `data-scroll-container` attribute (already set in `layout.tsx`)

## Gotchas

- **SSR mount guard in DesktopNav:** `DesktopNav` uses a `mounted` state to defer rendering the interactive `NavigationMenu` until client-side. The pre-mount placeholder must visually match the triggers to avoid layout shift. If you add/remove sections, update both the placeholder and the real nav.

- **Auto-hide uses `useLayoutEffect`:** The hook uses `useLayoutEffect` (not `useEffect`) to set initial visibility before paint, preventing a flash of the navbar on gallery pages. This means it only runs client-side.

- **Safari backdrop-filter:** The gallery-mode header uses inline styles with both `backdropFilter` and `WebkitBackdropFilter` for Safari compatibility, and `color-mix(in srgb, ...)` instead of `oklch` for the same reason.

- **`isLinkActive` specificity:** The active-state helper prevents parent links from highlighting when a more specific child link matches. This relies on `allHrefs` being computed once at module level from `navSections`. If links are added dynamically, this breaks.

- **Scroll container coupling:** `useAutoHideNavbar` finds its scroll target via `document.querySelector(SCROLL_CONTAINER_SELECTOR)`. The matching `data-scroll-container` attribute is set in `app/[locale]/(dashboard)/layout.tsx`. If the layout structure changes, the hook silently stops working (falls back to always-visible).

- **Mobile sheet sign-out:** `MobileNav` has its own `authClient.signOut()` call and redirect. This is separate from the sign-out in the settings feature. Keep both in sync if sign-out behavior changes.

- **PageContainer is a Server Component:** Unlike the other components in this feature, `page-container.tsx` has no `"use client"` directive and works as a Server Component with zero client JS.

## Dependencies

| Package | Why |
|---------|-----|
| `@allonfire/ui` | Button, NavigationMenu, Sheet, Avatar, Separator, ThemeToggle, `cn` utility |
| `@allonfire/auth/client` | `authClient.signOut()` in `MobileNav` |
| `next-intl` | `useTranslations` for nav labels and descriptions |
| `@/i18n/navigation` | Locale-aware `Link`, `usePathname` |
| `@/components/user-role-provider` | `useIsViewer()`, `useIsAdmin()` hooks for role-based link visibility |
| `lucide-react` | All nav icons (Images, Heart, Upload, Gamepad2, BrainCircuit, CircleHelp, PenSquare, Settings, Menu, LogOut, Check, ChevronDown) |
| `next/image` | Logo rendering with optimization |
| `next/navigation` | `useRouter` for sign-out redirect in `MobileNav` |
