// @module-tag unit

import { UNIT } from "@allonfire/core/shared/constants/units";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import { QUERY } from "@/shared/constants/query";
import { GAMES } from "../games";

const UNIT_KEY = /_(MS|PX)$/;

describe("GAMES", () => {
  it("keeps every unit inside a group, never at an owner's top", () => {
    expect(objectKeys(GAMES).filter((key) => UNIT_KEY.test(key))).toEqual([]);
    expect(
      objectKeys(GAMES.MEMORY).filter((key) => UNIT_KEY.test(key))
    ).toEqual([]);
  });

  it("holds a pair at least as long as the API's floor per move, so the board cannot send a score the API refuses", () => {
    expect(GAMES.MEMORY.DELAY.HOLD_MS).toBeGreaterThanOrEqual(
      MEMORY_RULE.TIME.MIN_MS_PER_MOVE
    );
  });

  it("offers only layouts of the whole deck", () => {
    for (const { cols, rows } of GAMES.MEMORY.LAYOUTS) {
      expect(cols * rows).toBe(MEMORY_RULE.CARDS);
    }
  });

  it("keeps the leaderboard no longer than its links live, and never reads it fresher than 5 minutes", () => {
    expect(GAMES.CACHE.LIFE.expire).toBeLessThanOrEqual(
      IMAGE_SERVER.LINK.PRIVATE_HOURS * UNIT.SECONDS_PER_HOUR
    );
    expect(GAMES.CACHE.LIFE.stale).toBeGreaterThanOrEqual(
      5 * UNIT.SECONDS_PER_MINUTE
    );
  });

  it("keeps a deck's key outside the prefix a change refreshes", () => {
    expect(QUERY.GAMES.DECK(0)[0]).not.toBe(QUERY.GAMES.ALL[0]);
    expect(QUERY.GAMES.DECK(0)).not.toEqual(QUERY.GAMES.DECK(1));
  });

  it("keeps the leaderboard's key inside it", () => {
    expect(QUERY.GAMES.LEADERBOARD.slice(0, QUERY.GAMES.ALL.length)).toEqual(
      QUERY.GAMES.ALL
    );
  });
});
