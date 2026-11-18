// @module-tag unit
import { App, Role } from "@allonfire/database/enums";
import { hasSectionRole } from "../utils/has-section-role";
import { sessionOf } from "./session-request-mocks";

/** A Session whose User holds `role` in this App (the tests' `AUTH_APP`). */
const heldAs = (role: Role) => sessionOf([{ app: App.BACK_OFFICE, role }]);

describe("hasSectionRole", () => {
  it("lets any Session into a Section with no minRole", () => {
    expect(hasSectionRole(heldAs(Role.USER), undefined)).toBe(true);
  });

  it("holds a Section with a minRole to that Role or above", () => {
    expect(hasSectionRole(heldAs(Role.USER), Role.ADMIN)).toBe(false);
    expect(hasSectionRole(heldAs(Role.ADMIN), Role.ADMIN)).toBe(true);
    expect(hasSectionRole(heldAs(Role.ADMIN), Role.USER)).toBe(true);
  });

  it("reads the Role this App holds, never another App's", () => {
    const elsewhere = sessionOf([{ app: App.LAURA, role: Role.ADMIN }]);
    expect(hasSectionRole(elsewhere, Role.USER)).toBe(false);
  });

  it("refuses no Session", () => {
    expect(hasSectionRole(null, Role.USER)).toBe(false);
  });
});
