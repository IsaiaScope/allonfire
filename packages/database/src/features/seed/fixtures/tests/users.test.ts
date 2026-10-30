// @module-tag unit
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../../generated/prisma/enums";
import { FIXTURE } from "../fixtures";

describe("fixture Users", () => {
  it("has one User per App per Role, the Membership matching", () => {
    for (const app of objectValues(App)) {
      for (const role of objectValues(Role)) {
        expect(FIXTURE.USER[app][role].memberships).toEqual([{ app, role }]);
      }
    }
  });

  it("derives each email from App and Role on the .test domain", () => {
    expect(FIXTURE.USER.BACK_OFFICE.ADMIN.email).toBe(
      "back-office-admin@allonfire.test"
    );
    expect(FIXTURE.USER.LAURA.VIEWER.email).toBe("laura-viewer@allonfire.test");
  });

  it("has an Admin in every App and a User in none", () => {
    expect(FIXTURE.USER.ADMIN_EVERYWHERE.memberships).toEqual(
      objectValues(App).map((app) => ({ app, role: Role.ADMIN }))
    );
    expect(FIXTURE.USER.NO_MEMBERSHIP.memberships).toEqual([]);
  });

  it("never repeats an email", () => {
    const emails = FIXTURE.USERS.map(({ email }) => email);
    expect(new Set(emails).size).toBe(emails.length);
  });
});
