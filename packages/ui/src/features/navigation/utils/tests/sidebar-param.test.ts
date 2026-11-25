// @module-tag unit
import { NAVIGATION } from "../../constants/navigation";
import { sidebarParam } from "../sidebar-param";

describe("sidebarParam", () => {
  it("reads only the two values the constant lists", () => {
    expect(sidebarParam.parse("true")).toBe(NAVIGATION.OPEN.true);
    expect(sidebarParam.parse("false")).toBe(NAVIGATION.OPEN.false);
  });

  it("reads anything else as no value, even a name every object has", () => {
    expect(sidebarParam.parse("x")).toBeNull();
    expect(sidebarParam.parse("constructor")).toBeNull();
  });

  it("writes the open state as the address holds it", () => {
    expect(sidebarParam.serialize(false)).toBe("false");
    expect(sidebarParam.serialize(true)).toBe("true");
  });
});
