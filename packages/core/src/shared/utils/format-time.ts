import { UNIT } from "../constants/units";

const { MS_PER_SECOND, SECONDS_PER_MINUTE } = UNIT;
const MS_PER_CENTISECOND = 10;
const PART_WIDTH = 2;

/** A time cut into minutes, seconds and hundredths of a second (cut down, never rounded up). */
const partsOf = (ms: number) => {
  const seconds = Math.floor(ms / MS_PER_SECOND);
  return {
    hundredths: String(
      Math.floor((ms % MS_PER_SECOND) / MS_PER_CENTISECOND)
    ).padStart(PART_WIDTH, "0"),
    minutes: Math.floor(seconds / SECONDS_PER_MINUTE),
    seconds: seconds % SECONDS_PER_MINUTE,
  };
};

/**
 * A game's clock as `m:ss.cc` always, so a running clock keeps its width and
 * its minutes: `6_250` reads `0:06.25`, `65_030` reads `1:05.03`.
 */
export const formatClock = (ms: number): string => {
  const { hundredths, minutes, seconds } = partsOf(ms);
  return `${minutes}:${String(seconds).padStart(PART_WIDTH, "0")}.${hundredths}`;
};

/**
 * A finished game's time, as short as it can be: `s.cc` under a minute and
 * `m:ss.cc` from one. `19_590` reads `19.59`, `65_030` reads `1:05.03`.
 */
export const formatTime = (ms: number): string => {
  const { hundredths, minutes, seconds } = partsOf(ms);
  return minutes === 0 ? `${seconds}.${hundredths}` : formatClock(ms);
};
