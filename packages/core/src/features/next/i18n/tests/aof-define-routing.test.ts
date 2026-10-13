// @module-tag unit
import { I18N } from "../../../i18n/constants/locales";
import { AOFDefineRouting } from "../aof-define-routing";

describe("AOFDefineRouting", () => {
  it("routes the Host's languages, the default first, prefix only when needed", () => {
    expect(AOFDefineRouting(I18N.BASE_LANGUAGES)).toEqual({
      defaultLocale: "en",
      localePrefix: "as-needed",
      locales: ["en", "it"],
    });
  });

  it("takes the Host's overrides and keeps its languages", () => {
    expect(
      AOFDefineRouting(I18N.BASE_LANGUAGES, {
        defaultLocale: "it",
        localeCookie: false,
      })
    ).toEqual({
      defaultLocale: "it",
      localeCookie: false,
      localePrefix: "as-needed",
      locales: ["en", "it"],
    });
  });
});
