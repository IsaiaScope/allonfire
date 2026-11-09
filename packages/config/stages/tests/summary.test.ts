// @module-tag unit
import { stageSummary, testCount, turboCache } from "../summary";

describe("stageSummary", () => {
  const passed = {
    firstLines: [],
    ms: 1500,
    name: "static:knip",
    output: "",
    status: "passed",
  } as const;
  const failed = {
    firstLines: ["error: unused export"],
    ms: 250,
    name: "static:dupes",
    output: "",
    status: "failed",
    tests: 12,
    turbo: { cached: 3, ran: 1 },
  } as const;

  it("has one row per tool: status, seconds, tests and Turbo's cache", () => {
    const md = stageSummary("static", [passed, failed]);
    expect(md).toContain("| static:knip | ✔ passed | 1.5 s |");
    expect(md).toContain(
      "| static:dupes | ✖ failed | 0.3 s | 12 | 3 cached / 1 ran |"
    );
  });

  it("follows a failure with its first lines and the run's link", () => {
    const md = stageSummary("static", [failed], {
      url: "https://example.test/run/1",
    });
    expect(md).toContain("```\nerror: unused export\n```");
    expect(md).toContain("https://example.test/run/1");
  });
});

describe("testCount", () => {
  it("adds Vitest's and Playwright's passed counts", () => {
    expect(
      testCount("      Tests  158 passed (158)\n   322 passed (2.5m)\n")
    ).toBe(480);
  });

  it("is undefined when the output names no tests", () => {
    expect(testCount("Checked 831 files")).toBeUndefined();
  });
});

describe("turboCache", () => {
  it("counts Turbo's cache hits and misses in a run summary", () => {
    expect(
      turboCache(
        '{"tasks":[{"cache":{"status":"HIT"}},{"cache":{"status":"MISS"}},{"cache":{"status":"HIT"}}]}'
      )
    ).toEqual({ cached: 2, ran: 1 });
  });
});
