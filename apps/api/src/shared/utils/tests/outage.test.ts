import { describe, expect, it } from "vitest";
import { captureLog } from "../../../features/logger/tests/capture";
import { outageLatch } from "../outage";

describe("outageLatch", () => {
  it("logs the first failure and the first recovery, nothing in between", () => {
    const { lines, logger } = captureLog();
    const latch = outageLatch(logger, { down: "down", recovered: "up" });

    latch.ok();
    latch.fail(new Error("1"));
    latch.fail(new Error("2"));
    latch.ok();
    latch.ok();
    latch.fail(new Error("3"));

    expect(lines.map((line) => line.msg)).toEqual(["down", "up", "down"]);
  });
});
