// @module-tag unit
// @vitest-environment node
import { proxyConfig } from "@allonfire/auth/shared/tests/proxy-config";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { proxyMatcherSuite } from "@allonfire/core/features/next/i18n/tests/proxy-matcher-suite";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { LAURA, SECTIONS } from "@/shared/constants/laura";

const config = await proxyConfig(() => import("./proxy"));

proxyMatcherSuite({
  config,
  pages: SECTIONS.map(({ path }) => path),
});

describe("Laura's proxy matcher", () => {
  const matches = (url: string) =>
    unstable_doesMiddlewareMatch({ config, url });

  it("routes a page under a Section and the Upload page", () => {
    expect(matches(LAURA.PAGE.LEADERBOARD)).toBe(true);
    expect(matches(LAURA.PAGE.UPLOAD)).toBe(true);
  });

  it("leaves a launch screen to Next", () => {
    expect(matches(`${METADATA.PATH.LAUNCH_SCREEN}/x.png`)).toBe(false);
  });
});
