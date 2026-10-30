// @module-tag unit

/** Chrome's `beforeinstallprompt`, as a test can dispatch it. */
const promptEvent = () =>
  Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: async () => undefined,
    userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
  });

// The store listens from the moment its module loads, on the page's window.
const load = async () => {
  vi.resetModules();
  vi.stubGlobal("window", new EventTarget());
  return await import("../install-prompt");
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("install prompt", () => {
  it("keeps the browser's prompt for the Install button, holding back the browser's own", async () => {
    const { installPrompt, subscribeInstallPrompt } = await load();
    const listener = vi.fn();
    subscribeInstallPrompt(listener);
    const event = promptEvent();
    window.dispatchEvent(event);
    expect(installPrompt()).toBe(event);
    expect(event.defaultPrevented).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("forgets it once the App is installed", async () => {
    const { installPrompt } = await load();
    window.dispatchEvent(promptEvent());
    window.dispatchEvent(new Event("appinstalled"));
    expect(installPrompt()).toBeNull();
  });

  it("ignores an event that carries no prompt", async () => {
    const { installPrompt } = await load();
    window.dispatchEvent(new Event("beforeinstallprompt"));
    expect(installPrompt()).toBeNull();
  });

  it("stops telling a listener that unsubscribed", async () => {
    const { subscribeInstallPrompt } = await load();
    const listener = vi.fn();
    subscribeInstallPrompt(listener)();
    window.dispatchEvent(promptEvent());
    expect(listener).not.toHaveBeenCalled();
  });
});
