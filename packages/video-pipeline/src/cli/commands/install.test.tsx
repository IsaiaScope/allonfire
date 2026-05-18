import { describe, expect, it } from "vitest";
import {
  installDoneLabel,
  installFooterLines,
  installModeCopy,
} from "./install";

describe("installModeCopy", () => {
  it("explains check-only mode", () => {
    const copy = installModeCopy({ checkOnly: true, force: false });

    expect(copy.title).toBe("dependency check");
    expect(copy.subtitle).toBe("no installs will run");
    expect(copy.lines.join(" ")).toContain("Missing tools will be reported");
  });

  it("explains that force is ignored during check-only mode", () => {
    const copy = installModeCopy({ checkOnly: true, force: true });

    expect(copy.title).toBe("dependency check");
    expect(copy.lines.join(" ")).toContain("--force is ignored");
  });

  it("explains normal install mode", () => {
    const copy = installModeCopy({ checkOnly: false, force: false });

    expect(copy.title).toBe("install dependencies");
    expect(copy.subtitle).toBe("installs missing tools only");
    expect(copy.lines.join(" ")).toContain("yt-dlp, ffmpeg, and whisper.cpp");
  });

  it("explains force reinstall mode", () => {
    const copy = installModeCopy({ checkOnly: false, force: true });

    expect(copy.title).toBe("force reinstall dependencies");
    expect(copy.subtitle).toBe(
      "runs installers even when tools are already present"
    );
    expect(copy.lines.join(" ")).toContain("binary is broken");
  });
});

describe("installFooterLines", () => {
  it("explains checked binaries and deferred model download", () => {
    expect(installFooterLines(["yt-dlp", "whisper-cpp"])).toEqual([
      "Checking tools: yt-dlp, whisper-cpp.",
      "This command handles command-line binaries only.",
      "Whisper model: downloaded later by `pnpm video transcribe`.",
    ]);
  });
});

describe("installDoneLabel", () => {
  it("uses install-specific row labels", () => {
    expect(
      installDoneLabel({ checkOnly: true, force: false, installed: true })
    ).toBe("Present");
    expect(
      installDoneLabel({ checkOnly: true, force: false, installed: false })
    ).toBe("Missing");
    expect(
      installDoneLabel({ checkOnly: false, force: false, installed: true })
    ).toBe("Installed");
    expect(
      installDoneLabel({ checkOnly: false, force: true, installed: true })
    ).toBe("Reinstalled");
  });
});
