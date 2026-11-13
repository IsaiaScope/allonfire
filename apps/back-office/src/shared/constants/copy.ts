import { UNIT } from "@allonfire/core/shared/constants/units";

/** What copying a value on a click says, and for how long. */
export const COPY = {
  /** How long the tip stays open on "copied" (a touch never hovers). */
  COPIED_MS: 2 * UNIT.MS_PER_SECOND,
} as const;
