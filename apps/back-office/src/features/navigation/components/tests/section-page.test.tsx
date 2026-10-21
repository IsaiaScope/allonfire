// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { SectionPage } from "../section-page";

describe("SectionPage", () => {
  it("keeps the bottom edge clear of the home indicator", () => {
    expect(renderToStaticMarkup(<SectionPage>Users</SectionPage>)).toContain(
      "pb-(--gutter-bottom)"
    );
  });
});
