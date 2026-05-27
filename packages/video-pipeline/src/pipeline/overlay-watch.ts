import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { runVideoAgent, type VideoAgentChoice } from "../lib/agent";
import { readMetadata } from "../lib/metadata";
import { transcriptJsonPath, transcriptPath } from "../lib/paths";
import { preflightVideoInput } from "./transcribe-media";
import type { ProgressCallback, TranscriptSegment } from "./types";

const MAX_MOMENTS = 18;
const BASELINE_MOMENTS = 6;
const MIN_MOMENT_SPACING_SECONDS = 12;
const FRAME_LABELS = ["start", "middle", "end"] as const;
const VISUAL_EVIDENCE_YES_RE = /useful_visual_evidence:\s*yes/i;
const LINE_SEPARATOR_RE = /\r?\n/;
const TRANSCRIPT_TIMESTAMP_LINE_RE = /^\[(\d{2}:\d{2}:\d{2})\]\s+(.+)$/;

const PROMPT_DIR = join(dirname(fileURLToPath(import.meta.url)), "prompts");

const VISUAL_CUES = [
  {
    clue: "look/show/see",
    pattern: /\b(look|show|see|watch|notice|here|visible|screen)\b/i,
  },
  {
    clue: "screen/ui",
    pattern:
      /\b(dashboard|interface|ui|app|window|panel|button|menu|sidebar|screen|terminal|editor|browser)\b/i,
  },
  {
    clue: "structured visual",
    pattern:
      /\b(chart|graph|diagram|table|list|timeline|flow|map|matrix|architecture|schema)\b/i,
  },
  {
    clue: "code or technical artifact",
    pattern:
      /\b(code|snippet|repository|file|diff|prompt|json|markdown|cli)\b/i,
  },
] as const;

export type MomentCandidate = {
  endTime: number;
  expectedVisualClue: string;
  id: string;
  reason: string;
  startTime: number;
  text: string;
  timestamp: string;
};

export type MomentPlan = {
  createdAt: string;
  moments: MomentCandidate[];
  source: "transcript.json" | "transcript.md";
};

export type FrameManifestEntry = {
  framePath: string;
  label: (typeof FRAME_LABELS)[number];
  momentId: string;
  relativeFramePath: string;
  time: number;
  timestamp: string;
};

export type FrameManifest = {
  createdAt: string;
  frames: FrameManifestEntry[];
  videoPath: string;
};

export type OverlayVisualEvidence = {
  evidenceMarkdown: string;
  evidencePath: string;
  frameManifestPath: string;
  momentPlanPath: string;
  usefulEvidence: boolean;
};

type ScoredMoment = TranscriptSegment & {
  cues: string[];
  score: number;
};

type TranscriptMoments = {
  segments: TranscriptSegment[];
  source: MomentPlan["source"];
};

export function overlayWatchDir(folder: string): string {
  return join(folder, ".overlay-watch");
}

export function momentPlanPath(folder: string): string {
  return join(overlayWatchDir(folder), "moment-plan.json");
}

export function frameManifestPath(folder: string): string {
  return join(overlayWatchDir(folder), "frame-manifest.json");
}

export function visualEvidencePath(folder: string): string {
  return join(overlayWatchDir(folder), "visual-evidence.md");
}

function framesDir(folder: string): string {
  return join(overlayWatchDir(folder), "frames");
}

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

function parseTimestamp(value: string): number {
  const parts = value.split(":").map((part) => Number.parseFloat(part));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return Number.parseFloat(value) || 0;
}

function isTranscriptSegment(value: unknown): value is TranscriptSegment {
  const segment = value as Partial<TranscriptSegment>;
  return (
    typeof segment.startTime === "number" &&
    typeof segment.endTime === "number" &&
    typeof segment.text === "string"
  );
}

function readTranscriptJson(folder: string): TranscriptSegment[] | null {
  const path = transcriptJsonPath(folder);
  if (!existsSync(path)) {
    return null;
  }
  const parsed = JSON.parse(readFileSync(path, "utf-8")) as {
    segments?: unknown[];
  };
  const segments = (parsed.segments ?? []).filter(isTranscriptSegment);
  return segments.length > 0 ? segments : null;
}

