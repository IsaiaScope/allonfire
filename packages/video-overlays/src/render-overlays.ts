import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type GeneratedOverlayAspectConfig,
  type GeneratedOverlayItem,
  type GeneratedOverlayPackage,
  type GeneratedOverlaySfx,
  generatedOverlayPackageSchema,
} from "./spec";

const require = createRequire(import.meta.url);
const HYPERFRAMES_REGISTRY =
  "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry";
const DEFAULT_QUALITY = "standard";
const DEFAULT_BACKGROUND: HyperframesBackground = "stage";
const FENCED_CODE_RE = /```(?:\w+)?\n([\s\S]*?)```/;
const SFX_FILES: Record<Exclude<GeneratedOverlaySfx, "none">, string> = {
  "page-turn": "page-turn.wav",
  "paper-tick": "paper-tick.wav",
  "quiet-pop": "quiet-pop.wav",
  "soft-whoosh": "soft-whoosh.wav",
  "ui-click": "ui-click.wav",
};

export type HyperframesBackground = "stage" | "transparent";

type ClipOutput = {
  aspect: string;
  durationSeconds: number;
  hasAudio: boolean;
  id: string;
  path: string;
  timelineStartSeconds: number;
};

type OverlayVideoOutput = {
  aspect: string;
  durationSeconds: number;
  hasAudio: boolean;
  id: string;
  path: string;
  timelineStartSeconds: number;
};

export type OverlayOutputKind = "clips" | "videos";

type CommandRunner = (
  command: string,
  args: string[],
  options: { cwd: string }
) => Promise<void>;

function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function loadOverlayPackage(projectFolder: string): GeneratedOverlayPackage {
  const specPath = join(projectFolder, "overlays", "overlay-spec.json");
  if (!existsSync(specPath)) {
    throw new Error(`Missing overlay render spec: ${specPath}`);
  }
  return generatedOverlayPackageSchema.parse(
    JSON.parse(readFileSync(specPath, "utf-8"))
  );
}

function overlayCompositionRoot(projectFolder: string): string {
  return join(projectFolder, "overlays", "compositions");
}

export function hyperframesCompositionDir({
  aspect,
  id,
  projectFolder,
}: {
  aspect: string;
  id: string;
  projectFolder: string;
}): string {
  return join(overlayCompositionRoot(projectFolder), id, aspect);
}

export function overlayOutputPath({
  aspect,
  id,
  kind,
  projectFolder,
}: {
  aspect: string;
  id: string;
  kind: OverlayOutputKind;
  projectFolder: string;
}): string {
  const extension = kind === "clips" ? "webm" : "mp4";
  return join(projectFolder, "overlays", kind, aspect, `${id}.${extension}`);
}

export function overlayVideoOutput({
  aspect,
  id,
  projectFolder,
}: {
  aspect: string;
  id: string;
  projectFolder: string;
}): string {
  return overlayOutputPath({ aspect, id, kind: "videos", projectFolder });
}

