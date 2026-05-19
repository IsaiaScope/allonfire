import type React from "react";
import { Composition, Folder } from "remotion";
import {
  type OverlaySpec,
  tutorialShowcaseOverlaySpecSchema,
  tutorialShowcasePropsSchema,
} from "./spec";
import { TutorialShowcaseOverlay } from "./tutorial-showcase-overlay";
import {
  TutorialStorybook,
  tutorialAtomStories,
  tutorialPatternStories,
  tutorialStoryAspects,
  tutorialStoryCompositionId,
} from "./tutorial-storybook";

export const DASHBOARD_TRIAGE_LANDSCAPE_ID = "DashboardTriageOverlay16x9";
export const DASHBOARD_TRIAGE_PORTRAIT_ID = "DashboardTriageOverlay9x16";
export const LINEAR_DIAGRAM_LANDSCAPE_ID = "LinearDiagramOverlay16x9";
export const LINEAR_DIAGRAM_PORTRAIT_ID = "LinearDiagramOverlay9x16";
export const TUTORIAL_SHOWCASE_FULLSCREEN_LANDSCAPE_ID =
  "TutorialShowcaseFullscreen16x9";
export const TUTORIAL_SHOWCASE_FULLSCREEN_PORTRAIT_ID =
  "TutorialShowcaseFullscreen9x16";
export const TUTORIAL_SHOWCASE_OVER_VIDEO_LANDSCAPE_ID =
  "TutorialShowcaseOverVideo16x9";
export const TUTORIAL_SHOWCASE_OVER_VIDEO_PORTRAIT_ID =
  "TutorialShowcaseOverVideo9x16";

export const DEFAULT_SPEC: OverlaySpec = {
  durationFrames: 180,
  fps: 30,
  overlay: {
    id: "tre-colonne-dashboard",
    kind: "diagram",
    moment: "Dashboard overview",
    purpose: "Show session triage structure",
    template: "dashboard-triage",
  },
  projectTitle: "Claude Code Just Got a Dashboard",
  props: {
    footerHints: [
      "invio per aprire",
      "spazio per rispondere",
      "ctrl+x per eliminare",
    ],
    sections: [
      {
        label: "Da rispondere",
        rows: [
          {
            detail: "domanda aperta",
            elapsed: "4m",
            name: "dark-mode",
            tone: "attention",
          },
          {
            detail: "conferma richiesta",
            elapsed: "11m",
            name: "release-notes",
            tone: "attention",
          },
        ],
        tone: "attention",
      },
      {
        label: "In corso",
        rows: [
          {
            detail: "analizzando",
            elapsed: "7m",
            name: "perf-audit",
            tone: "working",
          },
          {
            detail: "scrivendo test",
            elapsed: "2m",
            name: "payment-migration",
            tone: "working",
          },
        ],
        tone: "working",
      },
      {
        label: "Completati",
        rows: [
          {
            detail: "→ per tornare",
            elapsed: "0s",
            name: "test-coverage",
            tone: "complete",
          },
        ],
        tone: "complete",
      },
    ],
    statusLine: "2 in attesa · 4 in corso · 1 completato",
    theme: {
      accent: "oklch(0.58 0.12 236)",
      attention: "oklch(0.76 0.15 82)",
      complete: "oklch(0.64 0.16 150)",
      muted: "oklch(0.43 0.03 244)",
      panel: "oklch(0.94 0.01 236)",
      surface: "oklch(0.97 0.009 238)",
      text: "oklch(0.24 0.035 246)",
      working: "oklch(0.56 0.05 248)",
    },
    title: "Claude Code · Agents View",
  },
  sourceFolder: "",
};

export const DEFAULT_LINEAR_DIAGRAM_SPEC: OverlaySpec = {
  durationFrames: 180,
  fps: 30,
  overlay: {
    id: "timeline-processo-ai",
    kind: "diagram",
    moment: "Explain the AI workflow sequence",
    purpose: "Show a process or timeline with one active technical step",
    template: "linear-diagram",
  },
  projectTitle: "AllOnFire Linear Diagram",
  props: {
    activeIndex: 2,
    caption: "Recognizable tools, one active handoff.",
    eyebrow: "ai tool chain",
    orientation: "auto",
    placement: "center",
    steps: [
      {
        asset: "linear-diagram/chatgpt.svg",
        label: "ChatGPT",
        media: "tool",
        meta: "ask",
        status: "complete",
      },
      {
        asset: "linear-diagram/claude-code.svg",
        code: "claude code",
        label: "Claude Code",
        media: "code",
        meta: "agent",
        status: "complete",
      },
      {
        asset: "linear-diagram/codex.svg",
        label: "Codex",
        media: "image",
        meta: "active",
        status: "active",
      },
      {
        asset: "linear-diagram/anthropic.svg",
        code: "messages.create",
        label: "Anthropic",
        media: "code",
        meta: "api",
        status: "queued",
      },
      {
        asset: "linear-diagram/render-video.svg",
        label: "Render",
        media: "image",
        meta: "mp4",
        status: "queued",
      },
    ],
    theme: {
      accent: "oklch(0.69 0.19 48)",
      complete: "oklch(0.7 0.14 153)",
      info: "oklch(0.72 0.12 205)",
      line: "oklch(0.48 0.024 226 / 0.52)",
      muted: "oklch(0.71 0.023 82)",
      panel: "oklch(0.27 0.021 228)",
      surface: "oklch(0.17 0.018 238)",
      text: "oklch(0.92 0.018 78)",
      warning: "oklch(0.76 0.13 82)",
    },
    title: "AI tools in sequence",
  },
  sourceFolder: "",
};

