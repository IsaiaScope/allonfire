<h1 align="center">Gallery</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white" alt="TanStack Query" />
  <img src="https://img.shields.io/badge/Framer_Motion-12-FF0055?logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Blurhash-2.0-6366F1?logoColor=white" alt="Blurhash" />
</p>

<p align="center">Photo gallery with masonry grid, infinite scroll, blurhash placeholders, and favorites.</p>

---

<p align="center">
  <img src="../../../../../docs/screenshots/laura-gallery.png" width="600" alt="Gallery" />
  &nbsp;&nbsp;
  <img src="../../../../../docs/screenshots/mobile-laura-gallery.png" width="200" alt="Mobile Gallery" />
</p>

---

## 📁 Directory Structure

```
gallery/
  actions/
    gallery.ts              # Server actions: getPhotos, getFavorites, toggleFavorite, deletePhoto
  hooks/
    use-infinite-gallery.ts # Orchestrator hook: infinite query, preview state, delete, favorite
    use-favorite-toggle.ts  # TanStack mutation with optimistic cache updates for both query keys
    use-photo-preview.ts    # Simple open/close state for the lightbox
    use-heart-animation.ts  # 600ms burst animation timer for the heart icon
  components/
    gallery-client.tsx      # Client wrapper for the main gallery page (/)
    favorites-client.tsx    # Client wrapper for the favorites page (/favorites)
    photo-gallery-view.tsx  # Shared view: masonry grid + sentinel + preview overlay
    masonry-grid.tsx        # Generic JS masonry layout with responsive column count
    photo-card.tsx          # Individual photo tile with blurhash placeholder and heart overlay
    photo-preview.tsx       # Full-screen lightbox with toolbar (favorite, download, copy, share, delete)
    gallery-empty.tsx       # Empty state for main gallery (links to /upload)
    loading-spinner.tsx     # Heart-pulsing loading indicator for infinite scroll
```

---

## 🧩 Component Hierarchy

```
Server Page (fetches initialData)
  GalleryClient / FavoritesClient
    PhotoGalleryView
      MasonryGrid
        PhotoCard (per photo)
      LoadingSpinner (when fetching next page)
      PhotoPreview (when a photo is selected)
    GalleryEmpty / inline empty (when no photos)
```

---

## 🧱 Masonry Grid

`MasonryGrid` is a generic component (`<T>`) that distributes items into columns using a shortest-column algorithm. It does not use CSS columns or CSS masonry -- it measures the viewport with `matchMedia` listeners and distributes items via JS.

Responsive column counts:
- `< 640px`: 2 columns
- `640px+`: 3 columns
- `1024px+`: 4 columns

Before the first client-side measurement (`useColumnCount` returns `null`), it renders `MasonrySkeleton` -- a set of hardcoded Skeleton rectangles matching the grid layout. This avoids a flash when switching from server HTML to client JS masonry.

---

## 📜 Infinite Scroll

`useInfiniteGallery` uses TanStack Query's `useInfiniteQuery` with cursor-based pagination. A sentinel `div` at the bottom of the grid is observed via `IntersectionObserver` (rooted on the layout scroll container via `SCROLL_CONTAINER_SELECTOR`). When the sentinel enters the viewport with a 200px margin, the next page is fetched.

The `initialData` pattern is used: the server page fetches the first page and passes it as `initialData` to the client component, avoiding a loading state on first paint.

---

## ❤️ Favorites System

`useFavoriteToggle` wraps a TanStack `useMutation` with optimistic updates:

1. `onMutate`: cancels in-flight queries, snapshots both `["photos"]` and `["favorites"]` caches, optimistically flips `isFavorite` in the photos cache, and removes unfavorited photos from the favorites cache
2. `onError`: rolls back both caches to the snapshot
3. `onSettled`: only invalidates `["favorites"]` (not `["photos"]`, to avoid refetching all infinite pages)

Server-side, `toggleFavoriteAction` and `deletePhotoAction` both call `checkMutationAccess(auth)` to enforce the viewer role restriction.

---

## 🎨 Blurhash Placeholders

The server action `mapPhoto` converts each photo's stored `blurHash` string to a data URL via `blurHashToDataURL` (from `@allonfire/storage`). This data URL is passed to Next.js `<Image placeholder="blur" blurDataURL={...}>` for instant low-res previews while images load.

---

## 🔍 Photo Preview (Lightbox)

`PhotoPreview` renders a full-screen overlay (`fixed inset-0 z-50`) with:

- **Two-layer image loading**: thumbnail renders instantly (from browser cache), full-res crossfades in with opacity transition when loaded
- **Toolbar**: favorite toggle, download, copy to clipboard, share (Web Share API), delete with confirmation dialog
- **Feature detection**: `navigator.share` and `navigator.clipboard.write` are checked client-side; buttons only render when available
- **Safari clipboard**: copy converts to PNG via canvas with Promise-based `ClipboardItem` to preserve user activation
- **Keyboard**: Escape key closes the preview via a global keydown listener
- **Scroll lock**: `document.body.style.overflow = "hidden"` while open

---

## 🃏 Photo Card

`PhotoCard` renders each tile in the masonry grid:

- Uses `next/image` with `blurDataURL` placeholder and computed aspect ratio
- Heart icon: shows filled red when favorited (visible without hover), unfilled on hover for non-favorites
- Heart burst animation: `useHeartAnimation` triggers a 600ms CSS animation (`animate-heart-burst` + `animate-heart-ring`) when adding to favorites
- Viewer role: when `disabled` is true, the heart button is hidden and a dimmed heart shows for already-favorited photos

---

## 📦 Data Types

`GalleryPhoto` is the client-side shape returned by server actions:

```ts
type GalleryPhoto = {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  blurDataURL: string;
  caption: string | null;
  createdAt: string;
  isFavorite: boolean;
  user: { name: string | null; image: string | null };
};
```

`GalleryPage` wraps a page of photos with a cursor:

```ts
type GalleryPage = {
  photos: GalleryPhoto[];
  nextCursor: string | null;
};
```

---

## 📥 Import Patterns

```ts
// Server actions (used by pages for initialData, by hooks for mutations)
import { getPhotosAction, type GalleryPage } from "@/features/gallery/actions/gallery";

// Client wrappers (used by page.tsx files)
import { GalleryClient } from "@/features/gallery/components/gallery-client";
import { FavoritesClient } from "@/features/gallery/components/favorites-client";

// Hooks (used within gallery components)
import { useInfiniteGallery } from "@/features/gallery/hooks/use-infinite-gallery";
import { useFavoriteToggle } from "@/features/gallery/hooks/use-favorite-toggle";
```

No barrel `index.ts` files -- always import directly from the specific file.
