// @module-tag unit
import { USER } from "@allonfire/auth/features/users/constants/users";
import { App, Role } from "@allonfire/database/enums";
import { USERS } from "../../constants/users";
import { type AddUserFieldMessages, addUserSchema } from "../add-user-schema";

const MESSAGES: AddUserFieldMessages = {
  emailInvalid: "emailInvalid",
  emailRequired: "emailRequired",
  nameRequired: "nameRequired",
  passwordMismatch: "passwordMismatch",
  passwordWeak: "passwordWeak",
};
const ROLES = { [App.BACK_OFFICE]: USERS.NO_ROLE, [App.LAURA]: Role.USER };
/** Meets every rule: 12+ characters, each kind once at least. */
const STRONG = "A-long-password-1";
const VALID = {
  avatar: null,
  confirmPassword: STRONG,
  email: "  New@Add-User.test ",
  name: "New",
  password: STRONG,
  roles: ROLES,
};
const schema = addUserSchema(MESSAGES);

describe("addUserSchema", () => {
  it("trims the email, leaving its case to the User module", () => {
    expect(schema.parse(VALID).email).toBe("New@Add-User.test");
  });

  it("checks without messages, as the action does", () => {
    expect(addUserSchema().safeParse({ ...VALID, name: "" }).success).toBe(
      false
    );
  });

  it.each([
    ["short", "Aa1-".repeat(USER.LIMIT.PASSWORD_MIN / 4).slice(1)],
    ["without a lowercase letter", STRONG.toUpperCase()],
    ["without an uppercase letter", STRONG.toLowerCase()],
    ["without a number", "A-long-password-x"],
    ["without a symbol", "Along1password2x"],
  ])("refuses a password %s with one message", (_, password) => {
    const result = schema.safeParse({
      ...VALID,
      confirmPassword: password,
      password,
    });
    expect(result.error?.issues.map(({ message }) => message)).toEqual([
      MESSAGES.passwordWeak,
    ]);
  });

  it("refuses an empty email and name with their messages", () => {
    const result = schema.safeParse({ ...VALID, email: " ", name: "" });
    expect(result.error?.issues.map(({ message }) => message)).toEqual([
      MESSAGES.emailRequired,
      MESSAGES.nameRequired,
    ]);
  });

  it("refuses a confirmation that differs, on the confirmation", () => {
    const result = schema.safeParse({ ...VALID, confirmPassword: "y" });
    expect(
      result.error?.issues.map(({ message, path }) => [path, message])
    ).toEqual([[["confirmPassword"], MESSAGES.passwordMismatch]]);
  });

  it("says the passwords differ even while another field is wrong", () => {
    const result = schema.safeParse({
      ...VALID,
      confirmPassword: "y",
      name: "",
    });
    expect(result.error?.issues.map(({ message }) => message)).toEqual([
      MESSAGES.nameRequired,
      MESSAGES.passwordMismatch,
    ]);
  });
});