export const DEFAULT_TUTORIAL_SHOWCASE_SPEC: OverlaySpec = {
  durationFrames: 180,
  fps: 30,
  overlay: {
    id: "atelier-zero-tutorial-kit",
    kind: "tutorial",
    moment: "Demonstrate reusable tutorial overlay blocks",
    purpose: "Show the v1 Atelier Zero tutorial overlay primitives",
    template: "tutorial-showcase",
  },
  projectTitle: "Atelier Zero Tutorial Overlay Kit",
  props: {
    activeStep: 1,
    caption: "One idea.",
    code: {
      command: "render",
      file: "overlay.tsx",
      lines: ["read(input)", "focus(point)", "show(result)"],
    },
    kicker: "focus",
    lowerThird: {
      eyebrow: "chapter",
      title: "Blocks",
    },
    mode: "fullscreen",
    sfxEnabled: true,
    title: "One clear signal.",
  },
  sourceFolder: "",
};

function tutorialPropsForMode(mode: "fullscreen" | "over-video") {
  const spec = tutorialShowcaseOverlaySpecSchema.parse(
    DEFAULT_TUTORIAL_SHOWCASE_SPEC
  );

  return {
    ...spec.props,
    mode,
  };
}

export const RemotionRoot: React.FC = () => {
  const tutorialFullscreenProps = tutorialPropsForMode("fullscreen");
  const tutorialOverVideoProps = tutorialPropsForMode("over-video");

  return (
    <>
      <Folder name="Basic-Components">
        <Folder name="Atoms">
          {tutorialAtomStories.flatMap((story) =>
            tutorialStoryAspects.map((aspect) => (
              <Composition
                component={TutorialStorybook}
                defaultProps={{ sfxEnabled: true, story: story.id }}
                durationInFrames={180}
                fps={30}
                height={aspect === "16x9" ? 1080 : 1920}
                id={tutorialStoryCompositionId(story, aspect)}
                key={tutorialStoryCompositionId(story, aspect)}
                width={aspect === "16x9" ? 1920 : 1080}
              />
            ))
          )}
        </Folder>
        <Folder name="Patterns">
          {tutorialPatternStories.flatMap((story) =>
            tutorialStoryAspects.map((aspect) => (
              <Composition
                component={TutorialStorybook}
                defaultProps={{ sfxEnabled: false, story: story.id }}
                durationInFrames={180}
                fps={30}
                height={aspect === "16x9" ? 1080 : 1920}
                id={tutorialStoryCompositionId(story, aspect)}
                key={tutorialStoryCompositionId(story, aspect)}
                width={aspect === "16x9" ? 1920 : 1080}
              />
            ))
          )}
        </Folder>
      </Folder>
      <Folder name="Tutorial-Showcase">
        <Composition
          component={TutorialShowcaseOverlay}
          defaultProps={tutorialFullscreenProps}
          durationInFrames={180}
          fps={30}
          height={1080}
          id={TUTORIAL_SHOWCASE_FULLSCREEN_LANDSCAPE_ID}
          schema={tutorialShowcasePropsSchema}
          width={1920}
        />
        <Composition
          component={TutorialShowcaseOverlay}
          defaultProps={tutorialFullscreenProps}
          durationInFrames={180}
          fps={30}
          height={1920}
          id={TUTORIAL_SHOWCASE_FULLSCREEN_PORTRAIT_ID}
          schema={tutorialShowcasePropsSchema}
          width={1080}
        />
        <Composition
          component={TutorialShowcaseOverlay}
          defaultProps={tutorialOverVideoProps}
          durationInFrames={180}
          fps={30}
          height={1080}
          id={TUTORIAL_SHOWCASE_OVER_VIDEO_LANDSCAPE_ID}
          schema={tutorialShowcasePropsSchema}
          width={1920}
        />
        <Composition
          component={TutorialShowcaseOverlay}
          defaultProps={tutorialOverVideoProps}
          durationInFrames={180}
          fps={30}
          height={1920}
          id={TUTORIAL_SHOWCASE_OVER_VIDEO_PORTRAIT_ID}
          schema={tutorialShowcasePropsSchema}
          width={1080}
        />
      </Folder>
    </>
  );
};
