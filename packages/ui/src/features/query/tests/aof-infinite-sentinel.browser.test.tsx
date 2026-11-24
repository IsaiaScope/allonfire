// @module-tag integration
import { render } from "vitest-browser-react";
import { AOFInfiniteSentinel } from "../components/aof-infinite-sentinel";

const TALL_PX = 4000;

/** A sentinel that is in view at once, as on a tall screen. */
const inView = (props: { disabled: boolean; onReach: () => void }) => (
  <AOFInfiniteSentinel {...props} />
);

/** A sentinel far below the fold: the page has to scroll to it. */
const belowTheFold = (props: { disabled: boolean; onReach: () => void }) => (
  <div>
    <div style={{ height: TALL_PX }} />
    <AOFInfiniteSentinel {...props} />
  </div>
);

afterEach(() => {
  window.scrollTo(0, 0);
});

describe("AOFInfiniteSentinel", () => {
  it("asks for the next page once when it is in view", async () => {
    const onReach = vi.fn();
    await render(inView({ disabled: false, onReach }));
    await vi.waitUntil(() => onReach.mock.calls.length === 1);
    expect(onReach).toHaveBeenCalledTimes(1);
  });

  it("asks for nothing while it is disabled", async () => {
    const onReach = vi.fn();
    await render(inView({ disabled: true, onReach }));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(onReach).not.toHaveBeenCalled();
  });

  it("asks when it is enabled while still in view: a tall screen after a page landed", async () => {
    const onReach = vi.fn();
    const screen = await render(inView({ disabled: true, onReach }));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(onReach).not.toHaveBeenCalled();
    await screen.rerender(inView({ disabled: false, onReach }));
    await vi.waitUntil(() => onReach.mock.calls.length === 1);
    expect(onReach).toHaveBeenCalledTimes(1);
  });

  it("asks again each time it is scrolled into view, and only while enabled", async () => {
    const onReach = vi.fn();
    const screen = await render(belowTheFold({ disabled: false, onReach }));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(onReach).not.toHaveBeenCalled();
    window.scrollTo(0, TALL_PX);
    await vi.waitUntil(() => onReach.mock.calls.length === 1);
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await screen.rerender(belowTheFold({ disabled: true, onReach }));
    window.scrollTo(0, TALL_PX);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(onReach).toHaveBeenCalledTimes(1);
  });
});
