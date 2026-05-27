import { Box, useApp } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import { createOverlayMockups } from "../../pipeline/mockups";
import { Header } from "../components/header";
import { InfoPanel } from "../components/info-panel";
import { ResultPanel } from "../components/result-panel";
import { WorkPanel } from "../components/work-panel";
import { errorMessage, nextRenderTick } from "./stage-view";

type Props = {
  folder: string;
  force: boolean;
  overlayId?: string;
};

type MockupsStep = "run" | "done" | "fail" | "skip";

const MockupsStatusPanel: React.FC<{
  errorMsg: string | null;
  manifestPath: string | null;
  outputDir: string | null;
  specPath: string | null;
  step: MockupsStep;
}> = ({ errorMsg, manifestPath, outputDir, specPath, step }) => {
  if (step === "fail") {
    return (
      <ResultPanel
        details={[
          "Status: ✗ Failed",
          `Error: ${errorMsg ?? "unknown error"}`,
          "Fix: check overlay.md and the render error, then retry with --force",
        ]}
        title="Mockup creation failed"
        tone="error"
      />
    );
  }

  if (step === "done" || step === "skip") {
    return (
      <ResultPanel
        details={[
          `Status: ${step === "skip" ? "✓ Already complete" : "✓ Complete"}`,
          `Spec: ${specPath ?? "overlays/overlay-spec.json"}`,
          `Mockups: ${outputDir ?? "overlays/videos"}`,
          `Manifest: ${manifestPath ?? "overlays/manifest.json"}`,
        ]}
        progress={100}
        title={step === "skip" ? "Mockups already complete" : "Mockups ready"}
        tone="success"
      />
    );
  }

  return (
    <WorkPanel
      busy
      current="current: hyperframes mockup · writing overlay spec and rendering template preview"
      progress={60}
      progressWidth={38}
      title="Creating Hyperframes overlay mockups"
    />
  );
};

export const MockupsView: React.FC<Props> = ({ folder, force, overlayId }) => {
  const { exit } = useApp();
  const [step, setStep] = useState<MockupsStep>("run");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [specPath, setSpecPath] = useState<string | null>(null);
  const [manifestPath, setManifestPath] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await createOverlayMockups(folder, {
          force,
          overlayId,
        });
        if (cancelled) {
          return;
        }
        setSpecPath(result.specPath);
        setManifestPath(result.manifestPath);
        setOutputDir(result.outputDir);
        setStep(result.skipped ? "skip" : "done");
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(errorMessage(err));
          setStep("fail");
          process.exitCode = 1;
        }
      } finally {
        await nextRenderTick();
        exit();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [folder, force, overlayId, exit]);

  return (
    <Box flexDirection="column">
      <Header title="create overlay mockups" />

      <InfoPanel
        borderColor="cyan"
        details={[
          `Project: ${folder}`,
          `Overlay: ${overlayId ?? "tre-colonne-dashboard, then first diagram"}`,
          `Run mode: ${force ? "force redo" : "reuse completed mockups"}`,
          "Renderer: Hyperframes",
          "Writes: overlays/overlay-spec.json",
          "Writes: overlays/videos/16x9/*.mp4",
          "Writes: overlays/videos/9x16/*.mp4",
        ]}
        title="Mockup package"
      />

      <Box flexDirection="column" marginTop={1}>
        <MockupsStatusPanel
          errorMsg={errorMsg}
          manifestPath={manifestPath}
          outputDir={outputDir}
          specPath={specPath}
          step={step}
        />
      </Box>
    </Box>
  );
};
