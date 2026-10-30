// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFReadOnlyField } from "../aof-read-only-field";

const DISABLED_INPUT =
  /<input[^>]*disabled=""[^>]*value="ada@example.com"|<input[^>]*value="ada@example.com"[^>]*disabled=""/;
const TILE = /<span aria-hidden="true" class="[^"]*dark[^"]*bg-background/;

describe("AOFReadOnlyField", () => {
  const html = renderToStaticMarkup(
    <AOFReadOnlyField
      icon={<svg data-icon />}
      id="email"
      label="Email"
      value="ada@example.com"
    />
  );

  it("shows its value in a text field's box nobody can reach or edit, at full strength", () => {
    expect(html).toMatch(DISABLED_INPUT);
    expect(html).toContain("disabled:opacity-100");
    expect(html).toContain('for="email"');
    expect(html).toContain("h-(--field-height)");
  });

  it("opens on the text field's icon tile and keeps its rhythm, posting nothing", () => {
    expect(html).toMatch(TILE);
    expect(html).toContain("min-h-6");
    expect(html).not.toContain("name=");
  });
});
