// @module-tag unit

import {
  getRewrittenUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { I18N } from "../../../i18n/constants/locales";
import { METADATA } from "../../../metadata/constants/metadata";
import { AOFDefineRouting } from "../../i18n/aof-define-routing";
import { AOFWithLocalizedNotFound } from "../aof-with-localized-not-found";

const ORIGIN = "https://example.test";
const routing = AOFDefineRouting(I18N.BASE_LANGUAGES);
const KEPT = METADATA.PATH.LAUNCH_SCREEN;
const OWN_REWRITE = { destination: "/own-target", source: "/own-source" };

const rewrittenPath = async (
  path: string,
  nextConfig = AOFWithLocalizedNotFound({}, { keep: [KEPT], routing })
) => {
  const response = await unstable_getResponseFromNextConfig({
    nextConfig,
    url: `${ORIGIN}${path}`,
  });
  const url = getRewrittenUrl(response);
  return url ? new URL(url).pathname : null;
};

describe("AOFWithLocalizedNotFound", () => {
  it.each([
    "/no-such-file.png",
    "/api/anything",
    "/zz/deep/file.png",
    // Routes match case-sensitively: no language or kept route owns these.
    "/IT/file.png",
    `${KEPT.toUpperCase()}/any-screen.png`,
  ])(
    "sends %s, which no language owns, to the default language's 404",
    async (path) => {
      expect(await rewrittenPath(path)).toBe(
        `/${I18N.DEFAULT_LANGUAGE}${path}`
      );
    }
  );

  it.each([
    "/it",
    "/it/any-page",
    "/it/file.png",
    `/${I18N.DEFAULT_LANGUAGE}/any-page`,
    "/_next/static/chunk.js",
    `${KEPT}/any-screen.png`,
  ])("leaves %s to the route that serves it", async (path) => {
    expect(await rewrittenPath(path)).toBeNull();
  });

  it.each([
    METADATA.PATH.LAUNCH_SCREEN,
    METADATA.PATH.MANIFEST_ICON,
    METADATA.PATH.LOGO,
  ])(
    "leaves %s, a route core gives every App, without a keep",
    async (path) => {
      expect(
        await rewrittenPath(
          `${path}/any-file.png`,
          AOFWithLocalizedNotFound({}, { routing })
        )
      ).toBeNull();
    }
  );

  it("keeps a path that only starts like a language", async () => {
    expect(await rewrittenPath("/italy")).toBe(
      `/${I18N.DEFAULT_LANGUAGE}/italy`
    );
  });

  it.each([
    ["a list", async () => [OWN_REWRITE]],
    ["groups", async () => ({ afterFiles: [OWN_REWRITE] })],
  ] as const)(
    "runs after the App's own rewrites, given as %s",
    async (_form, rewrites) => {
      const nextConfig = AOFWithLocalizedNotFound({ rewrites }, { routing });
      expect(await rewrittenPath(OWN_REWRITE.source, nextConfig)).toBe(
        OWN_REWRITE.destination
      );
      expect(await rewrittenPath("/no-such-file.png", nextConfig)).toBe(
        `/${I18N.DEFAULT_LANGUAGE}/no-such-file.png`
      );
    }
  );
});
