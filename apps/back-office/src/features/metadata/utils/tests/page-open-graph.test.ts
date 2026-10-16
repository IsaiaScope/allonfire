// @module-tag unit
// @vitest-environment node
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { pageOpenGraph } from "../page-open-graph";

const { HOME, SIGN_IN } = AUTH.PAGE;

describe("pageOpenGraph", () => {
  it("gives the default language its public path, without a prefix", () => {
    expect(pageOpenGraph(SIGN_IN, "en").url).toBe(SIGN_IN);
  });

  it("prefixes every other language", () => {
    expect(pageOpenGraph(SIGN_IN, "it").url).toBe(`/it${SIGN_IN}`);
  });

  it("puts home at the root, and at the language's own root", () => {
    expect(pageOpenGraph(HOME, "en").url).toBe(METADATA.PATH.ROOT);
    expect(pageOpenGraph(HOME, "it").url).toBe("/it");
  });

  it("keeps the link-preview image, with its alt in the page's language", () => {
    expect(pageOpenGraph(SIGN_IN, "it").images).toEqual([
      expect.objectContaining({
        ...METADATA.SHARE_IMAGE.SIZE,
        alt: BACK_OFFICE.SHARE_IMAGE_ALT,
        url: `/it${METADATA.PATH.OPENGRAPH_IMAGE}`,
      }),
    ]);
  });

  it("keeps what the layout says about the App", () => {
    expect(pageOpenGraph(SIGN_IN, "it")).toMatchObject({
      alternateLocale: [METADATA.OG_LOCALE.en],
      locale: METADATA.OG_LOCALE.it,
      siteName: BACK_OFFICE.NAME,
      type: "website",
    });
  });
});
