import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveProjectFolder } from "./resolve";

const NOT_RESOLVED_RE = /could not resolve/i;

let work: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "video-pipeline-resolve-"));
  mkdirSync(join(work, "2026-05-13-fsm-spiegata", "raw"), {
    recursive: true,
  });
  mkdirSync(join(work, "2026-05-13-cosi-fsm", "raw"), { recursive: true });
  writeFileSync(
    join(work, "2026-05-13-fsm-spiegata", "raw", "metadata.json"),
    "{}"
  );
  writeFileSync(
    join(work, "2026-05-13-cosi-fsm", "raw", "metadata.json"),
    "{}"
  );
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

describe("resolveProjectFolder", () => {
  it("accepts absolute path verbatim", () => {
    const folder = join(work, "2026-05-13-fsm-spiegata", "raw");
    expect(resolveProjectFolder(folder, work)).toBe(folder);
  });

  it("accepts absolute project parent and resolves to raw folder", () => {
    const folder = join(work, "2026-05-13-fsm-spiegata");
    expect(resolveProjectFolder(folder, work)).toBe(join(folder, "raw"));
  });

  it("accepts project slug under the work directory and resolves to raw folder", () => {
    expect(resolveProjectFolder("2026-05-13-fsm-spiegata", work)).toBe(
      join(work, "2026-05-13-fsm-spiegata", "raw")
    );
    expect(resolveProjectFolder("2026-05-13-cosi-fsm", work)).toBe(
      join(work, "2026-05-13-cosi-fsm", "raw")
    );
  });

  it("falls back to cwd when arg is empty", () => {
    const folder = join(work, "2026-05-13-fsm-spiegata", "raw");
    expect(resolveProjectFolder("", work, folder)).toBe(folder);
  });

  it("falls back to cwd raw folder when arg is empty from the project parent", () => {
    const folder = join(work, "2026-05-13-fsm-spiegata");
    expect(resolveProjectFolder("", work, folder)).toBe(join(folder, "raw"));
  });

  it("throws if slug unresolved", () => {
    expect(() => resolveProjectFolder("does-not-exist", work)).toThrow(
      NOT_RESOLVED_RE
    );
  });
});
