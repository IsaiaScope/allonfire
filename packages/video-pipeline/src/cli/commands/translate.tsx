import { Box, useApp } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import type { ResolvedVideoAgent, VideoAgentChoice } from "../../lib/agent";
import { withLock } from "../../lib/lock";
import {
  isStageDone,
  markStageDone,
  markStageFailed,
  type ProjectMetadata,
  readMetadata,
} from "../../lib/metadata";
import { translate } from "../../pipeline/translate";
import { Header } from "../components/header";
import { InfoPanel } from "../components/info-panel";
import { Pipeline } from "../components/pipeline";
import { ResultPanel } from "../components/result-panel";
import { WorkPanel } from "../components/work-panel";
import { errorMessage, nextRenderTick } from "./stage-view";
import {
  activeTranslateMessage,
  type TranslateStageStep as StageStep,
  shouldShowTranslateProgress,
  type TranslateStep,
  type TranslateViewState,
  translateInfoDetails,
  translatePipelineStages,
  translateProgressStep,
  translateSuccessDetails,
} from "./translate-view-model";

type Props = { agent?: VideoAgentChoice; folder: string; force: boolean };

type TranslateFlowControls = {
  exit: () => void;
  isCancelled: () => boolean;
  setAgentUsed: (agent: ResolvedVideoAgent | null) => void;
  setCopiedVerbatim: (copied: boolean) => void;
  setErrorMsg: (message: string | null) => void;
  setFailedStep: (step: StageStep | null) => void;
  setMessage: (message: string) => void;
  setPct: (pct: number) => void;
  setProjectSlug: (slug: string | null) => void;
  setProjectTitle: (title: string | null) => void;
  setSourceLanguage: (language: string | null) => void;
  setStep: (step: TranslateStep) => void;
};

function setMetadataView(
  meta: ProjectMetadata,
  controls: TranslateFlowControls
): void {
  controls.setProjectTitle(meta.title);
  controls.setProjectSlug(meta.slug);
  controls.setSourceLanguage(meta.source.language);
}

const TranslateStatusPanel: React.FC<{
  folder: string;
  state: TranslateViewState;
}> = ({ folder, state }) => {
  if (state.step === "fail") {
    return (
      <ResultPanel
        details={[
          "Status: ✗ Failed",
          `Error: ${state.errorMsg ?? "unknown error"}`,
          "Fix: check transcript.md, agent CLI, and retry with --force",
        ]}
        title="Translation failed"
        tone="error"
      />
    );
  }

  if (state.step === "done" || state.step === "skip") {
    const title =
      state.step === "skip" ? "Translation already complete" : state.message;
    return (
      <ResultPanel
        details={translateSuccessDetails(folder, state)}
        progress={100}
        title={title}
        tone="success"
      />
    );
  }

  return (
    <WorkPanel
      busy
      current={activeTranslateMessage(state.step)}
      progress={shouldShowTranslateProgress(state.step) ? state.pct : undefined}
      progressWidth={38}
      title={state.message}
    />
  );
};

function handleTranslateProgress({
  controls,
  move,
}: {
  controls: TranslateFlowControls;
  move: (step: StageStep) => void;
}): (percent: number, message: string) => void {
  return (percent, message) => {
    if (controls.isCancelled()) {
      return;
    }
    const next = translateProgressStep(percent, message);
    move(next);
    controls.setPct(percent);
    controls.setMessage(message);
  };
}

async function runTranslateStage({
  agent,
  controls,
  folder,
  move,
}: {
  agent?: VideoAgentChoice;
  controls: TranslateFlowControls;
  folder: string;
  move: (step: StageStep) => void;
}): Promise<void> {
  await withLock(folder, async () => {
    try {
      const result = await translate(folder, {
        agent,
        onProgress: handleTranslateProgress({ controls, move }),
      });
      controls.setAgentUsed(result.agent);
      controls.setCopiedVerbatim(result.copiedVerbatim);
      move("files");
      markStageDone(folder, "translated");
    } catch (err) {
      markStageFailed(folder, "translated", errorMessage(err));
      throw err;
    }
  });
}

async function runTranslateFlow(
  { agent, folder, force }: Props,
  controls: TranslateFlowControls
): Promise<void> {
  let activeStep: StageStep = "project";
  const move = (next: StageStep) => {
    activeStep = next;
    controls.setStep(next);
  };

  try {
    move("project");
    const meta = readMetadata(folder);
    if (!meta) {
      throw new Error("No metadata.json — run `download` first");
    }
    setMetadataView(meta, controls);
    if (!isStageDone(meta.stages.transcribed)) {
      throw new Error("Transcribe stage not complete — run `transcribe` first");
    }
    if (!meta.source.language) {
      throw new Error("Source language unknown — run `transcribe` first");
    }
    if (isStageDone(meta.stages.translated) && !force) {
      controls.setStep("skip");
      controls.setMessage("already translated — pass --force to redo");
      return;
    }

    await runTranslateStage({ agent, controls, folder, move });
    controls.setStep("done");
    controls.setPct(100);
    controls.setMessage("Translation complete");
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

export const TranslateView: React.FC<Props> = ({ agent, folder, force }) => {
  const { exit } = useApp();
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState("Starting");
  const [step, setStep] = useState<TranslateStep>("project");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedStep, setFailedStep] = useState<StageStep | null>(null);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<string | null>(null);
  const [agentUsed, setAgentUsed] = useState<ResolvedVideoAgent | null>(null);
  const [copiedVerbatim, setCopiedVerbatim] = useState(false);

  useEffect(() => {
    let cancelled = false;
    runTranslateFlow(
      { agent, folder, force },
      {
        exit,
        isCancelled: () => cancelled,
        setAgentUsed,
        setCopiedVerbatim,
        setErrorMsg,
        setFailedStep,
        setMessage,
        setPct,
        setProjectSlug,
        setProjectTitle,
        setSourceLanguage,
        setStep,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [agent, folder, force, exit]);

  const state: TranslateViewState = {
    agent,
    agentUsed,
    copiedVerbatim,
    errorMsg,
    failedStep,
    message,
    pct,
    projectSlug,
    projectTitle,
    sourceLanguage,
    step,
  };

  return (
    <Box flexDirection="column">
      <Header title="translate source transcript" />

      <InfoPanel
        borderColor="cyan"
        details={translateInfoDetails({ folder, force, state })}
        title="Translation package"
      />

      <Pipeline stages={translatePipelineStages(state)} />

      <Box flexDirection="column" marginTop={1}>
        <TranslateStatusPanel folder={folder} state={state} />
      </Box>
    </Box>
  );
};
