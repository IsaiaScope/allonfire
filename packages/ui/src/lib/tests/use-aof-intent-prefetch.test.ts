// @module-tag unit
import { useAOFIntentPrefetch } from "../use-aof-intent-prefetch";

// The hook's one state, held here: Node renders no DOM to reach for, so
// each test reads what the hook asked for instead. A browser test of a
// link that spreads it covers the reach itself.
const state = vi.hoisted(() => ({ reached: false, set: vi.fn() }));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: () => [state.reached, state.set],
}));

beforeEach(() => {
  state.reached = false;
  state.set.mockClear();
});

describe("useAOFIntentPrefetch", () => {
  it("prefetches nothing of its own before intent", () => {
    expect(useAOFIntentPrefetch().prefetch).toBe(false);
  });

  it.each(["onFocus", "onPointerDown", "onPointerEnter"] as const)(
    "%s marks the link reached",
    (handler) => {
      useAOFIntentPrefetch()[handler]();
      expect(state.set).toHaveBeenCalledWith(true);
    }
  );

  it("prefetches the content behind its address once reached", () => {
    state.reached = true;
    expect(useAOFIntentPrefetch().prefetch).toBe(true);
  });
});
