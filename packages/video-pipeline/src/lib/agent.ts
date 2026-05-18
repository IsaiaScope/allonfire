import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";
import { env } from "../env";
import { runClaude } from "./claude";

export const VIDEO_AGENTS = ["auto", "claude", "codex"] as const;

export type VideoAgentChoice = (typeof VIDEO_AGENTS)[number];
export type ResolvedVideoAgent = Exclude<VideoAgentChoice, "auto">;

export type RunVideoAgentOptions = {
  agent?: VideoAgentChoice;
  prompt: string;
  input: string;
  cwd?: string;
  errorLabel?: string;
  outputPath?: string;
  readOnlyFiles?: boolean;
};

export type RunVideoAgentResult = {
  agent: ResolvedVideoAgent;
  output: string;
};

export function commandExists(command: string): boolean {
  if (isAbsolute(command)) {
    return existsSync(command);
  }
  const pathEnv = process.env.PATH ?? "";
  const exts =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
      : [""];

  return pathEnv
    .split(delimiter)
    .some((dir) =>
      exts.some((ext) => existsSync(join(dir, `${command}${ext}`)))
    );
}

export function resolveVideoAgent(
  requested: VideoAgentChoice = env.VIDEO_AGENT
): ResolvedVideoAgent | null {
  if (requested !== "auto") {
    return requested;
  }
  if (commandExists("claude")) {
    return "claude";
  }
  if (commandExists("codex")) {
    return "codex";
  }
  return null;
}

function runProcessWithInput(
  command: string,
  args: string[],
  input: string,
  errorLabel: string,
  cwd?: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    let stdout = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(`${errorLabel} failed (${code}): ${stderr.slice(-300)}`)
        );
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start ${errorLabel}: ${err.message}`))
    );
    proc.stdin.write(input);
    proc.stdin.end();
  });
}

function cleanupFile(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    // no temporary agent output to remove
  }
}

function temporaryAgentOutputPath(): string {
  return join(tmpdir(), `allonfire-video-agent-${randomUUID()}.txt`);
}

export async function runVideoAgent({
  agent = env.VIDEO_AGENT,
  prompt,
  input,
  cwd,
  errorLabel = "agent",
  outputPath,
  readOnlyFiles = false,
}: RunVideoAgentOptions): Promise<RunVideoAgentResult> {
  const resolved = resolveVideoAgent(agent);
  if (!resolved) {
    throw new Error("No Claude Code or Codex agent is available on PATH");
  }

  if (resolved === "claude") {
    return {
      agent: "claude",
      output: await runClaude({
        allowedTools: readOnlyFiles ? ["Read"] : [],
        cwd,
        input,
        prompt,
      }),
    };
  }

  const outPath = outputPath ?? temporaryAgentOutputPath();
  try {
    await runProcessWithInput(
      "codex",
      [
        "--ask-for-approval",
        "never",
        "exec",
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--ephemeral",
        "--output-last-message",
        outPath,
        "-",
      ],
      `${prompt}\n\n${input}`,
      `${errorLabel} via codex`,
      cwd
    );
    return {
      agent: "codex",
      output: readFileSync(outPath, "utf-8"),
    };
  } finally {
    cleanupFile(outPath);
  }
}
