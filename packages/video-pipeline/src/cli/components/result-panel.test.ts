import { describe, expect, it } from "vitest";
import { resultPanelColor, resultPanelState } from "./result-panel";

describe("result panel helpers", () => {
  it("maps tones to status colors", () => {
    expect(resultPanelColor("success")).toBe("green");
    expect(resultPanelColor("error")).toBe("red");
    expect(resultPanelColor("warning")).toBe("yellow");
    expect(resultPanelColor("info")).toBe("cyan");
  });

  it("maps tones to detail-list states", () => {
    expect(resultPanelState("success")).toBe("done");
    expect(resultPanelState("error")).toBe("failed");
    expect(resultPanelState("warning")).toBe("running");
    expect(resultPanelState("info")).toBe("pending");
  });
});
