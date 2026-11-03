// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFFaceted, type AOFFacetedLabels } from "../components/aof-faceted";

const ROLES = [
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
  { label: "Viewer", value: "viewer" },
] as const;
const LABELS: AOFFacetedLabels = {
  add: "Add",
  clear: "Clear the text",
  empty: "No match",
  reset: "Clear",
  search: "Search",
  selected: (count) => `${count} selected`,
  trigger: "Role",
};
const nothing = () => undefined;

const markup = (value: readonly ("admin" | "user" | "viewer")[]) =>
  renderToStaticMarkup(
    <AOFFaceted
      items={ROLES}
      labels={LABELS}
      onValueChange={nothing}
      value={value}
    />
  );

describe("AOFFaceted", () => {
  it("names the list and draws each chosen value as a badge, up to two", () => {
    const html = markup(["admin", "viewer"]);
    expect(html).toContain(">Role<");
    expect(html.match(/data-slot="faceted-badge"/g)).toHaveLength(2);
    expect(html).toContain("Admin");
    expect(html).toContain("Viewer");
  });

  it("counts the values once more than two are chosen", () => {
    const html = markup(["admin", "user", "viewer"]);
    expect(html.match(/data-slot="faceted-badge"/g)).toHaveLength(1);
    expect(html).toContain("3 selected");
  });

  it("names only the list when none is chosen, never DiceUI's English", () => {
    const html = markup([]);
    expect(html).toContain(">Role<");
    expect(html).not.toContain('data-slot="faceted-badge"');
    expect(html).not.toContain("Select options");
  });

  it("puts a tip on the plus as on the cross, so either icon is named", () => {
    expect(markup([])).toContain('data-slot="tooltip-trigger"');
    expect(markup(["admin"])).toContain('data-slot="tooltip-trigger"');
  });
});
