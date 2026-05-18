import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { env } from "../env";
import {
  commandExists,
  resolveVideoAgent,
  runVideoAgent,
  type VideoAgentChoice,
} from "../lib/agent";
import { readMetadata } from "../lib/metadata";
import { audioPath, transcriptJsonPath, transcriptPath } from "../lib/paths";
import {
  assertAudioUsable,
  preflightVideoInput,
  resolveVideoInput,
} from "./transcribe-media";
import {
  type TranscriptQualityIssue,
  type TranscriptQualityReport,
  transcriptQualityIssues,
  transcriptQualityReport,
} from "./transcript-quality";
import type {
  ProgressCallback,
  TranscribeResult,
  TranscriptSegment,
} from "./types";

const WAV_EXT_RE = /\.wav$/;
const TS_PROGRESS_RE = /progress\s*=\s*(\d+)/;
const CURL_PROGRESS_RE = /(\d+(?:\.\d+)?)%/g;
const CAPTIONS_FILE_RE = /^captions-([a-z0-9-]+)\.vtt$/i;
const BLOCK_SEPARATOR_RE = /\n{2,}/;
const WORD_SEPARATOR_RE = /\s+/;
const VTT_TIMESTAMP_RE = /(?:(\d{2,}):)?(\d{2}):(\d{2})(?:[.,](\d{3}))?/;
const VTT_INLINE_TIMESTAMP_RE = /<(?:(?:\d{2,}:)?\d{2}:\d{2}(?:[.,]\d{3})?)>/g;
const VTT_TAG_RE = /<[^>]+>/g;
const WHISPER_BIN_CANDIDATES = ["whisper-cli", "whisper-cpp", "whisper"];

export type TranscribeOptions = {
  forceRepairAgent?: boolean;
  localAsrEngine?: LocalAsrEngine;
  repairAgent?: TranscriptRepairAgent;
  whisperBin?: string;
};

export type LocalAsrEngine = "auto" | "whisper-cpp";
export type ResolvedLocalAsrEngine = Exclude<LocalAsrEngine, "auto">;
export type TranscriptRepairAgent = "off" | VideoAgentChoice;

export function modelsDir(): string {
  return env.WHISPER_MODELS_DIR;
}

export function modelPath(name: string = env.WHISPER_MODEL): string {
  return join(modelsDir(), `ggml-${name}.bin`);
}

export function localAsrCandidateOrder(
  requested: LocalAsrEngine = env.LOCAL_ASR_ENGINE,
  _platform: NodeJS.Platform = process.platform
): ResolvedLocalAsrEngine[] {
  if (requested !== "auto") {
    return [requested];
  }
  return ["whisper-cpp"];
}

export function parseCurlDownloadPercent(output: string): number | null {
  let lastMatch: RegExpExecArray | null = null;
  for (
    let match = CURL_PROGRESS_RE.exec(output);
    match !== null;
    match = CURL_PROGRESS_RE.exec(output)
  ) {
    lastMatch = match;
  }
  CURL_PROGRESS_RE.lastIndex = 0;
  if (!lastMatch) {
    return null;
  }
  return Math.min(100, Math.floor(Number.parseFloat(lastMatch[1])));
}

