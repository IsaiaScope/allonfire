// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFRadialMeter } from "../components/aof-radial-meter";

describe("AOFRadialMeter", () => {
  it("is one image named by what it counts", () => {
    const html = renderToStaticMarkup(
      <AOFRadialMeter
        aria-label="Today: 3 of 300"
        caption="of 300"
        color="var(--chart-1)"
        max={300}
        value={3}
      />
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Today: 3 of 300"');
    expect(html).toContain('data-slot="chart"');
  });

  it("passes the caller's props to the frame", () => {
    const html = renderToStaticMarkup(
      <AOFRadialMeter
        aria-label="Last 31 days: 4, no limit"
        caption="no limit"
        className="caller-class"
        color="var(--chart-2)"
        max={null}
        value={4}
      />
    );
    expect(html).toContain("caller-class");
  });
});
