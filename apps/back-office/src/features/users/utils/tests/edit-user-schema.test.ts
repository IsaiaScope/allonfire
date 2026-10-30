// @module-tag unit
import { App, Role } from "@allonfire/database/enums";
import { USERS } from "../../constants/users";
import { editUserSchema } from "../edit-user-schema";
import type { UserFieldMessages } from "../user-form-schema";

const MESSAGES: UserFieldMessages = {
  nameRequired: "nameRequired",
  passwordMismatch: "passwordMismatch",
  passwordWeak: "passwordWeak",
};
const STRONG = "A-long-password-1";
const VALID = {
  avatar: null,
  confirmPassword: "",
  name: "Edited",
  password: "",
  roles: { [App.BACK_OFFICE]: USERS.NO_ROLE, [App.LAURA]: Role.USER },
};
const schema = editUserSchema(MESSAGES);
const issuesOf = (values: Partial<typeof VALID>) =>
  schema
    .safeParse({ ...VALID, ...values })
    .error?.issues.map(({ message, path }) => ({ message, path }));

describe("editUserSchema", () => {
  it("keeps the password when both fields are empty", () => {
    const result = schema.safeParse(VALID);
    expect(result.success).toBe(true);
    expect(result.data?.password).toBe("");
  });

  it("a password in one field only is a mismatch", () => {
    expect(issuesOf({ password: STRONG })).toEqual([
      { message: MESSAGES.passwordMismatch, path: ["confirmPassword"] },
    ]);
    expect(issuesOf({ confirmPassword: STRONG })).toEqual([
      { message: MESSAGES.passwordMismatch, path: ["confirmPassword"] },
    ]);
  });

  it("a typed password follows Add a User's rules", () => {
    expect(issuesOf({ confirmPassword: "weak", password: "weak" })).toEqual([
      { message: MESSAGES.passwordWeak, path: ["password"] },
    ]);
    expect(
      schema.safeParse({ ...VALID, confirmPassword: STRONG, password: STRONG })
        .success
    ).toBe(true);
  });

  it("a name of spaces is required", () => {
    expect(issuesOf({ name: "   " })).toEqual([
      { message: MESSAGES.nameRequired, path: ["name"] },
    ]);
  });
});
