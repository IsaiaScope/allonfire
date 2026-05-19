import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { overlayPath } from "../lib/paths";

const OVERLAY_HEADING_RE = /^##\s+(.+)$/;
const METADATA_LINE_RE = /^-\s+(kind|moment|purpose):\s*(.+)$/;
const PROJECT_TITLE_RE = /^#\s+Overlay library\s+—\s+/;
const LINE_SEPARATOR_RE = /\r?\n/;
const DASHBOARD_TEMPLATE = "dashboard-triage" as const;
const DEFAULT_DURATION_FRAMES = 180;
const DEFAULT_FPS = 30;

export type OverlayBlock = {
  body: string;
  id: string;
  kind: string;
  moment: string;
  purpose: string;
};

export type DashboardRowTone = "attention" | "working" | "complete";

export type DashboardTriageProps = {
  footerHints: string[];
  sections: {
    label: string;
    rows: {
      detail: string;
      elapsed: string;
      name: string;
      tone: DashboardRowTone;
    }[];
    tone: DashboardRowTone;
  }[];
  statusLine: string;
  theme: {
    accent: string;
    attention: string;
    complete: string;
    muted: string;
    panel: string;
    surface: string;
    text: string;
    working: string;
  };
  title: string;
};

export type OverlayMockupSpec = {
  durationFrames: number;
  fps: number;
  overlay: {
    id: string;
    kind: string;
    moment: string;
    purpose: string;
    template: typeof DASHBOARD_TEMPLATE;
  };
  projectTitle: string;
  props: DashboardTriageProps;
  sourceFolder: string;
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
    id: string;
    kind?: string;
    moment?: string;
    purpose?: string;
  } | null = null;

  const flush = () => {
    if (!current) {
      return;
    }
    blocks.push({
      body: current.bodyLines.join("\n").trim(),
      id: current.id,
      kind: current.kind ?? "unknown",
      moment: current.moment ?? "",
      purpose: current.purpose ?? "",
    });
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
      current[metadata[1] as "kind" | "moment" | "purpose"] =
        metadata[2].trim();
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

export function dashboardTriagePropsFromOverlay(
  block: OverlayBlock
): DashboardTriageProps {
  return {
    footerHints: [
      "invio per aprire",
      "spazio per rispondere",
      "ctrl+x per eliminare",
    ],
    sections: [
      {
        label: "Da rispondere",
        rows: [
          {
            detail: "domanda aperta",
            elapsed: "4m",
            name: "dark-mode",
            tone: "attention",
          },
          {
            detail: "conferma richiesta",
            elapsed: "11m",
            name: "release-notes",
            tone: "attention",
          },
        ],
        tone: "attention",
      },
      {
        label: "In corso",
        rows: [
          {
            detail: "analizzando",
            elapsed: "7m",
            name: "perf-audit",
            tone: "working",
          },
          {
            detail: "scrivendo test",
            elapsed: "2m",
            name: "payment-migration",
            tone: "working",
          },
        ],
        tone: "working",
      },
      {
        label: "Completati",
        rows: [
          {
            detail: "→ per tornare",
            elapsed: "0s",
            name: "test-coverage",
            tone: "complete",
          },
        ],
        tone: "complete",
      },
    ],
    statusLine: "2 in attesa · 4 in corso · 1 completato",
    theme: {
      accent: "oklch(0.58 0.12 236)",
      attention: "oklch(0.76 0.15 82)",
      complete: "oklch(0.64 0.16 150)",
      muted: "oklch(0.43 0.03 244)",
      panel: "oklch(0.94 0.01 236)",
      surface: "oklch(0.97 0.009 238)",
      text: "oklch(0.24 0.035 246)",
      working: "oklch(0.56 0.05 248)",
    },
    title:
      block.id === "tre-colonne-dashboard"
        ? "Claude Code · Agents View"
        : block.id,
  };
}

export function buildMockupSpec({
  block,
  projectTitle,
  sourceFolder,
}: {
  block: OverlayBlock;
  projectTitle: string;
  sourceFolder: string;
}): OverlayMockupSpec {
  return {
    durationFrames: DEFAULT_DURATION_FRAMES,
    fps: DEFAULT_FPS,
    overlay: {
      id: block.id,
      kind: block.kind,
      moment: block.moment,
      purpose: block.purpose,
      template: DASHBOARD_TEMPLATE,
    },
    projectTitle,
    props: dashboardTriagePropsFromOverlay(block),
    sourceFolder,
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
          `Remotion mockup render failed (${code}): ${stderr.slice(-500)}`
        )
      );
    });
    proc.on("error", (err) =>
      reject(
        new Error(`Failed to start Remotion mockup render: ${err.message}`)
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

  const remotionDir = join(folder, "remotion");
  const mockupsDir = join(remotionDir, "mockups");
  const manifestPath = join(remotionDir, "manifest.json");
  const specPath = join(remotionDir, "overlay-spec.json");
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
        projectTitle: parseProjectTitle(markdown),
        sourceFolder: folder,
      }),
      specPath,
    };
  }

  if (options.force) {
    rmSync(remotionDir, { force: true, recursive: true });
  }
  mkdirSync(mockupsDir, { recursive: true });

  const markdown = readFileSync(markdownPath, "utf-8");
  const blocks = parseOverlayBlocks(markdown);
  const block = selectMockupOverlay(blocks, options.overlayId);
  const spec = buildMockupSpec({
    block,
    projectTitle: parseProjectTitle(markdown),
    sourceFolder: folder,
  });

  writeFileSync(specPath, JSON.stringify(spec, null, 2));
  await (options.render ?? defaultRenderMockups)(folder);

  return {
    manifestPath,
    outputDir: mockupsDir,
    skipped: false,
    spec,
    specPath,
  };
}
