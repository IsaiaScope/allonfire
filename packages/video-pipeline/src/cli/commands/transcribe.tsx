import { Box, useApp } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import { ToolMissingError } from "../../errors";
import type { VideoAgentChoice } from "../../lib/agent";
import { checkTool } from "../../lib/deps";
import { withLock } from "../../lib/lock";
import {
  isStageDone,
  markStageDone,
  markStageFailed,
  type ProjectMetadata,
  readMetadata,
  resetStages,
  updateSourceLanguage,
} from "../../lib/metadata";
import {
  localAsrCandidateOrder,
  readCaptionSource,
  transcribe,
} from "../../pipeline/transcribe";
import { Header } from "../components/header";
import { InfoPanel } from "../components/info-panel";
import { Pipeline } from "../components/pipeline";
import { ResultPanel } from "../components/result-panel";
import { WorkPanel } from "../components/work-panel";
import { errorMessage, nextRenderTick } from "./stage-view";
import {
  activeTranscribeMessage,
  asrSourceFromMessage,
  type CaptionState,
  type LocalAsrSource,
  type RepairState,
  type TranscribeStageStep as StageStep,
  shouldShowTranscribeProgress,
  type TranscribeStep,
  type TranscribeViewState,
  type TranscriptSource,
  transcribeInfoDetails,
  transcribePipelineStages,
  transcribeProgressStep,
  transcribeSuccessDetails,
} from "./transcribe-view-model";

type Props = { agent?: VideoAgentChoice; folder: string; force: boolean };

type TranscribeFlowControls = {
  exit: () => void;
  isCancelled: () => boolean;
  setCaptionState: (state: CaptionState) => void;
  setCurrentAsrSource: (source: LocalAsrSource | null) => void;
  setErrorMsg: (message: string | null) => void;
  setFailedStep: (step: StageStep | null) => void;
  setLanguage: (language: string | null) => void;
  setLocalAsrOrder: (order: string[]) => void;
  setMessage: (message: string) => void;
  setPct: (pct: number) => void;
  setProjectSlug: (slug: string | null) => void;
  setProjectTitle: (title: string | null) => void;
  setQualityIssues: (issues: string[] | null) => void;
  setQualityWordCount: (count: number | null) => void;
  setQualityWordsPerMinute: (wpm: number | null) => void;
  setRepairedBy: (agent: "claude" | "codex" | null) => void;
  setRepairState: (
    state: RepairState | ((previous: RepairState) => RepairState)
  ) => void;
  setSegments: (segments: number | null) => void;
  setSourceTitle: (title: string | null) => void;
  setStep: (step: TranscribeStep) => void;
  setTranscriptSource: (source: TranscriptSource | null) => void;
};

function setMetadataView(
  meta: ProjectMetadata,
  controls: TranscribeFlowControls
): void {
  controls.setProjectTitle(meta.title);
  controls.setProjectSlug(meta.slug);
  controls.setSourceTitle(meta.source.title);
  controls.setLanguage(meta.source.language);
}

const TranscribeStatusPanel: React.FC<{
  folder: string;
  state: TranscribeViewState;
}> = ({ folder, state }) => {
  if (state.step === "fail") {
    return (
      <ResultPanel
        details={[
          "Status: ✗ Failed",
          `Error: ${state.errorMsg ?? "unknown error"}`,
          "Fix: check captions, ffmpeg, local ASR tools, and retry with --force",
        ]}
        title="Transcription failed"
        tone="error"
      />
    );
  }

  if (state.step === "done" || state.step === "skip") {
    const title =
      state.step === "skip" ? "Transcription already complete" : state.message;
    return (
      <ResultPanel
        details={transcribeSuccessDetails(folder, state)}
        progress={100}
        title={title}
        tone="success"
      />
    );
  }

  return (
    <WorkPanel
      busy
      current={activeTranscribeMessage(state.step)}
      progress={
        shouldShowTranscribeProgress(state.step) ? state.pct : undefined
      }
      progressWidth={38}
      title={state.message}
    />
  );
};

async function prepareTranscriptInput({
  controls,
  folder,
  move,
}: {
  controls: TranscribeFlowControls;
  folder: string;
  move: (step: StageStep) => void;
}): Promise<void> {
  move("captions");
  controls.setPct(10);
  controls.setMessage("Checking downloaded captions");
  const captionSource = readCaptionSource(folder);
  const selectedAsrOrder =
    captionSource === null ? localAsrCandidateOrder() : [];
  controls.setLocalAsrOrder(selectedAsrOrder);

  if (captionSource === null) {
    controls.setCaptionState("missing");
    move("deps");
    controls.setMessage("Checking ffmpeg and local ASR");
    const ff = await checkTool("ffmpeg");
    if (!ff.installed) {
      throw new ToolMissingError("ffmpeg");
    }
    return;
  }

  controls.setCaptionState("available");
  controls.setTranscriptSource("captions");
}

function handleTranscribeProgress({
  controls,
  move,
}: {
  controls: TranscribeFlowControls;
  move: (step: StageStep) => void;
}): (percent: number, message: string) => void {
  return (percent, message) => {
    if (controls.isCancelled()) {
      return;
    }
    const next = transcribeProgressStep(percent, message);
    move(next);
    if (next === "agent") {
      controls.setRepairState("used");
    }
    const asrSource = asrSourceFromMessage(message);
    if (asrSource) {
      controls.setCurrentAsrSource(asrSource);
    }
    controls.setPct(percent);
    controls.setMessage(message);
  };
}

