// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFFreshOnReturn } from "../aof-fresh-on-return";

describe("AOFFreshOnReturn", () => {
  it("draws its children and nothing around them", () => {
    expect(
      renderToStaticMarkup(
        <AOFFreshOnReturn>
          <form aria-label="Add a User" />
        </AOFFreshOnReturn>
      )
    ).toBe('<form aria-label="Add a User"></form>');
  });
});
