import type { OceanArtKey } from "@allonfire/design/designs/ocean/mascot-art";
import { MASCOT } from "@/shared/constants/mascots";
import type { Tone } from "./tone";

/** A podium place of the leaderboard. */
export type Place = 1 | 2 | 3;

/**
 * Everything a podium place is told by: its colour medal (gold, silver,
 * bronze), the trophy on its step and the tint of its figures.
 */
export const PODIUM = {
  1: {
    medal: MASCOT.GAMES.MEDAL_FIRST,
    tone: "warning",
    trophy: MASCOT.GAMES.BADGE_RECORD,
  },
  2: {
    medal: MASCOT.GAMES.MEDAL_SILVER,
    tone: "primary",
    trophy: MASCOT.GAMES.TROPHY_SILVER,
  },
  3: {
    medal: MASCOT.GAMES.MEDAL_BRONZE,
    tone: "success",
    trophy: MASCOT.GAMES.TROPHY_BRONZE,
  },
} as const satisfies Record<
  Place,
  { medal: OceanArtKey; tone: Tone; trophy: OceanArtKey }
>;

/** The podium place of a rank, or `null` from the fourth on. */
export const placeOf = (rank: number): Place | null =>
  rank === 1 || rank === 2 || rank === 3 ? rank : null;
