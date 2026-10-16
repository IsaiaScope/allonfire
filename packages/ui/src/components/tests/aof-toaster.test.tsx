// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFToaster } from "../aof-toaster";

describe("AOFToaster", () => {
  it("renders the region toasts are announced in", () => {
    expect(renderToStaticMarkup(<AOFToaster />)).toContain(
      'aria-label="Notifications'
    );
  });
});
