import { UNIT } from "../constants/units";

const DECIMALS = 2;
const UNITS = ["MB", "GB", "TB"] as const;

/**
 * A size in bytes as people read it, one syntax everywhere: megabytes with two
 * decimals (`0.03 MB`, `5.00 MB`), or gigabytes, then terabytes, once the
 * number would pass 1024. Never bytes or kilobytes, so a column lines up.
 */
export const formatSize = (bytes: number): string => {
  let value = bytes / UNIT.BYTES_PER_MIB;
  let unit = 0;
  while (value >= UNIT.BYTES_PER_KIB && unit < UNITS.length - 1) {
    value /= UNIT.BYTES_PER_KIB;
    unit += 1;
  }
  return `${value.toFixed(DECIMALS)} ${UNITS[unit]}`;
};
