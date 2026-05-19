import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runVideoAgent, type VideoAgentChoice } from "../lib/agent";
import { overlayPath, scriptItPath, transcriptPath } from "../lib/paths";
import { createOverlayVisualEvidence } from "./overlay-watch";
import type { ProgressCallback } from "./types";

const PROMPT_DIR = join(dirname(fileURLToPath(import.meta.url)), "prompts");

export type GenerateOverlaysResult = {
  usefulVisualEvidence: boolean;
};

export async function generateOverlays(
  folder: string,
  title: string,
  count: number | undefined,
  options: {
    agent?: VideoAgentChoice;
    onProgress?: ProgressCallback;
  } = {}
): Promise<GenerateOverlaysResult> {
  const basePrompt = readFileSync(join(PROMPT_DIR, "overlay-gen.md"), "utf-8");
  const prompt =
    count !== undefined
      ? `${basePrompt}\n\nProduce exactly ${count} overlays.`
      : basePrompt;

  const transcript = readFileSync(transcriptPath(folder), "utf-8");
  const script = readFileSync(scriptItPath(folder), "utf-8");
  const evidence = await createOverlayVisualEvidence({
    agent: options.agent,
    folder,
    onProgress: options.onProgress,
    title,
  });
  const visualEvidence =
    evidence.usefulEvidence && evidence.evidenceMarkdown.trim().length > 0
      ? `# Visual evidence from source video\n\n${evidence.evidenceMarkdown}\n\n`
      : "";
  const input =
    `# Project title\n\n${title}\n\n` +
    `# Source transcript (verbatim)\n\n${transcript}\n\n` +
    visualEvidence +
    `# Italian script (what creator will say)\n\n${script}\n`;

  options.onProgress?.(90, "Generating overlay library");
  const result = await runVideoAgent({
    agent: options.agent,
    errorLabel: "overlay generation",
    input,
    prompt,
  });
  const md = result.output;
  options.onProgress?.(98, "Writing overlay.md");
  writeFileSync(overlayPath(folder), md);
  return { usefulVisualEvidence: evidence.usefulEvidence };
}
