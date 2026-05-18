import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { readMetadata } from "../lib/metadata";
import { legacyRealTitleVideoPath, videoPath } from "../lib/paths";
import type { ProgressCallback } from "./types";

const SILENCE_DURATION_RE = /silence_duration:\s*([0-9.]+)/g;

export type MediaPreflight = {
  durationSeconds: number;
  videoPath: string;
};

export function resolveVideoInput(folder: string): string {
  const metadata = readMetadata(folder);
  const slugInput = metadata?.slug ? videoPath(folder, metadata.slug) : null;
  const titledInput = metadata?.source.title
    ? legacyRealTitleVideoPath(folder, metadata.source.title)
    : null;
  const fallbackInput = videoPath(folder);
  return (
    [slugInput, titledInput, fallbackInput].find(
      (path): path is string => path !== null && existsSync(path)
    ) ??
    slugInput ??
    fallbackInput
  );
}

function parseFfprobeDuration(raw: unknown): number | null {
  const data = raw as {
    format?: { duration?: string };
    streams?: { codec_type?: string; duration?: string }[];
  };
  const candidates = [
    data.format?.duration,
    ...(data.streams ?? []).map((stream) => stream.duration),
  ];
  for (const candidate of candidates) {
    const duration = Number.parseFloat(candidate ?? "");
    if (Number.isFinite(duration) && duration > 0) {
      return duration;
    }
  }
  return null;
}

function runFfprobe(input: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      input,
    ]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed (${code}): ${stderr.slice(-200)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`Failed to parse ffprobe JSON: ${err}`));
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start ffprobe: ${err.message}`))
    );
  });
}

export async function preflightVideoInput(
  folder: string,
  onProgress: ProgressCallback
): Promise<MediaPreflight> {
  const input = resolveVideoInput(folder);
  if (!existsSync(input)) {
    throw new Error(`Video file missing: ${input}`);
  }
  if (statSync(input).size === 0) {
    throw new Error(`Video file is empty: ${input}`);
  }

  onProgress(3, "Preflighting media with ffprobe");
  const probe = (await runFfprobe(input)) as {
    streams?: { codec_type?: string }[];
  };
  const hasAudio = (probe.streams ?? []).some(
    (stream) => stream.codec_type === "audio"
  );
  if (!hasAudio) {
    throw new Error("Video has no audio stream");
  }
  const durationSeconds = parseFfprobeDuration(probe);
  if (!durationSeconds) {
    throw new Error("Video duration is unknown");
  }

  return { durationSeconds, videoPath: input };
}

export function parseSilenceRatio(
  output: string,
  durationSeconds?: number
): number | null {
  if (!durationSeconds || durationSeconds <= 0) {
    return null;
  }
  let silenceSeconds = 0;
  for (
    let match = SILENCE_DURATION_RE.exec(output);
    match !== null;
    match = SILENCE_DURATION_RE.exec(output)
  ) {
    silenceSeconds += Number.parseFloat(match[1]);
  }
  SILENCE_DURATION_RE.lastIndex = 0;
  return Math.min(1, silenceSeconds / durationSeconds);
}

export function assertAudioUsable(
  wav: string,
  durationSeconds: number,
  onProgress: ProgressCallback
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!existsSync(wav)) {
      reject(new Error(`Extracted audio missing: ${wav}`));
      return;
    }
    if (statSync(wav).size === 0) {
      reject(new Error(`Extracted audio is empty: ${wav}`));
      return;
    }

    onProgress(31, "Checking extracted audio for silence");
    const proc = spawn("ffmpeg", [
      "-i",
      wav,
      "-af",
      "silencedetect=n=-45dB:d=0.5",
      "-f",
      "null",
      "-",
    ]);
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffmpeg silence check failed (${code}): ${stderr.slice(-200)}`
          )
        );
        return;
      }
      const silenceRatio = parseSilenceRatio(stderr, durationSeconds);
      if (silenceRatio !== null && silenceRatio >= 0.95) {
        reject(
          new Error(
            `Extracted audio is mostly silence (${Math.round(
              silenceRatio * 100
            )}%)`
          )
        );
        return;
      }
      resolve();
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start ffmpeg silence check: ${err.message}`))
    );
  });
}
