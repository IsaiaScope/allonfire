// @module-tag unit
import { AOFCreateNavigation } from "../aof-create-navigation";
import { AOFDefineRouting } from "../aof-define-routing";

describe("AOFCreateNavigation", () => {
  it("gives the App its locale-aware Link and helpers", () => {
    const navigation = AOFCreateNavigation(AOFDefineRouting());
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