export function overlayVideoRenderPlan({
  aspect,
  durationSeconds,
  hasAudio,
  id,
  projectFolder,
  timelineStartSeconds,
}: {
  aspect: string;
  durationSeconds: number;
  hasAudio: boolean;
  id: string;
  projectFolder: string;
  timelineStartSeconds: number;
}): OverlayVideoOutput {
  return {
    aspect,
    durationSeconds,
    hasAudio,
    id,
    path: overlayVideoOutput({ aspect, id, projectFolder }),
    timelineStartSeconds,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_`>#|]/g, "")
    .replace(/^- /gm, "")
    .trim();
}

function bodyLines(item: GeneratedOverlayItem): string[] {
  const lines = plainText(item.body)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 0) {
    return lines.slice(0, item.density === "rich" ? 7 : 5);
  }
  return [item.purpose];
}

function codeLines(item: GeneratedOverlayItem): string[] {
  const fenced = item.body.match(FENCED_CODE_RE);
  const source = fenced?.[1] ?? item.body;
  return source
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, item.density === "rich" ? 9 : 7);
}

function tableRows(
  item: GeneratedOverlayItem
): { label: string; value: string }[] {
  const rows = item.body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .map((line) =>
      line
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean)
    )
    .filter((parts) => parts.length >= 2)
    .slice(0, item.density === "rich" ? 6 : 4)
    .map(([label, value]) => ({ label, value }));

  if (rows.length > 0) {
    return rows;
  }
  return bodyLines(item).map((line, index) => ({
    label: String(index + 1).padStart(2, "0"),
    value: line,
  }));
}

function overlayMarkup(item: GeneratedOverlayItem): string {
  if (item.template === "code-card") {
    return `<pre class="code-card">${codeLines(item)
      .map((line) => `<code>${escapeHtml(line)}</code>`)
      .join("\n")}</pre>`;
  }

  if (item.template === "table-card" || item.template === "dashboard-triage") {
    return `<div class="table-card">${tableRows(item)
      .map(
        (row) => `<div class="table-row">
  <span>${escapeHtml(row.label)}</span>
  <strong>${escapeHtml(row.value)}</strong>
</div>`
      )
      .join("\n")}</div>`;
  }

  const lines = bodyLines(item);
  if (item.template === "flow-diagram") {
    return `<div class="flow-card">${lines
      .map(
        (line, index) => `<div class="flow-node">
  <span>${String(index + 1).padStart(2, "0")}</span>
  <strong>${escapeHtml(line)}</strong>
</div>`
      )
      .join("\n")}</div>`;
  }

  return `<ul class="list-card">${lines
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("\n")}</ul>`;
}

function sfxAudioMarkup(item: GeneratedOverlayItem): string {
  if (item.sfx === "none") {
    return "";
  }
  return `<audio id="sfx" data-start="0.05" data-duration="1.2" data-track-index="2" data-volume="0.45" src="./assets/${SFX_FILES[item.sfx]}"></audio>`;
}

export function buildHyperframesIndexHtml({
  aspect,
  background = DEFAULT_BACKGROUND,
  item,
  projectTitle,
}: {
  aspect: GeneratedOverlayAspectConfig;
  background?: HyperframesBackground;
  item: GeneratedOverlayItem;
  projectTitle: string;
}): string {
  const duration = Number(item.durationSeconds.toFixed(2));
  const safePadding = aspect.id === "9x16" ? 72 : 88;
  const titleSize = aspect.id === "9x16" ? 76 : 92;
  const bodySize = aspect.id === "9x16" ? 34 : 38;
  return `<!doctype html>
<html lang="it" data-composition-variables='[{"id":"background","type":"enum","label":"Background","default":"${background}","options":[{"value":"stage","label":"Stage"},{"value":"transparent","label":"Transparent"}]}]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${aspect.width}, height=${aspect.height}" />
    <script src="./assets/gsap.min.js"></script>
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: ${aspect.width}px;
        height: ${aspect.height}px;
        overflow: hidden;
        background: transparent;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body[data-background="stage"] {
        background:
          radial-gradient(circle at 18% 18%, rgba(255, 107, 0, 0.18), transparent 30%),
          linear-gradient(135deg, #0f0f0f 0%, #17151a 52%, #0f0f0f 100%);
      }
      body[data-background="transparent"] { background: transparent; }
      #root {
        position: relative;
        width: ${aspect.width}px;
        height: ${aspect.height}px;
        overflow: hidden;
      }
      .overlay-shell {
        position: absolute;
        inset: ${safePadding}px;
        display: grid;
        align-content: center;
        gap: 32px;
        color: #f7f1e8;
      }
      .kicker {
        color: #ff6b00;
        font-size: ${Math.round(bodySize * 0.62)}px;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        max-width: ${aspect.id === "9x16" ? "900px" : "1320px"};
        color: #fff8ef;
        font-size: ${titleSize}px;
        font-weight: 900;
        letter-spacing: 0;
        line-height: 0.94;
      }
      .purpose {
        max-width: ${aspect.id === "9x16" ? "820px" : "1160px"};
        color: rgba(247, 241, 232, 0.72);
        font-size: ${bodySize}px;
        font-weight: 650;
        line-height: 1.12;
      }
      .list-card, .table-card, .flow-card, .code-card {
        max-width: ${aspect.id === "9x16" ? "900px" : "1280px"};
        margin: 0;
        border: 2px solid rgba(255, 107, 0, 0.34);
        border-radius: 8px;
        background: rgba(15, 15, 15, 0.86);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.28);
      }
      .list-card {
        display: grid;
        gap: 18px;
        padding: 34px 42px;
        list-style: none;
      }
      .list-card li {
        color: #f7f1e8;
        font-size: ${bodySize}px;
        font-weight: 720;
        line-height: 1.08;
      }
      .table-card { display: grid; padding: 20px; }
      .table-row {
        display: grid;
        grid-template-columns: minmax(170px, 0.34fr) 1fr;
        gap: 20px;
        align-items: center;
        min-height: 78px;
        border-bottom: 1px solid rgba(247, 241, 232, 0.14);
      }
      .table-row:last-child { border-bottom: 0; }
      .table-row span {
        color: #ffb37a;
        font-size: ${Math.round(bodySize * 0.7)}px;
        font-weight: 800;
      }
      .table-row strong {
        color: #f7f1e8;
        font-size: ${Math.round(bodySize * 0.9)}px;
        line-height: 1.05;
      }
      .flow-card {
        display: grid;
        grid-template-columns: ${aspect.id === "9x16" ? "1fr" : "repeat(3, minmax(0, 1fr))"};
        gap: 18px;
        padding: 24px;
      }
      .flow-node {
        display: grid;
        gap: 18px;
        min-height: ${aspect.id === "9x16" ? 142 : 184}px;
        padding: 26px;
        border: 1px solid rgba(247, 241, 232, 0.16);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.055);
      }
      .flow-node span {
        color: #ff6b00;
        font-size: ${Math.round(bodySize * 0.62)}px;
        font-weight: 900;
      }
      .flow-node strong {
        color: #f7f1e8;
        font-size: ${Math.round(bodySize * 0.82)}px;
        line-height: 1.06;
      }
      .code-card {
        display: grid;
        gap: 10px;
        padding: 34px 42px;
        color: #d8ffe8;
        font-family: "Roboto Mono", "SFMono-Regular", Consolas, monospace;
        font-size: ${Math.round(bodySize * 0.72)}px;
        line-height: 1.28;
        white-space: pre-wrap;
      }
      .code-card code { display: block; }
      .project {
        position: absolute;
        right: 0;
        bottom: -48px;
        color: rgba(247, 241, 232, 0.38);
        font-size: ${Math.round(bodySize * 0.54)}px;
        font-weight: 700;
      }
    </style>
  </head>
  <body data-background="${background}">
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${duration}"
      data-width="${aspect.width}"
      data-height="${aspect.height}"
    >
      <section id="overlay" class="clip overlay-shell" data-start="0" data-duration="${duration}" data-track-index="1">
        <div class="kicker">${escapeHtml(item.kind)} / ${escapeHtml(item.motion)}</div>
        <h1>${escapeHtml(item.emphasis || item.title)}</h1>
        <div class="purpose">${escapeHtml(item.purpose)}</div>
        ${overlayMarkup(item)}
        <div class="project">${escapeHtml(projectTitle)}</div>
      </section>
      ${sfxAudioMarkup(item)}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const vars = window.__hyperframes?.getVariables?.() || {};
      document.body.dataset.background = vars.background || "${background}";
      const tl = gsap.timeline({ paused: true });
      tl.from("#overlay", { opacity: 0, y: 36, scale: 0.985, duration: 0.55, ease: "power3.out" }, 0);
      tl.from(".list-card li, .table-row, .flow-node, .code-card code", { opacity: 0, y: 18, duration: 0.38, stagger: 0.08, ease: "power2.out" }, 0.28);
      tl.to("#overlay", { opacity: 0, y: -24, duration: 0.35, ease: "power2.in" }, ${Math.max(0.8, duration - 0.45)});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
}

