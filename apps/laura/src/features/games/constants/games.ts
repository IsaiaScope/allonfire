import { OCEAN_CARD_BACK } from "@allonfire/design/designs/ocean/card-back";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";

/** Laura's Memory game and its leaderboard: their tunables, each written once. */
export const GAMES = {
  /**
   * The leaderboard (`leaderboardHydration`), kept in the visitor's browser
   * (ADR 0028) until a score calls `updateTag(TAG)`. The rows hold Avatar
   * links signed for an hour, so the cache never outlives them: gone after an
   * hour, read again in the background after half, reused 5 minutes by
   * another browser.
   */
  CACHE: { LIFE: IMAGE_SERVER.LINK.CACHE_LIFE, TAG: "games" },
  LEADERBOARD: {
    RETRIES: 1,
    /** How many tiles a stats column holds (the skeleton draws as many). */
    STATS_PER_GROUP: 5,
  },
  MEMORY: {
    CARD: {
      MIN_TARGET_PX: 44,
      /**
       * The smallest a card is drawn: below it a window that shrinks (a zoom
       * in, a short window) makes the page scroll instead of the cards tiny.
       */
      MIN_WIDTH_PX: 80,
      RATIO: OCEAN_CARD_BACK.WIDTH / OCEAN_CARD_BACK.HEIGHT,
    },
    DECK: { RETRIES: 1 },
    DELAY: {
      /** How often the clock on the board is read: a hundredth of a second, the precision it shows. */
      CLOCK_MS: 10,
      /** How long a pair rests face up before it resolves: a game rule, not an animation. */
      HOLD_MS: 800,
    },
    /** The ways 12 cards lie in a room, each as columns by rows. */
    LAYOUTS: [
      { cols: 3, rows: 4 },
      { cols: 4, rows: 3 },
      { cols: 6, rows: 2 },
    ],
    SIZE: { GAP_PX: { LANDSCAPE: 8, PORTRAIT: 6 } },
  },
  /** Why a score was not saved: what the action tells the dialog. */
  SUBMIT_ERROR: {
    FAILED: "failed",
    IMPLAUSIBLE: "implausible",
    REFUSED: "refused",
  },
} as const;
