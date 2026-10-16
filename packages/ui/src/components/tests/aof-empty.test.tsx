// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFEmpty } from "../aof-empty";

describe("AOFEmpty", () => {
  it("heads the empty state and says what will fill it", () => {
    const html = renderToStaticMarkup(
      <AOFEmpty description="Arrives later." icon={<svg />} title="Nothing" />
    );
    expect(html).toContain("<h2");
    expect(html).toContain("Nothing");
    expect(html).toContain("Arrives later.");
    expect(html).toContain('data-slot="empty"');
  });

  it("passes the caller's props to the frame", () => {
    const html = renderToStaticMarkup(
      <AOFEmpty
        className="p-2"
        data-state="idle"
        description="d"
        icon={<svg />}
        title="t"
      />
    );
    expect(html).toContain("p-2");
    expect(html).toContain('data-state="idle"');
  });
});
