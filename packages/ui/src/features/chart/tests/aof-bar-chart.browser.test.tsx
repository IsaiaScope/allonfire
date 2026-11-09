// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFBarChart } from "../components/aof-bar-chart";

const SERIES = [
  { color: "var(--chart-1)", key: "public", label: "Public" },
  { color: "var(--chart-2)", key: "private", label: "Private" },
] as const;
const DATA = [
  { app: "Laura", private: 300, public: 50 },
  { app: "Back Office", private: 120, public: 0 },
] as const;

const WHOLE_NUMBER = /^\d+$/;
const inMegabytes = (value: number) => `${(value / 1_048_576).toFixed(2)} MB`;
const inBytes = (value: number) => `${value} B`;

describe("AOFBarChart in a browser", () => {
  it("draws a bar per value, a legend entry per series and formatted ticks", async () => {
    const screen = await render(
      <div className="h-64 w-120">
        <AOFBarChart
          aria-label="Bytes per App"
          category="app"
          data={DATA}
          emptyLabel="Nothing stored"
          series={SERIES}
          valueFormat={inBytes}
        />
      </div>
    );
    const chart = screen.container.querySelector('[role="img"]');
    await expect
      .poll(
        () => chart?.querySelectorAll(".recharts-bar-rectangle").length ?? 0
      )
      .toBeGreaterThanOrEqual(3);
    expect(chart?.textContent).toContain("Public");
    expect(chart?.textContent).toContain("Private");
    expect(chart?.textContent).toContain("Laura");
    expect(chart?.textContent).toContain(" B");
  });

  it("lays the bars out horizontally, longer for a bigger value", async () => {
    const screen = await render(
      <div className="w-120">
        <AOFBarChart
          aria-label="Bytes per App"
          category="app"
          data={DATA}
          emptyLabel="Nothing stored"
          series={SERIES}
        />
      </div>
    );
    const widthsOf = () =>
      [
        ...screen.container.querySelectorAll(
          ".recharts-bar-rectangle path, .recharts-bar-rectangle rect"
        ),
      ].map((bar) => bar.getBoundingClientRect().width);
    // Private bars: 300 for Laura, 120 for Back Office; their lengths follow.
    await expect.poll(() => widthsOf().length).toBeGreaterThanOrEqual(3);
    const [first = 0, second = 0] = widthsOf().sort((a, b) => b - a);
    expect(first).toBeGreaterThan(second);
  });
});

describe("AOFBarChart sizing in a browser", () => {
  it("grows taller with every row, so more Apps scale vertically", async () => {
    const rows = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        app: `App ${index}`,
        private: 10,
        public: 10,
      }));
    const heightOf = async (count: number) => {
      const screen = await render(
        <div className="w-120">
          <AOFBarChart
            aria-label="Bytes per App"
            category="app"
            data={rows(count)}
            emptyLabel="Nothing stored"
            series={SERIES}
          />
        </div>
      );
      const chart = screen.container.querySelector('[role="img"]');
      const height = chart?.getBoundingClientRect().height ?? 0;
      await screen.unmount();
      return height;
    };
    expect(await heightOf(6)).toBeGreaterThan(await heightOf(2));
  });

  it("keeps the value ticks apart on a phone", async () => {
    const screen = await render(
      <div className="w-75">
        <AOFBarChart
          aria-label="Bytes per App"
          category="app"
          data={[{ app: "Laura", private: 90_000, public: 150_000 }]}
          emptyLabel="Nothing stored"
          series={SERIES}
          valueFormat={inMegabytes}
        />
      </div>
    );
    const ticks = () =>
      [...screen.container.querySelectorAll(".recharts-xAxis-tick-labels text")]
        .map((tick) => tick.getBoundingClientRect())
        .sort((a, b) => a.left - b.left);
    await expect.poll(() => ticks().length).toBeGreaterThanOrEqual(2);
    const rects = ticks();
    for (const [index, rect] of rects.entries()) {
      const next = rects[index + 1];
      if (next) {
        expect(next.left - rect.right).toBeGreaterThanOrEqual(16);
      }
    }
  });
});

describe("AOFBarChart labels in a browser", () => {
  it("reads its axis values in the foreground colour, a size up on a wide screen", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.DESKTOP.WIDTH,
      SCREEN.VIEWPORT.DESKTOP.HEIGHT
    );
    const screen = await render(
      <div className="w-120 text-foreground">
        <AOFBarChart
          aria-label="Bytes per App"
          category="app"
          data={DATA}
          emptyLabel="Nothing stored"
          series={SERIES}
          valueFormat={inBytes}
        />
      </div>
    );
    const probe = screen.container.firstElementChild;
    const ticks = () => [
      ...screen.container.querySelectorAll(
        ".recharts-cartesian-axis-tick-label text"
      ),
    ];
    await expect
      .poll(
        () =>
          screen.container.querySelectorAll(".recharts-bar-rectangle").length
      )
      .toBeGreaterThan(0);
    expect(ticks().length).toBeGreaterThan(0);
    if (!probe) {
      throw new Error("the probe is missing");
    }
    const ink = getComputedStyle(probe).color;
    for (const tick of ticks()) {
      expect(getComputedStyle(tick).fill).toBe(ink);
      expect(
        Number.parseFloat(getComputedStyle(tick).fontSize)
      ).toBeGreaterThanOrEqual(14);
    }
  });

  it("turns the App names sideways on a phone, so the bars get the room", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    const screen = await render(
      <div className="w-90">
        <AOFBarChart
          aria-label="Bytes per App"
          category="app"
          data={DATA}
          emptyLabel="Nothing stored"
          series={SERIES}
        />
      </div>
    );
    await expect
      .poll(
        () =>
          screen.container.querySelectorAll(".recharts-bar-rectangle").length
      )
      .toBeGreaterThan(0);
    const names = [
      ...screen.container.querySelectorAll(".recharts-yAxis-tick-labels text"),
    ];
    expect(names.map(({ textContent }) => textContent)).toEqual([
      "Laura",
      "Back Office",
    ]);
    const svgLeft =
      screen.container.querySelector("svg")?.getBoundingClientRect().left ?? 0;
    for (const name of names) {
      expect(name.getAttribute("transform")).toContain("rotate(-90");
      // Inside the chart's own edge, or the SVG cuts the name off.
      expect(name.getBoundingClientRect().left).toBeGreaterThanOrEqual(svgLeft);
    }
    const container = screen.container.getBoundingClientRect();
    const firstBar = screen.container
      .querySelector(".recharts-bar-rectangle")
      ?.getBoundingClientRect();
    // Room for a turned name (one line of text), not a word's width.
    expect((firstBar?.left ?? 0) - container.left).toBeLessThan(48);
  });

  it("keeps the value ticks whole numbers when the values are counts", async () => {
    const screen = await render(
      <div className="w-120">
        <AOFBarChart
          aria-label="Users per App"
          category="app"
          data={[
            { app: "Laura", users: 1 },
            { app: "Back Office", users: 1 },
          ]}
          emptyLabel="No Users"
          series={[{ color: "var(--chart-1)", key: "users", label: "Users" }]}
          wholeValues
        />
      </div>
    );
    const ticks = () =>
      [
        ...screen.container.querySelectorAll(
          ".recharts-xAxis-tick-labels text"
        ),
      ].map((tick) => tick.textContent ?? "");
    await expect.poll(() => ticks().length).toBeGreaterThanOrEqual(2);
    for (const tick of ticks()) {
      expect(tick).toMatch(WHOLE_NUMBER);
    }
  });
});
