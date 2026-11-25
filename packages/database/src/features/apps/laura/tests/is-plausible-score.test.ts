// @module-tag unit

import { MEMORY_RULE } from "../constants/memory-rule";
import { isPlausibleScore } from "../utils/is-plausible-score";

describe("isPlausibleScore", () => {
  it.each([
    [{ moves: 6, timeMs: 6 * MEMORY_RULE.TIME.MIN_MS_PER_MOVE }, true],
    [{ moves: 5, timeMs: 60_000 }, false], // 12 cards need 6 moves at least
    [{ moves: 6, timeMs: 6 * MEMORY_RULE.TIME.MIN_MS_PER_MOVE - 1 }, false], // faster than the board lets a pair rest
    [{ moves: 10, timeMs: MEMORY_RULE.TIME.MAX_MS }, true],
    [{ moves: 10, timeMs: MEMORY_RULE.TIME.MAX_MS + 1 }, false],
    [
      { moves: MEMORY_RULE.MOVES.MAX + 1, timeMs: MEMORY_RULE.TIME.MAX_MS },
      false,
    ],
    [{ moves: 6.5, timeMs: 10_000 }, false],
    [{ moves: 6, timeMs: Number.NaN }, false],
  ])("%j is plausible: %s", (score, expected) => {
    expect(isPlausibleScore(score)).toBe(expected);
  });
});
