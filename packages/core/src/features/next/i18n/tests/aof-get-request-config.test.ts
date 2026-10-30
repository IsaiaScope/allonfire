// @module-tag unit
import { DATE } from "../../../i18n/constants/dates";
import { AOFGetRequestConfig } from "../aof-get-request-config";
import { SHARED_TRANSLATIONS } from "../shared-translations";

vi.mock("next-intl/server", () => ({
  getRequestConfig: <T>(create: T) => create,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const routing = { locales: ["en", "it"] as const };
const config = (locale: string | undefined) =>
  AOFGetRequestConfig({
    locale: async () => locale,
    routing,
    translations: {
      en: async () => ({ hello: "en" }),
      it: async () => ({ hello: "it" }),
    },
  })({ requestLocale: Promise.resolve(undefined) });

describe("AOFGetRequestConfig", () => {
  it("loads the shared translations, then the App's, for a routed locale", async () => {
    await expect(config("it")).resolves.toMatchObject({
      locale: "it",
      messages: { ...SHARED_TRANSLATIONS.it, hello: "it" },
    });
  });

  it("prints dates in one time zone and the shared formats, server and browser alike", async () => {
    await expect(config("en")).resolves.toMatchObject({
      formats: DATE.FORMATS,
      timeZone: DATE.TIME_ZONE,
    });
  });

  it.each(["xx", undefined])("404s on locale %s", async (locale) => {
    await expect(config(locale)).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
