// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFActionBar } from "../aof-action-bar";

const nothing = () => undefined;

// Open, the bar is a portal into the page, which only a browser draws: the
// Back Office's browser tests cover it open.
describe("AOFActionBar", () => {
  it("draws nothing while closed", () => {
    expect(
      renderToStaticMarkup(
        <AOFActionBar
          close="Clear selection"
          onOpenChange={nothing}
          open={false}
          selection="3 selected"
        >
          <span>Delete</span>
        </AOFActionBar>
      )
    ).toBe("");
  });
});
