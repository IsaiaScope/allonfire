// @module-tag unit
import { signInSchema } from "../sign-in-schema";

const MESSAGES = {
  emailInvalid: "Enter a valid email address.",
  emailRequired: "Enter your email.",
  passwordRequired: "Enter your password.",
};
const schema = signInSchema(MESSAGES);

const messagesFor = (email: string, password: string) => {
  const result = schema.safeParse({ email, password });
  return result.success
    ? []
    : result.error.issues.map(({ message }) => message);
};

describe("signInSchema", () => {
  it("accepts an email and a password", () => {
    expect(messagesFor("ada@example.com", "secret")).toEqual([]);
  });

  it("accepts an email pasted with spaces around it, as the server does", () => {
    expect(messagesFor(" ada@example.com ", "secret")).toEqual([]);
  });

  it("asks for the email when it is empty or blank, once", () => {
    expect(messagesFor("   ", "secret")).toEqual([MESSAGES.emailRequired]);
  });

  it("asks for a valid email", () => {
    expect(messagesFor("ada", "secret")).toEqual([MESSAGES.emailInvalid]);
  });

  it("asks for the password", () => {
    expect(messagesFor("ada@example.com", "")).toEqual([
      MESSAGES.passwordRequired,
    ]);
  });
});
