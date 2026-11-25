import { UNIT } from "@allonfire/core/shared/constants/units";

/** How the Memory scores are saved. */
export const MEMORY_SCORE = {
  LIMIT: {
    /**
     * How long a game with the very same moves and time (to the millisecond)
     * is taken for the game already saved, sent again after its answer was
     * lost, and not for a new one. Two real games never tie to the
     * millisecond within 30 seconds.
     */
    REPEAT_WINDOW_MS: 30 * UNIT.MS_PER_SECOND,
  },
} as const;
