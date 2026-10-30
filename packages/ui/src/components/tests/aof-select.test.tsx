// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFSelect, AOFSelectTrigger, AOFSelectValue } from "../aof-select";

describe("AOFSelect", () => {
  it("draws shadcn's trigger with the chosen value and the caller's classes", () => {
    const html = renderToStaticMarkup(
      <AOFSelect value="laura">
        <AOFSelectTrigger aria-label="App" className="w-40">
          <AOFSelectValue />
        </AOFSelectTrigger>
      </AOFSelect>
    );
    expect(html).toContain('data-slot="select-trigger"');
    expect(html).toContain("w-40");
    expect(html).toContain('aria-label="App"');
  });
});
