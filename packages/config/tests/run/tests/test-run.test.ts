// @module-tag unit
import { isStaleTestRun, runsIntegration, testRunStamp } from "../test-run";

const NOW = new Date("2026-10-09T12:00:00Z");
const EPOCH = NOW.getTime() / 1000;
const HOUR = 3600;
const DAY = 24 * HOUR;

it("stamps a run with its epoch seconds and a random suffix", () => {
  expect(testRunStamp(NOW)).toMatch(new RegExp(`^${EPOCH}_[a-z0-9]{6}$`));
});

it.each([
  ["a Test database", "_"],
  ["a bucket", "-"],
])("calls %s stale only after a day", (_, separator) => {
  const name = (epoch: number) =>
    ["allonfire", "test", "back", "office", epoch, "aaaaaa"].join(separator);
  expect(isStaleTestRun(name(EPOCH - DAY - HOUR), NOW)).toBe(true);
  // `pnpm test:ui` holds its run for a whole working session.
  expect(isStaleTestRun(name(EPOCH - 8 * HOUR), NOW)).toBe(false);
});

it.each(["allonfire", "image", "allonfire_test_api_1_ab12cd_extra"])(
  "never calls %s stale",
  (name) => {
    expect(isStaleTestRun(name, NOW)).toBe(false);
  }
);

describe("runsIntegration", () => {
  it("is true with no tag filter", () => {
    expect(runsIntegration(undefined)).toBe(true);
    expect(runsIntegration([])).toBe(true);
  });

  it("is false for a unit-only run", () => {
    expect(runsIntegration(["unit"])).toBe(false);
  });

  it("is true when the filter names integration", () => {
    expect(runsIntegration(["integration"])).toBe(true);
  });

  it("is true for any filter it cannot prove unit-only", () => {
    expect(runsIntegration(["!unit"])).toBe(true);
    expect(runsIntegration(["unit || integration"])).toBe(true);
    expect(runsIntegration(["integration && !slow"])).toBe(true);
  });
});
