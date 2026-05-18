import { describe, expect, it } from "vitest";
import {
  uninstallDoneLabel,
  uninstallFooterLines,
  uninstallModeCopy,
} from "./uninstall";

describe("uninstallModeCopy", () => {
  it("explains check-only mode", () => {
    const copy = uninstallModeCopy({ checkOnly: true, force: false });

    expect(copy.title).toBe("uninstall check");
    expect(copy.subtitle).toBe("no packages will be removed");
    expect(copy.lines.join(" ")).toContain("currently on PATH");
  });

  it("explains normal uninstall mode", () => {
    const copy = uninstallModeCopy({ checkOnly: false, force: false });

    expect(copy.title).toBe("uninstall dependencies");
    expect(copy.subtitle).toBe("removes installed selected tools");
    expect(copy.lines.join(" ")).toContain(
      "removed with this OS package manager"
    );
  });

  it("explains force uninstall mode", () => {
    const copy = uninstallModeCopy({ checkOnly: false, force: true });

    expect(copy.title).toBe("force uninstall dependencies");
    expect(copy.subtitle).toBe(
      "runs uninstallers even when tools are not detected"
    );
    expect(copy.lines.join(" ")).toContain("stale package-manager records");
  });
});

describe("uninstallFooterLines", () => {
  it("explains target tools and preserved project files", () => {
    expect(uninstallFooterLines(["whisper-cpp"])).toEqual([
      "Target tools: whisper-cpp.",
      "This removes command-line binaries only.",
      "Project files and downloaded video work are not touched.",
    ]);
  });
});

describe("uninstallDoneLabel", () => {
  it("uses uninstall-specific row labels", () => {
    expect(uninstallDoneLabel({ checkOnly: true, installed: true })).toBe(
      "Removable"
    );
    expect(uninstallDoneLabel({ checkOnly: true, installed: false })).toBe(
      "Absent"
    );
    expect(uninstallDoneLabel({ checkOnly: false, installed: true })).toBe(
      "Removed"
    );
    expect(uninstallDoneLabel({ checkOnly: false, installed: false })).toBe(
      "Skipped"
    );
  });
});
