import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";

/** Laura's Gallery and Favorites: their tunables, each written once. */
export const GALLERY = {
  /**
   * Both feeds' first page (`galleryHydration`, `favoritesHydration`), kept in
   * the visitor's browser (ADR 0028) until a change to the photos calls
   * `updateTag(TAG)`. The rows hold private links signed for an hour, and a
   * cache never outlives them: gone after an hour (`expire`), read again in
   * the background after half of it (`revalidate`), reused for 5 minutes by
   * another Admin's browser (`stale`). **`TAG` is what Phase 5 clears.**
   */
  CACHE: { LIFE: IMAGE_SERVER.LINK.CACHE_LIFE, TAG: "gallery" },
  DEFAULT: { PAGE_SIZE: 24 },
  /** The first page has no cursor. */
  FIRST_PAGE: null,
  /** The grid's rows per column width: a tile spans `tileSpan(width, height)` of them. */
  GRID: { PRECISION: 40 },
  LIMIT: {
    /** How often the loaded pages' links are asked for again, before they expire. */
    LINK_REFRESH_MS: IMAGE_SERVER.LINK.REFRESH_MS,
    /** How many photos ahead of the open one the preview loads. */
    PREFETCH_AHEAD: 3,
    /** Asks once more after a server or network failure. */
    RETRIES: 1,
  },
  /** "Image ready, tap Share again" shows here: at the toaster's own place it would cover that button. */
  SHARE_READY_TOAST_POSITION: "top-center",
  /** The skeleton draws these tiles, their ratios cycled. */
  SKELETON: { RATIOS: [0.75, 1, 1.333, 0.667], TILES: 24 },
  /** Which list a feed shows: every photo placed in Laura, or the Favorites. */
  SOURCE: { FAVORITES: "favorites", GALLERY: "gallery" },
} as const;
