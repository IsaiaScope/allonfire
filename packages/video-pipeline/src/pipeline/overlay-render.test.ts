import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectMetadata } from "../lib/metadata";
import { overlayPath } from "../lib/paths";
import {
  buildOverlayRenderSpec,
  createOverlayRenderPackage,
  hasCompleteOverlayRenderManifest,
  overlayRenderDir,
  projectOutputFolder,
} from "./overlay-render";

const OVERLAY_MD = `# Overlay library — Test Project

## terminali-sepolti
- kind: callout
- moment: apertura
- purpose: orientare il problema

**Troppe sessioni aperte.**

## comando-agents-view
- kind: code
- moment: comando principale
- purpose: memorizzare il comando
- density: rich
- motion: type-on
- sfx: ui-click
- emphasis: claude agents

\`\`\`bash
claude agents
\`\`\`

## tre-colonne-dashboard
- kind: table
- moment: dashboard
- purpose: mostrare la triage view

| Stato | Significato |
|---|---|
| Needs input | Claude aspetta |
`;

let folder: string;
let projectFolder: string;
let metadata: ProjectMetadata;

beforeEach(() => {
  projectFolder = mkdtempSync(join(tmpdir(), "video-project-"));
  folder = join(projectFolder, "raw");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "test-project.mp4"), "fake video");
  writeFileSync(overlayPath(folder), OVERLAY_MD);
  metadata = {
    createdAt: "2026-05-20T00:00:00.000Z",
    date: "2026-05-20",
    folder,
    slug: "test-project",
    source: {
      duration: 120,
      language: "en",
      title: "Source",
      url: "https://example.com",
      youtubeId: "abc",
    },
    stages: {
      downloaded: { at: "2026-05-20T00:00:00.000Z" },
      overlayed: null,
      transcribed: { at: "2026-05-20T00:00:00.000Z" },
      translated: { at: "2026-05-20T00:00:00.000Z" },
    },
    title: "Test Project",
    updatedAt: "2026-05-20T00:00:00.000Z",
  };
});

afterEach(() => {
  rmSync(projectFolder, { force: true, recursive: true });
});

