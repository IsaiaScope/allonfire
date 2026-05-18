import type { Quality } from "../../pipeline/download";
import type { PipelineStage } from "../components/pipeline";
import {
  activeStageMessage,
  completeLabel,
  type StageDefinition,
  stageState,
  stageStatusLabel,
} from "./stage-view";

export type DownloadStep =
  | "check"
  | "info"
  | "video"
  | "captions"
  | "done"
  | "fail"
  | "skip";
export type DownloadStageStep = Exclude<DownloadStep, "done" | "fail" | "skip">;

export type DownloadViewState = {
  captions?: string;
  errorMsg: string | null;
  failedStep: DownloadStageStep | null;
  folder: string | null;
  message: string;
  pct: number;
  projectTitle: string | null;
  step: DownloadStep;
  videoFile: string | null;
};

const STAGES: StageDefinition<DownloadStageStep>[] = [
  {
    id: "check",
    label: "Dependencies",
    detail: [
      "Tool: yt-dlp",
      "Checks: binary available on PATH",
      "Purpose: metadata and media downloads",
    ],
    summary: "Verify yt-dlp before source or media work",
    statusLabels: {
      pending: "Waiting",
      running: "Checking",
      done: "Verified",
      failed: "Missing",
    },
  },
  {
    id: "info",
    label: "Source",
    detail: [
      "Reads: title, duration, thumbnail",
      "Validates: YouTube video URL",
      "Creates: metadata.json and project folder",
    ],
    summary: "Read source metadata and prepare the project folder",
    statusLabels: {
      pending: "Waiting",
      running: "Reading",
      done: "Prepared",
      failed: "Rejected",
    },
  },
  {
    id: "video",
    label: "Video",
    detail: [
      "Output: project slug mp4",
      "Quality: selected resolution cap",
      "Resume: skips completed work unless --force is set",
    ],
    summary: "Write the slug-named mp4 with the selected quality cap",
    statusLabels: {
      pending: "Waiting",
      running: "Downloading",
      done: "Saved",
      failed: "Failed",
    },
  },
  {
    id: "captions",
    label: "Captions",
    detail: [
      "Output: captions-en.vtt when available",
      "Language: English auto subtitles",
      "Optional: continues when captions are missing",
    ],
    summary: "Fetch optional English captions when YouTube provides them",
    statusLabels: {
      pending: "Waiting",
      running: "Checking",
      done: "Handled",
      failed: "Failed",
    },
  },
];

export function projectTitleForDownload(
  explicitTitle: string | undefined,
  sourceTitle: string
): string {
  return explicitTitle?.trim() || sourceTitle;
}

function runModeLabel(force: boolean): string {
  return force ? "force redo" : "reuse completed stages";
}

export function downloadInfoDetails({
  date,
  folder,
  force,
  projectTitle,
  quality,
  videoFile,
}: DownloadViewState & {
  date: string;
  force: boolean;
  quality: Quality;
}): string[] {
  return [
    `Project: ${projectTitle ?? "from video metadata"}`,
    `Quality: ${quality}`,
    `Date: ${date}`,
    `Run mode: ${runModeLabel(force)}`,
    `Video: ${videoFile ?? "from video metadata"}`,
    `Folder: ${folder ?? "creating project folder"}`,
  ];
}

export function downloadPipelineStages(
  current: DownloadStep,
  failedStep: DownloadStageStep | null
): PipelineStage[] {
  return STAGES.map((stage) => {
    const state = stageState(STAGES, stage.id, current, failedStep);
    return {
      ...stage,
      state,
      statusLabel: stageStatusLabel(stage, current, state, "check"),
    };
  });
}

export function activeDownloadMessage(step: DownloadStep): string | undefined {
  return activeStageMessage(STAGES, step);
}

function captionsResultLine(
  step: DownloadStep,
  captions: string | undefined
): string {
  if (captions) {
    return "Captions: ✓ captions-en.vtt";
  }
  if (step === "skip") {
    return "Captions: • unchanged";
  }
  return "Captions: • not available";
}

export function downloadSuccessDetails(state: DownloadViewState): string[] {
  return [
    `Status: ${completeLabel(state.step)}`,
    `Video: ✓ ${state.videoFile ?? "slug-named mp4"}`,
    captionsResultLine(state.step, state.captions),
    `Next: pnpm video transcribe "${state.folder ?? ""}"`,
  ];
}
