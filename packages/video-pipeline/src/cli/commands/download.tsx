import { existsSync, mkdirSync } from "node:fs";
import { Box, useApp } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import { env } from "../../env";
import { ToolMissingError } from "../../errors";
import { checkTool } from "../../lib/deps";
import { withLock } from "../../lib/lock";
import {
  initMetadata,
  markStageDone,
  markStageFailed,
  readMetadata,
  type StageRecord,
} from "../../lib/metadata";
import { projectFolder, videoFileName } from "../../lib/paths";
import { slugifyOrFallback } from "../../lib/slug";
import {
  downloadCaptions,
  downloadVideo,
  extractYoutubeId,
  getVideoInfo,
  type Quality,
} from "../../pipeline/download";
import type { VideoInfo } from "../../pipeline/types";
import { Header } from "../components/header";
import { InfoPanel } from "../components/info-panel";
import { Pipeline } from "../components/pipeline";
import { ResultPanel } from "../components/result-panel";
import { WorkPanel } from "../components/work-panel";
import {
  activeDownloadMessage,
  type DownloadStep,
  type DownloadViewState,
  downloadInfoDetails,
  downloadPipelineStages,
  downloadSuccessDetails,
  projectTitleForDownload,
  type DownloadStageStep as StageStep,
} from "./download-view-model";
import { errorMessage, nextRenderTick } from "./stage-view";

type Props = {
  url: string;
  title?: string;
  date: string;
  quality: Quality;
  force: boolean;
};

type DownloadFlowControls = {
  exit: () => void;
  isCancelled: () => boolean;
  setCaptions: (captions: string | undefined) => void;
  setErrorMsg: (message: string | null) => void;
  setFailedStep: (step: StageStep | null) => void;
  setFolder: (folder: string | null) => void;
  setMessage: (message: string) => void;
  setPct: (pct: number) => void;
  setProjectTitle: (title: string | null) => void;
  setStep: (step: DownloadStep) => void;
  setVideoFile: (file: string | null) => void;
};

function isStageDone(record: StageRecord | undefined): boolean {
  return record !== null && record !== undefined && "at" in record;
}

const DownloadStatusPanel: React.FC<{
  state: DownloadViewState;
}> = ({ state }) => {
  if (state.step === "video") {
    return (
      <WorkPanel
        current={`yt-dlp is writing ${state.videoFile ?? "the slug-named mp4"}`}
        progress={state.pct}
        title="Downloading video"
      />
    );
  }

  if (state.step === "fail") {
    return (
      <ResultPanel
        details={[
          "Status: ✗ Failed",
          `Error: ${state.errorMsg ?? "unknown error"}`,
          "Fix: check the URL and retry with --force if partial files exist",
        ]}
        title="Download failed"
        tone="error"
      />
    );
  }

  if (state.step === "done" || state.step === "skip") {
    const title =
      state.step === "skip" ? "Download already complete" : state.message;
    return (
      <ResultPanel
        details={downloadSuccessDetails(state)}
        progress={100}
        title={title}
        tone="success"
      />
    );
  }

  return (
    <WorkPanel
      busy
      current={activeDownloadMessage(state.step)}
      title={state.message}
    />
  );
};

function prepareKnownFolder({
  controls,
  date,
  force,
  title,
  url,
}: Pick<Props, "date" | "force" | "title" | "url"> & {
  controls: DownloadFlowControls;
}): boolean {
  const explicitTitle = title?.trim();
  if (!explicitTitle) {
    return false;
  }

  const slug = slugifyOrFallback(explicitTitle, extractYoutubeId(url));
  const knownFolder = projectFolder(env.VIDEO_WORK_DIR, date, slug);
  controls.setProjectTitle(explicitTitle);
  controls.setFolder(knownFolder);

  if (!existsSync(knownFolder)) {
    mkdirSync(knownFolder, { recursive: true });
  }

  const existing = readMetadata(knownFolder);
  controls.setVideoFile(existing?.slug ? videoFileName(existing.slug) : null);
  if (isStageDone(existing?.stages.downloaded) && !force) {
    controls.setStep("skip");
    controls.setMessage("Already downloaded — pass --force to redo");
    return true;
  }

  return false;
}

