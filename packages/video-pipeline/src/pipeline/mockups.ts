import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { overlayPath } from "../lib/paths";

const OVERLAY_HEADING_RE = /^##\s+(.+)$/;
const METADATA_LINE_RE =
  /^-\s+(kind|moment|purpose|density|motion|sfx|emphasis):\s*(.+)$/;
const PROJECT_TITLE_RE = /^#\s+Overlay library\s+—\s+/;
const LINE_SEPARATOR_RE = /\r?\n/;
const BOLD_MARKDOWN_RE = /\*\*(.+?)\*\*/;
const DEFAULT_FPS = 30;
const DEFAULT_DURATION_SECONDS = 8;
const RAW_DIR = "raw";

export type OverlayBlock = {
  body: string;
  density?: string;
  emphasis?: string;
  id: string;
  kind: string;
  moment: string;
  motion?: string;
  purpose: string;
  sfx?: string;
};

export type OverlayMockupTemplate =
  | "callout-card"
  | "code-card"
  | "dashboard-triage"
  | "flow-diagram"
  | "list-card"
  | "table-card";

export type OverlayMockupSpec = {
  aspects: { height: number; id: "16x9" | "9x16"; width: number }[];
  compositionRoot: string;
  fps: number;
  overlays: {
    body: string;
    density: "light" | "medium" | "rich";
    durationSeconds: number;
    emphasis: string;
    id: string;
    kind: string;
    moment: string;
    motion: "build" | "compare" | "pulse" | "reveal" | "type-on";
    placementHint: string;
    purpose: string;
    sfx:
      | "none"
      | "page-turn"
      | "paper-tick"
      | "quiet-pop"
      | "soft-whoosh"
      | "ui-click";
    startSeconds: number;
    template: OverlayMockupTemplate;
    title: string;
  }[];
  projectTitle: string;
  renderer: "hyperframes";
  source: {
    durationSeconds: number;
    videoPath: string;
  };
};

export type CreateMockupsOptions = {
  force?: boolean;
  overlayId?: string;
  render?: (folder: string) => Promise<void>;
};

export type CreateMockupsResult = {
  manifestPath: string;
  outputDir: string;
  skipped: boolean;
  spec: OverlayMockupSpec;
  specPath: string;
};

function parseProjectTitle(markdown: string): string {
  const firstHeading = markdown
    .split("\n")
    .find((line) => line.startsWith("# "));
  return firstHeading?.replace(PROJECT_TITLE_RE, "").trim() ?? "Overlay mockup";
}

export function parseOverlayBlocks(markdown: string): OverlayBlock[] {
  const lines = markdown.split(LINE_SEPARATOR_RE);
  const blocks: OverlayBlock[] = [];
  let current: {
    bodyLines: string[];
    density?: string;
    emphasis?: string;
    id: string;
    kind?: string;
    moment?: string;
    motion?: string;
    purpose?: string;
    sfx?: string;
  } | null = null;

  const flush = () => {
    if (!current) {
      return;
    }
    const block: OverlayBlock = {
      body: current.bodyLines.join("\n").trim(),
      id: current.id,
      kind: current.kind ?? "unknown",
      moment: current.moment ?? "",
      purpose: current.purpose ?? "",
    };
    if (current.density) {
      block.density = current.density;
    }
    if (current.emphasis) {
      block.emphasis = current.emphasis;
    }
    if (current.motion) {
      block.motion = current.motion;
    }
    if (current.sfx) {
      block.sfx = current.sfx;
    }
    blocks.push(block);
  };

  for (const line of lines) {
    const heading = line.match(OVERLAY_HEADING_RE);
    if (heading) {
      flush();
      current = {
        bodyLines: [],
        id: heading[1].trim(),
      };
      continue;
    }
    if (!current) {
      continue;
    }
    const metadata = line.match(METADATA_LINE_RE);
    if (metadata) {
      current[
        metadata[1] as
          | "density"
          | "emphasis"
          | "kind"
          | "moment"
          | "motion"
          | "purpose"
          | "sfx"
      ] = metadata[2].trim();
      continue;
    }
    current.bodyLines.push(line);
  }
  flush();
  return blocks;
}

function isCompatibleOverlay(block: OverlayBlock): boolean {
  return block.kind === "diagram";
}

export function selectMockupOverlay(
  blocks: OverlayBlock[],
  overlayId?: string
): OverlayBlock {
  if (overlayId) {
    const selected = blocks.find((block) => block.id === overlayId);
    if (!selected) {
      throw new Error(
        `Overlay '${overlayId}' not found. Available overlays: ${blocks
          .map((block) => block.id)
          .join(", ")}`
      );
    }
    if (!isCompatibleOverlay(selected)) {
      throw new Error(
        `Overlay '${overlayId}' is kind '${selected.kind}', but mockups currently support diagram overlays.`
      );
    }
    return selected;
  }

  const preferred = blocks.find(
    (block) => block.id === "tre-colonne-dashboard"
  );
  if (preferred && isCompatibleOverlay(preferred)) {
    return preferred;
  }

  const compatible = blocks.find(isCompatibleOverlay);
  if (!compatible) {
    throw new Error(
      `No compatible diagram overlay found. Available overlays: ${blocks
        .map((block) => `${block.id} (${block.kind})`)
        .join(", ")}`
    );
  }
  return compatible;
}

