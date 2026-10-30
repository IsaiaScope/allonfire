// @module-tag unit
import { createTranslator } from "next-intl";
import { METADATA } from "../../../metadata/constants/metadata";
import { AOFPageMetadata } from "../aof-page-metadata";

const LOCALE = "it";
const MESSAGES = { Things: { list: { title: "Le cose" } } };
// The request's language and translations, as an App's request config gives
// them.
vi.mock("next-intl/server", () => ({
  getLocale: async () => LOCALE,
  getTranslations: async () =>
    createTranslator({ locale: LOCALE, messages: MESSAGES }),
}));

/** An App's link preview: where it points, in which language. */
const openGraph = (path: string, locale: string) => ({
  url: `/${locale}${path}`,
});
const pageMetadata = AOFPageMetadata(openGraph);
const { ROOT } = METADATA.PATH;

describe("AOFPageMetadata", () => {
  it("titles a page by its translation's full key, in the page's language", async () => {
    expect(await pageMetadata(ROOT, "Things.list.title")).toEqual({
      openGraph: { url: `/${LOCALE}${ROOT}` },
      title: MESSAGES.Things.list.title,
    });
  });

  it("leaves the title to the layout when given none", async () => {
    expect(await pageMetadata(ROOT)).toEqual({
      openGraph: { url: `/${LOCALE}${ROOT}` },
    });
  });
});
