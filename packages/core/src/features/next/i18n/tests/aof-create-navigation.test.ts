// @module-tag unit
import { I18N } from "../../../i18n/constants/locales";
import { AOFCreateNavigation } from "../aof-create-navigation";
import { AOFDefineRouting } from "../aof-define-routing";

const navigation = AOFCreateNavigation(AOFDefineRouting(I18N.BASE_LANGUAGES));
const [FIRST, SECOND] = I18N.BASE_LANGUAGES;
const PAGE = "/users";

describe("AOFCreateNavigation", () => {
  it("gives the App its locale-aware Link and helpers", () => {
    expect(navigation.Link).toBeDefined();
    for (const helper of [
      navigation.getPathname,
      navigation.languageLinks,
      navigation.redirect,
      navigation.usePathname,
      navigation.useRouter,
    ]) {
      expect(helper).toBeTypeOf("function");
    }
  });

  it("links every language to the same page, always prefixed, the current one marked", () => {
    expect(
      navigation.languageLinks(PAGE, SECOND).map(({ attributes }) => attributes)
    ).toEqual([
      { "aria-current": undefined, href: `/${FIRST}${PAGE}`, lang: FIRST },
      { "aria-current": "true", href: `/${SECOND}${PAGE}`, lang: SECOND },
    ]);
  });

  it("keeps the page's query, so a filtered list stays filtered", () => {
    const query = "search=app%3Alaura&page=2";
    expect(
      navigation
        .languageLinks(PAGE, SECOND, query)
        .map(({ attributes }) => attributes.href)
    ).toEqual([`/${FIRST}${PAGE}?${query}`, `/${SECOND}${PAGE}?${query}`]);
  });
});
