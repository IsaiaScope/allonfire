// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFCheckbox } from "../components/aof-checkbox";

describe("AOFCheckbox", () => {
  it("marks an indeterminate state for assistive tech", () => {
    const html = renderToStaticMarkup(
      <AOFCheckbox aria-label="Select all" indeterminate />
    );
    expect(html).toContain('aria-checked="mixed"');
  });

  it("names itself", () => {
    expect(
      renderToStaticMarkup(<AOFCheckbox aria-label="Select Ada" checked />)
    ).toContain('aria-label="Select Ada"');
  });
});
