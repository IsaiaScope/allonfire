import { describe, expect, it } from "vitest";
import {
  type OverlayViewState,
  overlayInfoDetails,
  overlayPipelineStages,
  overlayProgressStep,
  overlayStageState,
} from "./overlay-view-model";

const baseState: OverlayViewState = {
  agent: "claude",
  errorMsg: null,
  failedStep: null,
  message: "Starting",
  pct: 0,
  projectSlug: "project-slug",
  projectTitle: "Project Title",
  sourceTitle: "Source Title",
  step: "project",
  usefulVisualEvidence: null,
};

describe("overlay view model", () => {
  it("maps progress messages to overlay stages", () => {
    expect(overlayProgressStep(20, "Moment scout selected 8 moments")).toBe(
      "moments"
    );
    expect(
      overlayProgressStep(35, "Extracting targeted source-video frames")
    ).toBe("frames");
    expect(
      overlayProgressStep(
        65,
        "Inspecting sampled frames for visual inspiration"
      )
    ).toBe("visual");
    expect(overlayProgressStep(90, "Generating overlay library")).toBe(
      "library"
    );
  });

  it("marks earlier stages done, active stage running, and later stages pending", () => {
    expect(overlayStageState("project", "frames", null)).toBe("done");
    expect(overlayStageState("moments", "frames", null)).toBe("done");
    expect(overlayStageState("frames", "frames", null)).toBe("running");
    expect(overlayStageState("visual", "frames", null)).toBe("pending");
  });

  it("shows visual evidence status when known", () => {
    const stages = overlayPipelineStages({
      ...baseState,
      step: "library",
      usefulVisualEvidence: false,
    });

    expect(stages.find((stage) => stage.id === "visual")).toMatchObject({
      state: "done",
      statusLabel: "No signal",
    });
  });

  it("describes the overlay package details", () => {
    expect(
      overlayInfoDetails({
        count: 5,
        folder: "/work/project/raw",
        force: true,
        state: baseState,
      })
    ).toEqual([
      "Project: Project Title",
      "Slug: project-slug",
      "Source: Source Title",
      "Agent: claude",
      "Run mode: force redo",
      "Strategy: transcript moment scout, sampled frames, overlay library",
      "Overlay count: 5",
      "Input: transcript.md",
      "Input: script-it.md",
      "Writes: overlay.md",
      "Artifacts: .overlay-watch/",
      "Folder: /work/project/raw",
    ]);
  });
});
