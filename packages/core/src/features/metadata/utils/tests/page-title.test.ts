// @module-tag unit
import { SEPARATOR } from "../../../../shared/constants/separators";
import { pageTitle } from "../page-title";

describe("pageTitle", () => {
  it("puts the page first, then the App", () => {
    expect(pageTitle("Page not found", "Back Office")).toBe(
      `Page not found${SEPARATOR.TITLE}Back Office`
    );
  });

  it("joins them with an en dash, the separator the owner chose", () => {
    expect(pageTitle("Accedi", "Back Office")).toBe("Accedi – Back Office");
  });

  it("builds Next's title template from %s", () => {
    expect(pageTitle("%s", "Laura")).toBe(`%s${SEPARATOR.TITLE}Laura`);
  });
});
