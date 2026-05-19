import { describe, expect, it } from "vitest";
import { buildCli, parseYoutubeUrl, selectTools } from "./cli";

const VALID_YOUTUBE_URL_RE = /valid YouTube video URL/;
const SUPPORTED_TOOLS_RE = /Allowed: yt-dlp, ffmpeg, whisper-cpp/;

describe("buildCli", () => {
  it("registers all 7 subcommands", () => {
    const program = buildCli();
    const names = program.commands.map((c) => c.name()).sort();
    expect(names).toEqual([
      "download",
      "install",
      "mockups",
      "overlay",
      "transcribe",
      "translate",
      "uninstall",
    ]);
  });

  it("rejects removed --kind on download", () => {
    const program = buildCli();
    program.exitOverride();
    expect(() =>
      program.parse(
        [
          "node",
          "cli",
          "download",
          "https://www.youtube.com/watch?v=7zxIeRWasbc",
          "--kind",
          "normal",
          "--title",
          "T",
        ],
        { from: "node" }
      )
    ).toThrow();
  });

  it("allows download without an explicit title", () => {
    const program = buildCli();
    const command = program.commands.find((c) => c.name() === "download");
    const title = command?.options.find((o) => o.long === "--title");
    expect(title?.mandatory).toBe(false);
  });

  it("registers mockups with overlay selection", () => {
    const program = buildCli();
    const command = program.commands.find((c) => c.name() === "mockups");

    expect(command?.options.some((o) => o.long === "--overlay")).toBe(true);
    expect(command?.options.some((o) => o.long === "--force")).toBe(true);
  });

  it("adds the shared agent selector to agent-backed commands", () => {
    const program = buildCli();
    for (const name of ["overlay", "transcribe", "translate"]) {
      const command = program.commands.find((c) => c.name() === name);
      expect(command?.options.some((o) => o.long === "--agent")).toBe(true);
    }
  });

  it("accepts YouTube video URLs", () => {
    expect(parseYoutubeUrl("https://www.youtube.com/watch?v=7zxIeRWasbc")).toBe(
      "https://www.youtube.com/watch?v=7zxIeRWasbc"
    );
  });

  it("rejects malformed YouTube URLs before rendering", () => {
    expect(() =>
      parseYoutubeUrl("h\u001dttps://www.youtube.com/watch?v=7zxIeRWasbc")
    ).toThrow(VALID_YOUTUBE_URL_RE);
  });

  it("uses an OS-aware default install profile", () => {
    expect(selectTools([], "macos")).toEqual([
      "yt-dlp",
      "ffmpeg",
      "whisper-cpp",
    ]);
    expect(selectTools([], "linux")).toEqual([
      "yt-dlp",
      "ffmpeg",
      "whisper-cpp",
    ]);
  });

  it("rejects removed Python ASR tools", () => {
    expect(() => selectTools(["mlx-whisper"], "linux")).toThrow(
      SUPPORTED_TOOLS_RE
    );
  });

  it("mentions all supported tools when rejecting an unknown tool", () => {
    expect(() => selectTools(["nope"], "linux")).toThrow(SUPPORTED_TOOLS_RE);
  });
});
