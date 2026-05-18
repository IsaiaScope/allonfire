import { env } from "../../env";
import type { StageDefinition } from "./stage-view";
import type { TranscribeStageStep } from "./transcribe-view-model";

export const TRANSCRIBE_STAGES: StageDefinition<TranscribeStageStep>[] = [
  {
    id: "metadata",
    label: "Project",
    detail: [
      "Reads: metadata.json",
      "Needs: downloaded stage complete",
      "Resume: skips transcript unless --force is set",
    ],
    summary: "Read metadata and decide whether transcription should run",
    statusLabels: {
      pending: "Waiting",
      running: "Loading",
      done: "Loaded",
      failed: "Missing",
    },
  },
  {
    id: "deps",
    label: "Tools",
    detail: [
      "Checks: ffmpeg on PATH",
      "Checks: local ASR provider when captions are missing",
      "Purpose: audio extraction and offline speech recognition",
    ],
    summary: "Verify tools for local transcription fallback",
    statusLabels: {
      pending: "Waiting",
      running: "Checking",
      done: "Verified",
      failed: "Missing",
    },
  },
  {
    id: "captions",
    label: "Captions",
    detail: [
      "Input: captions-*.vtt when available",
      "Purpose: use downloaded YouTube captions first",
      "Fallback: whisper.cpp",
    ],
    summary: "Prefer downloaded captions before audio transcription",
    statusLabels: {
      pending: "Waiting",
      running: "Reading",
      done: "Used",
      failed: "Failed",
    },
  },
  {
    id: "model",
    label: "Local model",
    detail: [`whisper.cpp: ${env.WHISPER_MODEL}`],
    summary: "Prepare the selected local ASR model when needed",
    statusLabels: {
      pending: "Waiting",
      running: "Preparing",
      done: "Available",
      failed: "Failed",
    },
  },
  {
    id: "audio",
    label: "Audio",
    detail: [
      "Input: project slug mp4",
      "Output: audio.wav",
      "Format: mono 16 kHz WAV",
    ],
    summary: "Extract the slug-named mp4 when Whisper fallback is needed",
    statusLabels: {
      pending: "Waiting",
      running: "Extracting",
      done: "Ready",
      failed: "Failed",
    },
  },
  {
    id: "whisper",
    label: "ASR",
    detail: [
      "Engine: whisper.cpp",
      "Language: auto detect",
      "Output: speech segments with timestamps",
    ],
    summary: "Run local speech recognition fallback",
    statusLabels: {
      pending: "Waiting",
      running: "Transcribing",
      done: "Complete",
      failed: "Failed",
    },
  },
  {
    id: "quality-scan",
    label: "Quality scan",
    detail: [
      "Runs before agent repair",
      "Detects: empty, repeated text, timestamp issues, duration mismatch",
      "Purpose: decide whether repair should run",
    ],
    summary: "Detect transcript issues before optional agent repair",
    statusLabels: {
      pending: "Waiting",
      running: "Scanning",
      done: "Scanned",
      failed: "Failed",
    },
  },
  {
    id: "agent",
    label: "Agent repair",
    detail: [
      `Mode: ${env.TRANSCRIPT_REPAIR_AGENT ?? env.VIDEO_AGENT}`,
      `Trigger: ${
        env.TRANSCRIPT_REPAIR_ALWAYS
          ? "forced for testing"
          : "unstable local ASR transcript"
      }`,
      "Checks: repeats, timestamp order, media duration",
      "Output: cleaned transcript segments",
    ],
    summary: "Repair unstable local ASR transcript with Claude Code or Codex",
    statusLabels: {
      pending: "Waiting",
      running: "Repairing",
      done: "Complete",
      failed: "Failed",
    },
  },
  {
    id: "acceptance",
    label: "Acceptance gate",
    detail: [
      "Runs after agent repair",
      "Writes: transcript-quality.json",
      "Checks: empty, short, repeated, timing, language, word density",
      "Policy: fail before writing accepted transcript if issues remain",
    ],
    summary: "Accept or reject the repaired transcript",
    statusLabels: {
      pending: "Waiting",
      running: "Checking",
      done: "Accepted",
      failed: "Rejected",
    },
  },
  {
    id: "files",
    label: "Files",
    detail: [
      "Writes: transcript.md",
      "Writes: transcript.json",
      "Writes: transcript-quality.json",
      "Updates: metadata source language",
    ],
    summary: "Write transcript files and update metadata",
    statusLabels: {
      pending: "Waiting",
      running: "Writing",
      done: "Written",
      failed: "Failed",
    },
  },
];
