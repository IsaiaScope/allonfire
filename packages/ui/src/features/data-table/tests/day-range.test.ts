// @module-tag unit
import { dateOf, rangeOf } from "../utils/day-range";

describe("dateOf", () => {
  it("round-trip a day through the calendar's local date", () => {
    for (const day of ["2026-11-26", "2028-02-29", "2026-01-01"]) {
      expect(rangeOf({ from: dateOf(day) })).toEqual({ from: day, to: day });
    }
  });

  it("reads the day clicked, from the local parts, never shifted by a zone", () => {
    expect(rangeOf({ from: new Date(2026, 10, 26, 0, 0, 0) })?.from).toBe(
      "2026-11-26"
    );
    expect(rangeOf({ from: new Date(2026, 10, 26, 23, 59, 59) })?.from).toBe(
      "2026-11-26"
    );
  });
});

describe("rangeOf", () => {
  it("reads two days as a range", () => {
    expect(
      rangeOf({ from: new Date(2026, 10, 26), to: new Date(2026, 10, 28) })
    ).toEqual({ from: "2026-11-26", to: "2026-11-28" });
  });

  it("reads one day alone as the same day twice", () => {
    expect(rangeOf({ from: new Date(2026, 10, 26) })).toEqual({
      from: "2026-11-26",
      to: "2026-11-26",
    });
  });

  it("reads nothing as no range", () => {
    expect(rangeOf(undefined)).toBeNull();
    expect(rangeOf({})).toBeNull();
  });
});
