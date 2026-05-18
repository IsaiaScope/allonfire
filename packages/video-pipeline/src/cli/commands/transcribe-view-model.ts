import { env } from "../../env";
import type { VideoAgentChoice } from "../../lib/agent";
import { videoFileName } from "../../lib/paths";
import type { PipelineStage } from "../components/pipeline";
import type { BadgeState } from "../components/status-badge";
import {
  activeStageMessage,
  completeLabel,
  type StageDefinition,
  stageState,
  stageStatusLabel,
} from "./stage-view";
import { TRANSCRIBE_STAGES } from "./transcribe-stages";

export type TranscriptSource = "captions" | "whisper-cpp";
export type LocalAsrSource = Exclude<TranscriptSource, "captions">;

export type TranscribeStep =
  | "metadata"
  | "deps"
  | "captions"
  | "model"
  | "audio"
  | "whisper"
  | "quality-scan"
  | "agent"
  | "acceptance"
  | "files"
  | "done"
  | "fail"
  | "skip";
export type TranscribeStageStep = Exclude<
  TranscribeStep,
  "done" | "fail" | "skip"
>;
export type RepairState = "pending" | "used" | "skipped";
export type CaptionState = "available" | "missing" | null;

export type TranscribeViewState = {
  agent?: VideoAgentChoice;
  captionState: CaptionState;
  currentAsrSource: LocalAsrSource | null;
  errorMsg: string | null;
  failedStep: TranscribeStageStep | null;
  language: string | null;
  localAsrOrder: string[];
  message: string;
  pct: number;
  projectSlug: string | null;
  projectTitle: string | null;
  qualityIssues: string[] | null;
  qualityWordCount: number | null;
  qualityWordsPerMinute: number | null;
  repairedBy: "claude" | "codex" | null;
  repairState: RepairState;
  segments: number | null;
  sourceTitle: string | null;
  step: TranscribeStep;
  transcriptSource: TranscriptSource | null;
};

export function transcribeProgressStep(
  percent: number,
  message: string
): TranscribeStageStep {
  if (
    message.includes("Asking Claude Code") ||
    message.includes("Asking Codex")
  ) {
    return "agent";
  }
  if (message.toLowerCase().includes("captions")) {
    return "captions";
  }
  if (
    message.includes("Scanning transcript quality") ||
    message.includes("Quality scan found")
  ) {
    return "quality-scan";
  }
  if (message.includes("Running acceptance gate")) {
    return "acceptance";
  }
  if (message.includes("whisper.cpp")) {
    return "whisper";
  }
  if (
    message.includes("Downloading whisper model") ||
    message.includes("Whisper model")
  ) {
    return "model";
  }
  if (percent >= 96 || message.includes("Writing transcript")) {
    return "files";
  }
  if (
    percent >= 35 ||
    message.includes("Running whisper") ||
    message.includes("Transcribing")
  ) {
    return "whisper";
  }
  if (percent >= 5 || message.includes("audio")) {
    return "audio";
  }
  return "model";
}

export function asrSourceFromMessage(message: string): LocalAsrSource | null {
  if (message.includes("whisper.cpp")) {
    return "whisper-cpp";
  }
  return null;
}

function asrModelLabel(_source: LocalAsrSource): string {
  return `whisper.cpp ${env.WHISPER_MODEL}`;
}

function asrStageDetail(
  currentAsrSource: LocalAsrSource | null,
  localAsrOrder: string[]
): string[] {
  return [
    currentAsrSource
      ? `Current: ${asrModelLabel(currentAsrSource)}`
      : `Candidates: ${localAsrOrder.join(" → ") || "whisper.cpp"}`,
    "Language: auto detect",
    "Output: speech segments with timestamps",
  ];
}

export function transcribeStageState(
  stage: TranscribeStageStep,
  current: TranscribeStep,
  failedStep: TranscribeStageStep | null
): BadgeState {
  return stageState(TRANSCRIBE_STAGES, stage, current, failedStep);
}

function transcribeStageStatusLabel(
  stage: StageDefinition<TranscribeStageStep>,
  current: TranscribeStep,
  state: BadgeState
): string | undefined {
  return stageStatusLabel(stage, current, state, "metadata");
}

function fallbackLabel(localAsrOrder: string[]): string {
  if (localAsrOrder.length > 0) {
    return localAsrOrder.join(" → ");
  }
  return "captions first, then OS-aware local ASR";
}

