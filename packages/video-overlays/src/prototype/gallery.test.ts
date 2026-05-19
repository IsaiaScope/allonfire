import { describe, expect, it } from "vitest";
import { archetypes, exportTargets } from "./gallery-data";
import { renderGalleryHtml } from "./gallery-render";

describe("HTML overlay prototype gallery", () => {
  it("includes the first AI-tool explainer archetype pack", () => {
    expect(archetypes.map((archetype) => archetype.id)).toEqual([
      "dashboard-triage",
      "terminal-code",
      "process-flow",
      "linear-diagram",
      "before-after",
      "decision-matrix",
      "concept-map",
    ]);
  });

  it("exports every archetype in both aspect ratios and preview modes", () => {
    expect(exportTargets()).toHaveLength(28);
    expect(exportTargets()).toContainEqual(
      expect.objectContaining({
        archetype: "dashboard-triage",
        fileName: "dashboard-triage-16x9-standalone.png",
        format: "16x9",
        mode: "standalone",
      })
    );
  });

  it("renders a self-contained interactive HTML gallery", () => {
    const html = renderGalleryHtml();

    expect(html).toContain("AllOnFire overlay mockups");
    expect(html).toContain("Linear Diagram");
    expect(html).toContain("overlay-linear-diagram");
    expect(html).toContain("impact-stage");
    expect(html).toContain('data-filter-format="16x9"');
    expect(html).toContain('data-filter-mode="over-video"');
    expect(html.match(/class="stage /g)).toHaveLength(28);
  });
});
