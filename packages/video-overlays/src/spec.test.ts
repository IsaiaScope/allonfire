import { describe, expect, it } from "vitest";
import { getDashboardTriageLayout } from "./dashboard-triage-overlay";
import { getLinearDiagramLayout } from "./linear-diagram-overlay";
import {
  DASHBOARD_TRIAGE_LANDSCAPE_ID,
  DASHBOARD_TRIAGE_PORTRAIT_ID,
  DEFAULT_LINEAR_DIAGRAM_SPEC,
  DEFAULT_SPEC,
  DEFAULT_TUTORIAL_SHOWCASE_SPEC,
  LINEAR_DIAGRAM_LANDSCAPE_ID,
  LINEAR_DIAGRAM_PORTRAIT_ID,
  TUTORIAL_SHOWCASE_FULLSCREEN_LANDSCAPE_ID,
  TUTORIAL_SHOWCASE_FULLSCREEN_PORTRAIT_ID,
  TUTORIAL_SHOWCASE_OVER_VIDEO_LANDSCAPE_ID,
  TUTORIAL_SHOWCASE_OVER_VIDEO_PORTRAIT_ID,
} from "./root";
import {
  dashboardOverlaySpecSchema,
  linearDiagramOverlaySpecSchema,
  tutorialShowcaseOverlaySpecSchema,
} from "./spec";
import {
  tutorialAtomStories,
  tutorialPatternStories,
  tutorialStoryAspects,
  tutorialStoryCompositionId,
} from "./tutorial-storybook";

const REMOTION_COMPOSITION_ID_PATTERN = /^[A-Za-z0-9-]+$/;

describe("overlay spec", () => {
  it("accepts the default dashboard triage template props", () => {
    const spec = dashboardOverlaySpecSchema.parse(DEFAULT_SPEC);

    expect(spec.overlay.template).toBe("dashboard-triage");
    expect(spec.props.sections.map((section) => section.label)).toEqual([
      "Da rispondere",
      "In corso",
      "Completati",
    ]);
  });

  it("accepts the default linear diagram template props", () => {
    const spec = linearDiagramOverlaySpecSchema.parse(
      DEFAULT_LINEAR_DIAGRAM_SPEC
    );

    expect(spec.overlay.template).toBe("linear-diagram");
    expect(spec.props.steps.map((step) => step.label)).toEqual([
      "ChatGPT",
      "Claude Code",
      "Codex",
      "Anthropic",
      "Render",
    ]);
  });

  it("accepts the default tutorial showcase template props", () => {
    const spec = tutorialShowcaseOverlaySpecSchema.parse(
      DEFAULT_TUTORIAL_SHOWCASE_SPEC
    );

    expect(spec.overlay.template).toBe("tutorial-showcase");
    expect(spec.props.mode).toBe("fullscreen");
    expect(spec.props.code.lines).toHaveLength(3);
  });

  it("registers stable landscape and portrait composition ids", () => {
    expect(DASHBOARD_TRIAGE_LANDSCAPE_ID).toBe("DashboardTriageOverlay16x9");
    expect(DASHBOARD_TRIAGE_PORTRAIT_ID).toBe("DashboardTriageOverlay9x16");
    expect(LINEAR_DIAGRAM_LANDSCAPE_ID).toBe("LinearDiagramOverlay16x9");
    expect(LINEAR_DIAGRAM_PORTRAIT_ID).toBe("LinearDiagramOverlay9x16");
    expect(TUTORIAL_SHOWCASE_FULLSCREEN_LANDSCAPE_ID).toBe(
      "TutorialShowcaseFullscreen16x9"
    );
    expect(TUTORIAL_SHOWCASE_FULLSCREEN_PORTRAIT_ID).toBe(
      "TutorialShowcaseFullscreen9x16"
    );
    expect(TUTORIAL_SHOWCASE_OVER_VIDEO_LANDSCAPE_ID).toBe(
      "TutorialShowcaseOverVideo16x9"
    );
    expect(TUTORIAL_SHOWCASE_OVER_VIDEO_PORTRAIT_ID).toBe(
      "TutorialShowcaseOverVideo9x16"
    );
  });

  it("registers tutorial kit stories only for 16:9 and 9:16", () => {
    expect(tutorialStoryAspects).toEqual(["16x9", "9x16"]);
    const atomIds = tutorialAtomStories.map((story) => story.id);
    expect(atomIds).toContain("headline");
    expect(atomIds).toContain("flow-node");
    expect(atomIds).toContain("mini-bar-chart");
    expect(atomIds).toContain("vintage-photo-frame");
    expect(atomIds).toContain("paper-card");
    expect(atomIds).not.toContain("metadata-strip");
    expect(atomIds).not.toContain("side-rail");
    expect(tutorialPatternStories.map((story) => story.id)).toContain(
      "caption-band"
    );
    expect(tutorialPatternStories.map((story) => story.id)).toContain(
      "linear-flow-diagram"
    );
    expect(tutorialStoryCompositionId(tutorialAtomStories[1], "16x9")).toBe(
      "Headline-16x9"
    );
    expect(tutorialStoryCompositionId(tutorialPatternStories[0], "9x16")).toBe(
      "Pattern-CaptionBand-9x16"
    );
    for (const story of [...tutorialAtomStories, ...tutorialPatternStories]) {
      for (const aspect of tutorialStoryAspects) {
        expect(tutorialStoryCompositionId(story, aspect)).toMatch(
          REMOTION_COMPOSITION_ID_PATTERN
        );
      }
    }
  });

  it("derives a portrait-safe layout from the Remotion video config", () => {
    const landscape = getDashboardTriageLayout(1920, 1080);
    const portrait = getDashboardTriageLayout(1080, 1920);

    expect(landscape.portrait).toBe(false);
    expect(portrait.portrait).toBe(true);
    expect(portrait.shellWidth).toBeLessThanOrEqual(1080);
    expect(portrait.shellHeight).toBeLessThanOrEqual(1920);
    expect(portrait.rowGridTemplateColumns).not.toBe(
      landscape.rowGridTemplateColumns
    );
  });

  it("derives orientation-aware linear diagram layouts", () => {
    const landscape = getLinearDiagramLayout(1920, 1080, "horizontal");
    const portrait = getLinearDiagramLayout(1080, 1920, "auto");

    expect(landscape.isVertical).toBe(false);
    expect(landscape.isImpact).toBe(true);
    expect(landscape.isZigzag).toBe(false);
    expect(landscape.shellWidth).toBeGreaterThanOrEqual(1600);
    expect(landscape.shellHeight).toBeGreaterThanOrEqual(840);
    expect(landscape.assetHeight).toBeGreaterThanOrEqual(400);
    expect(portrait.isVertical).toBe(true);
    expect(portrait.isImpact).toBe(true);
    expect(portrait.isZigzag).toBe(false);
    expect(portrait.shellWidth).toBeLessThanOrEqual(1080);
    expect(portrait.shellHeight).toBeLessThanOrEqual(1920);
    expect(portrait.shellWidth).toBeGreaterThanOrEqual(900);
    expect(portrait.assetHeight).toBeGreaterThanOrEqual(480);
  });
});