export async function ensureModel(
  name: string,
  onProgress: ProgressCallback
): Promise<string> {
  const path = modelPath(name);
  if (existsSync(path) && statSync(path).size > 0) {
    return path;
  }
  mkdirSync(modelsDir(), { recursive: true });
  onProgress(0, `Downloading whisper model ${name} (~3 GB, one-time)`);
  const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${name}.bin`;
  const tmpPath = `${path}.download`;
  try {
    unlinkSync(tmpPath);
  } catch {
    // no partial download to remove
  }
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("curl", [
      "-fL",
      "--retry",
      "3",
      "--progress-bar",
      "-o",
      tmpPath,
      url,
    ]);
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      const pct = parseCurlDownloadPercent(text);
      if (pct !== null) {
        onProgress(pct, `Downloading whisper model ${name} (one-time)`);
      }
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Failed to download model (curl exit ${code}): ${stderr.slice(-200)}`
          )
        );
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start curl: ${err.message}`))
    );
  });
  if (!existsSync(tmpPath) || statSync(tmpPath).size === 0) {
    throw new Error("Downloaded whisper model is empty");
  }
  renameSync(tmpPath, path);
  onProgress(100, `Whisper model ${name} ready`);
  return path;
}

export function extractAudio(
  folder: string,
  onProgress: ProgressCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = resolveVideoInput(folder);
    const output = audioPath(folder);
    if (!existsSync(input)) {
      reject(new Error(`Video file missing: ${input}`));
      return;
    }
    onProgress(5, "Extracting audio with ffmpeg");
    const proc = spawn("ffmpeg", [
      "-i",
      input,
      "-vn",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-f",
      "wav",
      "-y",
      output,
    ]);
    let stderr = "";
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        onProgress(30, "Audio extracted");
        resolve(output);
      } else {
        reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-200)}`));
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start ffmpeg: ${err.message}`))
    );
  });
}

function findCommand(candidates: string[]): string | null {
  return candidates.find((candidate) => commandExists(candidate)) ?? null;
}

export function findWhisperBinary(detectedPath?: string): string {
  if (detectedPath) {
    return detectedPath;
  }
  return findCommand(WHISPER_BIN_CANDIDATES) ?? "whisper-cli";
}

export function buildWhisperArgs(
  modelBin: string,
  outBase: string,
  wav: string
): string[] {
  return [
    "-m",
    modelBin,
    "-oj",
    "-of",
    outBase,
    "-l",
    "auto",
    "-pp",
    "-mc",
    "0",
    "-nf",
    "-sns",
    wav,
  ];
}

export function runWhisper(
  wav: string,
  modelBin: string,
  onProgress: ProgressCallback,
  whisperBin: string = findWhisperBinary()
): Promise<{ segments: TranscriptSegment[]; language: string }> {
  return new Promise((resolve, reject) => {
    const outBase = wav.replace(WAV_EXT_RE, "");
    const args = buildWhisperArgs(modelBin, outBase, wav);
    const proc = spawn(whisperBin, args);

    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      const match = chunk.toString().match(TS_PROGRESS_RE);
      if (match) {
        const pct = 35 + Math.floor(Number.parseInt(match[1], 10) * 0.6);
        onProgress(
          Math.min(pct, 95),
          `Transcribing with whisper.cpp ${env.WHISPER_MODEL}`
        );
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`whisper-cli failed (${code}): ${stderr.slice(-300)}`)
        );
        return;
      }
      const jsonPath = `${outBase}.json`;
      if (!existsSync(jsonPath)) {
        reject(new Error("whisper produced no JSON output"));
        return;
      }
      try {
        const raw = JSON.parse(readFileSync(jsonPath, "utf-8"));
        const parsed = parseWhisperJson(raw);
        resolve(parsed);
      } catch (e) {
        reject(new Error(`Failed to parse whisper JSON: ${e}`));
      }
    });

    proc.on("error", (err) =>
      reject(new Error(`Failed to start whisper-cli: ${err.message}`))
    );
  });
}

type CaptionCue = {
  startTime: number;
  endTime: number;
  text: string;
};

export type CaptionSource = {
  path: string;
  language: string;
  segments: TranscriptSegment[];
};

function decodeVttEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseVttTimestamp(value: string): number {
  const match = value.match(VTT_TIMESTAMP_RE);
  if (!match) {
    return 0;
  }
  const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseInt(match[3], 10);
  const millis = match[4] ? Number.parseInt(match[4], 10) : 0;
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

function cleanVttText(lines: string[]): string {
  return decodeVttEntities(
    lines
      .join(" ")
      .replace(VTT_INLINE_TIMESTAMP_RE, "")
      .replace(VTT_TAG_RE, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function wordOverlap(previous: string[], next: string[]): number {
  const max = Math.min(previous.length, next.length);
  for (let size = max; size > 0; size -= 1) {
    let matches = true;
    for (let i = 0; i < size; i += 1) {
      if (previous[previous.length - size + i] !== next[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return size;
    }
  }
  return 0;
}

function dedupeRollingCaptions(cues: CaptionCue[]): TranscriptSegment[] {
  const accumulatedWords: string[] = [];
  const segments: TranscriptSegment[] = [];

  for (const cue of cues) {
    const words = cue.text.split(WORD_SEPARATOR_RE).filter(Boolean);
    if (words.length === 0) {
      continue;
    }
    const overlap = wordOverlap(accumulatedWords, words);
    const additions = words.slice(overlap);
    while (additions.length > 0 && accumulatedWords.at(-1) === additions[0]) {
      additions.shift();
    }
    if (additions.length === 0) {
      continue;
    }
    accumulatedWords.push(...additions);
    segments.push({
      startTime: cue.startTime,
      endTime: cue.endTime,
      text: additions.join(" "),
    });
  }

  return segments;
}

export function parseVttCaptions(content: string): TranscriptSegment[] {
  const blocks = content
    .replace(/\r\n/g, "\n")
    .split(BLOCK_SEPARATOR_RE)
    .map((block) => block.trim())
    .filter(Boolean);
  const cues: CaptionCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim());
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex === -1) {
      continue;
    }
    const [startRaw, endRaw] = lines[timingIndex].split("-->");
    if (!(startRaw && endRaw)) {
      continue;
    }
    const text = cleanVttText(lines.slice(timingIndex + 1));
    if (!text) {
      continue;
    }
    cues.push({
      startTime: parseVttTimestamp(startRaw.trim()),
      endTime: parseVttTimestamp(endRaw.trim()),
      text,
    });
  }

  return dedupeRollingCaptions(cues);
}

function findCaptionSource(
  folder: string
): { path: string; language: string } | null {
  let files: string[];
  try {
    files = readdirSync(folder);
  } catch {
    return null;
  }
  const candidates = files
    .map((file) => {
      const match = file.match(CAPTIONS_FILE_RE);
      return match ? { file, language: match[1] } : null;
    })
    .filter(
      (entry): entry is { file: string; language: string } => entry !== null
    )
    .sort((a, b) => {
      if (a.language === "en") {
        return -1;
      }
      if (b.language === "en") {
        return 1;
      }
      return a.file.localeCompare(b.file);
    });

  const first = candidates[0];
  return first
    ? { path: join(folder, first.file), language: first.language }
    : null;
}

export function readCaptionSource(folder: string): CaptionSource | null {
  const captions = findCaptionSource(folder);
  if (!captions) {
    return null;
  }
  const segments = parseVttCaptions(readFileSync(captions.path, "utf-8"));
  if (segments.length === 0) {
    return null;
  }
  return { ...captions, segments };
}

type WhisperRawSegment = {
  offsets?: { from: number; to: number };
  timestamps?: { from: string; to: string };
  start?: number;
  end?: number;
  text?: string;
};

function segmentStartTime(seg: WhisperRawSegment): number {
  if (seg.offsets !== undefined) {
    return seg.offsets.from / 1000;
  }
  if (seg.timestamps !== undefined) {
    return parseTs(seg.timestamps.from);
  }
  return seg.start ?? 0;
}

function segmentEndTime(seg: WhisperRawSegment): number {
  if (seg.offsets !== undefined) {
    return seg.offsets.to / 1000;
  }
  if (seg.timestamps !== undefined) {
    return parseTs(seg.timestamps.to);
  }
  return seg.end ?? 0;
}

export function parseWhisperJson(raw: {
  transcription?: WhisperRawSegment[];
  segments?: WhisperRawSegment[];
  result?: { language?: string };
}): { segments: TranscriptSegment[]; language: string } {
  const entries: WhisperRawSegment[] = raw.transcription ?? raw.segments ?? [];
  const segments: TranscriptSegment[] = entries
    .map((seg) => {
      const startTime = segmentStartTime(seg);
      const endTime = segmentEndTime(seg);
      return { startTime, endTime, text: (seg.text ?? "").trim() };
    })
    .filter((segment) => segment.text.length > 0);
  const language = raw.result?.language ?? "unknown";
  return { segments, language };
}

function parseTs(ts: string): number {
  const parts = ts.split(":");
  if (parts.length === 3) {
    return (
      Number.parseFloat(parts[0]) * 3600 +
      Number.parseFloat(parts[1]) * 60 +
      Number.parseFloat(parts[2])
    );
  }
  if (parts.length === 2) {
    return Number.parseFloat(parts[0]) * 60 + Number.parseFloat(parts[1]);
  }
  return Number.parseFloat(ts) || 0;
}

export function formatTimestamp(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

export function renderTranscriptMarkdown(
  segments: TranscriptSegment[],
  language: string
): string {
  const header = `# Transcript (source verbatim)\n\n**Source language:** ${language}\n\n`;
  const body = segments
    .map((s) => `[${formatTimestamp(s.startTime)}] ${s.text}`)
    .join("\n\n");
  return `${header}${body}\n`;
}