export function transcribeInfoDetails({
  folder,
  force,
  state,
}: {
  folder: string;
  force: boolean;
  state: TranscribeViewState;
}): string[] {
  const videoFile = state.projectSlug
    ? videoFileName(state.projectSlug)
    : "project slug mp4";
  return [
    `Project: ${state.projectTitle ?? "loading metadata"}`,
    `Slug: ${state.projectSlug ?? "loading metadata"}`,
    `Source: ${state.sourceTitle ?? "loading metadata"}`,
    `Agent: ${state.agent ?? env.TRANSCRIPT_REPAIR_AGENT ?? env.VIDEO_AGENT}`,
    `Fallback: ${fallbackLabel(state.localAsrOrder)}`,
    `Run mode: ${force ? "force redo" : "reuse completed transcript"}`,
    "Strategy: captions first, local ASR, agent repair",
    `Input: ${videoFile} if captions are missing`,
    "Writes: transcript.md",
    "Writes: transcript.json",
    `Language: ${state.language ?? "auto detect"}`,
    `Folder: ${folder}`,
  ];
}

function skippedByCaptions(
  stage: TranscribeStageStep,
  captionState: CaptionState
): boolean {
  return (
    captionState === "available" &&
    ["deps", "model", "audio", "whisper"].includes(stage)
  );
}

function skippedModel(
  stage: TranscribeStageStep,
  transcriptSource: TranscriptSource | null
): boolean {
  return (
    transcriptSource !== null &&
    transcriptSource !== "whisper-cpp" &&
    stage === "model"
  );
}

function skippedAgent(
  stage: TranscribeStageStep,
  repairState: RepairState
): boolean {
  return stage === "agent" && repairState === "skipped";
}

function captionsUnavailable(
  stage: TranscribeStageStep,
  captionState: CaptionState
): boolean {
  return captionState === "missing" && stage === "captions";
}

function transcribeStagePresentation(
  stage: StageDefinition<TranscribeStageStep>,
  state: TranscribeViewState
): Pick<PipelineStage, "state" | "statusLabel" | "detail"> {
  if (
    skippedByCaptions(stage.id, state.captionState) ||
    skippedModel(stage.id, state.transcriptSource) ||
    skippedAgent(stage.id, state.repairState)
  ) {
    return { detail: stage.detail, state: "pending", statusLabel: "Skipped" };
  }

  if (captionsUnavailable(stage.id, state.captionState)) {
    return {
      detail: stage.detail,
      state: "pending",
      statusLabel: "Unavailable",
    };
  }

  const currentStageState = transcribeStageState(
    stage.id,
    state.step,
    state.failedStep
  );
  return {
    detail:
      stage.id === "whisper"
        ? asrStageDetail(state.currentAsrSource, state.localAsrOrder)
        : stage.detail,
    state: currentStageState,
    statusLabel: transcribeStageStatusLabel(
      stage,
      state.step,
      currentStageState
    ),
  };
}

export function transcribePipelineStages(
  state: TranscribeViewState
): PipelineStage[] {
  return TRANSCRIBE_STAGES.map((stage) => ({
    ...stage,
    ...transcribeStagePresentation(stage, state),
  }));
}

export function activeTranscribeMessage(
  step: TranscribeStep
): string | undefined {
  return activeStageMessage(TRANSCRIBE_STAGES, step);
}

export function shouldShowTranscribeProgress(step: TranscribeStep): boolean {
  return [
    "model",
    "captions",
    "audio",
    "whisper",
    "quality-scan",
    "acceptance",
    "files",
  ].includes(step);
}

export function transcribeSuccessDetails(
  folder: string,
  state: TranscribeViewState
): string[] {
  return [
    `Status: ${completeLabel(state.step)}`,
    "Output: ✓ transcript.md and transcript.json",
    "Quality: ✓ transcript-quality.json",
    ...(state.transcriptSource ? [`Source: ✓ ${state.transcriptSource}`] : []),
    ...(state.repairedBy ? [`Repair: ✓ ${state.repairedBy}`] : []),
    ...(state.qualityIssues
      ? [`Quality issues: ${state.qualityIssues.join(", ") || "none"}`]
      : []),
    ...(state.qualityWordCount !== null
      ? [`Words: ${state.qualityWordCount}`]
      : []),
    ...(state.qualityWordsPerMinute !== null
      ? [`Pace: ${Math.round(state.qualityWordsPerMinute)} words/min`]
      : []),
    ...(state.segments !== null ? [`Segments: ${state.segments}`] : []),
    ...(state.language ? [`Language: ${state.language}`] : []),
    ...(state.step === "done"
      ? ["Reset: translated and overlayed stages"]
      : []),
    `Next: pnpm video translate "${folder}"`,
  ];
}
