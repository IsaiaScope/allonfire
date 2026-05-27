import { describe, expect, it } from "vitest";
import {
  formatDetailLine as formatToolStatusDetail,
  normalizeDetails,
  detailKeyWidth as toolStatusDetailKeyWidth,
  detailValueColor as toolStatusDetailValueColor,
} from "./detail-list";

describe("tool status row helpers", () => {
  it("normalizes optional detail lines", () => {
    expect(normalizeDetails()).toEqual([]);
    expect(normalizeDetails("ready")).toEqual(["ready"]);
    expect(normalizeDetails(["ready", "", "path: /bin/ffmpeg"])).toEqual([
      "ready",
      "path: /bin/ffmpeg",
    ]);
  });

  it("capitalizes dot-list phrases for display", () => {
    expect(formatToolStatusDetail("status: installed")).toEqual({
      key: "Status",
      value: "Installed",
    });
    expect(formatToolStatusDetail("path: /opt/homebrew/bin/yt-dlp")).toEqual({
      key: "Path",
      value: "/opt/homebrew/bin/yt-dlp",
    });
    expect(formatToolStatusDetail("source: https://youtu.be/abc")).toEqual({
      key: "Source",
      value: "https://youtu.be/abc",
    });
    expect(formatToolStatusDetail("tool: yt-dlp")).toEqual({
      key: "Tool",
      value: "yt-dlp",
    });
    expect(formatToolStatusDetail("output: video.mp4")).toEqual({
      key: "Output",
      value: "video.mp4",
    });
    expect(formatToolStatusDetail("renders: overlays/clips/")).toEqual({
      key: "Renders",
      value: "overlays/clips/",
    });
    expect(formatToolStatusDetail("checking PATH")).toEqual({
      value: "Checking PATH",
    });
  });

  it("uses quieter keyed colors for detail values", () => {
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail("status: ready"),
        "done"
      )
    ).toBe("green");
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail("status: missing"),
        "failed"
      )
    ).toBe("red");
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail("version: 8.1.1"),
        "done"
      )
    ).toBe("yellow");
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail("path: /opt/homebrew/bin/ffmpeg"),
        "done"
      )
    ).toBe("cyan");
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail("run mode: force redo"),
        "done"
      )
    ).toBe("yellow");
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail("project: Italian project title"),
        "done"
      )
    ).toBe("cyan");
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail("source: https://youtu.be/abc"),
        "done"
      )
    ).toBe("cyan");
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail("slug: claude-code-dashboard"),
        "done"
      )
    ).toBe("cyan");
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail("engine: whisper.cpp"),
        "done"
      )
    ).toBe("yellow");
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail(
          'next: pnpm video transcribe "/tmp/project/raw"'
        ),
        "done"
      )
    ).toBe("cyan");
    expect(
      toolStatusDetailValueColor(
        formatToolStatusDetail("fix: retry with --force"),
        "failed"
      )
    ).toBe("yellow");
  });

  it("preserves command casing in result details", () => {
    expect(
      formatToolStatusDetail('next: pnpm video transcribe "/tmp/project/raw"')
    ).toEqual({
      key: "Next",
      value: 'pnpm video transcribe "/tmp/project/raw"',
    });
  });

  it("keeps model provider keys wide enough on normal terminals", () => {
    const details = [
      "whisper.cpp: large-v3",
      "source: /opt/homebrew/bin/whisper-cli",
      "model: /Volumes/Crucial-4T/repo/allonfire/models/ggml-large-v3.bin",
    ].map(formatToolStatusDetail);

    expect(toolStatusDetailKeyWidth(details, 80, 3)).toBe(13);
    expect(toolStatusDetailKeyWidth(details, 36, 3)).toBeLessThan(16);
  });
});
