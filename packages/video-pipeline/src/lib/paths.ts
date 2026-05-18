import { join } from "node:path";
import { slugifyOrFallback } from "./slug";
import { truncateUtf8 } from "./text";

const RAW_FOLDER = "raw";
const DEFAULT_VIDEO_FILE = "video.mp4";
const FALLBACK_VIDEO_BASENAME = "video";
const MAX_VIDEO_BASENAME_BYTES = 180;
const UNSAFE_FILENAME_CHAR_RE = /[<>:"/\\|?*]/g;
const WHITESPACE_RE = /\s+/g;
const TRAILING_FILENAME_DOT_SPACE_RE = /[-. ]+$/g;

function replaceControlCharacters(value: string): string {
  return Array.from(value, (char) => {
    const code = char.codePointAt(0);
    return code !== undefined && (code <= 0x1f || code === 0x7f) ? "-" : char;
  }).join("");
}

export function projectFolderFromName(workDir: string, name: string): string {
  return join(workDir, name, RAW_FOLDER);
}

export function projectFolder(
  workDir: string,
  date: string,
  slug: string
): string {
  return projectFolderFromName(workDir, `${date}-${slug}`);
}

export function videoFileName(slug?: string): string {
  if (!slug) {
    return DEFAULT_VIDEO_FILE;
  }
  return `${slugifyOrFallback(slug, "video")}.mp4`;
}

export function videoPath(folder: string, slug?: string): string {
  return join(folder, videoFileName(slug));
}

export function legacyRealTitleVideoFileName(title: string): string {
  const cleaned = title
    .normalize("NFC")
    .replace(UNSAFE_FILENAME_CHAR_RE, "-")
    .replace(WHITESPACE_RE, " ")
    .trim();
  const normalized = replaceControlCharacters(cleaned)
    .replace(UNSAFE_FILENAME_CHAR_RE, "-")
    .replace(TRAILING_FILENAME_DOT_SPACE_RE, "")
    .trim();
  const basename =
    normalized.length > 0 && normalized !== "." && normalized !== ".."
      ? normalized
      : FALLBACK_VIDEO_BASENAME;
  return `${truncateUtf8(basename, MAX_VIDEO_BASENAME_BYTES) || FALLBACK_VIDEO_BASENAME}.mp4`;
}

export function legacyRealTitleVideoPath(
  folder: string,
  title: string
): string {
  return join(folder, legacyRealTitleVideoFileName(title));
}

export function audioPath(folder: string): string {
  return join(folder, "audio.wav");
}

export function captionsPath(folder: string, lang: string): string {
  return join(folder, `captions-${lang}.vtt`);
}

export function transcriptPath(folder: string): string {
  return join(folder, "transcript.md");
}

export function transcriptJsonPath(folder: string): string {
  return join(folder, "transcript.json");
}

export function transcriptItPath(folder: string): string {
  return join(folder, "transcript-it.md");
}

export function scriptItPath(folder: string): string {
  return join(folder, "script-it.md");
}

export function overlayPath(folder: string): string {
  return join(folder, "overlay.md");
}

export function metadataPath(folder: string): string {
  return join(folder, "metadata.json");
}

export function lockPath(folder: string): string {
  return join(folder, ".lock");
}