function gsapSourcePath(): string {
  return require.resolve("gsap/dist/gsap.min.js");
}

function publicSfxPath(cue: Exclude<GeneratedOverlaySfx, "none">): string {
  return join(packageRoot(), "public", "sfx", SFX_FILES[cue]);
}

export function writeHyperframesComposition({
  aspect,
  background = DEFAULT_BACKGROUND,
  copyFile = copyFileSync,
  item,
  mkdir = mkdirSync,
  projectFolder,
  projectTitle,
  writeFile = writeFileSync,
}: {
  aspect: GeneratedOverlayAspectConfig;
  background?: HyperframesBackground;
  copyFile?: (source: string, destination: string) => void;
  item: GeneratedOverlayItem;
  mkdir?: (path: string, options?: { recursive?: boolean }) => void;
  projectFolder: string;
  projectTitle: string;
  writeFile?: (path: string, data: string) => void;
}) {
  const compositionDir = hyperframesCompositionDir({
    aspect: aspect.id,
    id: item.id,
    projectFolder,
  });
  const assetsDir = join(compositionDir, "assets");
  mkdir(assetsDir, { recursive: true });

  const hyperframesConfigPath = join(compositionDir, "hyperframes.json");
  const metaPath = join(compositionDir, "meta.json");
  const indexPath = join(compositionDir, "index.html");

  writeFile(
    hyperframesConfigPath,
    JSON.stringify(
      {
        $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
        paths: {
          assets: "assets",
          blocks: "compositions",
          components: "compositions/components",
        },
        registry: HYPERFRAMES_REGISTRY,
      },
      null,
      2
    )
  );
  writeFile(
    metaPath,
    JSON.stringify(
      {
        id: `${item.id}-${aspect.id}`,
        name: `${projectTitle} / ${item.title} / ${aspect.id}`,
      },
      null,
      2
    )
  );
  writeFile(
    indexPath,
    buildHyperframesIndexHtml({ aspect, background, item, projectTitle })
  );
  copyFile(gsapSourcePath(), join(assetsDir, "gsap.min.js"));
  if (item.sfx !== "none") {
    copyFile(publicSfxPath(item.sfx), join(assetsDir, SFX_FILES[item.sfx]));
  }

  return {
    compositionDir,
    hyperframesConfigPath,
    indexPath,
    metaPath,
  };
}

