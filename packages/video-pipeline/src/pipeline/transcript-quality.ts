import type { TranscribeResult, TranscriptSegment } from "./types";

const WORD_SEPARATOR_RE = /\s+/;

export type TranscriptQualityIssue =
  | "caption-source-suspicious"
  | "empty"
  | "language-mismatch"
  | "low-word-density"
  | "missing-timestamps"
  | "outside-duration"
  | "repeated-text"
  | "too-short-for-duration"
  | "timestamp-regression";

export type TranscriptQualityReport = {
  durationSeconds?: number;
  endTime: number;
  expectedLanguage?: string;
  issues: TranscriptQualityIssue[];
  language: string;
  source: NonNullable<TranscribeResult["source"]>;
  wordCount: number;
  wordsPerMinute: number | null;
};

export function hasRepeatedHallucination(
  segments: TranscriptSegment[]
): boolean {
  let previous = "";
  let runLength = 0;
  for (const segment of segments) {
    const normalized = segment.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (normalized.length === 0) {
      continue;
    }
    if (normalized === previous) {
      runLength += 1;
      if (runLength >= 3) {
        return true;
      }
    } else {
      previous = normalized;
      runLength = 1;
    }
  }
  return false;
}

export function transcriptQualityIssues(
  segments: TranscriptSegment[],
  durationSeconds?: number
): TranscriptQualityIssue[] {
  return transcriptQualityReport(segments, {
    durationSeconds,
    language: "unknown",
    source: "whisper-cpp",
  }).issues;
}

function countWords(segments: TranscriptSegment[]): number {
  return segments.reduce(
    (sum, segment) =>
      sum + segment.text.split(WORD_SEPARATOR_RE).filter(Boolean).length,
    0
  );
}

function addTimestampIssues(
  issues: Set<TranscriptQualityIssue>,
  segments: TranscriptSegment[]
): void {
  if (segments.length > 1 && segments.every((s) => s.endTime <= s.startTime)) {
    issues.add("missing-timestamps");
  }

  let previousStart = Number.NEGATIVE_INFINITY;
  for (const segment of segments) {
    if (segment.startTime + 0.5 < previousStart) {
      issues.add("timestamp-regression");
    }
    previousStart = Math.max(previousStart, segment.startTime);
  }
}

function addDurationIssues(
  issues: Set<TranscriptQualityIssue>,
  {
    durationSeconds,
    endTime,
    wordCount,
    wordsPerMinute,
  }: {
    durationSeconds?: number;
    endTime: number;
    wordCount: number;
    wordsPerMinute: number | null;
  }
): void {
  if (!durationSeconds || durationSeconds <= 0) {
    return;
  }

  const tolerance = Math.max(5, durationSeconds * 0.03);
  if (endTime > durationSeconds + tolerance) {
    issues.add("outside-duration");
  }
  if (durationSeconds < 30 || wordCount === 0 || wordsPerMinute === null) {
    return;
  }
  if (wordsPerMinute < 20) {
    issues.add("low-word-density");
  }
  if (endTime < durationSeconds * 0.35 && wordsPerMinute < 35) {
    issues.add("too-short-for-duration");
  }
}

function shouldFlagLanguageMismatch(
  language: string,
  expectedLanguage?: string | null
): boolean {
  return (
    Boolean(expectedLanguage) &&
    language !== "unknown" &&
    language.toLowerCase() !== expectedLanguage?.toLowerCase()
  );
}

function hasSuspiciousCaptionIssues(
  issues: Set<TranscriptQualityIssue>
): boolean {
  return [...issues].some((issue) =>
    ["empty", "low-word-density", "too-short-for-duration"].includes(issue)
  );
}

export function transcriptQualityReport(
  segments: TranscriptSegment[],
  {
    durationSeconds,
    expectedLanguage,
    language,
    source,
  }: {
    durationSeconds?: number;
    expectedLanguage?: string | null;
    language: string;
    source: NonNullable<TranscribeResult["source"]>;
  }
): TranscriptQualityReport {
  const issues = new Set<TranscriptQualityIssue>();
  const wordCount = countWords(segments);
  const endTime = Math.max(0, ...segments.map((segment) => segment.endTime));
  const wordsPerMinute =
    durationSeconds && durationSeconds > 0
      ? wordCount / (durationSeconds / 60)
      : null;

  if (segments.length === 0) {
    issues.add("empty");
  }
  if (hasRepeatedHallucination(segments)) {
    issues.add("repeated-text");
  }
  addTimestampIssues(issues, segments);
  addDurationIssues(issues, {
    durationSeconds,
    endTime,
    wordCount,
    wordsPerMinute,
  });

  if (shouldFlagLanguageMismatch(language, expectedLanguage)) {
    issues.add("language-mismatch");
  }

  if (source === "captions" && hasSuspiciousCaptionIssues(issues)) {
    issues.add("caption-source-suspicious");
  }

  return {
    durationSeconds,
    endTime,
    expectedLanguage: expectedLanguage ?? undefined,
    issues: [...issues],
    language,
    source,
    wordCount,
    wordsPerMinute,
  };
}
