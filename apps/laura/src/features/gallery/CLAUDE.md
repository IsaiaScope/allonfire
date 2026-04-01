# Gallery -- Claude Guide

## Feature Scope

**Owns:** Photo gallery grid, infinite scroll pagination, photo preview lightbox, favorites toggling with optimistic updates, photo deletion, masonry layout, blurhash placeholder rendering, heart burst animation.

**Does not own:** Photo upload (see `features/upload/`), auth/role logic (uses `checkMutationAccess` from `@allonfire/auth/guard` and `useIsViewer` from `@/components/user-role-provider`), database queries (delegates to `@allonfire/database`), image processing/storage (delegates to `@allonfire/storage`), scroll container (uses `SCROLL_CONTAINER_SELECTOR` from `features/layout/constants`).

## File Responsibilities

| File | Purpose |
|------|---------|
| `actions/gallery.ts` | Server actions: `getPhotosAction`, `getFavoritesAction`, `toggleFavoriteAction`, `deletePhotoAction`. Maps DB `PhotoWithUser` to client `GalleryPhoto` with blurhash data URLs. |
| `hooks/use-infinite-gallery.ts` | Orchestrator hook: wires TanStack `useInfiniteQuery`, `IntersectionObserver` sentinel, preview state, delete action, and favorite mutation into a single return object. |
| `hooks/use-favorite-toggle.ts` | TanStack `useMutation` with optimistic cache updates for both `["photos"]` and `["favorites"]` query keys. Rolls back on error, only invalidates favorites on settle. |
| `hooks/use-photo-preview.ts` | Simple `useState<Photo | null>` with `openPreview` / `closePreview` callbacks. |
| `hooks/use-heart-animation.ts` | Manages a 600ms timer for heart burst CSS animation. Returns `{ animating, trigger }`. |
| `components/gallery-client.tsx` | Thin client wrapper for `/` page. Passes `getPhotosAction` and `GalleryEmpty` to `PhotoGalleryView`. |
| `components/favorites-client.tsx` | Thin client wrapper for `/favorites` page. Passes `getFavoritesAction` and inline empty state to `PhotoGalleryView`. |
| `components/photo-gallery-view.tsx` | Shared view component: renders `MasonryGrid` + sentinel div + `PhotoPreview`. Checks `useIsViewer()` for disabling mutations. |
| `components/masonry-grid.tsx` | Generic `<T>` masonry layout. Uses `matchMedia` for responsive column count (2/3/4). Renders `MasonrySkeleton` before first measurement. |
| `components/photo-card.tsx` | Photo tile with `next/image`, blurhash blur placeholder, heart overlay with hover states, heart burst animation. |
| `components/photo-preview.tsx` | Full-screen lightbox: two-layer image (thumbnail + full-res crossfade), toolbar with favorite/download/copy/share/delete. Feature-detects Web Share and Clipboard APIs. |
| `components/gallery-empty.tsx` | Empty state for main gallery with link to `/upload`. |
| `components/loading-spinner.tsx` | Heart-pulsing spinner shown during infinite scroll fetch. Server component (no `"use client"`). |

## Modification Guide

### 1. Add a new toolbar action to the lightbox

1. Add the button inside the toolbar `div` in `components/photo-preview.tsx`
2. Wrap with `Tooltip` + `TooltipTrigger` + `TooltipContent` following the existing pattern
3. Use `e.stopPropagation()` on click to prevent backdrop close
4. If the action requires secure context, feature-detect in the `useEffect` like `canShare`/`canCopy`

### 2. Change masonry column breakpoints

1. Edit the `BREAKPOINTS` array and `DEFAULT_COLUMNS` in `components/masonry-grid.tsx`
2. Update the grid CSS classes on the container div (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`) to match
3. Update `MasonrySkeleton` column visibility classes to match
4. Update `SKELETON_COLUMNS` array length to match the max column count

### 3. Add a new server action

1. Add the async function in `actions/gallery.ts` with `"use server"` (already at file top)
2. Call `checkMutationAccess(auth)` for any write operation
3. Use `mapPhoto` to convert DB results to `GalleryPhoto`
4. Wire it into the appropriate hook or component

### 4. Change pagination behavior

1. Cursor logic is in the database package (`getPhotosPaginated`, `getFavoritesPaginated`)
2. The `rootMargin: "200px"` in `use-infinite-gallery.ts` controls prefetch distance
3. `SCROLL_CONTAINER_SELECTOR` determines the IntersectionObserver root element

## Gotchas

- **Two query keys**: favorites and photos are separate TanStack Query keys (`["photos"]`, `["favorites"]`). `useFavoriteToggle` must update both caches optimistically. On settle, only `["favorites"]` is invalidated -- invalidating `["photos"]` would refetch all loaded infinite scroll pages.

- **Preview stale favorite state**: `useInfiniteGallery` computes `previewPhoto` by merging `currentPhoto` (snapshot at open time) with the latest `isFavorite` from `allPhotos`. Without this, toggling favorite in the preview would not update the heart icon until the preview is closed and reopened.

- **MasonrySkeleton before hydration**: `useColumnCount` returns `null` before the first client-side paint. `MasonryGrid` renders `MasonrySkeleton` in this state to prevent layout shift. The skeleton column visibility classes must match the real grid's responsive classes.

- **Heart burst CSS animations**: `animate-heart-burst` and `animate-heart-ring` are custom Tailwind keyframe animations defined in the app's Tailwind config, not in this feature. The `useHeartAnimation` hook only manages the 600ms timer.

- **Safari clipboard copy**: `photo-preview.tsx` converts images to PNG via canvas and passes a `Promise<Blob>` to `ClipboardItem`. This is required because Safari needs PNG format and the Promise preserves user activation across the async fetch.

- **biome-ignore comments**: `photo-card.tsx` has a sanctioned `biome-ignore lint/a11y/useSemanticElements` because using `div[role="button"]` avoids invalid nested `<button>` elements (the heart toggle is a child button). `photo-preview.tsx` has sanctioned ignores for backdrop click-to-close and keyboard handling patterns.

- **Viewer role disabling**: `PhotoGalleryView` passes `disabled={isViewer}` to both `PhotoCard` and `PhotoPreview`. When disabled, favorite toggle buttons are hidden, delete is grayed out with tooltip, and hearts show dimmed for already-favorited photos.

## Dependencies

| Package | Why |
|---------|-----|
| `@tanstack/react-query` | `useInfiniteQuery` for pagination, `useMutation` for optimistic favorite toggle, `useQueryClient` for cache manipulation |
| `@allonfire/ui` | Button, Skeleton, AlertDialog, Tooltip components and `cn` utility |
| `@allonfire/database` | `getPhotosPaginated`, `getFavoritesPaginated`, `toggleFavorite`, `deletePhoto`, `getFavoritePhotoIds`, `PhotoWithUser` type |
| `@allonfire/storage` | `blurHashToDataURL` for converting stored blurhash to data URL |
| `@allonfire/auth` | `checkMutationAccess` for viewer role guard on write actions |
| `next/image` | Optimized image rendering with blur placeholders |
| `next-intl` | `useTranslations` for i18n strings |
| `lucide-react` | Heart, Copy, Download, Share2, Trash2, Images, Upload icons |
| `sonner` | Toast notifications for copy/download/delete feedback |
