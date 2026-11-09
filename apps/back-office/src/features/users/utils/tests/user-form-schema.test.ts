// @module-tag unit

import { App, Role } from "@allonfire/database/enums";
import { USERS } from "../../constants/users";
import { membershipsOf } from "../user-form-schema";

const ROLES = { [App.BACK_OFFICE]: USERS.NO_ROLE, [App.LAURA]: Role.USER };

describe("membershipsOf", () => {
  it("turns the Role rows into Memberships, leaving out Not a member", () => {
    expect(membershipsOf(ROLES)).toEqual([{ app: App.LAURA, role: Role.USER }]);
  });
});
