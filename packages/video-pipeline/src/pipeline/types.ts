export type ProgressCallback = (percent: number, message: string) => void;

export type VideoInfo = {
  title: string;
  duration: number;
  youtubeId: string;
  thumbnail?: string;
};

export type DownloadResult = {
  folder: string;
  videoPath: string;
  info: VideoInfo;
  captionsPath?: string;
};

export type TranscriptSegment = {
  startTime: number;
  endTime: number;
  text: string;
};

export type TranscribeResult = {
  segments: TranscriptSegment[];
  language: string;
  source?: "captions" | "whisper-cpp";
  repairedBy?: "claude" | "codex";
  quality?: {
    issues: string[];
    wordCount: number;
    wordsPerMinute: number | null;
  };
};
