// @module-tag unit
import { BASE_LANGUAGES } from "../../../i18n/constants/locales";
import { AOFCreateNavigation } from "../aof-create-navigation";
import { AOFDefineRouting } from "../aof-define-routing";

describe("AOFCreateNavigation", () => {
  it("gives the App its locale-aware Link and helpers", () => {
    const navigation = AOFCreateNavigation(AOFDefineRouting(BASE_LANGUAGES));
    expect(navigation.Link).toBeDefined();
    for (const helper of [
      navigation.getPathname,
      navigation.redirect,
      navigation.usePathname,
      navigation.useRouter,
    ]) {
      expect(helper).toBeTypeOf("function");
    }
  });
});
