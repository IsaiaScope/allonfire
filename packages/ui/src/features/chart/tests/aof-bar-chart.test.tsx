// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFBarChart } from "../components/aof-bar-chart";
import { barChartHeight } from "../utils/bar-chart-height";

const SERIES = [
  { color: "var(--chart-1)", key: "public", label: "Public" },
  { color: "var(--chart-2)", key: "private", label: "Private" },
] as const;

describe("AOFBarChart", () => {
  it("is one image named by what it shows", () => {
    const html = renderToStaticMarkup(
      <AOFBarChart
        aria-label="Bytes per App"
        category="app"
        data={[{ app: "laura", private: 3, public: 1 }]}
        emptyLabel="Nothing stored"
        series={SERIES}
      />
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Bytes per App"');
  });

  it("shows emptyLabel and no chart when there is no row", () => {
    const html = renderToStaticMarkup(
      <AOFBarChart
        aria-label="Bytes per App"
        category="app"
        data={[]}
        emptyLabel="Nothing stored"
        series={SERIES}
      />
    );
    expect(html).toContain("Nothing stored");
    expect(html).not.toContain('data-slot="chart"');
  });

  it("shows emptyLabel when every value is 0", () => {
    const html = renderToStaticMarkup(
      <AOFBarChart
        aria-label="Bytes per App"
        category="app"
        data={[{ app: "laura", private: 0, public: 0 }]}
        emptyLabel="Nothing stored"
        series={SERIES}
      />
    );
    expect(html).toContain("Nothing stored");
    expect(html).not.toContain('data-slot="chart"');
  });
});

describe("barChartHeight", () => {
  it("is the height the chart draws at, for its rows and its bars per row", () => {
    const html = renderToStaticMarkup(
      <AOFBarChart
        aria-label="Stored"
        category="app"
        data={[
          { app: "Laura", private: 1, public: 2 },
          { app: "Back Office", private: 3, public: 4 },
        ]}
        emptyLabel="Nothing"
        series={SERIES}
      />
    );
    expect(html).toContain(`height:${barChartHeight(2, SERIES.length)}px`);
  });
});
