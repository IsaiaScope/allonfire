// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFServiceWorker } from "../aof-service-worker";
import { PWA } from "../constants/pwa";

const { register, Workbox } = vi.hoisted(() => {
  const registerMock = vi.fn(async () => undefined);
  // `new Workbox(...)`: a class, so the mock can be constructed.
  const WorkboxMock = vi.fn(
    class {
      register = registerMock;
    }
  );
  return { register: registerMock, Workbox: WorkboxMock };
});
vi.mock("workbox-window", () => ({ Workbox }));
// No DOM here: the effect runs during the server render instead.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void) => effect(),
}));

beforeEach(() => {
  vi.stubGlobal("navigator", { serviceWorker: {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AOFServiceWorker", () => {
  it("registers the App's worker when enabled, rendering nothing", () => {
    expect(renderToStaticMarkup(<AOFServiceWorker enabled />)).toBe("");
    expect(Workbox).toHaveBeenCalledWith(PWA.PATH.SERVICE_WORKER);
    expect(register).toHaveBeenCalledOnce();
  });

  // A worker under `next dev` would serve stale HMR files.
  it("registers nothing when disabled", () => {
    renderToStaticMarkup(<AOFServiceWorker enabled={false} />);
    expect(Workbox).not.toHaveBeenCalled();
  });

  it("registers nothing in a browser without service workers", () => {
    vi.stubGlobal("navigator", {});
    renderToStaticMarkup(<AOFServiceWorker enabled />);
    expect(Workbox).not.toHaveBeenCalled();
  });
});
