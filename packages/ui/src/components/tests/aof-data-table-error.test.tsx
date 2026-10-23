// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFDataTableError } from "../aof-data-table-error";

const RETRY_BUTTON = /<button[^>]*>Try again<\/button>/;
const nothing = () => undefined;

describe("AOFDataTableError", () => {
  it("says what failed and offers to try again", () => {
    const html = renderToStaticMarkup(
      <AOFDataTableError
        description="Check the connection."
        onRetry={nothing}
        retry="Try again"
        title="Could not load"
      />
    );
    expect(html).toContain("<h2");
    expect(html).toContain("Could not load");
    expect(html).toContain("Check the connection.");
    expect(html).toMatch(RETRY_BUTTON);
  });
});
