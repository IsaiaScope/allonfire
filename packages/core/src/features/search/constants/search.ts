import { z } from "zod";

/** A list's search grammar (ADR 0026), the same for every list. */
export const SEARCH = {
  /** A keyset cursor (`keysetCursor`): `<epoch ms>.<id>`. */
  CURSOR: {
    /** The longest cursor text: 16 digits, the dot and a 64-character id. */
    MAX_LENGTH: 81,
    /** What a cursor looks like, before its time is checked. */
    PATTERN: /^\d{1,16}\.[A-Za-z0-9_-]{1,64}$/,
  },
  /** The directions a sort goes. */
  DIRECTION: ["asc", "desc"],
  /** The first day a range holds: the database has no year 0000. */
  FIRST_DAY: "0001-01-01",
  /** A list's sort (ADR 0031). */
  SORT: {
    /** More than this many sorts are cut. */
    MAX: 3,
  },
  /** The field the free words are written under: `input:alice`. */
  TEXT_FIELD: "input",
} as const;

export const directionSchema = z.enum(SEARCH.DIRECTION);
export type Direction = z.infer<typeof directionSchema>;
