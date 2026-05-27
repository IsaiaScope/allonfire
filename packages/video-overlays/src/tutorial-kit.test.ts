import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tutorialSfxCueSchema } from "./spec";
import { enterProgress } from "./tutorial-kit/lib/motion";
import { type TutorialSfxCue, tutorialSfxFiles } from "./tutorial-kit/lib/sfx";

describe("tutorial overlay kit", () => {
  it("keeps the curated SFX pack local and schema-backed", () => {
    const cues = Object.keys(tutorialSfxFiles) as TutorialSfxCue[];

    expect(cues).toEqual([
      "soft-whoosh",
      "paper-tick",
      "quiet-pop",
      "ui-click",
      "page-turn",
    ]);

    for (const cue of cues) {
      tutorialSfxCueSchema.parse(cue);
      expect(
        existsSync(join(process.cwd(), "public", tutorialSfxFiles[cue]))
      ).toBe(true);
    }
  });

  it("uses deterministic frame-based entrance progress", () => {
    expect(enterProgress(0, 10, 20)).toBe(0);
    expect(enterProgress(40, 10, 20)).toBe(1);
    expect(enterProgress(20, 10, 20)).toBeGreaterThan(0);
    expect(enterProgress(20, 10, 20)).toBeLessThan(1);
  });
});