function recordTranscriptionResult(
  folder: string,
  result: Awaited<ReturnType<typeof transcribe>>,
  controls: TranscribeFlowControls
): void {
  controls.setLanguage(result.language);
  controls.setSegments(result.segments.length);
  controls.setTranscriptSource(result.source ?? "whisper-cpp");
  controls.setQualityIssues(result.quality?.issues ?? null);
  controls.setQualityWordCount(result.quality?.wordCount ?? null);
  controls.setQualityWordsPerMinute(result.quality?.wordsPerMinute ?? null);
  if (result.source && result.source !== "captions") {
    controls.setCurrentAsrSource(result.source);
  }
  controls.setRepairedBy(result.repairedBy ?? null);
  controls.setRepairState((previous) =>
    result.repairedBy || previous === "used" ? "used" : "skipped"
  );
  controls.setMessage("Updating metadata source language");
  updateSourceLanguage(folder, result.language);
  markStageDone(folder, "transcribed");
  resetStages(folder, ["translated", "overlayed"]);
}

async function runTranscribeStage({
  agent,
  controls,
  folder,
  move,
}: {
  agent?: VideoAgentChoice;
  controls: TranscribeFlowControls;
  folder: string;
  move: (step: StageStep) => void;
}): Promise<void> {
  await withLock(folder, async () => {
    try {
      const result = await transcribe(
        folder,
        handleTranscribeProgress({ controls, move }),
        { repairAgent: agent }
      );
      move("files");
      recordTranscriptionResult(folder, result, controls);
    } catch (err) {
      markStageFailed(folder, "transcribed", errorMessage(err));
      throw err;
    }
  });
}

async function runTranscribeFlow(
  { agent, folder, force }: Props,
  controls: TranscribeFlowControls
): Promise<void> {
  let activeStep: StageStep = "metadata";
  const move = (next: StageStep) => {
    activeStep = next;
    controls.setStep(next);
  };

  try {
    move("metadata");
    const meta = readMetadata(folder);
    if (!meta) {
      throw new Error("No metadata.json — run `download` first");
    }
    setMetadataView(meta, controls);
    if (isStageDone(meta.stages.transcribed) && !force) {
      controls.setStep("skip");
      controls.setMessage("already transcribed — pass --force to redo");
      return;
    }

    await prepareTranscriptInput({ controls, folder, move });
    await runTranscribeStage({ agent, controls, folder, move });
    controls.setStep("done");
    controls.setPct(100);
    controls.setMessage("Transcription complete");
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

export const TranscribeView: React.FC<Props> = ({ agent, folder, force }) => {
  const { exit } = useApp();
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState("Starting");
  const [step, setStep] = useState<TranscribeStep>("metadata");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [segments, setSegments] = useState<number | null>(null);
  const [transcriptSource, setTranscriptSource] =
    useState<TranscriptSource | null>(null);
  const [currentAsrSource, setCurrentAsrSource] =
    useState<LocalAsrSource | null>(null);
  const [repairedBy, setRepairedBy] = useState<"claude" | "codex" | null>(null);
  const [repairState, setRepairState] = useState<RepairState>("pending");
  const [localAsrOrder, setLocalAsrOrder] = useState<string[]>([]);
  const [captionState, setCaptionState] = useState<CaptionState>(null);
  const [failedStep, setFailedStep] = useState<StageStep | null>(null);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);
  const [qualityIssues, setQualityIssues] = useState<string[] | null>(null);
  const [qualityWordCount, setQualityWordCount] = useState<number | null>(null);
  const [qualityWordsPerMinute, setQualityWordsPerMinute] = useState<
    number | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    runTranscribeFlow(
      { agent, folder, force },
      {
        exit,
        isCancelled: () => cancelled,
        setCaptionState,
        setCurrentAsrSource,
        setErrorMsg,
        setFailedStep,
        setLanguage,
        setLocalAsrOrder,
        setMessage,
        setPct,
        setProjectSlug,
        setProjectTitle,
        setQualityIssues,
        setQualityWordCount,
        setQualityWordsPerMinute,
        setRepairedBy,
        setRepairState,
        setSegments,
        setSourceTitle,
        setStep,
        setTranscriptSource,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [agent, folder, force, exit]);

  const state: TranscribeViewState = {
    agent,
    captionState,
    currentAsrSource,
    errorMsg,
    failedStep,
    language,
    localAsrOrder,
    message,
    pct,
    projectSlug,
    projectTitle,
    qualityIssues,
    qualityWordCount,
    qualityWordsPerMinute,
    repairedBy,
    repairState,
    segments,
    sourceTitle,
    step,
    transcriptSource,
  };

  return (
    <Box flexDirection="column">
      <Header title="transcribe source video" />

      <InfoPanel
        borderColor="cyan"
        details={transcribeInfoDetails({ folder, force, state })}
        title="Transcription package"
      />

      <Pipeline stages={transcribePipelineStages(state)} />

      <Box flexDirection="column" marginTop={1}>
        <TranscribeStatusPanel folder={folder} state={state} />
      </Box>
    </Box>
  );
};
