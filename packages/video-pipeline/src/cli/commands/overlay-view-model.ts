import { basename, dirname, join } from "node:path";
import { env } from "../../env";
import type { VideoAgentChoice } from "../../lib/agent";
import type { PipelineStage } from "../components/pipeline";
import type { BadgeState } from "../components/status-badge";
import {
  activeStageMessage,
  completeLabel,
  type StageDefinition,
  stageState,
  stageStatusLabel,
} from "./stage-view";

export type OverlayStep =
  | "project"
  | "transcript"
  | "moments"
  | "frames"
  | "visual"
  | "library"
  | "render"
  | "files"
  | "done"
  | "fail"
  | "skip";
export type OverlayStageStep = Exclude<OverlayStep, "done" | "fail" | "skip">;

export type OverlayViewState = {
  agent?: VideoAgentChoice;
  errorMsg: string | null;
  failedStep: OverlayStageStep | null;
  message: string;
  pct: number;
  projectSlug: string | null;
  projectTitle: string | null;
  sourceTitle: string | null;
  step: OverlayStep;
  usefulVisualEvidence: boolean | null;
};

const STAGES: StageDefinition<OverlayStageStep>[] = [
  {
    id: "project",
    label: "Project",
    detail: [
      "Reads: metadata.json",
      "Needs: translated stage complete",
      "Resume: skips overlay unless --force is set",
    ],
    summary: "Read metadata and decide whether overlay generation should run",
    statusLabels: {
      pending: "Waiting",
      running: "Loading",
      done: "Loaded",
      failed: "Missing",
    },
  },
  {
    id: "transcript",
    label: "Inputs",
    detail: [
      "Input: transcript.md",
      "Input: script-it.md",
      "Purpose: source text and Italian speaking script",
    ],
    summary: "Check transcript and Italian script inputs",
    statusLabels: {
      pending: "Waiting",
      running: "Checking",
      done: "Ready",
      failed: "Missing",
    },
  },
  {
    id: "moments",
    label: "Moment scout",
    detail: [
      "Reads: transcript.json, then transcript.md fallback",
      "Selects: up to 18 likely visual moments",
      "Writes: .overlay-watch/moment-plan.json",
    ],
    summary: "Find transcript timestamps worth sampling visually",
    statusLabels: {
      pending: "Waiting",
      running: "Selecting",
      done: "Selected",
      failed: "Failed",
    },
  },
  {
    id: "frames",
    label: "Frames",
    detail: [
      "Tool: ffmpeg",
      "Extracts: start, middle, end per moment",
      "Writes: .overlay-watch/frames and frame-manifest.json",
    ],
    summary: "Sample source-video frames around candidate moments",
    statusLabels: {
      pending: "Waiting",
      running: "Extracting",
      done: "Extracted",
      failed: "Failed",
    },
  },
  {
    id: "visual",
    label: "Visual scout",
    detail: [
      "Agent: read-only frame inspection",
      "Output: observed visual evidence when present",
      "Fallback: transcript-only overlay logic when frames have no signal",
    ],
    summary: "Inspect sampled frames for useful overlay inspiration",
    statusLabels: {
      pending: "Waiting",
      running: "Inspecting",
      done: "Scanned",
      failed: "Failed",
    },
  },
  {
    id: "library",
    label: "Overlay library",
    detail: [
      `Agent: ${env.VIDEO_AGENT}`,
      "Input: transcript, script, optional visual evidence",
      "Output: video-ready overlay scenes in overlay.md",
    ],
    summary: "Generate the final Italian overlay scene library",
    statusLabels: {
      pending: "Waiting",
      running: "Generating",
      done: "Generated",
      failed: "Failed",
    },
  },
  {
    id: "render",
    label: "Render",
    detail: [
      "Writes: overlays/overlay-spec.json",
      "Renders: overlays/clips/16x9 and 9x16",
      "Renders: overlays/videos/16x9 and 9x16",
    ],
    summary: "Render reusable animated overlay clips and standalone videos",
    statusLabels: {
      pending: "Waiting",
      running: "Rendering",
      done: "Rendered",
      failed: "Failed",
    },
  },
  {
    id: "files",
    label: "Files",
    detail: [
      "Writes: overlay.md",
      "Artifacts: .overlay-watch/",
      "Artifacts: overlays/",
      "Updates: overlayed stage state",
    ],
    summary: "Write overlay outputs and update metadata",
    statusLabels: {
      pending: "Waiting",
      running: "Writing",
      done: "Written",
      failed: "Failed",
    },
  },
];

function overlayVideosFolder(folder: string): string {
  return basename(folder) === "raw"
    ? join(dirname(folder), "overlays", "videos")
    : join(folder, "overlays", "videos");
}

