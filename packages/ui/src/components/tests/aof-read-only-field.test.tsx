// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFReadOnlyField } from "../aof-read-only-field";

const DISABLED_INPUT =
  /<input[^>]*disabled=""[^>]*value="ada@example.com"|<input[^>]*value="ada@example.com"[^>]*disabled=""/;
const TILE = /<span aria-hidden="true"[^>]*><svg data-icon/;

describe("AOFReadOnlyField", () => {
  const html = renderToStaticMarkup(
    <AOFReadOnlyField
      icon={<svg data-icon />}
      id="email"
      label="Email"
      value="ada@example.com"
    />
  );

  it("shows its value, labelled, in an input nobody can reach or edit", () => {
    expect(html).toMatch(DISABLED_INPUT);
    expect(html).toContain('for="email"');
  });

  it("opens on the text field's icon tile, hidden from screen readers, posting nothing", () => {
    expect(html).toMatch(TILE);
    expect(html).not.toContain("name=");
  });
});
