// @module-tag unit
import { I18N } from "../../../i18n/constants/locales";
import { aofBaseNavigation } from "../utils/aof-base-navigation";
import { aofBaseRouting } from "../utils/aof-base-routing";

const [, SECOND] = I18N.BASE_LANGUAGES;
const PAGE = "/users";

describe("aofBaseRouting", () => {
  it("routes the base languages, the default one first", () => {
    expect(aofBaseRouting.locales).toEqual(I18N.BASE_LANGUAGES);
    expect(aofBaseRouting.defaultLocale).toBe(I18N.DEFAULT_LANGUAGE);
  });
});

describe("aofBaseNavigation", () => {
  it("is built from that routing: the other language's link is always prefixed", () => {
    expect(
      aofBaseNavigation.languageLinks(PAGE, I18N.DEFAULT_LANGUAGE)[1]
        ?.attributes.href
    ).toBe(`/${SECOND}${PAGE}`);
  });
});
