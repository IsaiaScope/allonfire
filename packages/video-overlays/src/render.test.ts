import { describe, expect, it } from "vitest";
import {
  buildHyperframesIndexHtml,
  hyperframesCompositionDir,
  overlayOutputPath,
  projectFolderFromArgs as overlayProjectFolderFromArgs,
  overlayVideoRenderPlan,
  writeHyperframesComposition,
} from "./render-overlays";

describe("render CLI args", () => {
  it("ignores pnpm argument separators", () => {
    expect(overlayProjectFolderFromArgs(["--", "/tmp/project"])).toBe(
      "/tmp/project"
    );
  });

  it("builds standalone per-overlay video outputs without source media", () => {
    const output = overlayVideoRenderPlan({
      aspect: "9x16",
      durationSeconds: 8,
      hasAudio: true,
      id: "demo",
      projectFolder: "/tmp/project",
      timelineStartSeconds: 42.5,
    });

    expect(output).toEqual({
      aspect: "9x16",
      durationSeconds: 8,
      hasAudio: true,
      id: "demo",
      path: "/tmp/project/overlays/videos/9x16/demo.mp4",
      timelineStartSeconds: 42.5,
    });
  });

  it("builds aspect-specific clip and video paths", () => {
    expect(
      overlayOutputPath({
        aspect: "16x9",
        id: "demo",
        kind: "clips",
        projectFolder: "/tmp/project",
      })
    ).toBe("/tmp/project/overlays/clips/16x9/demo.webm");
    expect(
      overlayOutputPath({
        aspect: "9x16",
        id: "demo",
        kind: "videos",
        projectFolder: "/tmp/project",
      })
    ).toBe("/tmp/project/overlays/videos/9x16/demo.mp4");
  });

  it("builds a Hyperframes composition with required timing attributes", () => {
    const html = buildHyperframesIndexHtml({
      aspect: { height: 1080, id: "16x9", width: 1920 },
      background: "transparent",
      item: {
        body: "**Opening claim**\n\n- First point\n- Second point",
        density: "medium",
        durationSeconds: 8,
        emphasis: "Opening claim",
        id: "opening-claim",
        kind: "callout",
        moment: "opening",
        motion: "reveal",
        placementHint: "opening",
        purpose: "orient the viewer",
        sfx: "none",
        startSeconds: 12,
        template: "callout-card",
        title: "Opening Claim",
      },
      projectTitle: "Project",
    });

    expect(html).toContain('data-composition-id="main"');
    expect(html).toContain('data-width="1920"');
    expect(html).toContain('data-height="1080"');
    expect(html).toContain('class="clip overlay-shell"');
    expect(html).toContain('data-start="0"');
    expect(html).toContain('data-duration="8"');
    expect(html).toContain('data-track-index="1"');
    expect(html).toContain("gsap.timeline({ paused: true })");
    expect(html).toContain('window.__timelines["main"] = tl;');
    expect(html).not.toContain("cdn.jsdelivr.net");
  });

  it("writes a self-contained Hyperframes project for an overlay aspect", () => {
    const projectFolder = "/tmp/project";
    const dir = hyperframesCompositionDir({
      aspect: "9x16",
      id: "demo",
      projectFolder,
    });

    expect(dir).toBe("/tmp/project/overlays/compositions/demo/9x16");

    const outputs = writeHyperframesComposition({
      aspect: { height: 1920, id: "9x16", width: 1080 },
      background: "stage",
      item: {
        body: "Demo body",
        density: "light",
        durationSeconds: 9,
        emphasis: "Demo",
        id: "demo",
        kind: "callout",
        moment: "demo",
        motion: "build",
        placementHint: "demo",
        purpose: "show the demo",
        sfx: "soft-whoosh",
        startSeconds: 0,
        template: "list-card",
        title: "Demo",
      },
      projectFolder,
      projectTitle: "Project",
      writeFile: () => undefined,
      mkdir: () => undefined,
      copyFile: () => undefined,
    });

    expect(outputs.compositionDir).toBe(dir);
    expect(outputs.indexPath).toBe(`${dir}/index.html`);
    expect(outputs.hyperframesConfigPath).toBe(`${dir}/hyperframes.json`);
  });
});
