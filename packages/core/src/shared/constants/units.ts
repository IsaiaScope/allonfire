const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const BYTES_PER_KIB = 1024;

/** How many of one unit make another: time in seconds and milliseconds, size in bytes. */
export const UNIT = {
  BYTES_PER_KIB,
  BYTES_PER_MIB: 1024 * BYTES_PER_KIB,
  DAYS_PER_YEAR: 365,
  MS_PER_MINUTE: SECONDS_PER_MINUTE * MS_PER_SECOND,
  MS_PER_SECOND,
  SECONDS_PER_DAY: 24 * SECONDS_PER_HOUR,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} as const;
