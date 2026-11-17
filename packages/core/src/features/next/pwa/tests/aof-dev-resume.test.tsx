// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFDevResume } from "../components/aof-dev-resume";

const { reloadOnResume } = vi.hoisted(() => ({ reloadOnResume: vi.fn() }));
vi.mock("../utils/reload-on-resume", () => ({ reloadOnResume }));
// No DOM here: the effect runs during the server render instead.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void) => effect(),
}));

const unregister = vi.fn(async () => true);

beforeEach(() => {
  vi.stubGlobal("document", {});
  vi.stubGlobal("location", { reload: vi.fn() });
  vi.stubGlobal("navigator", {
    serviceWorker: { getRegistrations: async () => [{ unregister }] },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AOFDevResume", () => {
  it("watches for the page's return and drops leftover workers, rendering nothing", async () => {
    expect(renderToStaticMarkup(<AOFDevResume />)).toBe("");
    expect(reloadOnResume).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(unregister).toHaveBeenCalledOnce());
  });

  it("reports a worker it could not drop", async () => {
    const failure = new Error("blocked");
    const report = vi.fn();
    vi.stubGlobal("reportError", report);
    vi.stubGlobal("navigator", {
      serviceWorker: { getRegistrations: () => Promise.reject(failure) },
    });
    renderToStaticMarkup(<AOFDevResume />);
    await vi.waitFor(() => expect(report).toHaveBeenCalledWith(failure));
  });

  it("still watches in a browser without service workers", () => {
    vi.stubGlobal("navigator", {});
    renderToStaticMarkup(<AOFDevResume />);
    expect(reloadOnResume).toHaveBeenCalledOnce();
  });
});
