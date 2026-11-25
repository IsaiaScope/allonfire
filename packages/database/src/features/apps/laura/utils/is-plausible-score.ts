import { MEMORY_RULE } from "../constants/memory-rule";

/**
 * Whether a game could have been played: whole numbers, at least the fewest
 * moves, at most the most, and not faster than the board lets a pair rest.
 * A cheater with believable numbers passes: the leaderboard is for a couple,
 * and this refuses only the impossible.
 */
export function isPlausibleScore({
  moves,
  timeMs,
}: {
  moves: number;
  timeMs: number;
}): boolean {
  return (
    Number.isInteger(moves) &&
    Number.isInteger(timeMs) &&
    moves >= MEMORY_RULE.MOVES.MIN &&
    moves <= MEMORY_RULE.MOVES.MAX &&
    timeMs >= moves * MEMORY_RULE.TIME.MIN_MS_PER_MOVE &&
    timeMs <= MEMORY_RULE.TIME.MAX_MS
  );
}
