import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { legacyRealTitleVideoPath, videoPath } from "../lib/paths";

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

const { downloadVideo, extractYoutubeId } = await import("./download");

const CANNOT_EXTRACT_RE = /cannot extract/i;

function fakeProc(stdout = "", exitCode = 0) {
  return {
    stdout: {
      on(event: string, cb: (chunk: Buffer) => void) {
        if (event === "data" && stdout) {
          setImmediate(() => cb(Buffer.from(stdout)));
        }
      },
    },
    stderr: {
      on(_event: string, _cb: (chunk: Buffer) => void) {
        // no-op
      },
    },
    on(event: string, cb: (code: number) => void) {
      if (event === "close") {
        setImmediate(() => cb(exitCode));
      }
    },
  };
}

describe("extractYoutubeId", () => {
  it("extracts from watch?v= URL", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/watch?v=abc123XYZ_-")
    ).toBe("abc123XYZ_-");
  });

  it("extracts from youtu.be short URL", () => {
    expect(extractYoutubeId("https://youtu.be/abc123XYZ_-")).toBe(
      "abc123XYZ_-"
    );
  });

  it("extracts from shorts URL", () => {
    expect(extractYoutubeId("https://youtube.com/shorts/abc123XYZ_-")).toBe(
      "abc123XYZ_-"
    );
  });

  it("extracts from embed URL", () => {
    expect(extractYoutubeId("https://youtube.com/embed/abc123XYZ_-")).toBe(
      "abc123XYZ_-"
    );
  });

  it("throws on non-YT URL", () => {
    expect(() => extractYoutubeId("https://vimeo.com/12345")).toThrow(
      CANNOT_EXTRACT_RE
    );
  });
});

describe("downloadVideo", () => {
  let folder: string;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "video-pipeline-download-"));
    spawnMock.mockReset();
  });

  afterEach(() => {
    rmSync(folder, { force: true, recursive: true });
  });

  it("skips an existing video unless force is requested", async () => {
    writeFileSync(videoPath(folder, "project-slug"), "existing");

    const progress = vi.fn();
    const result = await downloadVideo(
      "https://youtu.be/abc123XYZ_-",
      folder,
      "1080p",
      progress,
      {
        info: {
          duration: 42,
          title: "Source",
          youtubeId: "abc123XYZ_-",
        },
        outputSlug: "project-slug",
      }
    );

    expect(result.videoPath).toBe(videoPath(folder, "project-slug"));
    expect(progress).toHaveBeenCalledWith(100, "Video already downloaded");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("still skips legacy real-title video projects", async () => {
    writeFileSync(legacyRealTitleVideoPath(folder, "Source"), "existing");

    const progress = vi.fn();
    const result = await downloadVideo(
      "https://youtu.be/abc123XYZ_-",
      folder,
      "1080p",
      progress,
      {
        info: {
          duration: 42,
          title: "Source",
          youtubeId: "abc123XYZ_-",
        },
        outputSlug: "project-slug",
      }
    );

    expect(result.videoPath).toBe(legacyRealTitleVideoPath(folder, "Source"));
    expect(progress).toHaveBeenCalledWith(100, "Video already downloaded");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("still skips legacy video.mp4 projects", async () => {
    writeFileSync(videoPath(folder), "existing");

    const progress = vi.fn();
    const result = await downloadVideo(
      "https://youtu.be/abc123XYZ_-",
      folder,
      "1080p",
      progress,
      {
        info: {
          duration: 42,
          title: "Source",
          youtubeId: "abc123XYZ_-",
        },
        outputSlug: "project-slug",
      }
    );

    expect(result.videoPath).toBe(videoPath(folder));
    expect(progress).toHaveBeenCalledWith(100, "Video already downloaded");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("overwrites an existing video when force is requested", async () => {
    writeFileSync(videoPath(folder), "existing");
    spawnMock.mockImplementationOnce(() =>
      fakeProc("[download] 37.0% of 10.00MiB")
    );

    const progress = vi.fn();
    await downloadVideo(
      "https://youtu.be/abc123XYZ_-",
      folder,
      "1080p",
      progress,
      {
        force: true,
        info: {
          duration: 42,
          title: "Source",
          youtubeId: "abc123XYZ_-",
        },
        outputSlug: "project-slug",
      }
    );

    expect(spawnMock).toHaveBeenCalledWith(
      "yt-dlp",
      expect.arrayContaining(["--force-overwrites"])
    );
    expect(spawnMock).toHaveBeenCalledWith(
      "yt-dlp",
      expect.arrayContaining([videoPath(folder, "project-slug")])
    );
    expect(progress).toHaveBeenCalledWith(37, "Downloading 37%");
    expect(progress).toHaveBeenLastCalledWith(100, "Download complete");
  });
});
