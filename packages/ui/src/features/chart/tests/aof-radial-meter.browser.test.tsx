// @module-tag integration
import { render } from "vitest-browser-react";
import { AOFRadialMeter } from "../components/aof-radial-meter";

describe("AOFRadialMeter in a browser", () => {
  it("draws its track and its fill, the number in the middle", async () => {
    const screen = await render(
      <div className="flex flex-col items-center">
        <AOFRadialMeter
          aria-label="Today: 150 of 300"
          caption="of 300"
          color="var(--chart-1)"
          max={300}
          value={150}
        />
      </div>
    );
    const meter = screen.container.querySelector('[role="img"]');
    await expect
      .poll(() => meter?.querySelectorAll(".recharts-sector").length ?? 0)
      .toBeGreaterThan(1);
    expect(meter?.getBoundingClientRect().width).toBeGreaterThan(100);
    expect(meter?.textContent).toContain("150");
    expect(meter?.textContent).toContain("of 300");
  });
});
