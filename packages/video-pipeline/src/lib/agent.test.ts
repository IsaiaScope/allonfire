import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();
const runClaudeMock = vi.fn();
const stdinWriteMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

vi.mock("./claude", () => ({
  runClaude: (...args: unknown[]) => runClaudeMock(...args),
}));

const { resolveVideoAgent, runVideoAgent } = await import("./agent");

let root: string;
let previousEnv: NodeJS.ProcessEnv;

function writeExecutable(name: string): string {
  const path = join(root, "bin", name);
  writeFileSync(path, "");
  chmodSync(path, 0o755);
  return path;
}

function fakeProc(onClose: () => void, exitCode = 0) {
  return {
    stdout: {
      on(_event: string, _cb: (chunk: Buffer) => void) {
        // no stdout
      },
    },
    stderr: {
      on(_event: string, _cb: (chunk: Buffer) => void) {
        // no stderr
      },
    },
    stdin: {
      end: vi.fn(),
      write: stdinWriteMock,
    },
    on(event: string, cb: (code: number) => void) {
      if (event === "close") {
        setImmediate(() => {
          onClose();
          cb(exitCode);
        });
      }
    },
  };
}

describe("agent runner", () => {
  beforeEach(() => {
    previousEnv = { ...process.env };
    root = mkdtempSync(join(tmpdir(), "video-pipeline-agent-"));
    mkdirSync(join(root, "bin"), { recursive: true });
    process.env.PATH = join(root, "bin");
    spawnMock.mockReset();
    runClaudeMock.mockReset();
    stdinWriteMock.mockReset();
  });

  afterEach(() => {
    process.env = previousEnv;
    rmSync(root, { recursive: true, force: true });
  });

  it("resolves auto to Claude first, then Codex", () => {
    const claude = writeExecutable("claude");
    writeExecutable("codex");

    expect(resolveVideoAgent("auto")).toBe("claude");

    unlinkSync(claude);
    expect(resolveVideoAgent("auto")).toBe("codex");
  });

  it("runs Claude through the isolated Claude helper", async () => {
    runClaudeMock.mockResolvedValueOnce("claude output\n");

    const result = await runVideoAgent({
      agent: "claude",
      cwd: root,
      input: "hello",
      prompt: "translate this",
    });

    expect(result).toEqual({ agent: "claude", output: "claude output\n" });
    expect(runClaudeMock).toHaveBeenCalledWith({
      allowedTools: [],
      cwd: root,
      input: "hello",
      prompt: "translate this",
    });
  });

  it("allows Claude read-only file access for visual inspection", async () => {
    runClaudeMock.mockResolvedValueOnce("visual report\n");

    const result = await runVideoAgent({
      agent: "claude",
      cwd: root,
      input: "frames",
      prompt: "inspect",
      readOnlyFiles: true,
    });

    expect(result).toEqual({ agent: "claude", output: "visual report\n" });
    expect(runClaudeMock).toHaveBeenCalledWith({
      allowedTools: ["Read"],
      cwd: root,
      input: "frames",
      prompt: "inspect",
    });
  });

  it("runs Codex with ephemeral exec output and removes the output file", async () => {
    let outputPath = "";
    spawnMock.mockImplementationOnce((_command: string, args: string[]) => {
      const outIndex = args.indexOf("--output-last-message");
      outputPath = args[outIndex + 1];
      return fakeProc(() => writeFileSync(outputPath, "codex output\n"));
    });

    const result = await runVideoAgent({
      agent: "codex",
      cwd: root,
      errorLabel: "translation",
      input: "hello",
      prompt: "translate this",
    });

    expect(result).toEqual({ agent: "codex", output: "codex output\n" });
    expect(spawnMock).toHaveBeenCalledWith(
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
        outputPath,
        "-",
      ],
      expect.objectContaining({ cwd: root })
    );
    expect(stdinWriteMock).toHaveBeenCalledWith("translate this\n\nhello");
    expect(existsSync(outputPath)).toBe(false);
  });
});
