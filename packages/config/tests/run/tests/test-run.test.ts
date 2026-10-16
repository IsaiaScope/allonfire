// @module-tag unit
import {
  dropWhenRunEnds,
  isStaleTestRun,
  isTestRunOf,
  runsIntegration,
  testRunStamp,
} from "../test-run";

const NOW = new Date("2026-10-09T12:00:00Z");
const EPOCH = NOW.getTime() / 1000;
const HOUR = 3600;
const DAY = 24 * HOUR;

const LIVE_PID = 4242;
const DEAD_PID = 4343;
const isRunning = (pid: number) => pid === LIVE_PID;

it("stamps a run with its epoch seconds, its process and a random suffix", () => {
  expect(testRunStamp(NOW)).toMatch(
    new RegExp(`^${EPOCH}_${process.pid}_[a-z0-9]{6}$`)
  );
});

it.each([
  ["a Test database", "_"],
  ["a bucket", "-"],
])("calls %s stale once its run has ended", (_, separator) => {
  const name = (pid: number) =>
    ["allonfire", "test", "back", "office", EPOCH, pid, "aaaaaa"].join(
      separator
    );
  // Killed: Vitest exits on SIGTERM before any teardown finishes.
  expect(isStaleTestRun(name(DEAD_PID), NOW, isRunning)).toBe(true);
  // `pnpm test:ui` holds its run for a whole working session.
  expect(isStaleTestRun(name(LIVE_PID), NOW, isRunning)).toBe(false);
});

it.each([
  ["a Test database", "_"],
  ["a bucket", "-"],
])(
  "calls %s stale after a day, whoever holds its process number",
  (_, separator) => {
    const name = (epoch: number) =>
      ["allonfire", "test", "back", "office", epoch, LIVE_PID, "aaaaaa"].join(
        separator
      );
    expect(isStaleTestRun(name(EPOCH - DAY - HOUR), NOW, isRunning)).toBe(true);
    expect(isStaleTestRun(name(EPOCH - 8 * HOUR), NOW, isRunning)).toBe(false);
  }
);

it("ages a name without a process, a template's, by its epoch only", () => {
  const template = (epoch: number) => `allonfire_test_template_${epoch}_03d6c9`;
  expect(isStaleTestRun(template(EPOCH - DAY - HOUR), NOW, isRunning)).toBe(
    true
  );
  expect(isStaleTestRun(template(EPOCH - 8 * HOUR), NOW, isRunning)).toBe(
    false
  );
});

it("sees its own process running", () => {
  expect(
    isStaleTestRun(`allonfire_test_api_${EPOCH}_${process.pid}_aaaaaa`, NOW)
  ).toBe(false);
});

it.each(["allonfire", "image", "allonfire_test_api_1_ab12cd_extra"])(
  "never calls %s stale",
  (name) => {
    expect(isStaleTestRun(name, NOW)).toBe(false);
  }
);

it.each([
  ["allonfire_test_e2e_1791907884_p9blh8", "e2e", true],
  ["allonfire_test_e2e_1791907884_4242_p9blh8", "e2e", true],
  ["allonfire-test-back-office-1791907884-4242-p9blh8", "back-office", true],
  ["allonfire-test-e2e-1791907884-p9blh8", "e2e", true],
  ["allonfire-test-back-office-1791907884-p9blh8", "back-office", true],
  ["allonfire_test_back_office_1791907884_p9blh8", "back-office", true],
  ["allonfire_test_e2e_extra_1791907884_p9blh8", "e2e", false],
  ["allonfire_test_template_1791880206_03d6c9", "e2e", false],
  ["allonfire", "e2e", false],
])("says whether %s is a run labelled %s", (name, label, expected) => {
  expect(isTestRunOf(name, label)).toBe(expected);
});

describe("dropWhenRunEnds", () => {
  const SIGNALS = ["SIGHUP"] as const;
  const listeners = () =>
    SIGNALS.map((signal) => process.listenerCount(signal));

  it.each(SIGNALS)(
    "drops on %s, which Vitest never handles, then exits",
    async (signal) => {
      const before = listeners();
      const exit = vi.fn();
      const first = vi.fn().mockResolvedValue(undefined);
      const second = vi.fn().mockRejectedValue(new Error("already gone"));
      dropWhenRunEnds(first, exit);
      dropWhenRunEnds(second, exit);
      process.emit(signal);
      process.emit(signal);
      await vi.waitFor(() => expect(exit).toHaveBeenCalledOnce());
      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
      expect(listeners()).toEqual(before);
    }
  );

  it("drops once when the run ends, and no longer listens", async () => {
    const before = listeners();
    const drop = vi.fn().mockResolvedValue(undefined);
    await dropWhenRunEnds(drop)();
    expect(drop).toHaveBeenCalledOnce();
    expect(listeners()).toEqual(before);
  });
});

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
