// @module-tag unit
import { CHECK, STAGE, STAGE_NAMES } from "../stages";

/** A tool that waits on a person: a UI or a headed browser. */
const INTERACTIVE = /:ui$|headed/;
const scripts = (stage: keyof typeof STAGE) =>
  STAGE[stage].map(({ name }) => name);

describe("STAGE", () => {
  it("holds each Stage's tools, in the order they run", () => {
    expect(scripts("static")).toEqual([
      "static:lint",
      "static:types",
      "static:knip",
      "static:knip-production",
      "static:dupes",
      "static:i18n",
      "static:tailwind",
      "static:design",
      "static:shell",
      "static:migrate-image",
      "static:workflows",
    ]);
    expect(scripts("test")).toEqual([
      "test:services",
      "test:run",
      "test:drift",
    ]);
    expect(scripts("e2e")).toEqual(["test:services", "e2e:browser", "e2e:run"]);
    expect(scripts("build")).toEqual(["build:apps"]);
  });

  it.each(STAGE_NAMES)(
    "%s says why each tool runs, and runs nothing interactive",
    (stage) => {
      for (const tool of STAGE[stage]) {
        expect(tool.why.length).toBeGreaterThan(0);
        expect(tool.name).not.toMatch(INTERACTIVE);
        expect(tool.command).toBe(`pnpm -s run ${tool.name}`);
      }
    }
  );

  it("runs static, test and e2e for a check: what the hook runs", () => {
    expect(CHECK).toEqual(["static", "test", "e2e"]);
  });
});
