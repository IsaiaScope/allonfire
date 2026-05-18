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
import { captionsPath, transcriptJsonPath, transcriptPath } from "../lib/paths";
import {
  buildWhisperArgs,
  findWhisperBinary,
  formatTimestamp,
  localAsrCandidateOrder,
  parseCurlDownloadPercent,
  parseWhisperJson,
  renderTranscriptMarkdown,
  transcribe,
} from "./transcribe";
import { parseSilenceRatio } from "./transcribe-media";
import {
  hasRepeatedHallucination,
  transcriptQualityIssues,
  transcriptQualityReport,
} from "./transcript-quality";

let folder: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "video-pipeline-transcribe-"));
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe("transcribe helpers", () => {
  it("parses whisper.cpp JSON with offsets in ms", () => {
    const raw = {
      transcription: [
        { offsets: { from: 0, to: 1500 }, text: " Hello world." },
        { offsets: { from: 1500, to: 3000 }, text: " Second." },
      ],
      result: { language: "en" },
    };
    const result = parseWhisperJson(raw);
    expect(result.language).toBe("en");
    expect(result.segments).toEqual([
      { startTime: 0, endTime: 1.5, text: "Hello world." },
      { startTime: 1.5, endTime: 3, text: "Second." },
    ]);
  });

  it("formatTimestamp produces HH:MM:SS", () => {
    expect(formatTimestamp(0)).toBe("00:00:00");
    expect(formatTimestamp(59.9)).toBe("00:00:59");
    expect(formatTimestamp(60)).toBe("00:01:00");
    expect(formatTimestamp(3725)).toBe("01:02:05");
  });

  it("renders transcript markdown with [HH:MM:SS] prefix per segment", () => {
    const md = renderTranscriptMarkdown(
      [
        { startTime: 0, endTime: 2, text: "Hello." },
        { startTime: 2, endTime: 5, text: "World." },
      ],
      "en"
    );
    expect(md).toContain("**Source language:** en");
    expect(md).toContain("[00:00:00] Hello.");
    expect(md).toContain("[00:00:02] World.");
  });

  it("preserves special characters and emojis in transcript text", () => {
    const md = renderTranscriptMarkdown(
      [{ startTime: 0, endTime: 2, text: "Perché? 🔥✨ <ok> & done!" }],
      "it"
    );
    expect(md).toContain("[00:00:00] Perché? 🔥✨ <ok> & done!");
  });

  it("uses the detected whisper binary path when provided", () => {
    expect(findWhisperBinary("/usr/local/bin/whisper-cpp")).toBe(
      "/usr/local/bin/whisper-cpp"
    );
  });

  it("adds local whisper.cpp safeguards against silence loops", () => {
    const args = buildWhisperArgs("model.bin", "audio", "audio.wav");
    expect(args).toContain("-mc");
    expect(args).toContain("0");
    expect(args).toContain("-nf");
    expect(args).toContain("-sns");
  });

  it("orders local ASR by operating system", () => {
    expect(localAsrCandidateOrder("auto", "darwin")).toEqual(["whisper-cpp"]);
    expect(localAsrCandidateOrder("auto", "linux")).toEqual(["whisper-cpp"]);
    expect(localAsrCandidateOrder("whisper-cpp", "darwin")).toEqual([
      "whisper-cpp",
    ]);
  });

  it("detects repeated hallucination loops", () => {
    expect(
      hasRepeatedHallucination([
        { startTime: 0, endTime: 1, text: "Loop." },
        { startTime: 1, endTime: 2, text: "Loop." },
        { startTime: 2, endTime: 3, text: "Loop." },
      ])
    ).toBe(true);
    expect(
      hasRepeatedHallucination([
        { startTime: 0, endTime: 1, text: "One." },
        { startTime: 1, endTime: 2, text: "Two." },
      ])
    ).toBe(false);
  });

  it("flags unstable local ASR transcript quality", () => {
    expect(
      transcriptQualityIssues(
        [
          { startTime: 0, endTime: 1, text: "Loop." },
          { startTime: 1, endTime: 2, text: "Loop." },
          { startTime: 2, endTime: 3, text: "Loop." },
          { startTime: 1, endTime: 4, text: "regressed" },
          { startTime: 12, endTime: 20, text: "outside" },
        ],
        10
      )
    ).toEqual(["repeated-text", "timestamp-regression", "outside-duration"]);

    expect(
      transcriptQualityIssues([
        { startTime: 0, endTime: 0, text: "No timing." },
        { startTime: 0, endTime: 0, text: "Still no timing." },
      ])
    ).toEqual(["missing-timestamps"]);
  });

  it("builds a transcript quality report with low-density and language issues", () => {
    const report = transcriptQualityReport(
      [{ startTime: 0, endTime: 4, text: "Short." }],
      {
        durationSeconds: 120,
        expectedLanguage: "it",
        language: "en",
        source: "captions",
      }
    );

    expect(report.wordCount).toBe(1);
    expect(report.issues).toEqual([
      "low-word-density",
      "too-short-for-duration",
      "language-mismatch",
      "caption-source-suspicious",
    ]);
  });

  it("parses curl progress-bar percentages", () => {
    expect(parseCurlDownloadPercent("############ 12.3%")).toBe(12);
    expect(parseCurlDownloadPercent("## 8.0% #### 42.9%")).toBe(42);
    expect(parseCurlDownloadPercent("no progress yet")).toBeNull();
  });

  it("parses ffmpeg silencedetect output into a silence ratio", () => {
    expect(
      parseSilenceRatio(
        "[silencedetect] silence_duration: 20.5\n[silencedetect] silence_duration: 9.5",
        60
      )
    ).toBe(0.5);
    expect(parseSilenceRatio("no silence", 60)).toBe(0);
    expect(parseSilenceRatio("silence_duration: 1", undefined)).toBeNull();
  });

  it("uses downloaded VTT captions before falling back to whisper", async () => {
    writeFileSync(
      captionsPath(folder, "en"),
      `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:02.000 align:start position:0%
Hello<00:00:00.500><c> world</c>

00:00:02.000 --> 00:00:02.010 align:start position:0%
Hello world

00:00:02.010 --> 00:00:04.000 align:start position:0%
Hello world
This<00:00:02.500><c> part</c><00:00:03.000><c> is</c><00:00:03.500><c> new.</c>

00:00:04.000 --> 00:00:06.000 align:start position:0%
This part is new.
new.<00:00:05.000><c> Final.</c>
`
    );

    const result = await transcribe(folder, () => undefined);

    expect(result.language).toBe("en");
    expect(result.segments.map((segment) => segment.text)).toEqual([
      "Hello world",
      "This part is new.",
      "Final.",
    ]);
    expect(readFileSync(transcriptPath(folder), "utf-8")).toContain(
      "[00:00:02] This part is new."
    );
    expect(
      JSON.parse(readFileSync(transcriptJsonPath(folder), "utf-8"))
    ).toMatchObject({
      language: "en",
      quality: { issues: [], wordCount: 7 },
      source: "captions",
    });
  });

  it("rejects suspicious captions at the quality gate", async () => {
    initMetadata(folder, {
      date: "2026-05-15",
      slug: "quality-gate-test",
      source: {
        duration: 120,
        language: "en",
        title: "Quality gate test",
        url: "https://example.com/watch?v=quality-gate-test",
        youtubeId: "quality-gate-test",
      },
      title: "Quality gate test",
    });
    writeFileSync(
      captionsPath(folder, "en"),
      `WEBVTT

00:00:00.000 --> 00:00:04.000
Short.
`
    );

    await expect(
      transcribe(folder, () => undefined, { repairAgent: "off" })
    ).rejects.toThrow(
      "Transcript quality check failed: low-word-density, too-short-for-duration, caption-source-suspicious"
    );

    const report = JSON.parse(
      readFileSync(join(folder, "transcript-quality.json"), "utf-8")
    );
    expect(report).toMatchObject({
      issues: [
        "low-word-density",
        "too-short-for-duration",
        "caption-source-suspicious",
      ],
      source: "captions",
      wordCount: 1,
    });
    expect(existsSync(transcriptJsonPath(folder))).toBe(false);
    expect(existsSync(transcriptPath(folder))).toBe(false);
  });
});