function readTranscriptMarkdown(folder: string): TranscriptSegment[] {
  const path = transcriptPath(folder);
  if (!existsSync(path)) {
    return [];
  }
  const lines = readFileSync(path, "utf-8").split(LINE_SEPARATOR_RE);
  const moments: { startTime: number; text: string }[] = [];
  for (const line of lines) {
    const match = line.match(TRANSCRIPT_TIMESTAMP_LINE_RE);
    if (match) {
      moments.push({
        startTime: parseTimestamp(match[1]),
        text: match[2].trim(),
      });
    }
  }
  return moments.map((moment, index) => {
    const next = moments[index + 1];
    return {
      endTime: next ? next.startTime : moment.startTime + 5,
      startTime: moment.startTime,
      text: moment.text,
    };
  });
}

function readTranscriptMomentsWithSource(folder: string): TranscriptMoments {
  const jsonSegments = readTranscriptJson(folder);
  if (jsonSegments) {
    return { segments: jsonSegments, source: "transcript.json" };
  }
  return { segments: readTranscriptMarkdown(folder), source: "transcript.md" };
}

export function readTranscriptMoments(folder: string): TranscriptSegment[] {
  return readTranscriptMomentsWithSource(folder).segments;
}

function scoreMoment(segment: TranscriptSegment): ScoredMoment {
  const cues = VISUAL_CUES.filter((cue) => cue.pattern.test(segment.text)).map(
    (cue) => cue.clue
  );
  return {
    ...segment,
    cues,
    score: cues.length,
  };
}

function dedupeBySpacing(
  moments: ScoredMoment[],
  maxMoments: number
): ScoredMoment[] {
  const selected: ScoredMoment[] = [];
  for (const moment of moments) {
    const overlaps = selected.some(
      (candidate) =>
        Math.abs(candidate.startTime - moment.startTime) <
        MIN_MOMENT_SPACING_SECONDS
    );
    if (!overlaps) {
      selected.push(moment);
    }
    if (selected.length >= maxMoments) {
      break;
    }
  }
  return selected;
}

function selectBaselineMoments(moments: ScoredMoment[]): ScoredMoment[] {
  if (moments.length <= BASELINE_MOMENTS) {
    return moments;
  }
  const selected: ScoredMoment[] = [];
  const step = (moments.length - 1) / (BASELINE_MOMENTS - 1);
  for (let index = 0; index < BASELINE_MOMENTS; index += 1) {
    selected.push(moments[Math.round(index * step)]);
  }
  return dedupeBySpacing(selected, BASELINE_MOMENTS);
}

function toCandidate(moment: ScoredMoment, index: number): MomentCandidate {
  const cues = moment.cues.length > 0 ? moment.cues : ["baseline scan"];
  const reason =
    moment.cues.length > 0
      ? cues.map((cue) => `visual cue: ${cue}`).join("; ")
      : "baseline transcript scan";
  return {
    endTime: moment.endTime,
    expectedVisualClue: cues.join(", "),
    id: `moment-${(index + 1).toString().padStart(3, "0")}`,
    reason,
    startTime: moment.startTime,
    text: moment.text,
    timestamp: formatTimestamp(moment.startTime),
  };
}

export function selectMomentCandidates(
  segments: TranscriptSegment[]
): MomentCandidate[] {
  const scored = segments
    .filter((segment) => segment.text.trim().length > 0)
    .map(scoreMoment);
  const positives = scored
    .filter((moment) => moment.score > 0)
    .sort((a, b) => b.score - a.score || a.startTime - b.startTime);
  const selected =
    positives.length > 0
      ? dedupeBySpacing(positives, MAX_MOMENTS)
      : selectBaselineMoments(scored);
  return selected
    .sort((a, b) => a.startTime - b.startTime)
    .map((moment, index) => toCandidate(moment, index));
}

export function createMomentPlan(folder: string): MomentPlan {
  const transcript = readTranscriptMomentsWithSource(folder);
  if (transcript.segments.length === 0) {
    throw new Error(
      "Transcript is missing or contains no timestamped segments"
    );
  }
  const plan: MomentPlan = {
    createdAt: new Date().toISOString(),
    moments: selectMomentCandidates(transcript.segments),
    source: transcript.source,
  };
  mkdirSync(overlayWatchDir(folder), { recursive: true });
  writeFileSync(momentPlanPath(folder), JSON.stringify(plan, null, 2));
  return plan;
}

export function buildFrameExtractionArgs(
  videoPath: string,
  time: number,
  outputPath: string
): string[] {
  return [
    "-nostdin",
    "-ss",
    time.toFixed(3),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "-y",
    outputPath,
  ];
}