function writeTranscriptFiles(
  folder: string,
  segments: TranscriptSegment[],
  language: string,
  source: NonNullable<TranscribeResult["source"]>,
  repairedBy?: TranscribeResult["repairedBy"],
  quality?: TranscriptQualityReport
): void {
  writeFileSync(
    transcriptPath(folder),
    renderTranscriptMarkdown(segments, language)
  );
  writeFileSync(
    transcriptJsonPath(folder),
    JSON.stringify(
      {
        segments,
        language,
        source,
        ...(repairedBy ? { repairedBy } : {}),
        ...(quality ? { quality } : {}),
      },
      null,
      2
    )
  );
}

function writeTranscriptQualityReport(
  folder: string,
  report: TranscriptQualityReport
): void {
  writeFileSync(
    join(folder, "transcript-quality.json"),
    JSON.stringify(report, null, 2)
  );
}

function assertTranscriptQualityAccepted(
  report: TranscriptQualityReport
): void {
  if (report.issues.length > 0) {
    throw new Error(
      `Transcript quality check failed: ${report.issues.join(", ")}`
    );
  }
}

function cleanupFile(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    // already cleaned
  }
}

function shouldRetryLocalAsr(issues: TranscriptQualityIssue[]): boolean {
  return issues.some((issue) =>
    [
      "empty",
      "missing-timestamps",
      "outside-duration",
      "repeated-text",
      "timestamp-regression",
    ].includes(issue)
  );
}

