import { describe, expect, it } from "vitest";
import {
  audioPath,
  captionsPath,
  legacyRealTitleVideoFileName,
  lockPath,
  metadataPath,
  overlayPath,
  projectFolder,
  projectFolderFromName,
  scriptItPath,
  transcriptItPath,
  transcriptJsonPath,
  transcriptPath,
  videoFileName,
  videoPath,
} from "./paths";

const WORK = "/work";

describe("paths", () => {
  it("computes project folder from an existing project name", () => {
    expect(projectFolderFromName(WORK, "2026-05-13-fsm-spiegata")).toBe(
      "/work/2026-05-13-fsm-spiegata/raw"
    );
  });

  it("computes project folder under <work>/<date>-<slug>/raw", () => {
    expect(projectFolder(WORK, "2026-05-13", "fsm-spiegata")).toBe(
      "/work/2026-05-13-fsm-spiegata/raw"
    );
  });

  it("computes a video file name from the source title", () => {
    expect(videoFileName("Perché così è 🔥!")).toBe("perche-cosi-e.mp4");
  });

  it("keeps legacy real-title filename generation available for fallback", () => {
    expect(legacyRealTitleVideoFileName("Perché così è 🔥!")).toBe(
      "Perché così è 🔥!.mp4"
    );
    expect(legacyRealTitleVideoFileName('A/B: "test"')).toBe("A-B- -test.mp4");
  });

  it("computes per-artifact paths inside the project folder", () => {
    const f = "/work/2026-05-13-x";
    expect(videoPath(f)).toBe("/work/2026-05-13-x/video.mp4");
    expect(videoPath(f, "Real Video Title")).toBe(
      "/work/2026-05-13-x/real-video-title.mp4"
    );
    expect(audioPath(f)).toBe("/work/2026-05-13-x/audio.wav");
    expect(captionsPath(f, "en")).toBe("/work/2026-05-13-x/captions-en.vtt");
    expect(transcriptPath(f)).toBe("/work/2026-05-13-x/transcript.md");
    expect(transcriptJsonPath(f)).toBe("/work/2026-05-13-x/transcript.json");
    expect(transcriptItPath(f)).toBe("/work/2026-05-13-x/transcript-it.md");
    expect(scriptItPath(f)).toBe("/work/2026-05-13-x/script-it.md");
    expect(overlayPath(f)).toBe("/work/2026-05-13-x/overlay.md");
    expect(metadataPath(f)).toBe("/work/2026-05-13-x/metadata.json");
    expect(lockPath(f)).toBe("/work/2026-05-13-x/.lock");
  });
});
