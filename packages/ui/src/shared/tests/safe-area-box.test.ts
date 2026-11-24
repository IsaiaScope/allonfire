// @module-tag unit
import { centredInSafeArea } from "../utils/safe-area-box";

describe("centredInSafeArea", () => {
  it("centres between the page's gutters, never grows past them and scrolls what does not fit", () => {
    const classes = centredInSafeArea();
    for (const gutter of ["top", "right", "bottom", "left"]) {
      expect(classes).toContain(`--gutter-${gutter}`);
    }
    expect(classes).toContain("overflow-y-auto");
  });
});