function projectOutputFolder(inputFolder: string): string {
  return basename(inputFolder) === RAW_DIR ? dirname(inputFolder) : inputFolder;
}

function templateForBlock(block: OverlayBlock): OverlayMockupTemplate {
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

function emphasisFromBlock(block: OverlayBlock): string {
  return (
    block.emphasis?.trim() ||
    block.body.match(BOLD_MARKDOWN_RE)?.[1]?.trim() ||
    block.purpose ||
    titleFromBlock(block)
  );
}

function normalizedDensity(value?: string): "light" | "medium" | "rich" {
  return value === "light" || value === "medium" || value === "rich"
    ? value
    : "medium";
}

function normalizedMotion(
  value?: string
): "build" | "compare" | "pulse" | "reveal" | "type-on" {
  return value === "build" ||
    value === "compare" ||
    value === "pulse" ||
    value === "reveal" ||
    value === "type-on"
    ? value
    : "reveal";
}

function normalizedSfx(
  value?: string
):
  | "none"
  | "page-turn"
  | "paper-tick"
  | "quiet-pop"
  | "soft-whoosh"
  | "ui-click" {
  return value === "none" ||
    value === "page-turn" ||
    value === "paper-tick" ||
    value === "quiet-pop" ||
    value === "soft-whoosh" ||
    value === "ui-click"
    ? value
    : "none";
}

export function buildMockupSpec({
  block,
  projectFolder,
  projectTitle,
}: {
  block: OverlayBlock;
  projectFolder: string;
  projectTitle: string;
}): OverlayMockupSpec {
  return {
    aspects: [
      { height: 1080, id: "16x9", width: 1920 },
      { height: 1920, id: "9x16", width: 1080 },
    ],
    compositionRoot: join(projectFolder, "overlays", "compositions"),
    fps: DEFAULT_FPS,
    overlays: [
      {
        body: block.body,
        density: normalizedDensity(block.density),
        durationSeconds: DEFAULT_DURATION_SECONDS,
        emphasis: emphasisFromBlock(block),
        id: block.id,
        kind: block.kind,
        moment: block.moment,
        motion: normalizedMotion(block.motion),
        placementHint: block.moment,
        purpose: block.purpose,
        sfx: normalizedSfx(block.sfx),
        startSeconds: 0,
        template: templateForBlock(block),
        title: titleFromBlock(block),
      },
    ],
    projectTitle,
    renderer: "hyperframes",
    source: {
      durationSeconds: DEFAULT_DURATION_SECONDS,
      videoPath: "",
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

function defaultRenderMockups(folder: string): Promise<void> {
  return new Promise((resolveDone, reject) => {
    const proc = spawn(
      "pnpm",
      ["--filter", "@allonfire/video-overlays", "render", "--", folder],
      {
        cwd: workspaceRoot(),
        stdio: ["ignore", "ignore", "pipe"],
      }
    );
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
          `Hyperframes mockup render failed (${code}): ${stderr.slice(-500)}`
        )
      );
    });
    proc.on("error", (err) =>
      reject(
        new Error(`Failed to start Hyperframes mockup render: ${err.message}`)
      )
    );
  });
}

export async function createOverlayMockups(
  folder: string,
  options: CreateMockupsOptions = {}
): Promise<CreateMockupsResult> {
  const markdownPath = overlayPath(folder);
  if (!existsSync(markdownPath)) {
    throw new Error(
      `Missing overlay.md — run \`pnpm video overlay "${folder}"\` first.`
    );
  }

  const projectFolder = projectOutputFolder(folder);
  const overlaysDir = join(projectFolder, "overlays");
  const mockupsDir = join(overlaysDir, "videos");
  const manifestPath = join(overlaysDir, "manifest.json");
  const specPath = join(overlaysDir, "overlay-spec.json");
  if (existsSync(manifestPath) && !options.force) {
    const markdown = readFileSync(markdownPath, "utf-8");
    const block = selectMockupOverlay(
      parseOverlayBlocks(markdown),
      options.overlayId
    );
    return {
      manifestPath,
      outputDir: mockupsDir,
      skipped: true,
      spec: buildMockupSpec({
        block,
        projectFolder,
        projectTitle: parseProjectTitle(markdown),
      }),
      specPath,
    };
  }

  if (options.force) {
    rmSync(overlaysDir, { force: true, recursive: true });
  }
  mkdirSync(mockupsDir, { recursive: true });

  const markdown = readFileSync(markdownPath, "utf-8");
  const blocks = parseOverlayBlocks(markdown);
  const block = selectMockupOverlay(blocks, options.overlayId);
  const spec = buildMockupSpec({
    block,
    projectFolder,
    projectTitle: parseProjectTitle(markdown),
  });

  writeFileSync(specPath, JSON.stringify(spec, null, 2));
  await (options.render ?? defaultRenderMockups)(projectFolder);

  return {
    manifestPath,
    outputDir: mockupsDir,
    skipped: false,
    spec,
    specPath,
  };
}
