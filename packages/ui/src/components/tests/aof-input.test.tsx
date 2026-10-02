// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFInput } from "../aof-input";

describe("AOFInput", () => {
  it("renders the shadcn input with its props", () => {
    const html = renderToStaticMarkup(
      <AOFInput autoComplete="username" name="email" type="email" />
    );
    expect(html).toContain('data-slot="input"');
    expect(html).toContain('type="email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('autoComplete="username"');
  });
});
