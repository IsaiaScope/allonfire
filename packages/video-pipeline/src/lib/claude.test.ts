import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();
const stdinWriteMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

const { runClaude } = await import("./claude");

const EXIT_CODE_RE = /exited with code 2/;

function fakeProc(stdout: string, exitCode = 0) {
  return {
    stdout: {
      on(event: string, cb: (chunk: Buffer) => void) {
        if (event === "data") {
          setImmediate(() => cb(Buffer.from(stdout)));
        }
      },
    },
    stderr: {
      on(_event: string, _cb: (chunk: Buffer) => void) {
        // no-op
      },
    },
    stdin: {
      end: vi.fn(),
      write: stdinWriteMock,
    },
    on(event: string, cb: (code: number) => void) {
      if (event === "close") {
        setImmediate(() => cb(exitCode));
      }
    },
  };
}

describe("runClaude", () => {
  beforeEach(() => {
    stdinWriteMock.mockClear();
    spawnMock.mockClear();
  });

  it("invokes Claude in non-persistent print mode", async () => {
    spawnMock.mockImplementationOnce(() => fakeProc("translated text\n"));
    const out = await runClaude({ prompt: "translate this", input: "hello" });
    expect(out).toBe("translated text\n");
    expect(spawnMock).toHaveBeenCalledWith(
      "claude",
      [
        "--print",
        "--output-format",
        "text",
        "--no-session-persistence",
        "--permission-mode",
        "dontAsk",
        "--tools",
        "",
        "--setting-sources",
        "",
        "--strict-mcp-config",
        "--mcp-config",
        '{"mcpServers":{}}',
      ],
      expect.any(Object)
    );
    expect(stdinWriteMock).toHaveBeenCalledWith("translate this\n\nhello");
  });

  it("rejects when claude exits non-zero", async () => {
    spawnMock.mockImplementationOnce(() => fakeProc("oops", 2));
    await expect(runClaude({ prompt: "x", input: "y" })).rejects.toThrow(
      EXIT_CODE_RE
    );
  });

  it("passes explicit Claude tool access when requested", async () => {
    spawnMock.mockImplementationOnce(() => fakeProc("visual report\n"));
    await runClaude({
      allowedTools: ["Read"],
      input: "frames",
      prompt: "inspect",
    });
    const args = spawnMock.mock.calls[0][1];
    expect(args[args.indexOf("--tools") + 1]).toBe("Read");
  });
});