function defaultCommandRunner(
  command: string,
  args: string[],
  options: { cwd: string }
): Promise<void> {
  return new Promise((resolveDone, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd,
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
          `${command} ${args.join(" ")} failed (${code}): ${stderr.slice(-700)}`
        )
      );
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start ${command}: ${err.message}`))
    );
  });
}

async function lintComposition({
  compositionDir,
  runCommand,
}: {
  compositionDir: string;
  runCommand: CommandRunner;
}) {
  await runCommand("pnpm", ["exec", "hyperframes", "lint", compositionDir], {
    cwd: packageRoot(),
  });
}

async function renderComposition({
  compositionDir,
  format,
  fps,
  output,
  runCommand,
  variables,
}: {
  compositionDir: string;
  format: "mp4" | "webm";
  fps: number;
  output: string;
  runCommand: CommandRunner;
  variables: Record<string, string>;
}) {
  await runCommand(
    "pnpm",
    [
      "exec",
      "hyperframes",
      "render",
      compositionDir,
      "--output",
      output,
      "--format",
      format,
      "--fps",
      String(fps),
      "--quality",
      DEFAULT_QUALITY,
      "--strict",
      "--strict-variables",
      "--variables",
      JSON.stringify(variables),
    ],
    { cwd: packageRoot() }
  );
}

async function renderClips({
  projectFolder,
  runCommand,
  spec,
}: {
  projectFolder: string;
  runCommand: CommandRunner;
  spec: GeneratedOverlayPackage;
}) {
  const outputs: ClipOutput[] = [];

  for (const aspect of spec.aspects) {
    mkdirSync(join(projectFolder, "overlays", "clips", aspect.id), {
      recursive: true,
    });
    for (const item of spec.overlays) {
      const { compositionDir } = writeHyperframesComposition({
        aspect,
        background: "stage",
        item,
        projectFolder,
        projectTitle: spec.projectTitle,
      });
      await lintComposition({ compositionDir, runCommand });
      const outputLocation = overlayOutputPath({
        aspect: aspect.id,
        id: item.id,
        kind: "clips",
        projectFolder,
      });
      await renderComposition({
        compositionDir,
        format: "webm",
        fps: spec.fps,
        output: outputLocation,
        runCommand,
        variables: { background: "transparent" },
      });
      outputs.push({
        aspect: aspect.id,
        durationSeconds: item.durationSeconds,
        hasAudio: item.sfx !== "none",
        id: item.id,
        path: outputLocation,
        timelineStartSeconds: item.startSeconds,
      });
    }
  }

  return outputs;
}

async function renderOverlayVideos({
  projectFolder,
  runCommand,
  spec,
}: {
  projectFolder: string;
  runCommand: CommandRunner;
  spec: GeneratedOverlayPackage;
}): Promise<OverlayVideoOutput[]> {
  const outputs: OverlayVideoOutput[] = [];

  for (const aspect of spec.aspects) {
    mkdirSync(join(projectFolder, "overlays", "videos", aspect.id), {
      recursive: true,
    });
    for (const item of spec.overlays) {
      const compositionDir = hyperframesCompositionDir({
        aspect: aspect.id,
        id: item.id,
        projectFolder,
      });
      const output = overlayVideoRenderPlan({
        aspect: aspect.id,
        durationSeconds: item.durationSeconds,
        hasAudio: item.sfx !== "none",
        id: item.id,
        projectFolder,
        timelineStartSeconds: item.startSeconds,
      });
      await renderComposition({
        compositionDir,
        format: "mp4",
        fps: spec.fps,
        output: output.path,
        runCommand,
        variables: { background: "stage" },
      });
      outputs.push(output);
    }
  }

  return outputs;
}

export async function renderOverlayPackage(
  projectFolderArg: string,
  options: { runCommand?: CommandRunner } = {}
): Promise<void> {
  const projectFolder = resolve(projectFolderArg);
  const spec = loadOverlayPackage(projectFolder);
  const runCommand = options.runCommand ?? defaultCommandRunner;
  const clipsDir = join(projectFolder, "overlays", "clips");
  const videosDir = join(projectFolder, "overlays", "videos");
  const compositionsDir = overlayCompositionRoot(projectFolder);
  rmSync(clipsDir, { force: true, recursive: true });
  rmSync(videosDir, { force: true, recursive: true });
  rmSync(compositionsDir, { force: true, recursive: true });
  mkdirSync(compositionsDir, { recursive: true });

  const clips = await renderClips({ projectFolder, runCommand, spec });
  const videos = await renderOverlayVideos({
    projectFolder,
    runCommand,
    spec,
  });

  writeFileSync(
    join(projectFolder, "overlays", "manifest.json"),
    JSON.stringify(
      {
        aspects: spec.aspects,
        clips,
        compositionRoot: compositionsDir,
        createdAt: new Date().toISOString(),
        mode: "standalone",
        overlayCount: spec.overlays.length,
        renderer: "hyperframes",
        sourceVideoReference: spec.source.videoPath,
        videos,
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
    process.stderr.write("Usage: pnpm render-overlays -- <project-folder>\n");
    process.exit(1);
  }
  renderOverlayPackage(projectFolder).catch((err) => {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exit(1);
  });
}
