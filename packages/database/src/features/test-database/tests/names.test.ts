// @module-tag unit
import { isStaleTestRun } from "@allonfire/config/tests/run/test-run";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { templateName, testDatabaseName } from "../names";

const NOW = new Date("2026-10-09T12:00:00Z");
const EPOCH = NOW.getTime() / UNIT.MS_PER_SECOND;

describe("Test database names", () => {
  it("names a clone by label and stamp, safe unquoted", () => {
    expect(testDatabaseName("back-office", "1760011200_ab12cd")).toBe(
      "allonfire_test_back_office_1760011200_ab12cd"
    );
  });

  it("names a template by its build time and fingerprint, stale after a day", () => {
    const name = templateName("ab12cd", EPOCH - 2 * UNIT.SECONDS_PER_DAY);
    expect(name).toBe(
      `allonfire_test_template_${EPOCH - 2 * UNIT.SECONDS_PER_DAY}_ab12cd`
    );
    expect(isStaleTestRun(name, NOW)).toBe(true);
  });

  it("refuses a label or stamp Postgres would need quoted", () => {
    expect(() => testDatabaseName("api; DROP", "1_abcdef")).toThrow();
    expect(() => testDatabaseName("api", "1_ABCDEF")).toThrow();
  });
});
