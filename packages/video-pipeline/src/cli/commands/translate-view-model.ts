import { env } from "../../env";
import type { ResolvedVideoAgent, VideoAgentChoice } from "../../lib/agent";
import type { PipelineStage } from "../components/pipeline";
import type { BadgeState } from "../components/status-badge";
import {
  activeStageMessage,
  completeLabel,
  type StageDefinition,
  stageState,
  stageStatusLabel,
} from "./stage-view";

export type TranslateStep =
  | "project"
  | "transcript"
  | "agent"
  | "verbatim"
  | "script"
  | "files"
  | "done"
  | "fail"
  | "skip";
export type TranslateStageStep = Exclude<
  TranslateStep,
  "done" | "fail" | "skip"
>;

export type TranslateViewState = {
  agent?: VideoAgentChoice;
  agentUsed: ResolvedVideoAgent | null;
  copiedVerbatim: boolean;
  errorMsg: string | null;
  failedStep: TranslateStageStep | null;
  message: string;
  pct: number;
  projectSlug: string | null;
  projectTitle: string | null;
  sourceLanguage: string | null;
  step: TranslateStep;
};

const STAGES: StageDefinition<TranslateStageStep>[] = [
  {
    id: "project",
    label: "Project",
    detail: [
      "Reads: metadata.json",
      "Needs: transcribed stage complete",
      "Resume: skips translation unless --force is set",
    ],
    summary: "Read metadata and decide whether translation should run",
    statusLabels: {
      pending: "Waiting",
      running: "Loading",
      done: "Loaded",
      failed: "Missing",
    },
  },
  {
    id: "transcript",
    label: "Transcript",
    detail: [
      "Input: transcript.md",
      "Needs: source language from transcription",
      "Purpose: source material for Italian outputs",
    ],
    summary: "Read the source transcript produced by transcribe",
    statusLabels: {
      pending: "Waiting",
      running: "Reading",
      done: "Ready",
      failed: "Missing",
    },
  },
  {
    id: "agent",
    label: "Agent",
    detail: [
      `Mode: ${env.TRANSLATE_AGENT ?? env.VIDEO_AGENT}`,
      "Auto: Claude Code first, then Codex",
      "Purpose: translation and script rewriting",
    ],
    summary: "Select the configured Claude Code or Codex runner",
    statusLabels: {
      pending: "Waiting",
      running: "Selecting",
      done: "Selected",
      failed: "Missing",
    },
  },
  {
    id: "verbatim",
    label: "Verbatim",
    detail: [
      "Output: transcript-it.md",
      "Keeps: timestamps and paragraph breaks",
      "Italian: copies transcript when source is already Italian",
    ],
    summary: "Create the timestamp-preserving Italian transcript",
    statusLabels: {
      pending: "Waiting",
      running: "Translating",
      done: "Translated",
      failed: "Failed",
    },
  },
  {
    id: "script",
    label: "Script",
    detail: [
      "Output: script-it.md",
      "Prompt: cue-card Italian speaking script",
      "Style: concise channel voice without invented facts",
    ],
    summary:
      "Rewrite the Italian transcript into a speaker-friendly cue script",
    statusLabels: {
      pending: "Waiting",
      running: "Rewriting",
      done: "Rewritten",
      failed: "Failed",
    },
  },
  {
    id: "files",
    label: "Files",
    detail: [
      "Writes: transcript-it.md",
      "Writes: script-it.md",
      "Updates: translated stage state",
    ],
    summary: "Write translation outputs and update metadata",
    statusLabels: {
      pending: "Waiting",
      running: "Writing",
      done: "Written",
      failed: "Failed",
    },
  },
];

export function agentChoiceLabel(agent?: VideoAgentChoice): string {
  return agent ?? env.TRANSLATE_AGENT ?? env.VIDEO_AGENT;
}

function agentName(agent: ResolvedVideoAgent): string {
  return agent === "claude" ? "Claude Code" : "Codex";
}

export function translateProgressStep(
  percent: number,
  message: string
): TranslateStageStep {
  const lower = message.toLowerCase();
  if (lower.includes("writing script-it") || percent >= 95) {
    return "files";
  }
  if (lower.includes("rewrite")) {
    return "script";
  }
  if (
    lower.includes("copying italian transcript") ||
    lower.includes("translate transcript") ||
    lower.includes("writing transcript-it")
  ) {
    return "verbatim";
  }
  if (lower.includes("selected for translation")) {
    return "agent";
  }
  if (lower.includes("reading transcript")) {
    return "transcript";
  }
  return "project";
}

export function translateStageState(
  stage: TranslateStageStep,
  current: TranslateStep,
  failedStep: TranslateStageStep | null
): BadgeState {
  return stageState(STAGES, stage, current, failedStep);
}

function translateStageStatusLabel(
  stage: StageDefinition<TranslateStageStep>,
  state: TranslateViewState,
  currentStageState: BadgeState
): string | undefined {
  if (
    stage.id === "verbatim" &&
    state.sourceLanguage === "it" &&
    currentStageState === "done"
  ) {
    return "Copied";
  }
  return stageStatusLabel(stage, state.step, currentStageState, "project");
}

function translateStageDetail(
  stage: StageDefinition<TranslateStageStep>,
  state: TranslateViewState
): string[] {
  if (stage.id === "agent") {
    return [
      `Mode: ${agentChoiceLabel(state.agent)}`,
      `Resolved: ${
        state.agentUsed ? agentName(state.agentUsed) : "selects at run time"
      }`,
      "Purpose: translation and script rewriting",
    ];
  }
  return stage.detail;
}

export function translatePipelineStages(
  state: TranslateViewState
): PipelineStage[] {
  return STAGES.map((stage) => {
    const currentStageState = translateStageState(
      stage.id,
      state.step,
      state.failedStep
    );
    return {
      ...stage,
      detail: translateStageDetail(stage, state),
      state: currentStageState,
      statusLabel: translateStageStatusLabel(stage, state, currentStageState),
    };
  });
}

export function translateInfoDetails({
  folder,
  force,
  state,
}: {
  folder: string;
  force: boolean;
  state: TranslateViewState;
}): string[] {
  return [
    `Project: ${state.projectTitle ?? "loading metadata"}`,
    `Slug: ${state.projectSlug ?? "loading metadata"}`,
    `Source: ${state.sourceLanguage ?? "loading metadata"}`,
    `Agent: ${agentChoiceLabel(state.agent)}`,
    `Run mode: ${force ? "force redo" : "reuse completed translation"}`,
    "Target: Italian",
    "Input: transcript.md",
    "Writes: transcript-it.md",
    "Writes: script-it.md",
    `Folder: ${folder}`,
  ];
}

export function activeTranslateMessage(
  step: TranslateStep
): string | undefined {
  return activeStageMessage(STAGES, step);
}

export function shouldShowTranslateProgress(step: TranslateStep): boolean {
  return ["transcript", "agent", "verbatim", "script", "files"].includes(step);
}

export function translateSuccessDetails(
  folder: string,
  state: TranslateViewState
): string[] {
  return [
    `Status: ${completeLabel(state.step)}`,
    "Output: ✓ transcript-it.md",
    "Output: ✓ script-it.md",
    ...(state.agentUsed ? [`Agent: ✓ ${agentName(state.agentUsed)}`] : []),
    ...(state.copiedVerbatim ? ["Verbatim: ✓ copied from Italian source"] : []),
    `Next: pnpm video overlay "${folder}"`,
  ];
}
