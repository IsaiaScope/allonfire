// @module-tag unit
import { App } from "@allonfire/database/enums";
import { userDeps } from "../user-deps";

describe("userDeps", () => {
  it("names the Back Office as the App that manages Users", () => {
    expect(userDeps({ warn: () => undefined }).manageApp).toBe(App.BACK_OFFICE);
  });
});
