// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFFaceted, type AOFFacetedLabels } from "../aof-faceted";

const ITEMS = [
  { label: "Laura", value: "laura" },
  { label: "Back Office", value: "back-office" },
] as const;
const LABELS: AOFFacetedLabels = {
  empty: "No Apps",
  placeholder: "All Apps",
  reset: "Reset",
  search: "Search Apps",
  trigger: "App",
};
const nothing = () => undefined;

describe("AOFFaceted", () => {
  it("draws the chosen label on its trigger", () => {
    const html = renderToStaticMarkup(
      <AOFFaceted
        items={ITEMS}
        labels={LABELS}
        onValueChange={nothing}
        value="laura"
      />
    );
    expect(html).toContain('aria-label="App"');
    expect(html).toContain("Laura");
    expect(html).not.toContain("All Apps");
  });

  it("draws the placeholder when none is chosen, never DiceUI's English", () => {
    const html = renderToStaticMarkup(
      <AOFFaceted
        items={ITEMS}
        labels={LABELS}
        onValueChange={nothing}
        value={null}
      />
    );
    expect(html).toContain("All Apps");
    expect(html).not.toContain("Select options");
  });
});
