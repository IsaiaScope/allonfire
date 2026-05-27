import { describe, expect, it } from "vitest";
import {
  type OverlayViewState,
  overlayInfoDetails,
  overlayPipelineStages,
  overlayProgressStep,
  overlayStageState,
  overlaySuccessDetails,
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
    expect(overlayProgressStep(96, "Rendering overlay clips")).toBe("render");
    expect(
      overlayProgressStep(
        96,
        "Rendering 16:9 and 9:16 overlay clips and videos"
      )
    ).toBe("render");
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
      "Strategy: transcript moment scout, sampled frames, video-ready overlay scenes",
      "Overlay count: 5",
      "Input: transcript.md",
      "Input: script-it.md",
      "Writes: overlay.md",
      "Writes: overlays/overlay-spec.json",
      "Writes: overlays/clips/16x9 and 9x16",
      "Writes: overlays/videos/16x9 and 9x16",
      "Artifacts: .overlay-watch/",
      "Folder: /work/project/raw",
    ]);
  });

  it("does not point users to a single final overlay video", () => {
    const details = overlayInfoDetails({
      count: 5,
      folder: "/work/project/raw",
      force: true,
      state: baseState,
    });
    const successDetails = overlaySuccessDetails("/work/project/raw", {
      ...baseState,
      step: "done",
    });

    expect(details.join("\n")).not.toContain("final-overlay.mp4");
    expect(successDetails.join("\n")).not.toContain("final-overlay.mp4");
    expect(successDetails).toContain("Output: ✓ overlays/videos/16x9 + 9x16");
    expect(successDetails).toContain(
      'Next: review "/work/project/overlays/videos"'
    );
  });
});