function removeConsecutiveDuplicateSegments(
  segments: TranscriptSegment[]
): TranscriptSegment[] {
  const cleaned: TranscriptSegment[] = [];
  let previous = "";
  for (const segment of segments) {
    const normalized = segment.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (normalized.length > 0 && normalized === previous) {
      continue;
    }
    previous = normalized;
    cleaned.push(segment);
  }
  return cleaned;
}

function transcriptRepairPrompt(durationSeconds?: number): string {
  return [
    "You repair raw speech-to-text transcript JSON.",
    'Return JSON only, with shape {"language": string, "segments": [{"startTime": number, "endTime": number, "text": string}]}',
    "Remove only obvious repeated hallucination loops and empty text.",
    durationSeconds
      ? `The media duration is ${durationSeconds} seconds; remove transcript segments that clearly fall outside it.`
      : null,
    "Keep segments in chronological order and stitch the remaining transcript without adding new words.",
    'If retained text is clearly uncertain, preserve the exact words and wrap them as "[uncertain: exact words]".',
    "Do not summarize, translate, rewrite style, add facts, or change timestamps unless a removed duplicate makes the surrounding sequence valid.",
    "If the transcript is empty, return empty segments; do not invent missing content.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function parseAgentRepairOutput(output: string): TranscriptSegment[] | null {
  const trimmed = output.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return null;
  }
  const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
    segments?: TranscriptSegment[];
  };
  return Array.isArray(parsed.segments) && parsed.segments.length > 0
    ? parsed.segments
    : null;
}

async function maybeRepairTranscriptWithAgent(
  folder: string,
  segments: TranscriptSegment[],
  language: string,
  requestedAgent: TranscriptRepairAgent,
  onProgress: ProgressCallback,
  durationSeconds?: number,
  forceRepairAgent = env.TRANSCRIPT_REPAIR_ALWAYS
): Promise<{ segments: TranscriptSegment[]; repairedBy?: "claude" | "codex" }> {
  const cleaned = removeConsecutiveDuplicateSegments(segments);
  if (cleaned.length === 0) {
    return { segments: cleaned };
  }
  const issues = transcriptQualityIssues(cleaned, durationSeconds);
  if (requestedAgent === "off" || (!forceRepairAgent && issues.length === 0)) {
    return { segments: cleaned };
  }
  const agent = resolveVideoAgent(requestedAgent);
  if (!agent) {
    return { segments: cleaned };
  }

  const input = JSON.stringify(
    {
      forceRepairAgent,
      language,
      durationSeconds,
      issues,
      segments: cleaned,
    },
    null,
    2
  );
  const agentName = agent === "claude" ? "Claude Code" : "Codex";
  onProgress(96, `Asking ${agentName} to repair repeated transcript text`);
  const { output } = await runVideoAgent({
    agent,
    cwd: folder,
    errorLabel: "transcript repair",
    input,
    outputPath: join(folder, ".transcript-repair-agent.json"),
    prompt: transcriptRepairPrompt(durationSeconds),
  });
  const parsed = parseAgentRepairOutput(output);
  if (parsed) {
    return { segments: parsed, repairedBy: agent };
  }

  return { segments: cleaned };
}

