import type React from "react";
import { Composition, Folder } from "remotion";
import { z } from "zod";
import { DashboardTriageOverlay } from "./dashboard-triage-overlay";
import { GeneratedOverlayClip } from "./generated-overlay";
import { LinearDiagramOverlay } from "./linear-diagram-overlay";
import type { OverlaySpec } from "./spec";
import {
  dashboardTriagePropsSchema,
  generatedOverlayItemSchema,
  linearDiagramPropsSchema,
} from "./spec";
import {
  TutorialStorybook,
  tutorialComponentStories,
  tutorialStoryAspects,
  tutorialStoryCompositionId,
  tutorialTemplateStories,
} from "./tutorial-storybook";

export const DASHBOARD_TRIAGE_LANDSCAPE_ID = "DashboardTriageOverlay16x9";
export const DASHBOARD_TRIAGE_PORTRAIT_ID = "DashboardTriageOverlay9x16";
export const LINEAR_DIAGRAM_LANDSCAPE_ID = "LinearDiagramOverlay16x9";
export const LINEAR_DIAGRAM_PORTRAIT_ID = "LinearDiagramOverlay9x16";
export const GENERATED_OVERLAY_CLIP_LANDSCAPE_ID = "GeneratedOverlayClip16x9";
export const GENERATED_OVERLAY_CLIP_PORTRAIT_ID = "GeneratedOverlayClip9x16";
const generatedOverlayClipPropsSchema = z.object({
  background: z.enum(["stage", "transparent"]).optional(),
  item: generatedOverlayItemSchema,
});

export function generatedOverlayCompositionId(aspect: "16x9" | "9x16") {
  return aspect === "16x9"
    ? GENERATED_OVERLAY_CLIP_LANDSCAPE_ID
    : GENERATED_OVERLAY_CLIP_PORTRAIT_ID;
}

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

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Generated">
        <Composition
          component={GeneratedOverlayClip}
          defaultProps={{
            item: {
              body: "**Overlay**",
              density: "medium",
              durationSeconds: 10,
              emphasis: "Sample emphasis",
              id: "sample",
              kind: "callout",
              moment: "Sample moment",
              motion: "reveal",
              placementHint: "Sample moment",
              purpose: "Preview a generated overlay",
              sfx: "soft-whoosh",
              startSeconds: 0,
              template: "callout-card",
              title: "Sample Overlay",
            },
          }}
          durationInFrames={300}
          fps={30}
          height={1080}
          id={GENERATED_OVERLAY_CLIP_LANDSCAPE_ID}
          schema={generatedOverlayClipPropsSchema}
          width={1920}
        />
        <Composition
          component={GeneratedOverlayClip}
          defaultProps={{
            item: {
              body: "**Overlay**",
              density: "medium",
              durationSeconds: 10,
              emphasis: "Sample emphasis",
              id: "sample",
              kind: "callout",
              moment: "Sample moment",
              motion: "reveal",
              placementHint: "Sample moment",
              purpose: "Preview a generated overlay",
              sfx: "soft-whoosh",
              startSeconds: 0,
              template: "callout-card",
              title: "Sample Overlay",
            },
          }}
          durationInFrames={300}
          fps={30}
          height={1920}
          id={GENERATED_OVERLAY_CLIP_PORTRAIT_ID}
          schema={generatedOverlayClipPropsSchema}
          width={1080}
        />
        <Composition
          component={DashboardTriageOverlay}
          defaultProps={DEFAULT_SPEC.props}
          durationInFrames={DEFAULT_SPEC.durationFrames}
          fps={DEFAULT_SPEC.fps}
          height={1080}
          id={DASHBOARD_TRIAGE_LANDSCAPE_ID}
          schema={dashboardTriagePropsSchema}
          width={1920}
        />
        <Composition
          component={DashboardTriageOverlay}
          defaultProps={DEFAULT_SPEC.props}
          durationInFrames={DEFAULT_SPEC.durationFrames}
          fps={DEFAULT_SPEC.fps}
          height={1920}
          id={DASHBOARD_TRIAGE_PORTRAIT_ID}
          schema={dashboardTriagePropsSchema}
          width={1080}
        />
        <Composition
          component={LinearDiagramOverlay}
          defaultProps={DEFAULT_LINEAR_DIAGRAM_SPEC.props}
          durationInFrames={DEFAULT_LINEAR_DIAGRAM_SPEC.durationFrames}
          fps={DEFAULT_LINEAR_DIAGRAM_SPEC.fps}
          height={1080}
          id={LINEAR_DIAGRAM_LANDSCAPE_ID}
          schema={linearDiagramPropsSchema}
          width={1920}
        />
        <Composition
          component={LinearDiagramOverlay}
          defaultProps={DEFAULT_LINEAR_DIAGRAM_SPEC.props}
          durationInFrames={DEFAULT_LINEAR_DIAGRAM_SPEC.durationFrames}
          fps={DEFAULT_LINEAR_DIAGRAM_SPEC.fps}
          height={1920}
          id={LINEAR_DIAGRAM_PORTRAIT_ID}
          schema={linearDiagramPropsSchema}
          width={1080}
        />
      </Folder>
      <Folder name="Components">
        {tutorialComponentStories.flatMap((story) =>
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
      <Folder name="Templates">
        {tutorialTemplateStories.flatMap((story) =>
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
    </>
  );
};
