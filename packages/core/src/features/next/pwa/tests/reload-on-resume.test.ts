// @module-tag unit
import { PWA } from "../constants/pwa";
import { reloadOnResume } from "../utils/reload-on-resume";

/** A page whose visibility and clock the test moves; `listeners` are what the helper registered. */
const setup = () => {
  const listeners = new Map<string, () => void>();
  const page = {
    addEventListener: (type: string, listener: () => void) =>
      listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type),
    visibilityState: "visible",
  };
  let time = 0;
  const reload = vi.fn();
  const stop = reloadOnResume({
    hiddenMs: PWA.DEV_RESUME.HIDDEN_MS,
    now: () => time,
    page,
    reload,
  });
  /** The page goes hidden or visible `after` ms later. */
  const change = (state: "hidden" | "visible", after: number) => {
    time += after;
    page.visibilityState = state;
    listeners.get("visibilitychange")?.();
  };
  return { change, listeners, reload, stop };
};

describe("reloadOnResume", () => {
  it("reloads a page that comes back after the hidden time", () => {
    const { change, reload } = setup();
    change("hidden", 0);
    change("visible", PWA.DEV_RESUME.HIDDEN_MS + 1);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("leaves a page that was hidden only briefly", () => {
    const { change, reload } = setup();
    change("hidden", 0);
    change("visible", PWA.DEV_RESUME.HIDDEN_MS);
    expect(reload).not.toHaveBeenCalled();
  });

  it("counts each hiding on its own", () => {
    const { change, reload } = setup();
    change("hidden", 0);
    change("visible", 1);
    change("hidden", PWA.DEV_RESUME.HIDDEN_MS * 5);
    change("visible", 1);
    expect(reload).not.toHaveBeenCalled();
  });

  it("does nothing for a visible event that no hiding came before", () => {
    const { change, reload } = setup();
    change("visible", PWA.DEV_RESUME.HIDDEN_MS * 5);
    expect(reload).not.toHaveBeenCalled();
  });

  it("stops listening when stopped", () => {
    const { listeners, stop } = setup();
    stop();
    expect(listeners.size).toBe(0);
  });
});
