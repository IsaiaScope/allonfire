// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFSeparator } from "../aof-separator";

describe("AOFSeparator", () => {
  it("renders shadcn's separator", () => {
    expect(renderToStaticMarkup(<AOFSeparator />)).toContain(
      'data-slot="separator"'
    );
  });
});
