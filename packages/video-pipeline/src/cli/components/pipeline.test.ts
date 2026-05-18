import { describe, expect, it } from "vitest";
import { pipelineStageRows } from "./pipeline";

const STAGES = [
  {
    detail: [
      "Tool: yt-dlp",
      "Checks: binary available on PATH",
      "Purpose: metadata and media downloads",
    ],
    id: "check",
    label: "Dependencies",
    state: "done" as const,
  },
  {
    detail: "metadata, title, duration, thumbnail",
    id: "info",
    label: "Source",
    state: "done" as const,
  },
  {
    detail: "mp4 download with selected quality cap",
    id: "video",
    label: "Video",
    state: "running" as const,
  },
  {
    detail: "English VTT if available",
    id: "captions",
    label: "Captions",
    state: "pending" as const,
  },
];

describe("pipelineStageRows", () => {
  it("maps stages to reusable status rows", () => {
    expect(pipelineStageRows(STAGES)).toEqual([
      {
        details: [
          "Tool: yt-dlp",
          "Checks: binary available on PATH",
          "Purpose: metadata and media downloads",
        ],
        label: "Dependencies",
        state: "done",
        statusLabel: "Ready",
      },
      {
        details: ["Details: metadata, title, duration, thumbnail"],
        label: "Source",
        state: "done",
        statusLabel: "Ready",
      },
      {
        details: ["Details: mp4 download with selected quality cap"],
        label: "Video",
        state: "running",
        statusLabel: "Working",
      },
      {
        details: ["Details: English VTT if available"],
        label: "Captions",
        state: "pending",
        statusLabel: "Queued",
      },
    ]);
  });

  it("preserves custom status labels and multiple details", () => {
    expect(
      pipelineStageRows([
        {
          detail: ["Current file: video.mp4", "Audio: mono 16 kHz WAV"],
          id: "audio",
          label: "Audio",
          state: "running",
          statusLabel: "Extracting",
        },
      ])
    ).toEqual([
      {
        details: ["Current file: video.mp4", "Audio: mono 16 kHz WAV"],
        label: "Audio",
        state: "running",
        statusLabel: "Extracting",
      },
    ]);
  });

  it("uses state-specific status labels when present", () => {
    expect(
      pipelineStageRows([
        {
          detail: ["Tool: yt-dlp"],
          id: "check",
          label: "Dependencies",
          state: "running",
          statusLabels: {
            pending: "Waiting",
            running: "Checking",
            done: "Verified",
            failed: "Missing",
          },
        },
      ])
    ).toEqual([
      {
        details: ["Tool: yt-dlp"],
        label: "Dependencies",
        state: "running",
        statusLabel: "Checking",
      },
    ]);
  });
});
