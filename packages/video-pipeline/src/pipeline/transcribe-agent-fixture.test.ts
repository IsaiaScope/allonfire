import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initMetadata } from "../lib/metadata";
import {
  captionsPath,
  transcriptJsonPath,
  transcriptPath,
  videoPath,
} from "../lib/paths";

let root: string;
let folder: string;
let previousEnv: NodeJS.ProcessEnv;

function writeNodeBin(name: string, source: string): void {
  const path = join(root, "bin", name);
  writeFileSync(path, `#!/usr/bin/env node\n${source}`);
  chmodSync(path, 0o755);
}

beforeEach(() => {
  previousEnv = { ...process.env };
  root = mkdtempSync(join(tmpdir(), "video-pipeline-agent-fixture-"));
  folder = join(root, "project", "raw");
  mkdirSync(join(root, "bin"), { recursive: true });
  mkdirSync(join(root, "models"), { recursive: true });
  mkdirSync(folder, { recursive: true });

  writeFileSync(join(root, "models", "ggml-large-v3.bin"), "model");
  writeFileSync(videoPath(folder, "agent-repair-test"), "video");
  initMetadata(folder, {
    date: "2026-05-14",
    slug: "agent-repair-test",
    source: {
      duration: 10,
      language: null,
      title: "Agent repair test",
      url: "https://example.com/watch?v=agent-repair-test",
      youtubeId: "agent-repair-test",
    },
    title: "Agent repair test",
  });

  writeNodeBin(
    "ffmpeg",
    `
const { writeFileSync } = require("node:fs");
if (process.argv.includes("-version")) {
  process.stdout.write("ffmpeg version 8.1.1");
  process.exit(0);
}
if (process.argv.includes("silencedetect=n=-45dB:d=0.5")) {
  process.stderr.write("no silence detected");
  process.exit(0);
}
writeFileSync(process.argv.at(-1), "wav");
`
  );

  writeNodeBin(
    "ffprobe",
    `
process.stdout.write(JSON.stringify({
  format: { duration: "10" },
  streams: [{ codec_type: "video" }, { codec_type: "audio", duration: "10" }]
}));
`
  );

  writeNodeBin(
    "whisper-cli",
    `
const { writeFileSync } = require("node:fs");
if (process.argv.includes("--help")) {
  process.stdout.write("whisper-cli 0.11.1");
  process.exit(0);
}
const outIndex = process.argv.indexOf("-of");
const outBase = process.argv[outIndex + 1];
writeFileSync(\`\${outBase}.json\`, JSON.stringify({
  result: { language: "en" },
  transcription: [
    { offsets: { from: 5000, to: 6000 }, text: "First valid segment." },
    { offsets: { from: 1000, to: 2000 }, text: "Timestamp went backwards." },
    { offsets: { from: 12_000, to: 20_000 }, text: "Outside the video duration." }
  ]
}));
`
  );

  writeNodeBin(
    "codex",
    `
const { writeFileSync } = require("node:fs");
const execIndex = process.argv.indexOf("exec");
const approvalIndex = process.argv.indexOf("--ask-for-approval");
if (!process.argv.includes("--ephemeral")) {
  process.stderr.write("codex repair must run with --ephemeral");
  process.exit(2);
}
if (execIndex !== -1 && approvalIndex > execIndex) {
  process.stderr.write("unexpected argument '--ask-for-approval' found");
  process.exit(2);
}
const outIndex = process.argv.indexOf("--output-last-message");
const outPath = process.argv[outIndex + 1];
writeFileSync(outPath, JSON.stringify({
  language: "en",
  segments: [
    { startTime: 0, endTime: 2, text: "Clean transcript from fake Codex repair." }
  ]
}));
`
  );

  process.env.PATH = `${join(root, "bin")}${delimiter}${previousEnv.PATH ?? ""}`;
  process.env.WHISPER_MODELS_DIR = join(root, "models");
  process.env.LOCAL_ASR_ENGINE = "whisper-cpp";
  process.env.TRANSCRIPT_REPAIR_AGENT = "codex";
  vi.resetModules();
});

afterEach(() => {
  process.env = previousEnv;
  rmSync(root, { recursive: true, force: true });
  vi.resetModules();
});

describe("temporary transcribe agent repair fixture", () => {
  it("generates a bad local transcript and forces Codex repair", async () => {
    const { transcribe } = await import("./transcribe");
    const messages: string[] = [];

    const result = await transcribe(
      folder,
      (_percent, message) => messages.push(message),
      {
        localAsrEngine: "whisper-cpp",
        repairAgent: "codex",
      }
    );

    expect(messages).toContain(
      "Asking Codex to repair repeated transcript text"
    );
    expect(messages.indexOf("Scanning transcript quality")).toBeLessThan(
      messages.indexOf("Asking Codex to repair repeated transcript text")
    );
    expect(
      messages.indexOf("Asking Codex to repair repeated transcript text")
    ).toBeLessThan(messages.indexOf("Running acceptance gate"));
    expect(result).toMatchObject({
      language: "en",
      repairedBy: "codex",
      source: "whisper-cpp",
      segments: [
        {
          endTime: 2,
          startTime: 0,
          text: "Clean transcript from fake Codex repair.",
        },
      ],
    });
    expect(
      JSON.parse(readFileSync(transcriptJsonPath(folder), "utf-8"))
    ).toMatchObject({
      language: "en",
      quality: { issues: [], wordCount: 6 },
      repairedBy: "codex",
      segments: result.segments,
      source: "whisper-cpp",
    });
    expect(readFileSync(transcriptPath(folder), "utf-8")).toContain(
      "Clean transcript from fake Codex repair."
    );
  });

  it("can force Codex repair even when captions are available", async () => {
    const { transcribe } = await import("./transcribe");
    const messages: string[] = [];

    writeFileSync(
      captionsPath(folder, "en"),
      `WEBVTT

00:00:00.000 --> 00:00:02.000
Already clean caption text.
`
    );

    const result = await transcribe(
      folder,
      (_percent, message) => messages.push(message),
      {
        forceRepairAgent: true,
        repairAgent: "codex",
      }
    );

    expect(messages).toContain(
      "Asking Codex to repair repeated transcript text"
    );
    expect(messages.indexOf("Scanning transcript quality")).toBeLessThan(
      messages.indexOf("Asking Codex to repair repeated transcript text")
    );
    expect(
      messages.indexOf("Asking Codex to repair repeated transcript text")
    ).toBeLessThan(messages.indexOf("Running acceptance gate"));
    expect(result).toMatchObject({
      repairedBy: "codex",
      source: "captions",
      segments: [
        {
          endTime: 2,
          startTime: 0,
          text: "Clean transcript from fake Codex repair.",
        },
      ],
    });
    expect(
      JSON.parse(readFileSync(transcriptJsonPath(folder), "utf-8"))
    ).toMatchObject({
      language: "en",
      quality: { issues: [], wordCount: 6 },
      repairedBy: "codex",
      segments: result.segments,
      source: "captions",
    });
  });
});