async function runLocalAsr(
  wav: string,
  onProgress: ProgressCallback,
  options: TranscribeOptions,
  durationSeconds?: number
): Promise<{
  segments: TranscriptSegment[];
  language: string;
  source: Exclude<NonNullable<TranscribeResult["source"]>, "captions">;
}> {
  const modelBin = await ensureModel(env.WHISPER_MODEL, onProgress);
  onProgress(35, `Running whisper.cpp ${env.WHISPER_MODEL}`);
  const result = await runWhisper(
    wav,
    modelBin,
    onProgress,
    findWhisperBinary(options.whisperBin)
  );
  const issues = transcriptQualityIssues(result.segments, durationSeconds);
  if (shouldRetryLocalAsr(issues)) {
    onProgress(95, `Quality scan found: ${issues.join(", ")}`);
  }
  return { ...result, source: "whisper-cpp" };
}

export async function transcribe(
  folder: string,
  onProgress: ProgressCallback,
  options: TranscribeOptions = {}
): Promise<TranscribeResult> {
  const forceRepairAgent =
    options.forceRepairAgent ?? env.TRANSCRIPT_REPAIR_ALWAYS;
  const repairAgent =
    options.repairAgent ?? env.TRANSCRIPT_REPAIR_AGENT ?? env.VIDEO_AGENT;
  const metadata = readMetadata(folder);
  const captions = readCaptionSource(folder);
  if (captions) {
    onProgress(35, `Reading ${captions.language} captions`);
    onProgress(95, "Scanning transcript quality");
    const repaired = await maybeRepairTranscriptWithAgent(
      folder,
      captions.segments,
      captions.language,
      repairAgent,
      onProgress,
      metadata?.source.duration,
      forceRepairAgent
    );
    onProgress(96, "Running acceptance gate");
    const quality = transcriptQualityReport(repaired.segments, {
      durationSeconds: metadata?.source.duration,
      expectedLanguage: metadata?.source.language,
      language: captions.language,
      source: "captions",
    });
    writeTranscriptQualityReport(folder, quality);
    assertTranscriptQualityAccepted(quality);
    onProgress(97, "Writing transcript.md and transcript.json");
    writeTranscriptFiles(
      folder,
      repaired.segments,
      captions.language,
      "captions",
      repaired.repairedBy,
      quality
    );
    onProgress(
      100,
      `Transcribed from captions (${repaired.segments.length} segments, lang=${captions.language})`
    );
    return {
      segments: repaired.segments,
      language: captions.language,
      source: "captions",
      repairedBy: repaired.repairedBy,
      quality,
    };
  }

  const preflight = await preflightVideoInput(folder, onProgress);
  const wav = await extractAudio(folder, onProgress);
  await assertAudioUsable(wav, preflight.durationSeconds, onProgress);
  const result = await runLocalAsr(
    wav,
    onProgress,
    options,
    preflight.durationSeconds
  );
  onProgress(95, "Scanning transcript quality");
  const repaired = await maybeRepairTranscriptWithAgent(
    folder,
    result.segments,
    result.language,
    repairAgent,
    onProgress,
    preflight.durationSeconds,
    forceRepairAgent
  );
  onProgress(96, "Running acceptance gate");
  const quality = transcriptQualityReport(repaired.segments, {
    durationSeconds: preflight.durationSeconds,
    expectedLanguage: metadata?.source.language,
    language: result.language,
    source: result.source,
  });
  writeTranscriptQualityReport(folder, quality);
  assertTranscriptQualityAccepted(quality);

  onProgress(97, "Writing transcript.md and transcript.json");
  writeTranscriptFiles(
    folder,
    repaired.segments,
    result.language,
    result.source,
    repaired.repairedBy,
    quality
  );

  onProgress(99, "Cleaning temporary audio and whisper output");
  cleanupFile(wav);
  cleanupFile(`${wav.replace(WAV_EXT_RE, "")}.json`);

  onProgress(
    100,
    `Transcribed (${repaired.segments.length} segments, lang=${result.language})`
  );
  return {
    segments: repaired.segments,
    language: result.language,
    source: result.source,
    repairedBy: repaired.repairedBy,
    quality,
  };
}
