import { UNIT } from "@allonfire/core/shared/constants/units";

const PAIRS = 6;

/**
 * What the Memory board and the API agree on: how many cards there are and
 * which games no player could have produced. Shared so the board never sends
 * a score the API refuses.
 */
export const MEMORY_RULE = {
  CARDS: PAIRS * 2,
  MOVES: {
    MAX: 1000,
    /** Matching `PAIRS` pairs takes `PAIRS` moves at the very least. */
    MIN: PAIRS,
  },
  PAIRS,
  TIME: {
    /** One day: fits the `timeMs` column (an Int) many times over. */
    MAX_MS: UNIT.MS_PER_DAY,
    /**
     * The board holds every pair face up 800 ms before it resolves
     * (`GAMES.MEMORY.DELAY.HOLD_MS` in Laura), so a game lasts at least that long per
     * move. The floor sits under the hold so rounding never refuses an honest game.
     */
    MIN_MS_PER_MOVE: 700,
  },
} as const;
