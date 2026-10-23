// @module-tag unit
import { App, Role } from "@allonfire/database/enums";
import { isBackOfficeAdmin } from "../user-deps";

describe("isBackOfficeAdmin", () => {
  it("lets in only an Admin of the Back Office", () => {
    expect(
      isBackOfficeAdmin({
        memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
      })
    ).toBe(true);
    expect(
      isBackOfficeAdmin({
        memberships: [{ app: App.BACK_OFFICE, role: Role.USER }],
      })
    ).toBe(false);
    expect(
      isBackOfficeAdmin({ memberships: [{ app: App.LAURA, role: Role.ADMIN }] })
    ).toBe(false);
    expect(isBackOfficeAdmin({ memberships: [] })).toBe(false);
  });
});
