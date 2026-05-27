import { describe, expect, it } from "vitest";
import {
  dashboardOverlaySpecSchema,
  generatedOverlayPackageSchema,
  linearDiagramOverlaySpecSchema,
} from "./spec";

describe("overlay spec", () => {
  it("accepts the default dashboard triage template props", () => {
    const spec = dashboardOverlaySpecSchema.parse({
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
        footerHints: ["invio per aprire"],
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
            ],
            tone: "working",
          },
          {
            label: "Completati",
            rows: [
              {
                detail: "finito",
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
    });

    expect(spec.overlay.template).toBe("dashboard-triage");
    expect(spec.props.sections.map((section) => section.label)).toEqual([
      "Da rispondere",
      "In corso",
      "Completati",
    ]);
  });

  it("accepts the default linear diagram template props", () => {
    const spec = linearDiagramOverlaySpecSchema.parse({
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
        eyebrow: "ai tool chain",
        orientation: "auto",
        placement: "center",
        steps: [
          {
            label: "ChatGPT",
            status: "complete",
          },
          {
            label: "Claude Code",
            status: "complete",
          },
          {
            label: "Codex",
            status: "active",
          },
          {
            label: "Anthropic",
            status: "queued",
          },
          {
            label: "Render",
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
    });

    expect(spec.overlay.template).toBe("linear-diagram");
    expect(spec.props.steps.map((step) => step.label)).toEqual([
      "ChatGPT",
      "Claude Code",
      "Codex",
      "Anthropic",
      "Render",
    ]);
  });

  it("accepts generated overlay render packages", () => {
    const spec = generatedOverlayPackageSchema.parse({
      aspects: [{ height: 1080, id: "16x9", width: 1920 }],
      compositionRoot: "/tmp/project/overlays/compositions",
      fps: 30,
      overlays: [
        {
          body: "**Hello**",
          density: "medium",
          durationSeconds: 10,
          emphasis: "Hello",
          id: "hello",
          kind: "callout",
          moment: "opening",
          motion: "reveal",
          placementHint: "opening",
          purpose: "orient the viewer",
          sfx: "soft-whoosh",
          startSeconds: 12,
          template: "callout-card",
          title: "Hello",
        },
      ],
      projectTitle: "Project",
      renderer: "hyperframes",
      source: {
        durationSeconds: 120,
        videoPath: "/tmp/source.mp4",
      },
    });

    expect(spec.overlays[0].template).toBe("callout-card");
    expect(spec.aspects[0].id).toBe("16x9");
    expect(spec.compositionRoot).toBe("/tmp/project/overlays/compositions");
    expect(spec.renderer).toBe("hyperframes");
  });

  it("rejects generated overlay packages for unknown renderers", () => {
    expect(() =>
      generatedOverlayPackageSchema.parse({
        aspects: [{ height: 1080, id: "16x9", width: 1920 }],
        compositionRoot: "/tmp/project/overlays/compositions",
        fps: 30,
        overlays: [],
        projectTitle: "Project",
        renderer: "remotion",
        source: {
          durationSeconds: 120,
          videoPath: "/tmp/source.mp4",
        },
      })
    ).toThrow();
  });

  it("rejects unknown generated overlay sound cues", () => {
    expect(() =>
      generatedOverlayPackageSchema.parse({
        aspects: [{ height: 1080, id: "16x9", width: 1920 }],
        compositionRoot: "/tmp/project/overlays/compositions",
        fps: 30,
        overlays: [
          {
            body: "**Hello**",
            density: "medium",
            durationSeconds: 10,
            emphasis: "Hello",
            id: "hello",
            kind: "callout",
            moment: "opening",
            motion: "reveal",
            placementHint: "opening",
            purpose: "orient the viewer",
            sfx: "big-hit",
            startSeconds: 12,
            template: "callout-card",
            title: "Hello",
          },
        ],
        projectTitle: "Project",
        renderer: "hyperframes",
        source: {
          durationSeconds: 120,
          videoPath: "/tmp/source.mp4",
        },
      })
    ).toThrow();
  });
});
