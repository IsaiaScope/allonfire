import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";
import {
  DASHBOARD_TRIAGE_LANDSCAPE_ID,
  LINEAR_DIAGRAM_LANDSCAPE_ID,
  TUTORIAL_SHOWCASE_FULLSCREEN_LANDSCAPE_ID,
} from "./root";
import { overlaySpecSchema } from "./spec";

function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function loadSpec(projectFolder: string) {
  const specPath = join(projectFolder, "remotion", "overlay-spec.json");
  if (!existsSync(specPath)) {
    throw new Error(`Missing overlay spec: ${specPath}`);
  }
  return overlaySpecSchema.parse(JSON.parse(readFileSync(specPath, "utf-8")));
}

function compositionIdForTemplate(template: string): string {
  if (template === "linear-diagram") {
    return LINEAR_DIAGRAM_LANDSCAPE_ID;
  }
  if (template === "tutorial-showcase") {
    return TUTORIAL_SHOWCASE_FULLSCREEN_LANDSCAPE_ID;
  }
  return DASHBOARD_TRIAGE_LANDSCAPE_ID;
}

export async function renderMockup(projectFolderArg: string): Promise<void> {
  const projectFolder = resolve(projectFolderArg);
  const spec = loadSpec(projectFolder);
  const compositionId = compositionIdForTemplate(spec.overlay.template);
  const outputName = spec.overlay.template;
  const outputDir = join(projectFolder, "remotion", "mockups");
  mkdirSync(outputDir, { recursive: true });

  const serveUrl = await bundle({
    entryPoint: join(packageRoot(), "src", "index.ts"),
    webpackOverride: enableTailwind,
  });
  const composition = await selectComposition({
    id: compositionId,
    inputProps: spec.props,
    serveUrl,
  });
  const stillPath = join(outputDir, `${outputName}.png`);
  const videoPath = join(outputDir, `${outputName}.mp4`);

  await renderStill({
    composition,
    frame: Math.floor(spec.durationFrames / 3),
    inputProps: spec.props,
    output: stillPath,
    serveUrl,
  });

  await renderMedia({
    codec: "h264",
    composition,
    inputProps: spec.props,
    outputLocation: videoPath,
    serveUrl,
  });

  writeFileSync(
    join(projectFolder, "remotion", "manifest.json"),
    JSON.stringify(
      {
        compositionId,
        createdAt: new Date().toISOString(),
        outputs: {
          png: stillPath,
          video: videoPath,
        },
        overlayId: spec.overlay.id,
        template: spec.overlay.template,
      },
      null,
      2
    )
  );
}

export function projectFolderFromArgs(args: string[]): string | undefined {
  return args.find((arg) => arg !== "--");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const projectFolder = projectFolderFromArgs(process.argv.slice(2));
  if (!projectFolder) {
    process.stderr.write("Usage: pnpm render -- <project-folder>\n");
    process.exit(1);
  }
  renderMockup(projectFolder).catch((err) => {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exit(1);
  });
}