async function runProjectDownload({
  controls,
  date,
  folderPath,
  force,
  info,
  projectTitle,
  quality,
  slug,
  url,
}: {
  controls: DownloadFlowControls;
  date: string;
  folderPath: string;
  force: boolean;
  info: VideoInfo;
  projectTitle: string;
  quality: Quality;
  slug: string;
  url: string;
}): Promise<void> {
  controls.setFolder(folderPath);
  controls.setProjectTitle(projectTitle);
  controls.setVideoFile(videoFileName(slug));

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true });
  }

  await withLock(folderPath, async () => {
    const existing = readMetadata(folderPath);
    if (isStageDone(existing?.stages.downloaded) && !force) {
      controls.setStep("skip");
      controls.setMessage("Already downloaded — pass --force to redo");
      return;
    }

    if (!existing) {
      initMetadata(folderPath, {
        title: projectTitle,
        slug,
        date,
        source: {
          url,
          youtubeId: info.youtubeId || extractYoutubeId(url),
          title: info.title,
          duration: info.duration,
          thumbnail: info.thumbnail,
          language: null,
        },
      });
    }

    await runDownloadStage({
      controls,
      folderPath,
      force,
      info,
      quality,
      slug,
      url,
    });
    await runCaptionStage({ controls, folderPath, force, url });
    markStageDone(folderPath, "downloaded");
    controls.setStep("done");
    controls.setMessage("Download complete");
  });
}

async function runDownloadStage({
  controls,
  folderPath,
  force,
  info,
  quality,
  slug,
  url,
}: {
  controls: DownloadFlowControls;
  folderPath: string;
  force: boolean;
  info: VideoInfo;
  quality: Quality;
  slug: string;
  url: string;
}): Promise<void> {
  controls.setStep("video");
  try {
    await downloadVideo(
      url,
      folderPath,
      quality,
      (p, m) => {
        if (controls.isCancelled()) {
          return;
        }
        controls.setPct(p);
        controls.setMessage(m);
      },
      { force, info, outputSlug: slug }
    );
  } catch (err) {
    markStageFailed(folderPath, "downloaded", errorMessage(err));
    throw err;
  }
}

async function runCaptionStage({
  controls,
  folderPath,
  force,
  url,
}: {
  controls: DownloadFlowControls;
  folderPath: string;
  force: boolean;
  url: string;
}): Promise<void> {
  controls.setStep("captions");
  controls.setMessage("Pulling EN captions if available");
  controls.setCaptions(await downloadCaptions(url, folderPath, { force }));
}

async function runDownloadFlow(
  props: Props,
  controls: DownloadFlowControls
): Promise<void> {
  let activeStep: StageStep = "check";
  const move = (next: StageStep) => {
    activeStep = next;
    controls.setStep(next);
  };

  try {
    move("check");
    const yt = await checkTool("yt-dlp");
    if (!yt.installed) {
      throw new ToolMissingError("yt-dlp");
    }

    if (prepareKnownFolder({ ...props, controls })) {
      return;
    }

    move("info");
    controls.setMessage("Fetching source metadata via yt-dlp");
    const info = await getVideoInfo(props.url);
    const resolvedTitle = projectTitleForDownload(props.title, info.title);
    const slug = slugifyOrFallback(
      resolvedTitle,
      info.youtubeId || extractYoutubeId(props.url)
    );
    await runProjectDownload({
      controls,
      date: props.date,
      folderPath: projectFolder(env.VIDEO_WORK_DIR, props.date, slug),
      force: props.force,
      info,
      projectTitle: resolvedTitle,
      quality: props.quality,
      slug,
      url: props.url,
    });
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

export const DownloadView: React.FC<Props> = ({
  url,
  title,
  date,
  quality,
  force,
}) => {
  const { exit } = useApp();
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState("Starting…");
  const [step, setStep] = useState<DownloadStep>("check");
  const [folder, setFolder] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string | null>(
    title?.trim() || null
  );
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string | undefined>();
  const [failedStep, setFailedStep] = useState<StageStep | null>(null);

  useEffect(() => {
    let cancelled = false;
    runDownloadFlow(
      { date, force, quality, title, url },
      {
        exit,
        isCancelled: () => cancelled,
        setCaptions,
        setErrorMsg,
        setFailedStep,
        setFolder,
        setMessage,
        setPct,
        setProjectTitle,
        setStep,
        setVideoFile,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [url, title, date, quality, force, exit]);

  const state: DownloadViewState = {
    captions,
    errorMsg,
    failedStep,
    folder,
    message,
    pct,
    projectTitle,
    step,
    videoFile,
  };

  return (
    <Box flexDirection="column">
      <Header subtitle={url} title="download YouTube video" />

      <InfoPanel
        borderColor="cyan"
        details={downloadInfoDetails({ ...state, date, force, quality })}
        title="Source package"
      />

      <Pipeline stages={downloadPipelineStages(step, failedStep)} />

      <Box flexDirection="column" marginTop={1}>
        <DownloadStatusPanel state={state} />
      </Box>
    </Box>
  );
};
