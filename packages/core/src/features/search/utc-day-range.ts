import { PATTERN } from "../../shared/constants/patterns";
import { UNIT } from "../../shared/constants/units";
import { SEARCH } from "./constants/search";

/** Whole UTC days, both ends included: `YYYY-MM-DD`, `from <= to`. */
export type DayRange = { from: string; to: string };

/** A day written as `YYYY-MM-DD` that exists (`2026-02-30` does not) and the database holds (`0000-01-01` does not). */
export const isIsoDay = (day: string): boolean => {
  if (!PATTERN.ISO_DAY.test(day) || day < SEARCH.FIRST_DAY) {
    return false;
  }
  const at = new Date(`${day}T00:00:00.000Z`);
  return !Number.isNaN(at.getTime()) && at.toISOString().startsWith(day);
};

/** The instants a range holds: from the first day's start up to the day after the last. */
export const utcDayRange = ({
  from,
  to,
}: DayRange): { gte: Date; lt: Date } => ({
  gte: new Date(`${from}T00:00:00.000Z`),
  lt: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + UNIT.MS_PER_DAY),
});
