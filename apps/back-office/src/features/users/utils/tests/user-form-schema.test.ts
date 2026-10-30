// @module-tag unit
import { App, Role } from "@allonfire/database/enums";
import { USERS } from "../../constants/users";
import { membershipsOf, passwordChecks } from "../user-form-schema";

const ROLES = { [App.BACK_OFFICE]: USERS.NO_ROLE, [App.LAURA]: Role.USER };
/** Meets every rule: 12+ characters, each kind once at least. */
const STRONG = "A-long-password-1";

describe("passwordChecks", () => {
  it("meets nothing while the password is empty", () => {
    expect(passwordChecks({ confirmPassword: "", password: "" })).toEqual({
      length: false,
      lowercase: false,
      match: false,
      number: false,
      symbol: false,
      uppercase: false,
    });
  });

  it("ticks each kind as it is typed, and the match once both agree", () => {
    expect(passwordChecks({ confirmPassword: "", password: "a1" })).toEqual({
      length: false,
      lowercase: true,
      match: false,
      number: true,
      symbol: false,
      uppercase: false,
    });
    expect(
      passwordChecks({ confirmPassword: STRONG, password: STRONG })
    ).toEqual({
      length: true,
      lowercase: true,
      match: true,
      number: true,
      symbol: true,
      uppercase: true,
    });
  });
});

describe("membershipsOf", () => {
  it("turns the Role rows into Memberships, leaving out Not a member", () => {
    expect(membershipsOf(ROLES)).toEqual([{ app: App.LAURA, role: Role.USER }]);
  });
});