export function overlayAgentLabel(agent?: VideoAgentChoice): string {
  return agent ?? env.VIDEO_AGENT;
}

export function overlayProgressStep(
  percent: number,
  message: string
): OverlayStageStep {
  const lower = message.toLowerCase();
  if (lower.includes("rendering") && lower.includes("overlay")) {
    return "render";
  }
  if (lower.includes("generating") && lower.includes("overlay")) {
    return "library";
  }
  if (lower.includes("inspecting sampled frames")) {
    return "visual";
  }
  if (
    lower.includes("extracting targeted") ||
    lower.includes("preflighting media") ||
    lower.includes("ffprobe")
  ) {
    return "frames";
  }
  if (lower.includes("moment scout")) {
    return "moments";
  }
  if (percent >= 90) {
    return "library";
  }
  return "transcript";
}

export function overlayStageState(
  stage: OverlayStageStep,
  current: OverlayStep,
  failedStep: OverlayStageStep | null
): BadgeState {
  return stageState(STAGES, stage, current, failedStep);
}

function visualStatusLabel(
  state: OverlayViewState,
  currentStageState: BadgeState
): string | undefined {
  if (state.usefulVisualEvidence === true && currentStageState === "done") {
    return "Useful";
  }
  if (state.usefulVisualEvidence === false && currentStageState === "done") {
    return "No signal";
  }
  return undefined;
}

function overlayStageStatusLabel(
  stage: StageDefinition<OverlayStageStep>,
  state: OverlayViewState,
  currentStageState: BadgeState
): string | undefined {
  if (stage.id === "visual") {
    return (
      visualStatusLabel(state, currentStageState) ??
      stageStatusLabel(stage, state.step, currentStageState, "project")
    );
  }
  return stageStatusLabel(stage, state.step, currentStageState, "project");
}

function overlayStageDetail(
  stage: StageDefinition<OverlayStageStep>,
  state: OverlayViewState
): string[] {
  if (stage.id === "library") {
    return [
      `Agent: ${overlayAgentLabel(state.agent)}`,
      "Input: transcript, script, optional visual evidence",
      "Output: video-ready overlay scenes in overlay.md",
    ];
  }
  return stage.detail;
}

export function overlayPipelineStages(
  state: OverlayViewState
): PipelineStage[] {
  return STAGES.map((stage) => {
    const currentStageState = overlayStageState(
      stage.id,
      state.step,
      state.failedStep
    );
    return {
      ...stage,
      detail: overlayStageDetail(stage, state),
      state: currentStageState,
      statusLabel: overlayStageStatusLabel(stage, state, currentStageState),
    };
  });
}

function visualEvidenceResultLabel(state: OverlayViewState): string {
  if (state.usefulVisualEvidence === true) {
    return "✓ used";
  }
  if (state.usefulVisualEvidence === false) {
    return "no useful frame signal";
  }
  return "not reported";
}

export function overlayInfoDetails({
  count,
  folder,
  force,
  state,
}: {
  count?: number;
  folder: string;
  force: boolean;
  state: OverlayViewState;
}): string[] {
  return [
    `Project: ${state.projectTitle ?? "loading metadata"}`,
    `Slug: ${state.projectSlug ?? "loading metadata"}`,
    `Source: ${state.sourceTitle ?? "loading metadata"}`,
    `Agent: ${overlayAgentLabel(state.agent)}`,
    `Run mode: ${force ? "force redo" : "reuse completed overlays"}`,
    "Strategy: transcript moment scout, sampled frames, video-ready overlay scenes",
    `Overlay count: ${count ?? "prompt decides"}`,
    "Input: transcript.md",
    "Input: script-it.md",
    "Writes: overlay.md",
    "Writes: overlays/overlay-spec.json",
    "Writes: overlays/clips/16x9 and 9x16",
    "Writes: overlays/videos/16x9 and 9x16",
    "Artifacts: .overlay-watch/",
    `Folder: ${folder}`,
  ];
}

export function activeOverlayMessage(step: OverlayStep): string | undefined {
  return activeStageMessage(STAGES, step);
}

export function shouldShowOverlayProgress(step: OverlayStep): boolean {
  return ["moments", "frames", "visual", "library", "render", "files"].includes(
    step
  );
}

export function overlaySuccessDetails(
  folder: string,
  state: OverlayViewState
): string[] {
  return [
    `Status: ${completeLabel(state.step)}`,
    "Output: ✓ overlay.md",
    "Output: ✓ overlays/overlay-spec.json",
    "Output: ✓ overlays/clips/16x9 + 9x16",
    "Output: ✓ overlays/videos/16x9 + 9x16",
    "Artifacts: ✓ .overlay-watch/",
    `Visual evidence: ${visualEvidenceResultLabel(state)}`,
    `Next: review "${overlayVideosFolder(folder)}"`,
  ];
}