function frameTimesForMoment(moment: MomentCandidate): number[] {
  const start = Math.max(0, moment.startTime + 0.25);
  const end = Math.max(start, moment.endTime - 0.25);
  const middle = start + (end - start) / 2;
  return [start, middle, end];
}

function extractFrame(
  videoPath: string,
  time: number,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "ffmpeg",
      buildFrameExtractionArgs(videoPath, time, outputPath)
    );
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `ffmpeg frame extraction failed (${code}): ${stderr.slice(-300)}`
        )
      );
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start ffmpeg: ${err.message}`))
    );
  });
}

async function extractFrames(
  folder: string,
  videoPath: string,
  plan: MomentPlan
): Promise<FrameManifest> {
  const dir = framesDir(folder);
  mkdirSync(dir, { recursive: true });
  const frames: FrameManifestEntry[] = [];

  for (const moment of plan.moments) {
    const times = frameTimesForMoment(moment);
    for (let index = 0; index < FRAME_LABELS.length; index += 1) {
      const label = FRAME_LABELS[index];
      const framePath = join(dir, `${moment.id}-${label}.jpg`);
      const time = times[index];
      await extractFrame(videoPath, time, framePath);
      frames.push({
        framePath,
        label,
        momentId: moment.id,
        relativeFramePath: relative(folder, framePath),
        time,
        timestamp: formatTimestamp(time),
      });
    }
  }

  const manifest: FrameManifest = {
    createdAt: new Date().toISOString(),
    frames,
    videoPath,
  };
  writeFileSync(frameManifestPath(folder), JSON.stringify(manifest, null, 2));
  return manifest;
}

function renderFrameManifest(
  plan: MomentPlan,
  manifest: FrameManifest
): string {
  const lines: string[] = [];
  for (const moment of plan.moments) {
    lines.push(
      `## ${moment.id} — ${moment.timestamp}`,
      `Transcript: ${moment.text}`,
      `Reason: ${moment.reason}`
    );
    const frames = manifest.frames.filter(
      (frame) => frame.momentId === moment.id
    );
    for (const frame of frames) {
      lines.push(
        `- ${frame.label} ${frame.timestamp}: ${frame.relativeFramePath}`
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function hasUsefulVisualEvidence(markdown: string): boolean {
  return VISUAL_EVIDENCE_YES_RE.test(markdown);
}

async function inspectVisualEvidence({
  agent,
  folder,
  input,
}: {
  agent?: VideoAgentChoice;
  folder: string;
  input: string;
}): Promise<string> {
  const prompt = readFileSync(
    join(PROMPT_DIR, "overlay-visual-scout.md"),
    "utf-8"
  );
  const result = await runVideoAgent({
    agent,
    cwd: folder,
    errorLabel: "overlay visual scout",
    input,
    prompt,
    readOnlyFiles: true,
  });
  return result.output;
}

export async function createOverlayVisualEvidence({
  agent,
  folder,
  onProgress,
  title,
}: {
  agent?: VideoAgentChoice;
  folder: string;
  onProgress?: ProgressCallback;
  title: string;
}): Promise<OverlayVisualEvidence> {
  rmSync(overlayWatchDir(folder), { force: true, recursive: true });
  const metadata = readMetadata(folder);
  const plan = createMomentPlan(folder);
  onProgress?.(20, `Moment scout selected ${plan.moments.length} moments`);

  const media = await preflightVideoInput(folder, (percent, message) => {
    onProgress?.(20 + Math.floor(percent * 0.1), message);
  });
  onProgress?.(35, "Extracting targeted source-video frames");
  const manifest = await extractFrames(folder, media.videoPath, plan);

  const input =
    `# Project title\n\n${title}\n\n` +
    `# Source video\n\n${metadata?.source.title ?? "Unknown"}\n\n` +
    `# Candidate moments and sampled frames\n\n${renderFrameManifest(
      plan,
      manifest
    )}`;

  onProgress?.(65, "Inspecting sampled frames for visual inspiration");
  const evidenceMarkdown = await inspectVisualEvidence({
    agent,
    folder,
    input,
  });
  writeFileSync(visualEvidencePath(folder), evidenceMarkdown);

  return {
    evidenceMarkdown,
    evidencePath: visualEvidencePath(folder),
    frameManifestPath: frameManifestPath(folder),
    momentPlanPath: momentPlanPath(folder),
    usefulEvidence: hasUsefulVisualEvidence(evidenceMarkdown),
  };
}
