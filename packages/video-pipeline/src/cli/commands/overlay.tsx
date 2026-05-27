import { existsSync } from "node:fs";
import { Box, useApp } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import type { VideoAgentChoice } from "../../lib/agent";
import { withLock } from "../../lib/lock";
import {
  isStageDone,
  markStageDone,
  markStageFailed,
  type ProjectMetadata,
  readMetadata,
} from "../../lib/metadata";
import { overlayPath } from "../../lib/paths";
import { generateOverlays } from "../../pipeline/overlay";
import {
  createOverlayRenderPackage,
  hasCompleteOverlayRenderManifest,
} from "../../pipeline/overlay-render";
import { Header } from "../components/header";
import { InfoPanel } from "../components/info-panel";
import { Pipeline } from "../components/pipeline";
import { ResultPanel } from "../components/result-panel";
import { WorkPanel } from "../components/work-panel";
import {
  activeOverlayMessage,
  type OverlayStep,
  type OverlayViewState,
  overlayInfoDetails,
  overlayPipelineStages,
  overlayProgressStep,
  overlaySuccessDetails,
  type OverlayStageStep as StageStep,
  shouldShowOverlayProgress,
} from "./overlay-view-model";
import { errorMessage, nextRenderTick } from "./stage-view";

type Props = {
  agent?: VideoAgentChoice;
  count?: number;
  folder: string;
  force: boolean;
};

type OverlayFlowControls = {
  exit: () => void;
  isCancelled: () => boolean;
  setErrorMsg: (message: string | null) => void;
  setFailedStep: (step: StageStep | null) => void;
  setMessage: (message: string) => void;
  setPct: (pct: number) => void;
  setProjectSlug: (slug: string | null) => void;
  setProjectTitle: (title: string | null) => void;
  setSourceTitle: (title: string | null) => void;
  setStep: (step: OverlayStep) => void;
  setUsefulVisualEvidence: (used: boolean | null) => void;
};

function setMetadataView(
  meta: ProjectMetadata,
  controls: OverlayFlowControls
): void {
  controls.setProjectTitle(meta.title);
  controls.setProjectSlug(meta.slug);
  controls.setSourceTitle(meta.source.title);
}

const OverlayStatusPanel: React.FC<{
  folder: string;
  state: OverlayViewState;
}> = ({ folder, state }) => {
  if (state.step === "fail") {
    return (
      <ResultPanel
        details={[
          "Status: ✗ Failed",
          `Error: ${state.errorMsg ?? "unknown error"}`,
          "Fix: check transcript.md, script-it.md, ffmpeg, agent CLI, and retry with --force",
        ]}
        title="Overlay generation failed"
        tone="error"
      />
    );
  }

  if (state.step === "done" || state.step === "skip") {
    const title =
      state.step === "skip"
        ? "Overlay library already complete"
        : state.message;
    return (
      <ResultPanel
        details={overlaySuccessDetails(folder, state)}
        progress={100}
        title={title}
        tone="success"
      />
    );
  }

  return (
    <WorkPanel
      busy
      current={activeOverlayMessage(state.step)}
      progress={shouldShowOverlayProgress(state.step) ? state.pct : undefined}
      progressWidth={38}
      title={state.message}
    />
  );
};

function handleOverlayProgress({
  controls,
  move,
}: {
  controls: OverlayFlowControls;
  move: (step: StageStep) => void;
}): (percent: number, message: string) => void {
  return (percent, message) => {
    if (controls.isCancelled()) {
      return;
    }
    const next = overlayProgressStep(percent, message);
    move(next);
    controls.setPct(percent);
    controls.setMessage(message);
  };
}

