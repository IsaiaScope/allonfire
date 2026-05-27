import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runVideoAgentMock = vi.fn();
const createOverlayVisualEvidenceMock = vi.fn();

vi.mock("../lib/agent", () => ({
  runVideoAgent: (...args: unknown[]) => runVideoAgentMock(...args),
}));

vi.mock("./overlay-watch", () => ({
  createOverlayVisualEvidence: (...args: unknown[]) =>
    createOverlayVisualEvidenceMock(...args),
}));

const { generateOverlays } = await import("./overlay");
const { overlayPath, scriptItPath, transcriptPath } = await import(
  "../lib/paths"
);

let folder: string;

beforeEach(() => {
  runVideoAgentMock.mockReset();
  createOverlayVisualEvidenceMock.mockReset();
  createOverlayVisualEvidenceMock.mockResolvedValue({
    evidenceMarkdown: "",
    usefulEvidence: false,
  });
  folder = mkdtempSync(join(tmpdir(), "video-pipeline-overlay-"));
  writeFileSync(transcriptPath(folder), "# Transcript\n[00:00:00] hi\n");
  writeFileSync(scriptItPath(folder), "# Script\nciao\n");
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe("generateOverlays", () => {
  it("calls claude with both transcripts concatenated and writes overlay.md", async () => {
    runVideoAgentMock.mockResolvedValueOnce({
      agent: "claude",
      output:
        "# Overlay library — Test\n\n## intro-diagram\n- kind: diagram\n- moment: apertura\n- purpose: orientamento\n\nDescrizione.\n",
    });
    await generateOverlays(folder, "Test", undefined);
    expect(runVideoAgentMock).toHaveBeenCalledTimes(1);
    expect(createOverlayVisualEvidenceMock).toHaveBeenCalledWith(
      expect.objectContaining({ folder, title: "Test" })
    );
    const call = runVideoAgentMock.mock.calls[0][0];
    expect(call.input).toContain("# Transcript");
    expect(call.input).toContain("# Script");
    expect(call.input).not.toContain("# Visual evidence from source video");
    expect(call.prompt).toContain("video-ready overlay scenes");
    expect(call.prompt).toContain(
      "- motion: reveal | build | compare | pulse | type-on"
    );
    expect(readFileSync(overlayPath(folder), "utf-8")).toContain(
      "## intro-diagram"
    );
  });

  it("injects explicit count into the prompt when provided", async () => {
    runVideoAgentMock.mockResolvedValueOnce({
      agent: "claude",
      output: "# Overlay library — Test\n",
    });
    await generateOverlays(folder, "Test", 7);
    const call = runVideoAgentMock.mock.calls[0][0];
    expect(call.prompt).toContain("exactly 7 overlays");
  });

  it("includes visual evidence when the scan finds useful source visuals", async () => {
    createOverlayVisualEvidenceMock.mockResolvedValueOnce({
      evidenceMarkdown:
        "useful_visual_evidence: yes\n\n## 00:00:10\nObserved UI callout.",
      usefulEvidence: true,
    });
    runVideoAgentMock.mockResolvedValueOnce({
      agent: "claude",
      output: "# Overlay library — Test\n",
    });

    await generateOverlays(folder, "Test", undefined);

    const call = runVideoAgentMock.mock.calls[0][0];
    expect(call.input).toContain("# Visual evidence from source video");
    expect(call.input).toContain("Observed UI callout.");
  });
});
