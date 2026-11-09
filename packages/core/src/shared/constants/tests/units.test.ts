// @module-tag unit
import { UNIT } from "../units";

describe("UNIT", () => {
  it("builds an hour from minutes and a day from hours, in milliseconds", () => {
    expect(UNIT.MS_PER_HOUR).toBe(60 * UNIT.MS_PER_MINUTE);
    expect(UNIT.MS_PER_DAY).toBe(24 * UNIT.MS_PER_HOUR);
  });

  it("keeps the millisecond and second spellings of a day the same length", () => {
    expect(UNIT.MS_PER_DAY).toBe(UNIT.SECONDS_PER_DAY * UNIT.MS_PER_SECOND);
  });
});
