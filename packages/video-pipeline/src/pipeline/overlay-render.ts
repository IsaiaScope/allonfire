import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { ProjectMetadata } from "../lib/metadata";
import { overlayPath, videoPath } from "../lib/paths";
import { type OverlayBlock, parseOverlayBlocks } from "./mockups";

const OVERLAYS_DIR = "overlays";
const RAW_DIR = "raw";
const DEFAULT_FPS = 30;
const MIN_CLIP_SECONDS = 8;
const BODY_CHARS_PER_SECOND = 90;
const DEFAULT_DENSITY = "medium";
const DEFAULT_MOTION = "reveal";
const DEFAULT_SFX = "soft-whoosh";
const BOLD_MARKDOWN_RE = /\*\*(.+?)\*\*/;
const GENERATED_OVERLAY_ASPECTS = [
  { height: 1080, id: "16x9", width: 1920 },
  { height: 1920, id: "9x16", width: 1080 },
] as const;

export type GeneratedOverlayTemplate =
  | "callout-card"
  | "code-card"
  | "dashboard-triage"
  | "flow-diagram"
  | "list-card"
  | "table-card";

export type GeneratedOverlayAspect = (typeof GENERATED_OVERLAY_ASPECTS)[number];
export type GeneratedOverlayAspectId = GeneratedOverlayAspect["id"];
export type GeneratedOverlayDensity = "light" | "medium" | "rich";
export type GeneratedOverlayMotion =
  | "build"
  | "compare"
  | "pulse"
  | "reveal"
  | "type-on";
export type GeneratedOverlaySfx =
  | "none"
  | "page-turn"
  | "paper-tick"
  | "quiet-pop"
  | "soft-whoosh"
  | "ui-click";

export type GeneratedOverlayItem = {
  body: string;
  density: GeneratedOverlayDensity;
  durationSeconds: number;
  emphasis: string;
  id: string;
  kind: string;
  moment: string;
  motion: GeneratedOverlayMotion;
  placementHint: string;
  purpose: string;
  sfx: GeneratedOverlaySfx;
  startSeconds: number;
  template: GeneratedOverlayTemplate;
  title: string;
};

export type OverlayRenderSpec = {
  aspects: GeneratedOverlayAspect[];
  compositionRoot: string;
  fps: number;
  overlays: GeneratedOverlayItem[];
  projectTitle: string;
  renderer: "hyperframes";
  source: {
    durationSeconds: number;
    videoPath: string;
  };
};

export type CreateOverlayRenderOptions = {
  force?: boolean;
  render?: (projectFolder: string) => Promise<void>;
};

export type CreateOverlayRenderResult = {
  clipsDir: string;
  manifestPath: string;
  outputDir: string;
  spec: OverlayRenderSpec;
  specPath: string;
  videosDir: string;
};

export function projectOutputFolder(inputFolder: string): string {
  return basename(inputFolder) === RAW_DIR ? dirname(inputFolder) : inputFolder;
}

export function overlayRenderDir(inputFolder: string): string {
  return join(projectOutputFolder(inputFolder), OVERLAYS_DIR);
}

export function overlayRenderManifestPath(inputFolder: string): string {
  return join(overlayRenderDir(inputFolder), "manifest.json");
}

