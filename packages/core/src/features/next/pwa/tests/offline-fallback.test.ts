// @module-tag unit
import { PWA } from "../constants/pwa";
import { offlineFallback } from "../offline-fallback";

const ORIGIN = "https://example.test";
const EN_PAGE = new Response("en");
const IT_PAGE = new Response("it");
const cached = new Map([
  [`/en${PWA.PATH.OFFLINE}`, EN_PAGE],
  [`/it${PWA.PATH.OFFLINE}`, IT_PAGE],
]);

beforeEach(() => {
  globalThis.AOF_PWA = { defaultLanguage: "en", offline: PWA.PATH.OFFLINE };
  vi.stubGlobal("caches", {
    match: async (url: string) => cached.get(url),
  });
});

afterEach(() => {
  globalThis.AOF_PWA = undefined;
  vi.unstubAllGlobals();
});

const failedLoad = (path: string) =>
  offlineFallback({ request: new Request(`${ORIGIN}${path}`) });

describe("offlineFallback", () => {
  it("answers with the Offline page of the URL's language", async () => {
    expect(await failedLoad("/it/sign-in")).toBe(IT_PAGE);
  });

  it("answers a URL with no language with the default language's", async () => {
    expect(await failedLoad("/sign-in")).toBe(EN_PAGE);
    expect(await failedLoad(PWA.PATH.OFFLINE)).toBe(EN_PAGE);
  });

  it("answers an unknown first segment with the default language's", async () => {
    expect(await failedLoad("/does-not-exist/deeper")).toBe(EN_PAGE);
  });

  it("answers nothing before the build's settings are there", async () => {
    globalThis.AOF_PWA = undefined;
    expect(await failedLoad("/it/sign-in")).toBeUndefined();
  });

  // Workbox writes the plugin's source text into sw.js, without its module:
  // a reference to an import would be undefined there.
  it("works from its own source text, as the generated worker runs it", async () => {
    const copy = new Function(`return (${offlineFallback.toString()});`)();
    expect(await copy({ request: new Request(`${ORIGIN}/it/sign-in`) })).toBe(
      IT_PAGE
    );
  });
});
