export const aspectFormats = [
  {
    height: 1080,
    id: "16x9",
    label: "16:9",
    width: 1920,
  },
  {
    height: 1920,
    id: "9x16",
    label: "9:16",
    width: 1080,
  },
] as const;

export const previewModes = [
  {
    id: "standalone",
    label: "Standalone",
  },
  {
    id: "over-video",
    label: "Over video",
  },
] as const;

export const archetypes = [
  {
    id: "dashboard-triage",
    label: "Dashboard Triage",
    summary: "Agent queues, status clusters, and live work distribution.",
  },
  {
    id: "terminal-code",
    label: "Terminal / Code Moment",
    summary: "CLI command, output, file target, and one highlighted decision.",
  },
  {
    id: "process-flow",
    label: "Process Flow",
    summary: "A local pipeline, one step active, one output per step.",
  },
  {
    id: "linear-diagram",
    label: "Linear Diagram",
    summary: "A large active tool handoff with local brand evidence.",
  },
  {
    id: "before-after",
    label: "Before / After Comparison",
    summary:
      "Old workflow against new workflow, with the turning point visible.",
  },
  {
    id: "decision-matrix",
    label: "Decision Matrix",
    summary: "Tradeoffs between tools, approaches, or implementation paths.",
  },
  {
    id: "concept-map",
    label: "Concept Map",
    summary: "One central idea surrounded by connected practical implications.",
  },
] as const;

export type ArchetypeId = (typeof archetypes)[number]["id"];
export type AspectFormatId = (typeof aspectFormats)[number]["id"];
export type PreviewModeId = (typeof previewModes)[number]["id"];

export type ExportTarget = {
  archetype: ArchetypeId;
  fileName: string;
  format: AspectFormatId;
  height: number;
  mode: PreviewModeId;
  width: number;
};

export function exportTargets(): ExportTarget[] {
  return archetypes.flatMap((archetype) =>
    aspectFormats.flatMap((format) =>
      previewModes.map((mode) => ({
        archetype: archetype.id,
        fileName: `${archetype.id}-${format.id}-${mode.id}.png`,
        format: format.id,
        height: format.height,
        mode: mode.id,
        width: format.width,
      }))
    )
  );
}
