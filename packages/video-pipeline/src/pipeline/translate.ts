import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../env";
import {
  type ResolvedVideoAgent,
  resolveVideoAgent,
  runVideoAgent,
  type VideoAgentChoice,
} from "../lib/agent";
import { isStageDone, readMetadata } from "../lib/metadata";
import { scriptItPath, transcriptItPath, transcriptPath } from "../lib/paths";
import type { ProgressCallback } from "./types";

const PROMPT_DIR = join(dirname(fileURLToPath(import.meta.url)), "prompts");

function loadPrompt(name: string): string {
  return readFileSync(join(PROMPT_DIR, `${name}.md`), "utf-8");
}

export async function translate(
  folder: string,
  options: {
    agent?: VideoAgentChoice;
    onProgress?: ProgressCallback;
  } = {}
): Promise<{
  agent: ResolvedVideoAgent;
  copiedVerbatim: boolean;
  sourceLanguage: string;
}> {
  const onProgress = options.onProgress ?? (() => undefined);
  const metadata = readMetadata(folder);
  if (!metadata) {
    throw new Error("No metadata.json — run `download` first");
  }
  if (!isStageDone(metadata.stages.transcribed)) {
    throw new Error("Transcribe stage not complete — run `transcribe` first");
  }
  const sourceLang = metadata.source.language;
  if (!sourceLang) {
    throw new Error("Source language unknown — run `transcribe` first");
  }

  onProgress(15, "Reading transcript.md");
  const source = readFileSync(transcriptPath(folder), "utf-8");
  const requestedAgent =
    options.agent ?? env.TRANSLATE_AGENT ?? env.VIDEO_AGENT;
  const agent = resolveVideoAgent(requestedAgent);
  if (!agent) {
    throw new Error("No Claude Code or Codex agent is available on PATH");
  }
  onProgress(
    25,
    `${agent === "claude" ? "Claude Code" : "Codex"} selected for translation`
  );
  let copiedVerbatim = false;

  if (sourceLang === "it") {
    onProgress(35, "Copying Italian transcript to transcript-it.md");
    copyFileSync(transcriptPath(folder), transcriptItPath(folder));
    copiedVerbatim = true;
  } else {
    onProgress(
      40,
      `Asking ${agent === "claude" ? "Claude Code" : "Codex"} to translate transcript verbatim`
    );
    const { output: verbatim } = await runVideoAgent({
      agent,
      cwd: folder,
      errorLabel: "verbatim translation",
      outputPath: join(folder, ".translate-verbatim-agent.md"),
      prompt: loadPrompt("translate-verbatim"),
      input: source,
    });
    onProgress(62, "Writing transcript-it.md");
    writeFileSync(transcriptItPath(folder), verbatim);
  }

  const itVerbatim = readFileSync(transcriptItPath(folder), "utf-8");
  onProgress(
    74,
    `Asking ${agent === "claude" ? "Claude Code" : "Codex"} to rewrite Italian speaking script`
  );
  const { output: script } = await runVideoAgent({
    agent,
    cwd: folder,
    errorLabel: "Italian script rewrite",
    outputPath: join(folder, ".rewrite-script-agent.md"),
    prompt: loadPrompt("rewrite-script"),
    input: itVerbatim,
  });
  onProgress(95, "Writing script-it.md");
  writeFileSync(scriptItPath(folder), script);
  onProgress(100, "Translation complete");
  return { agent, copiedVerbatim, sourceLanguage: sourceLang };
}
