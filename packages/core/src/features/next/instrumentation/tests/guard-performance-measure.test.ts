// @module-tag unit
import { guardPerformanceMeasure } from "../guard-performance-measure";

const NEGATIVE = new TypeError(
  "Failed to execute 'measure' on 'Performance': 'CatchAll [Prerender]' cannot have a negative time stamp."
);

const target = (fail?: Error) => {
  const measure = vi.fn<Performance["measure"]>((_name, options) => {
    if (fail && typeof options === "object" && options.start !== 0) {
      throw fail;
    }
    return globalThis.performance.measure("fake", { duration: 0, start: 0 });
  });
  const performance = { measure };
  guardPerformanceMeasure(performance);
  return { measure, performance };
};

describe("guardPerformanceMeasure", () => {
  it("records a negative measure as zero length instead of throwing", () => {
    const { measure, performance } = target(NEGATIVE);
    expect(() =>
      performance.measure("CatchAll [Prerender]", { start: -1 })
    ).not.toThrow();
    expect(measure).toHaveBeenLastCalledWith("CatchAll [Prerender]", {
      duration: 0,
      start: 0,
    });
  });

  it("still throws any other error", () => {
    const { performance } = target(new TypeError("mark 'x' does not exist"));
    expect(() => performance.measure("x", { start: 5 })).toThrow(
      "does not exist"
    );
  });

  it("passes a valid measure straight through", () => {
    const { measure, performance } = target();
    performance.measure("ok", { start: 1 });
    expect(measure).toHaveBeenCalledWith("ok", { start: 1 }, undefined);
  });
});
