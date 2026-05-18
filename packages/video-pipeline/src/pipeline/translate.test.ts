import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initMetadata, markStageDone } from "../lib/metadata";

const resolveVideoAgentMock = vi.fn();
const runVideoAgentMock = vi.fn();

vi.mock("../lib/agent", () => ({
  resolveVideoAgent: (...args: unknown[]) => resolveVideoAgentMock(...args),
  runVideoAgent: (...args: unknown[]) => runVideoAgentMock(...args),
}));

const { translate } = await import("./translate");
const { scriptItPath, transcriptItPath, transcriptPath } = await import(
  "../lib/paths"
);

let folder: string;

function writeProject(sourceLanguage: string): void {
  initMetadata(folder, {
    date: "2026-05-14",
    slug: "translation-test",
    source: {
      duration: 12,
      language: sourceLanguage,
      title: "Translation test",
      url: "https://example.com/watch?v=translation-test",
      youtubeId: "translation-test",
    },
    title: "Translation test",
  });
  markStageDone(folder, "transcribed");
  writeFileSync(
    transcriptPath(folder),
    "# Transcript\n\n[00:00:00] Hello world.\n"
  );
}

describe("translate", () => {
  beforeEach(() => {
    resolveVideoAgentMock.mockReset();
    runVideoAgentMock.mockReset();
    resolveVideoAgentMock.mockReturnValue("claude");
    folder = mkdtempSync(join(tmpdir(), "video-pipeline-translate-"));
  });

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it("runs verbatim + rewrite when source is not Italian", async () => {
    writeProject("en");
    resolveVideoAgentMock.mockReturnValue("codex");
    runVideoAgentMock
      .mockResolvedValueOnce({
        agent: "codex",
        output: "# Trascrizione IT verbatim\n\n[00:00:00] Ciao mondo.\n",
      })
      .mockResolvedValueOnce({
        agent: "codex",
        output: "# Script\n\nCiao a tutti, oggi parliamo di...\n",
      });

    const result = await translate(folder, { agent: "codex" });

    expect(resolveVideoAgentMock).toHaveBeenCalledWith("codex");
    expect(runVideoAgentMock).toHaveBeenCalledTimes(2);
    expect(runVideoAgentMock.mock.calls[0][0]).toMatchObject({
      agent: "codex",
      cwd: folder,
      errorLabel: "verbatim translation",
    });
    expect(runVideoAgentMock.mock.calls[1][0]).toMatchObject({
      agent: "codex",
      cwd: folder,
      errorLabel: "Italian script rewrite",
    });
    expect(readFileSync(transcriptItPath(folder), "utf-8")).toContain(
      "Ciao mondo"
    );
    expect(readFileSync(scriptItPath(folder), "utf-8")).toContain(
      "Ciao a tutti"
    );
    expect(result).toEqual({
      agent: "codex",
      copiedVerbatim: false,
      sourceLanguage: "en",
    });
  });

  it("copies verbatim transcript when source is Italian and rewrites once", async () => {
    writeProject("it");
    runVideoAgentMock.mockResolvedValueOnce({
      agent: "claude",
      output: "# Script\n\nBenvenuti...\n",
    });

    const result = await translate(folder);

    expect(runVideoAgentMock).toHaveBeenCalledTimes(1);
    expect(readFileSync(transcriptItPath(folder), "utf-8")).toBe(
      readFileSync(transcriptPath(folder), "utf-8")
    );
    expect(readFileSync(scriptItPath(folder), "utf-8")).toContain("Benvenuti");
    expect(result).toEqual({
      agent: "claude",
      copiedVerbatim: true,
      sourceLanguage: "it",
    });
  });

  it("requires the transcribed stage to be complete", async () => {
    initMetadata(folder, {
      date: "2026-05-14",
      slug: "translation-test",
      source: {
        duration: 12,
        language: "en",
        title: "Translation test",
        url: "https://example.com/watch?v=translation-test",
        youtubeId: "translation-test",
      },
      title: "Translation test",
    });

    await expect(translate(folder)).rejects.toThrow(
      "Transcribe stage not complete"
    );
    expect(runVideoAgentMock).not.toHaveBeenCalled();
  });
});
