import { spawn } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import {
  captionsPath,
  legacyRealTitleVideoPath,
  videoPath,
} from "../lib/paths";
import type { DownloadResult, ProgressCallback, VideoInfo } from "./types";

const YT_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
];

const DOWNLOAD_PCT_RE = /\[download]\s+(\d+\.?\d*)%/;

export function extractYoutubeId(url: string): string {
  for (const pattern of YT_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  throw new Error(`Cannot extract YouTube video ID from: ${url}`);
}

export function getVideoInfo(url: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", ["--dump-json", "--no-download", url]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`yt-dlp metadata failed (${code}): ${stderr.slice(-300)}`)
        );
        return;
      }
      try {
        const json = JSON.parse(stdout);
        resolve({
          title: json.title ?? "Untitled",
          duration: json.duration ?? 0,
          youtubeId: json.id ?? extractYoutubeId(url),
          thumbnail: json.thumbnail,
        });
      } catch (e) {
        reject(new Error(`Failed to parse yt-dlp JSON: ${e}`));
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start yt-dlp: ${err.message}`))
    );
  });
}

export type Quality = "4k" | "1080p" | "720p";

export type DownloadVideoOptions = {
  force?: boolean;
  info?: VideoInfo;
  outputSlug?: string;
};

const QUALITY_HEIGHT: Record<Quality, number> = {
  "4k": 2160,
  "1080p": 1080,
  "720p": 720,
};

export async function downloadVideo(
  url: string,
  folder: string,
  quality: Quality,
  onProgress: ProgressCallback,
  options: DownloadVideoOptions = {}
): Promise<DownloadResult> {
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }
  const info = options.info ?? (await getVideoInfo(url));
  const target = videoPath(
    folder,
    options.outputSlug ?? info.youtubeId ?? extractYoutubeId(url)
  );
  const titleTarget = legacyRealTitleVideoPath(folder, info.title);
  const legacyTarget = videoPath(folder);

  if (existsSync(target) && !options.force) {
    onProgress(100, "Video already downloaded");
    return { folder, videoPath: target, info };
  }
  if (existsSync(titleTarget) && !options.force) {
    onProgress(100, "Video already downloaded");
    return { folder, videoPath: titleTarget, info };
  }
  if (existsSync(legacyTarget) && !options.force) {
    onProgress(100, "Video already downloaded");
    return { folder, videoPath: legacyTarget, info };
  }

  onProgress(5, "Starting download…");

  const heightCap = QUALITY_HEIGHT[quality];
  const formatSelector = `bestvideo[height<=${heightCap}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${heightCap}][ext=mp4]/best`;

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("yt-dlp", [
      "-f",
      formatSelector,
      "--merge-output-format",
      "mp4",
      "--newline",
      "--progress",
      ...(options.force ? ["--force-overwrites"] : []),
      "-o",
      target,
      url,
    ]);
    let lastPct = 5;
    const onChunk = (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(DOWNLOAD_PCT_RE);
      if (match) {
        const pct = Math.min(Math.floor(Number.parseFloat(match[1])), 99);
        if (pct > lastPct) {
          lastPct = pct;
          onProgress(pct, `Downloading ${pct}%`);
        }
      }
    };
    proc.stdout.on("data", onChunk);
    proc.stderr.on("data", onChunk);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start yt-dlp: ${err.message}`))
    );
  });

  onProgress(100, "Download complete");
  return { folder, videoPath: target, info };
}

export function downloadCaptions(
  url: string,
  folder: string,
  options: { force?: boolean } = {}
): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const target = captionsPath(folder, "en");
    if (existsSync(target) && !options.force) {
      resolve(target);
      return;
    }
    if (options.force) {
      rmSync(target, { force: true });
    }
    const proc = spawn("yt-dlp", [
      "--write-auto-subs",
      "--write-subs",
      "--sub-langs",
      "en",
      "--sub-format",
      "vtt",
      "--skip-download",
      "-o",
      `${folder}/source.%(ext)s`,
      url,
    ]);
    let stderr = "";
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    proc.on("close", () => {
      const candidates = [
        `${folder}/source.en.vtt`,
        `${folder}/source.en-US.vtt`,
        `${folder}/source.en-orig.vtt`,
      ];
      const found = candidates.find((p) => existsSync(p));
      if (!found) {
        resolve(undefined);
        return;
      }
      try {
        renameSync(found, target);
        resolve(target);
      } catch (e) {
        reject(
          new Error(
            `Failed to rename captions: ${e}. stderr: ${stderr.slice(-200)}`
          )
        );
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start yt-dlp captions: ${err.message}`))
    );
  });
}
