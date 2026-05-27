import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initMetadata } from "../lib/metadata";
import { transcriptJsonPath, transcriptPath } from "../lib/paths";
import {
  buildFrameExtractionArgs,
  hasUsefulVisualEvidence,
  readTranscriptMoments,
  selectMomentCandidates,
} from "./overlay-watch";

let folder: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "video-pipeline-overlay-watch-"));
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe("overlay moment scout", () => {
  it("reads timestamped moments from transcript.json first", () => {
    writeFileSync(
      transcriptJsonPath(folder),
      JSON.stringify({
        segments: [
          { startTime: 10, endTime: 14, text: "Look at this dashboard." },
          { startTime: 30, endTime: 34, text: "Plain narration." },
        ],
      })
    );
    writeFileSync(transcriptPath(folder), "[00:00:01] ignored\n");

    expect(readTranscriptMoments(folder)).toEqual([
      { startTime: 10, endTime: 14, text: "Look at this dashboard." },
      { startTime: 30, endTime: 34, text: "Plain narration." },
    ]);
  });

  it("falls back to timestamped transcript.md when transcript.json is missing", () => {
    writeFileSync(
      transcriptPath(folder),
      "# Transcript\n\n[00:00:05] First moment.\n\n[00:00:12] Second moment.\n"
    );

    expect(readTranscriptMoments(folder)).toEqual([
      { startTime: 5, endTime: 12, text: "First moment." },
      { startTime: 12, endTime: 17, text: "Second moment." },
    ]);
  });

  it("selects at most 18 non-overlapping candidate moments", () => {
    const moments = Array.from({ length: 30 }, (_, index) => ({
      endTime: index * 20 + 6,
      startTime: index * 20,
      text: `Look at dashboard ${index}.`,
    }));

    const selected = selectMomentCandidates(moments);

    expect(selected).toHaveLength(18);
    expect(selected[0]).toMatchObject({
      id: "moment-001",
      reason: "visual cue: look/show/see; visual cue: screen/ui",
      timestamp: "00:00:00",
    });
    expect(
      selected.every((moment, index) => {
        if (index === 0) {
          return true;
        }
        return moment.startTime - selected[index - 1].startTime >= 12;
      })
    ).toBe(true);
  });

  it("keeps a baseline scan when no visual keywords are present", () => {
    const selected = selectMomentCandidates(
      Array.from({ length: 10 }, (_, index) => ({
        endTime: index * 20 + 4,
        startTime: index * 20,
        text: `Narration ${index}.`,
      }))
    );

    expect(selected).toHaveLength(6);
    expect(selected[0].reason).toBe("baseline transcript scan");
  });
});

describe("overlay frame extraction", () => {
  it("builds ffmpeg args for a single sampled frame", () => {
    expect(
      buildFrameExtractionArgs("/tmp/video.mp4", 12.345, "/tmp/out.jpg")
    ).toEqual([
      "-nostdin",
      "-ss",
      "12.345",
      "-i",
      "/tmp/video.mp4",
      "-frames:v",
      "1",
      "-q:v",
      "2",
      "-y",
      "/tmp/out.jpg",
    ]);
  });
});

describe("visual evidence classification", () => {
  it("recognizes useful visual evidence from the scout marker", () => {
    expect(
      hasUsefulVisualEvidence(
        "useful_visual_evidence: yes\n\n## 00:00:10\nObserved dashboard card."
      )
    ).toBe(true);
    expect(
      hasUsefulVisualEvidence(
        "useful_visual_evidence: no\n\nNo relevant source overlays."
      )
    ).toBe(false);
  });
});

describe("overlay visual scan artifacts", () => {
  it("writes a moment plan from transcript candidates", async () => {
    const { createMomentPlan } = await import("./overlay-watch");
    initMetadata(folder, {
      date: "2026-05-15",
      slug: "overlay-watch",
      source: {
        duration: 120,
        language: null,
        title: "Overlay Watch",
        url: "https://www.youtube.com/watch?v=7zxIeRWasbc",
        youtubeId: "7zxIeRWasbc",
      },
      title: "Overlay Watch",
    });
    writeFileSync(
      transcriptJsonPath(folder),
      JSON.stringify({
        segments: [
          { startTime: 4, endTime: 8, text: "Here is the dashboard." },
        ],
      })
    );

    const plan = createMomentPlan(folder);

    expect(plan.moments).toHaveLength(1);
    expect(existsSync(join(folder, ".overlay-watch", "moment-plan.json"))).toBe(
      true
    );
    expect(
      readFileSync(join(folder, ".overlay-watch", "moment-plan.json"), "utf-8")
    ).toContain("Here is the dashboard.");
  });
});
