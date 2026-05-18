import { describe, expect, it } from "vitest";
import { translateStageState } from "./translate-view-model";

describe("translateStageState", () => {
  it("marks earlier stages done, active stage running, and later stages pending", () => {
    expect(translateStageState("project", "script", null)).toBe("done");
    expect(translateStageState("transcript", "script", null)).toBe("done");
    expect(translateStageState("script", "script", null)).toBe("running");
    expect(translateStageState("files", "script", null)).toBe("pending");
  });

  it("marks the failed stage explicitly", () => {
    expect(translateStageState("agent", "fail", "agent")).toBe("failed");
  });

  it("marks all stages done when translation is complete", () => {
    expect(translateStageState("files", "done", null)).toBe("done");
  });
});
