import type { PipelineStage } from "../components/pipeline";
import type { BadgeState } from "../components/status-badge";

export type TerminalStep = "done" | "fail" | "skip";

export type StageDefinition<TStage extends string> = {
  id: TStage;
  label: string;
  detail: string[];
  summary: string;
  statusLabels: NonNullable<PipelineStage["statusLabels"]>;
};

export function nextRenderTick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function completeLabel(step: string): string {
  return step === "skip" ? "✓ Already complete" : "✓ Complete";
}

export function stageState<TStage extends string>(
  stages: readonly StageDefinition<TStage>[],
  stage: TStage,
  current: TStage | TerminalStep,
  failedStep: TStage | null
): BadgeState {
  if (failedStep === stage) {
    return "failed";
  }
  if (current === "done" || current === "skip") {
    return "done";
  }
  if (current === "fail") {
    return "pending";
  }

  const stageIndex = stages.findIndex((s) => s.id === stage);
  const currentIndex = stages.findIndex((s) => s.id === current);
  if (currentIndex === stageIndex) {
    return "running";
  }
  return currentIndex > stageIndex ? "done" : "pending";
}

export function stageStatusLabel<TStage extends string>(
  stage: StageDefinition<TStage>,
  current: TStage | TerminalStep,
  state: BadgeState,
  skipAnchor: TStage
): string | undefined {
  if (current === "skip") {
    return stage.id === skipAnchor ? stage.statusLabels.done : "Skipped";
  }
  return stage.statusLabels[state];
}

export function activeStageMessage<TStage extends string>(
  stages: readonly StageDefinition<TStage>[],
  step: TStage | TerminalStep
): string | undefined {
  const activeStage = stages.find((stage) => stage.id === step);
  if (!activeStage) {
    return undefined;
  }
  return `current: ${activeStage.label.toLowerCase()} · ${activeStage.summary}`;
}
