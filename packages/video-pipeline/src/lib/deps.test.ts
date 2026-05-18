import { beforeEach, describe, expect, it, vi } from "vitest";

const execMock = vi.fn();

vi.mock("node:child_process", () => ({
  exec: (
    cmd: string,
    options:
      | { timeout?: number }
      | ((err: Error | null, stdout: string, stderr: string) => void),
    cb?: (err: Error | null, stdout: string, stderr: string) => void
  ) => execMock(cmd, options, cb),
}));

const {
  checkTool,
  defaultToolsForPlatform,
  installCommand,
  uninstallCommand,
  KNOWN_TOOLS,
} = await import("./deps");

describe("checkTool", () => {
  beforeEach(() => {
    execMock.mockReset();
  });

  it("returns installed=false when which fails", async () => {
    execMock.mockImplementation((_cmd, _options, cb) =>
      cb(new Error("not found"), "", "")
    );

    await expect(checkTool("yt-dlp")).resolves.toEqual({ installed: false });
  });

  it("returns installed=true with unknown version when version probing fails", async () => {
    execMock
      .mockImplementationOnce((_cmd, _options, cb) =>
        cb(null, "/opt/homebrew/bin/whisper-cli\n", "")
      )
      .mockImplementationOnce((_cmd, _options, cb) =>
        cb(new Error("timed out"), "", "")
      );

    await expect(checkTool("whisper-cpp")).resolves.toEqual({
      installed: true,
      path: "/opt/homebrew/bin/whisper-cli",
      source: "path",
      version: "unknown",
    });
  });

  it("reads versions from stderr when a tool prints help there", async () => {
    execMock
      .mockImplementationOnce((_cmd, _options, cb) =>
        cb(null, "/opt/homebrew/bin/ffmpeg\n", "")
      )
      .mockImplementationOnce((_cmd, _options, cb) =>
        cb(null, "", "ffmpeg version 8.1.1 Copyright")
      );

    await expect(checkTool("ffmpeg")).resolves.toEqual({
      installed: true,
      path: "/opt/homebrew/bin/ffmpeg",
      source: "path",
      version: "8.1.1",
    });
  });

  it("finds versions anywhere in combined stdout and stderr", async () => {
    execMock
      .mockImplementationOnce((_cmd, _options, cb) =>
        cb(null, "/opt/homebrew/bin/whisper-cli\n", "")
      )
      .mockImplementationOnce((_cmd, _options, cb) =>
        cb(
          null,
          "usage: whisper-cli [options] file0 file1 ...",
          "load_backend: loaded BLAS backend from /opt/homebrew/Cellar/ggml/0.11.1/libexec/libggml-blas.so"
        )
      );

    await expect(checkTool("whisper-cpp")).resolves.toEqual({
      installed: true,
      path: "/opt/homebrew/bin/whisper-cli",
      source: "path",
      version: "0.11.1",
    });
  });
});

describe("installCommand", () => {
  it("dispatches brew on macos", () => {
    expect(installCommand("macos", "yt-dlp")).toEqual([
      "brew",
      ["install", "yt-dlp"],
    ]);
  });

  it("dispatches winget on windows", () => {
    const [cmd, args] = installCommand("windows", "ffmpeg");
    expect(cmd).toBe("winget");
    expect(args).toContain("install");
    expect(args).toContain("-e");
  });

  it("dispatches sh -c on linux", () => {
    const [cmd, args] = installCommand("linux", "yt-dlp");
    expect(cmd).toBe("sh");
    expect(args[0]).toBe("-c");
    expect(args[1]).toContain("yt-dlp");
  });
});

describe("uninstallCommand", () => {
  it("dispatches brew uninstall on macos", () => {
    expect(uninstallCommand("macos", "yt-dlp")).toEqual([
      "brew",
      ["uninstall", "yt-dlp"],
    ]);
  });

  it("dispatches winget uninstall on windows", () => {
    const [cmd, args] = uninstallCommand("windows", "ffmpeg");
    expect(cmd).toBe("winget");
    expect(args).toContain("uninstall");
    expect(args).toContain("Gyan.FFmpeg");
  });

  it("dispatches sh -c on linux", () => {
    const [cmd, args] = uninstallCommand("linux", "whisper-cpp");
    expect(cmd).toBe("sh");
    expect(args[0]).toBe("-c");
    expect(args[1]).toContain("whisper-cli");
  });
});

describe("KNOWN_TOOLS", () => {
  it("lists only binary tools", () => {
    expect(KNOWN_TOOLS).toEqual(["yt-dlp", "ffmpeg", "whisper-cpp"]);
  });
});

describe("defaultToolsForPlatform", () => {
  it("uses the same binary-only profile on every OS", () => {
    expect(defaultToolsForPlatform("macos")).toEqual([
      "yt-dlp",
      "ffmpeg",
      "whisper-cpp",
    ]);
    expect(defaultToolsForPlatform("linux")).toEqual([
      "yt-dlp",
      "ffmpeg",
      "whisper-cpp",
    ]);
    expect(defaultToolsForPlatform("windows")).toEqual([
      "yt-dlp",
      "ffmpeg",
      "whisper-cpp",
    ]);
  });
});
