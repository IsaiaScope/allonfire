// @module-tag unit
import { isIsoDay, utcDayRange } from "../utc-day-range";

describe("utcDayRange", () => {
  it("covers whole UTC days, both ends included", () => {
    const { gte, lt } = utcDayRange({ from: "2026-11-26", to: "2026-11-28" });
    expect(gte.toISOString()).toBe("2026-11-26T00:00:00.000Z");
    expect(lt.toISOString()).toBe("2026-11-29T00:00:00.000Z");
  });

  it("works on a leap day and a month end", () => {
    const leap = utcDayRange({ from: "2028-02-29", to: "2028-02-29" });
    expect(leap.gte.toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(leap.lt.toISOString()).toBe("2028-03-01T00:00:00.000Z");
    const monthEnd = utcDayRange({ from: "2026-12-31", to: "2026-12-31" });
    expect(monthEnd.lt.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("isIsoDay", () => {
  it("accepts a real day and refuses the rest", () => {
    expect(isIsoDay("2026-11-26")).toBe(true);
    expect(isIsoDay("2028-02-29")).toBe(true);
    expect(isIsoDay("2026-02-30")).toBe(false);
    expect(isIsoDay("2026-02-29")).toBe(false);
    expect(isIsoDay("2026-13-01")).toBe(false);
    expect(isIsoDay("yesterday")).toBe(false);
    expect(isIsoDay("2026-1-5")).toBe(false);
    expect(isIsoDay("")).toBe(false);
    expect(isIsoDay("0000-01-01")).toBe(false);
    expect(isIsoDay("0001-01-01")).toBe(true);
  });
});
