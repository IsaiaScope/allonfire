import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { overlayPath } from "../lib/paths";
import {
  createOverlayMockups,
  parseOverlayBlocks,
  selectMockupOverlay,
} from "./mockups";

const OVERLAY_MD = `# Overlay library — Test Project

## intro
- kind: callout
- moment: start
- purpose: introduce

Hello.

## tre-colonne-dashboard
- kind: diagram
- moment: dashboard
- purpose: show triage

Dashboard body.

## other-diagram
- kind: diagram
- moment: later
- purpose: explain

Other body.
`;

let folder: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "video-pipeline-mockups-"));
  writeFileSync(overlayPath(folder), OVERLAY_MD);
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe("overlay mockups", () => {
  it("parses overlay.md blocks", () => {
    expect(parseOverlayBlocks(OVERLAY_MD)).toEqual([
      {
        body: "Hello.",
        id: "intro",
        kind: "callout",
        moment: "start",
        purpose: "introduce",
      },
      {
        body: "Dashboard body.",
        id: "tre-colonne-dashboard",
        kind: "diagram",
        moment: "dashboard",
        purpose: "show triage",
      },
      {
        body: "Other body.",
        id: "other-diagram",
        kind: "diagram",
        moment: "later",
        purpose: "explain",
      },
    ]);
  });

  it("parses richer overlay render metadata when present", () => {
    expect(
      parseOverlayBlocks(`## richer-scene
- kind: callout
- moment: opening
- purpose: explain
- density: rich
- motion: pulse
- sfx: quiet-pop
- emphasis: punto chiave

Body.
`)
    ).toEqual([
      {
        body: "Body.",
        density: "rich",
        emphasis: "punto chiave",
        id: "richer-scene",
        kind: "callout",
        moment: "opening",
        motion: "pulse",
        purpose: "explain",
        sfx: "quiet-pop",
      },
    ]);
  });

  it("prefers the dashboard triage overlay", () => {
    const selected = selectMockupOverlay(parseOverlayBlocks(OVERLAY_MD));

    expect(selected.id).toBe("tre-colonne-dashboard");
  });

  it("respects an explicit overlay id", () => {
    const selected = selectMockupOverlay(
      parseOverlayBlocks(OVERLAY_MD),
      "other-diagram"
    );

    expect(selected.id).toBe("other-diagram");
  });

  it("rejects unsupported explicit overlay kinds", () => {
    expect(() =>
      selectMockupOverlay(parseOverlayBlocks(OVERLAY_MD), "intro")
    ).toThrow("mockups currently support diagram overlays");
  });

  it("writes overlay-spec.json and calls the renderer", async () => {
    const render = vi.fn((target: string) => {
      writeFileSync(
        join(target, "overlays", "manifest.json"),
        JSON.stringify({ ok: true })
      );
      return Promise.resolve();
    });

    const result = await createOverlayMockups(folder, { force: true, render });

    expect(render).toHaveBeenCalledWith(folder);
    expect(result.skipped).toBe(false);
    expect(existsSync(join(folder, "overlays", "overlay-spec.json"))).toBe(
      true
    );
    expect(
      JSON.parse(
        readFileSync(join(folder, "overlays", "overlay-spec.json"), "utf-8")
      )
    ).toMatchObject({
      overlays: [
        {
          id: "tre-colonne-dashboard",
          template: "dashboard-triage",
        },
      ],
      projectTitle: "Test Project",
      renderer: "hyperframes",
    });
  });

  it("skips existing artifacts unless forced", async () => {
    mkdirSync(join(folder, "overlays"), { recursive: true });
    writeFileSync(
      join(folder, "overlays", "manifest.json"),
      JSON.stringify({ ok: true })
    );
    const render = vi.fn();

    const result = await createOverlayMockups(folder, { render });

    expect(result.skipped).toBe(true);
    expect(render).not.toHaveBeenCalled();
  });

  it("fails clearly when overlay.md is missing", async () => {
    rmSync(overlayPath(folder));

    await expect(createOverlayMockups(folder)).rejects.toThrow(
      "Missing overlay.md"
    );
  });
});
