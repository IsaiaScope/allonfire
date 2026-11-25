// @module-tag unit

import { MEMORY_RULE } from "../constants/memory-rule";

it("is 12 cards of 6 pairs", () => {
  expect(MEMORY_RULE.CARDS).toBe(MEMORY_RULE.PAIRS * 2);
});

it("needs at least one move per pair", () => {
  expect(MEMORY_RULE.MOVES.MIN).toBe(MEMORY_RULE.PAIRS);
});