export function hasOverlayRenderManifest(inputFolder: string): boolean {
  return existsSync(overlayRenderManifestPath(inputFolder));
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function hasOutputForEveryOverlay({
  expectedAspects,
  expectedIds,
  outputs,
}: {
  expectedAspects: GeneratedOverlayAspectId[];
  expectedIds: string[];
  outputs: unknown;
}): boolean {
  if (!Array.isArray(outputs)) {
    return false;
  }
  return expectedIds.every((id) =>
    expectedAspects.every((aspect) =>
      outputs.some((output) => {
        if (
          typeof output !== "object" ||
          output === null ||
          !("aspect" in output) ||
          !("hasAudio" in output) ||
          !("id" in output) ||
          !("path" in output)
        ) {
          return false;
        }
        const candidate = output as {
          aspect: unknown;
          hasAudio: unknown;
          id: unknown;
          path: unknown;
        };
        return (
          candidate.aspect === aspect &&
          typeof candidate.hasAudio === "boolean" &&
          candidate.id === id &&
          typeof candidate.path === "string" &&
          existsSync(candidate.path)
        );
      })
    )
  );
}

export function hasCompleteOverlayRenderManifest(inputFolder: string): boolean {
  const manifestPath = overlayRenderManifestPath(inputFolder);
  if (!(existsSync(manifestPath) && existsSync(overlayPath(inputFolder)))) {
    return false;
  }

  try {
    const markdown = readFileSync(overlayPath(inputFolder), "utf-8");
    const expectedIds = parseOverlayBlocks(markdown).map((block) => block.id);
    const expectedAspects = GENERATED_OVERLAY_ASPECTS.map(
      (aspect) => aspect.id
    );
    const manifest = readJsonFile(manifestPath);
    if (
      expectedIds.length === 0 ||
      typeof manifest !== "object" ||
      manifest === null ||
      !("clips" in manifest) ||
      !("videos" in manifest)
    ) {
      return false;
    }
    return (
      hasOutputForEveryOverlay({
        expectedAspects,
        expectedIds,
        outputs: manifest.clips,
      }) &&
      hasOutputForEveryOverlay({
        expectedAspects,
        expectedIds,
        outputs: manifest.videos,
      })
    );
  } catch {
    return false;
  }
}

function templateForBlock(block: OverlayBlock): GeneratedOverlayTemplate {
  if (block.id === "tre-colonne-dashboard") {
    return "dashboard-triage";
  }
  if (block.kind === "code") {
    return "code-card";
  }
  if (block.kind === "table") {
    return "table-card";
  }
  if (block.kind === "diagram") {
    return "flow-diagram";
  }
  if (block.kind === "list") {
    return "list-card";
  }
  return "callout-card";
}

function titleFromBlock(block: OverlayBlock): string {
  return block.id
    .split("-")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function normalizedDensity(value?: string): GeneratedOverlayDensity {
  if (value === "light" || value === "medium" || value === "rich") {
    return value;
  }
  return DEFAULT_DENSITY;
}

function normalizedMotion(value?: string): GeneratedOverlayMotion {
  if (
    value === "build" ||
    value === "compare" ||
    value === "pulse" ||
    value === "reveal" ||
    value === "type-on"
  ) {
    return value;
  }
  return DEFAULT_MOTION;
}

function normalizedSfx(value?: string): GeneratedOverlaySfx {
  if (
    value === "none" ||
    value === "page-turn" ||
    value === "paper-tick" ||
    value === "quiet-pop" ||
    value === "soft-whoosh" ||
    value === "ui-click"
  ) {
    return value;
  }
  return DEFAULT_SFX;
}

function plainMarkdownLine(value: string): string {
  return (
    value
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*_`>#|]/g, "")
      .replace(/^- /gm, "")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

function emphasisFromBlock(block: OverlayBlock): string {
  const explicit = block.emphasis?.trim();
  if (explicit) {
    return explicit;
  }
  const bold = block.body.match(BOLD_MARKDOWN_RE)?.[1]?.trim();
  if (bold) {
    return bold;
  }
  return (
    plainMarkdownLine(block.body) || block.purpose || titleFromBlock(block)
  );
}

function estimateDurationSeconds(block: OverlayBlock): number {
  const bodySeconds = Math.ceil(block.body.length / BODY_CHARS_PER_SECOND);
  return Math.max(MIN_CLIP_SECONDS, bodySeconds + 5);
}

function startSecondsForIndex({
  durationSeconds,
  index,
  sourceDurationSeconds,
  total,
}: {
  durationSeconds: number;
  index: number;
  sourceDurationSeconds: number;
  total: number;
}): number {
  if (total === 0) {
    return 0;
  }
  const target = ((index + 1) * sourceDurationSeconds) / (total + 1);
  const latest = Math.max(0, sourceDurationSeconds - durationSeconds);
  return Math.round(Math.min(target, latest) * 10) / 10;
}

function fallbackVideoPath(folder: string): string | null {
  const candidate = readdirSync(folder)
    .filter((name) => !name.startsWith("._") && name.endsWith(".mp4"))
    .sort()[0];
  return candidate ? join(folder, candidate) : null;
}

function sourceVideoPath(folder: string, metadata: ProjectMetadata): string {
  const preferred = videoPath(folder, metadata.slug);
  if (existsSync(preferred)) {
    return preferred;
  }
  const fallback = fallbackVideoPath(folder);
  if (fallback) {
    return fallback;
  }
  throw new Error(`Missing downloaded MP4 in ${folder}`);
}

export function buildOverlayRenderSpec({
  folder,
  markdown,
  metadata,
}: {
  folder: string;
  markdown: string;
  metadata: ProjectMetadata;
}): OverlayRenderSpec {
  const blocks = parseOverlayBlocks(markdown);
  const sourceDurationSeconds = metadata.source.duration;
  const sourcePath = sourceVideoPath(folder, metadata);
  const overlays = blocks.map((block, index) => {
    const durationSeconds = estimateDurationSeconds(block);
    return {
      body: block.body,
      density: normalizedDensity(block.density),
      durationSeconds,
      emphasis: emphasisFromBlock(block),
      id: block.id,
      kind: block.kind,
      moment: block.moment,
      motion: normalizedMotion(block.motion),
      placementHint: block.moment,
      purpose: block.purpose,
      sfx: normalizedSfx(block.sfx),
      startSeconds: startSecondsForIndex({
        durationSeconds,
        index,
        sourceDurationSeconds,
        total: blocks.length,
      }),
      template: templateForBlock(block),
      title: titleFromBlock(block),
    };
  });

  return {
    aspects: [...GENERATED_OVERLAY_ASPECTS],
    compositionRoot: join(overlayRenderDir(folder), "compositions"),
    fps: DEFAULT_FPS,
    overlays,
    projectTitle: metadata.title,
    renderer: "hyperframes",
    source: {
      durationSeconds: sourceDurationSeconds,
      videoPath: sourcePath,
    },
  };
}

function workspaceRoot(start: string = process.cwd()): string {
  let current = resolve(start);
  while (dirname(current) !== current) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    current = dirname(current);
  }
  throw new Error("Could not find pnpm-workspace.yaml");
}

function defaultRenderOverlayPackage(projectFolder: string): Promise<void> {
  return new Promise((resolveDone, reject) => {
    const overlaysPackageRoot = join(
      workspaceRoot(),
      "packages/video-overlays"
    );
    const tsxBin = join(
      overlaysPackageRoot,
      "node_modules/.bin",
      process.platform === "win32" ? "tsx.cmd" : "tsx"
    );
    const proc = spawn(tsxBin, ["src/render-overlays.ts", projectFolder], {
      cwd: overlaysPackageRoot,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolveDone();
        return;
      }
      reject(
        new Error(
          `Overlay video render failed (${code}): ${stderr.slice(-500)}`
        )
      );
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start overlay video render: ${err.message}`))
    );
  });
}

export async function createOverlayRenderPackage(
  folder: string,
  metadata: ProjectMetadata,
  options: CreateOverlayRenderOptions = {}
): Promise<CreateOverlayRenderResult> {
  const outputDir = overlayRenderDir(folder);
  if (options.force) {
    rmSync(outputDir, { force: true, recursive: true });
  }
  for (const aspect of GENERATED_OVERLAY_ASPECTS) {
    mkdirSync(join(outputDir, "clips", aspect.id), { recursive: true });
    mkdirSync(join(outputDir, "videos", aspect.id), { recursive: true });
  }

  const markdown = readFileSync(overlayPath(folder), "utf-8");
  const spec = buildOverlayRenderSpec({ folder, markdown, metadata });
  const specPath = join(outputDir, "overlay-spec.json");
  const manifestPath = join(outputDir, "manifest.json");
  const clipsDir = join(outputDir, "clips");
  const videosDir = join(outputDir, "videos");
  writeFileSync(specPath, JSON.stringify(spec, null, 2));

  await (options.render ?? defaultRenderOverlayPackage)(
    projectOutputFolder(folder)
  );

  return {
    clipsDir,
    manifestPath,
    outputDir,
    spec,
    specPath,
    videosDir,
  };
}
