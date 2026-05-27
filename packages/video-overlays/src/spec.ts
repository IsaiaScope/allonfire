import { z } from "zod";

export const rowToneSchema = z.enum(["attention", "working", "complete"]);

export const dashboardRowSchema = z.object({
  detail: z.string(),
  elapsed: z.string(),
  name: z.string(),
  tone: rowToneSchema,
});

export const dashboardSectionSchema = z.object({
  label: z.string(),
  rows: z.array(dashboardRowSchema),
  tone: rowToneSchema,
});

export const dashboardTriagePropsSchema = z.object({
  footerHints: z.array(z.string()),
  sections: z.array(dashboardSectionSchema),
  statusLine: z.string(),
  theme: z.object({
    accent: z.string(),
    attention: z.string(),
    complete: z.string(),
    muted: z.string(),
    panel: z.string(),
    surface: z.string(),
    text: z.string(),
    working: z.string(),
  }),
  title: z.string(),
});

export const linearStepStatusSchema = z.enum([
  "complete",
  "active",
  "queued",
  "warning",
]);

export const linearStepMediaSchema = z.enum(["code", "image", "tool"]);

export const linearDiagramStepSchema = z.object({
  accent: z.string().optional(),
  asset: z.string().optional(),
  code: z.string().optional(),
  label: z.string(),
  media: linearStepMediaSchema.optional(),
  meta: z.string().optional(),
  status: linearStepStatusSchema,
});

export const linearDiagramPropsSchema = z.object({
  activeIndex: z.number().int().nonnegative(),
  caption: z.string().optional(),
  eyebrow: z.string(),
  orientation: z.enum(["auto", "horizontal", "vertical"]),
  placement: z.enum(["top", "center", "side", "vertical-center"]),
  steps: z.array(linearDiagramStepSchema).min(2).max(7),
  theme: z.object({
    accent: z.string(),
    complete: z.string(),
    info: z.string(),
    line: z.string(),
    muted: z.string(),
    panel: z.string(),
    surface: z.string(),
    text: z.string(),
    warning: z.string(),
  }),
  title: z.string(),
});

export const tutorialSfxCueSchema = z.enum([
  "soft-whoosh",
  "paper-tick",
  "quiet-pop",
  "ui-click",
  "page-turn",
]);

export const generatedOverlaySfxSchema = z.union([
  tutorialSfxCueSchema,
  z.literal("none"),
]);

export const generatedOverlayAspectSchema = z.enum(["16x9", "9x16"]);

export const generatedOverlayDensitySchema = z.enum([
  "light",
  "medium",
  "rich",
]);

export const generatedOverlayMotionSchema = z.enum([
  "reveal",
  "build",
  "compare",
  "pulse",
  "type-on",
]);

export const generatedOverlayAspectConfigSchema = z.object({
  height: z.number().int().positive(),
  id: generatedOverlayAspectSchema,
  width: z.number().int().positive(),
});

export const generatedOverlayTemplateSchema = z.enum([
  "callout-card",
  "code-card",
  "dashboard-triage",
  "flow-diagram",
  "list-card",
  "table-card",
]);

export const generatedOverlayItemSchema = z.object({
  body: z.string(),
  density: generatedOverlayDensitySchema,
  durationSeconds: z.number().positive(),
  emphasis: z.string(),
  id: z.string(),
  kind: z.string(),
  moment: z.string(),
  motion: generatedOverlayMotionSchema,
  placementHint: z.string(),
  purpose: z.string(),
  sfx: generatedOverlaySfxSchema,
  startSeconds: z.number().nonnegative(),
  template: generatedOverlayTemplateSchema,
  title: z.string(),
});

export const generatedOverlayPackageSchema = z.object({
  aspects: z.array(generatedOverlayAspectConfigSchema).min(1),
  compositionRoot: z.string(),
  fps: z.number().int().positive(),
  overlays: z.array(generatedOverlayItemSchema),
  projectTitle: z.string(),
  renderer: z.literal("hyperframes"),
  source: z.object({
    durationSeconds: z.number().positive(),
    videoPath: z.string(),
  }),
});

export const dashboardOverlaySpecSchema = z.object({
  durationFrames: z.number().int().positive(),
  fps: z.number().int().positive(),
  overlay: z.object({
    id: z.string(),
    kind: z.string(),
    moment: z.string(),
    purpose: z.string(),
    template: z.literal("dashboard-triage"),
  }),
  projectTitle: z.string(),
  props: dashboardTriagePropsSchema,
  sourceFolder: z.string(),
});

export const linearDiagramOverlaySpecSchema = z.object({
  durationFrames: z.number().int().positive(),
  fps: z.number().int().positive(),
  overlay: z.object({
    id: z.string(),
    kind: z.string(),
    moment: z.string(),
    purpose: z.string(),
    template: z.literal("linear-diagram"),
  }),
  projectTitle: z.string(),
  props: linearDiagramPropsSchema,
  sourceFolder: z.string(),
});

export const overlaySpecSchema = z.union([
  dashboardOverlaySpecSchema,
  linearDiagramOverlaySpecSchema,
]);

export type DashboardTriageProps = z.infer<typeof dashboardTriagePropsSchema>;
export type DashboardSection = z.infer<typeof dashboardSectionSchema>;
export type DashboardRow = z.infer<typeof dashboardRowSchema>;
export type LinearDiagramProps = z.infer<typeof linearDiagramPropsSchema>;
export type LinearDiagramStep = z.infer<typeof linearDiagramStepSchema>;
export type TutorialSfxCue = z.infer<typeof tutorialSfxCueSchema>;
export type GeneratedOverlayAspect = z.infer<
  typeof generatedOverlayAspectSchema
>;
export type GeneratedOverlayAspectConfig = z.infer<
  typeof generatedOverlayAspectConfigSchema
>;
export type GeneratedOverlayDensity = z.infer<
  typeof generatedOverlayDensitySchema
>;
export type GeneratedOverlayItem = z.infer<typeof generatedOverlayItemSchema>;
export type GeneratedOverlayMotion = z.infer<
  typeof generatedOverlayMotionSchema
>;
export type GeneratedOverlaySfx = z.infer<typeof generatedOverlaySfxSchema>;
export type GeneratedOverlayPackage = z.infer<
  typeof generatedOverlayPackageSchema
>;
export type OverlaySpec = z.infer<typeof overlaySpecSchema>;
