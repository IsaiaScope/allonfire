import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { METADATA } from "../../../metadata/constants/metadata";
import { PWA } from "../../pwa/constants/pwa";

const IT = "/it";
const { PATH } = METADATA;

/**
 * The cases every App's proxy matcher answers the same way: its pages go
 * through the proxy (with and without a language), and Next's generated
 * metadata routes, files with a dot, the Offline page's prefixed address
 * and the API skip it. An App's `proxy.test.ts` is one call, with the pages
 * it adds; the matcher itself stays a literal in its `proxy.ts`, which Next
 * reads statically.
 */
export const proxyMatcherSuite = ({
  config,
  pages,
}: {
  config: Parameters<typeof unstable_doesMiddlewareMatch>[0]["config"];
  /** The App's own pages, at their un-prefixed paths. */
  pages: readonly string[];
}) => {
  const matches = (url: string) =>
    unstable_doesMiddlewareMatch({ config, url });

  describe("proxy matcher", () => {
    it.each([
      PATH.ROOT,
      IT,
      ...pages,
      ...pages.map((page) => `${IT}${page}`),
      // A page whose name only starts like a metadata file is still a page.
      `${PATH.ICON}s`,
      `${PATH.ICON}ic`,
      // With no language, the proxy picks the visitor's.
      PWA.PATH.OFFLINE,
    ])("routes the page %s", (url) => {
      expect(matches(url)).toBe(true);
    });

    it.each([
      PATH.ICON,
      PATH.APPLE_ICON,
      PATH.OPENGRAPH_IMAGE,
      `/en${PATH.OPENGRAPH_IMAGE}`,
      `${IT}${PATH.TWITTER_IMAGE}`,
      // Next appends a hash or an image id to generated images.
      `${PATH.OPENGRAPH_IMAGE}-abc123`,
      `${PATH.OPENGRAPH_IMAGE}/anyid`,
      `${IT}${PATH.TWITTER_IMAGE}/anyid`,
      PATH.MANIFEST,
      PATH.ROBOTS,
      PATH.FAVICON,
      `${PATH.LAUNCH_SCREEN}/any-screen.png`,
      "/_next/static/chunk.js",
      // The worker precaches each language's Offline page at its prefixed
      // address; the locale proxy would redirect `/en/offline` to `/offline`.
      `/en${PWA.PATH.OFFLINE}`,
      `${IT}${PWA.PATH.OFFLINE}`,
      "/api/health",
    ])("leaves the file %s to Next", (url) => {
      expect(matches(url)).toBe(false);
    });
  });
};
