// @module-tag unit
// @vitest-environment node
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "./proxy";

vi.mock("@allonfire/auth/features/next/utils/with-session-refresh", () => ({
  withSessionRefresh: (handler: unknown) => handler,
}));
vi.mock("@allonfire/core/features/next/i18n/aof-create-middleware", () => ({
  AOFCreateMiddleware: () => () => undefined,
}));

const IT = "/it";
const { PATH } = METADATA;
const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it.each([
    PATH.ROOT,
    AUTH.PAGE.SIGN_IN,
    IT,
    `${IT}${AUTH.PAGE.SIGN_IN}`,
    // A page whose name only starts like a metadata file is still a page.
    `${PATH.ICON}s`,
    `${PATH.ICON}ic`,
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
    "/api/health",
  ])("leaves the file %s to Next", (url) => {
    expect(matches(url)).toBe(false);
  });
});
