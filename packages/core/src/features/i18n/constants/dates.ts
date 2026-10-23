const DAY = "day";

/**
 * How every App prints dates. One time zone, so the server and the browser
 * print the same day and hydration never disagrees; named formats, so a page
 * says which (`format.dateTime(date, DATE.FORMAT.DAY)`) and never spells out
 * the options. Core's next-intl request config hands both to every App.
 */
export const DATE = {
  FORMAT: { DAY },
  /** next-intl's `formats`: each name with its `Intl.DateTimeFormat` options. */
  FORMATS: {
    dateTime: { [DAY]: { dateStyle: "medium" } },
  },
  TIME_ZONE: "UTC",
} as const satisfies {
  FORMATS: { dateTime: Record<string, Intl.DateTimeFormatOptions> };
  FORMAT: Record<string, string>;
  TIME_ZONE: string;
};