describe("overlay render package", () => {
  it("normalizes raw folders to parent output folders", () => {
    expect(projectOutputFolder(folder)).toBe(projectFolder);
    expect(overlayRenderDir(folder)).toBe(join(projectFolder, "overlays"));
  });

  it("builds a content-duration render spec from overlay.md", () => {
    const spec = buildOverlayRenderSpec({
      folder,
      markdown: OVERLAY_MD,
      metadata,
    });

    expect(spec.source.videoPath).toBe(join(folder, "test-project.mp4"));
    expect(spec.renderer).toBe("hyperframes");
    expect(spec.compositionRoot).toBe(
      join(projectFolder, "overlays", "compositions")
    );
    expect(spec.aspects).toEqual([
      { height: 1080, id: "16x9", width: 1920 },
      { height: 1920, id: "9x16", width: 1080 },
    ]);
    expect(spec.overlays.map((overlay) => overlay.template)).toEqual([
      "callout-card",
      "code-card",
      "dashboard-triage",
    ]);
    expect(spec.overlays[0].durationSeconds).toBeGreaterThanOrEqual(8);
    expect(spec.overlays[0]).toMatchObject({
      density: "medium",
      emphasis: "Troppe sessioni aperte.",
      motion: "reveal",
      sfx: "soft-whoosh",
    });
    expect(spec.overlays[1]).toMatchObject({
      density: "rich",
      emphasis: "claude agents",
      motion: "type-on",
      sfx: "ui-click",
    });
    expect(spec.overlays[0].placementHint).toBe("apertura");
  });

  it("does not cap generated clip duration for long overlay content", () => {
    const longBody = "Long overlay sentence. ".repeat(140);
    const spec = buildOverlayRenderSpec({
      folder,
      markdown: `# Overlay library

## long-overlay
- kind: callout
- moment: extended explanation
- purpose: stay on screen while the idea develops

${longBody}
`,
      metadata,
    });

    expect(spec.overlays[0].durationSeconds).toBeGreaterThan(30);
  });

  it("writes overlay-spec.json and calls the overlay renderer", async () => {
    const render = vi.fn((target: string) => {
      writeFileSync(
        join(target, "overlays", "manifest.json"),
        JSON.stringify({ ok: true })
      );
      return Promise.resolve();
    });

    const result = await createOverlayRenderPackage(folder, metadata, {
      force: true,
      render,
    });

    expect(render).toHaveBeenCalledWith(projectFolder);
    expect(existsSync(result.specPath)).toBe(true);
    expect(dirname(result.videosDir)).toBe(join(projectFolder, "overlays"));
    expect(result.clipsDir).toBe(join(projectFolder, "overlays", "clips"));
    expect(result.videosDir).toBe(join(projectFolder, "overlays", "videos"));
    const spec = JSON.parse(readFileSync(result.specPath, "utf-8"));
    expect(spec.projectTitle).toBe("Test Project");
    expect(spec.renderer).toBe("hyperframes");
    expect(spec.compositionRoot).toBe(
      join(projectFolder, "overlays", "compositions")
    );
    expect(spec.overlays).toContainEqual(
      expect.objectContaining({
        id: "terminali-sepolti",
        template: "callout-card",
      })
    );
  });

  it("treats old final-video-only manifests as incomplete", () => {
    const outputDir = overlayRenderDir(folder);
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(outputDir, "manifest.json"),
      JSON.stringify({
        clips: [],
        finalVideo: join(outputDir, "final-overlay.mp4"),
        overlayCount: 3,
      })
    );

    expect(hasCompleteOverlayRenderManifest(folder)).toBe(false);
  });

  it("accepts manifests with clips and per-overlay videos for every overlay", () => {
    const outputDir = overlayRenderDir(folder);
    const clipsDir = join(outputDir, "clips");
    const videosDir = join(outputDir, "videos");
    const ids = [
      "terminali-sepolti",
      "comando-agents-view",
      "tre-colonne-dashboard",
    ];
    const aspects = ["16x9", "9x16"];
    const clips = ids.flatMap((id) =>
      aspects.map((aspect) => {
        const path = join(clipsDir, aspect, `${id}.webm`);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, "clip");
        return {
          aspect,
          durationSeconds: 8,
          hasAudio: true,
          id,
          path,
          timelineStartSeconds: 10,
        };
      })
    );
    const videos = ids.flatMap((id) =>
      aspects.map((aspect) => {
        const path = join(videosDir, aspect, `${id}.mp4`);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, "video");
        return {
          aspect,
          durationSeconds: 8,
          hasAudio: true,
          id,
          path,
          timelineStartSeconds: 10,
        };
      })
    );
    writeFileSync(
      join(outputDir, "manifest.json"),
      JSON.stringify({ clips, overlayCount: ids.length, videos })
    );

    expect(hasCompleteOverlayRenderManifest(folder)).toBe(true);
  });

  it("rejects manifests missing a generated aspect", () => {
    const outputDir = overlayRenderDir(folder);
    const ids = [
      "terminali-sepolti",
      "comando-agents-view",
      "tre-colonne-dashboard",
    ];
    const clips = ids.map((id) => {
      const path = join(outputDir, "clips", "16x9", `${id}.webm`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, "clip");
      return {
        aspect: "16x9",
        durationSeconds: 8,
        hasAudio: true,
        id,
        path,
        timelineStartSeconds: 10,
      };
    });
    const videos = ids.map((id) => {
      const path = join(outputDir, "videos", "16x9", `${id}.mp4`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, "video");
      return {
        aspect: "16x9",
        durationSeconds: 8,
        hasAudio: true,
        id,
        path,
        timelineStartSeconds: 10,
      };
    });
    writeFileSync(
      join(outputDir, "manifest.json"),
      JSON.stringify({ clips, overlayCount: ids.length, videos })
    );

    expect(hasCompleteOverlayRenderManifest(folder)).toBe(false);
  });
});
