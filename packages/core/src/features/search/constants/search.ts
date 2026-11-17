import { z } from "zod";

/** A list's search grammar (ADR 0026), the same for every list. */
export const SEARCH = {
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
