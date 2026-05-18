import { describe, expect, it } from "vitest";
import { transcribeStageState } from "./transcribe-view-model";

describe("transcribeStageState", () => {
  it("marks earlier stages done, active stage running, and later stages pending", () => {
    expect(transcribeStageState("metadata", "audio", null)).toBe("done");
    expect(transcribeStageState("deps", "audio", null)).toBe("done");
    expect(transcribeStageState("audio", "audio", null)).toBe("running");
    expect(transcribeStageState("whisper", "audio", null)).toBe("pending");
    expect(transcribeStageState("quality-scan", "quality-scan", null)).toBe(
      "running"
    );
    expect(transcribeStageState("agent", "agent", null)).toBe("running");
    expect(transcribeStageState("acceptance", "acceptance", null)).toBe(
      "running"
    );
    expect(transcribeStageState("agent", "files", null)).toBe("done");
  });

  it("marks the failed stage explicitly", () => {
    expect(transcribeStageState("acceptance", "fail", "acceptance")).toBe(
      "failed"
    );
  });

  it("marks all stages done when transcription is complete", () => {
    expect(transcribeStageState("files", "done", null)).toBe("done");
  });
});