async function runOverlayStage({
  agent,
  controls,
  count,
  folder,
  force,
  meta,
  move,
}: {
  agent?: VideoAgentChoice;
  controls: OverlayFlowControls;
  count?: number;
  folder: string;
  force: boolean;
  meta: ProjectMetadata;
  move: (step: StageStep) => void;
}): Promise<void> {
  await withLock(folder, async () => {
    try {
      const shouldGenerateLibrary = force || !existsSync(overlayPath(folder));
      if (shouldGenerateLibrary) {
        const result = await generateOverlays(folder, meta.title, count, {
          agent,
          onProgress: handleOverlayProgress({ controls, move }),
        });
        controls.setUsefulVisualEvidence(result.usefulVisualEvidence);
      }
      move("render");
      controls.setMessage("Rendering 16:9 and 9:16 overlay clips and videos");
      controls.setPct(96);
      await createOverlayRenderPackage(folder, meta, { force });
      move("files");
      markStageDone(folder, "overlayed");
    } catch (err) {
      markStageFailed(folder, "overlayed", errorMessage(err));
      throw err;
    }
  });
}

async function runOverlayFlow(
  props: Props,
  controls: OverlayFlowControls
): Promise<void> {
  let activeStep: StageStep = "project";
  const move = (next: StageStep) => {
    activeStep = next;
    controls.setStep(next);
  };

  try {
    move("project");
    const meta = readMetadata(props.folder);
    if (!meta) {
      throw new Error("No metadata.json — run `download` first");
    }
    setMetadataView(meta, controls);
    move("transcript");
    if (!isStageDone(meta.stages.translated)) {
      throw new Error("Translate stage not complete — run `translate` first");
    }
    const hasOverlayMarkdown = existsSync(overlayPath(props.folder));
    const hasRenderManifest = hasCompleteOverlayRenderManifest(props.folder);
    if (hasOverlayMarkdown && hasRenderManifest && !props.force) {
      if (!isStageDone(meta.stages.overlayed)) {
        markStageDone(props.folder, "overlayed");
      }
      controls.setStep("skip");
      controls.setMessage("already overlayed — pass --force to redo");
      return;
    }

    await runOverlayStage({
      agent: props.agent,
      controls,
      count: props.count,
      folder: props.folder,
      force: props.force,
      meta,
      move,
    });
    controls.setStep("done");
    controls.setPct(100);
    controls.setMessage("Overlay videos complete");
  } catch (err) {
    if (!controls.isCancelled()) {
      controls.setFailedStep(activeStep);
      controls.setStep("fail");
      controls.setErrorMsg(errorMessage(err));
      process.exitCode = 1;
    }
  } finally {
    await nextRenderTick();
    controls.exit();
  }
}

export const OverlayView: React.FC<Props> = ({
  agent,
  count,
  folder,
  force,
}) => {
  const { exit } = useApp();
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState("Starting");
  const [step, setStep] = useState<OverlayStep>("project");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedStep, setFailedStep] = useState<StageStep | null>(null);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);
  const [usefulVisualEvidence, setUsefulVisualEvidence] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    runOverlayFlow(
      { agent, count, folder, force },
      {
        exit,
        isCancelled: () => cancelled,
        setErrorMsg,
        setFailedStep,
        setMessage,
        setPct,
        setProjectSlug,
        setProjectTitle,
        setSourceTitle,
        setStep,
        setUsefulVisualEvidence,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [agent, count, folder, force, exit]);

  const state: OverlayViewState = {
    agent,
    errorMsg,
    failedStep,
    message,
    pct,
    projectSlug,
    projectTitle,
    sourceTitle,
    step,
    usefulVisualEvidence,
  };

  return (
    <Box flexDirection="column">
      <Header title="generate overlay library" />

      <InfoPanel
        borderColor="cyan"
        details={overlayInfoDetails({ count, folder, force, state })}
        title="Overlay package"
      />

      <Pipeline stages={overlayPipelineStages(state)} />

      <Box flexDirection="column" marginTop={1}>
        <OverlayStatusPanel folder={folder} state={state} />
      </Box>
    </Box>
  );
};
