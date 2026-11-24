const GALLERY = "gallery";

/**
 * Laura's TanStack Query keys, every feature's in one place: a page that
 * prefetches on the server and the component that reads it back share a key
 * only when both build it here.
 */
export const QUERY = {
  FAVORITES: {
    /** The prefix of the Favorites feed. */
    ALL: [GALLERY, "favorites"],
    /** The Favorites, page after page. */
    FEED: [GALLERY, "favorites", "feed"],
  },
  GALLERY: {
    /** The prefix every Gallery key starts with, the Favorites' too: what Phase 5 invalidates. */
    ALL: [GALLERY],
    /** The Gallery, page after page. */
    FEED: [GALLERY, "feed"],
  },
} as const;
