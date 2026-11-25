const GALLERY = "gallery";
const GAMES = "games";

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
  GAMES: {
    /** The prefix of what a score changes: the leaderboard. */
    ALL: [GAMES],
    /**
     * One draw of Memory's deck. Outside `ALL` on purpose: `ALL` is what a
     * change refreshes, and a score never redraws a board under the player.
     */
    DECK: (round: number) => ["memory-deck", round] as const,
    /** The leaderboard, the caller's place and the totals: one body. */
    LEADERBOARD: [GAMES, "leaderboard"],
  },
} as const;
