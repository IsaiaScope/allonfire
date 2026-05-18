import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  initMetadata,
  markStageDone,
  markStageFailed,
  type ProjectMetadata,
  readMetadata,
  resetStages,
  updateSourceLanguage,
} from "./metadata";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "video-pipeline-metadata-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function initFakeProject(folder: string): void {
  initMetadata(folder, {
    title: "X",
    slug: "x",
    date: "2026-05-13",
    source: {
      url: "https://youtu.be/x",
      youtubeId: "x",
      title: "X",
      duration: 60,
      thumbnail: undefined,
      language: null,
    },
  });
}

describe("metadata", () => {
  it("initialises a fresh metadata.json with stages all null", () => {
    initMetadata(tmp, {
      title: "FSM Spiegata",
      slug: "fsm-spiegata",
      date: "2026-05-13",
      source: {
        url: "https://youtu.be/abc",
        youtubeId: "abc",
        title: "Why FSMs",
        duration: 743,
        thumbnail: "https://t.example/x.jpg",
        language: null,
      },
    });
    const m = readMetadata(tmp);
    expect(m).not.toBeNull();
    expect(m?.slug).toBe("fsm-spiegata");
    expect(m?.stages).toEqual({
      downloaded: null,
      transcribed: null,
      translated: null,
      overlayed: null,
    });
    expect(m?.source.language).toBeNull();
  });

  it("readMetadata returns null when file missing", () => {
    expect(readMetadata(tmp)).toBeNull();
  });

  it("markStageDone records timestamp on the given stage", () => {
    initFakeProject(tmp);
    markStageDone(tmp, "downloaded");
    const m = readMetadata(tmp) as ProjectMetadata;
    const rec = m.stages.downloaded;
    expect(rec).not.toBeNull();
    if (rec && "at" in rec) {
      expect(rec.at).toMatch(ISO_RE);
    }
    expect(m.stages.transcribed).toBeNull();
  });

  it("markStageFailed records error string + timestamp", () => {
    initFakeProject(tmp);
    markStageFailed(tmp, "transcribed", "whisper crashed");
    const m = readMetadata(tmp) as ProjectMetadata;
    const rec = m.stages.transcribed;
    expect(rec && "failedAt" in rec && rec.error === "whisper crashed").toBe(
      true
    );
  });

  it("updateSourceLanguage persists the detected language", () => {
    initFakeProject(tmp);
    updateSourceLanguage(tmp, "en");
    const m = readMetadata(tmp) as ProjectMetadata;
    expect(m.source.language).toBe("en");
  });

  it("resetStages clears stale downstream stage records", () => {
    initFakeProject(tmp);
    markStageDone(tmp, "translated");
    markStageDone(tmp, "overlayed");

    resetStages(tmp, ["translated", "overlayed"]);

    const m = readMetadata(tmp) as ProjectMetadata;
    expect(m.stages.translated).toBeNull();
    expect(m.stages.overlayed).toBeNull();
  });
});
