import type { DayRange } from "@allonfire/core/features/search/utc-day-range";

const pad = (part: number) => String(part).padStart(2, "0");

/** The day a calendar's `Date` shows, from its local parts: the day clicked is the day stored. */
const dayOf = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** A stored day as the calendar's own local `Date`. */
export const dateOf = (day: string): Date => {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
};

/**
 * What the calendar selected as a range: both days, or the one day alone
 * (`from === to`) while the second is still to be picked; nothing when it was
 * cleared.
 */
export const rangeOf = (
  selected: { from?: Date | undefined; to?: Date | undefined } | undefined
): DayRange | null => {
  if (!selected?.from) {
    return null;
  }
  const from = dayOf(selected.from);
  return { from, to: selected.to ? dayOf(selected.to) : from };
};
