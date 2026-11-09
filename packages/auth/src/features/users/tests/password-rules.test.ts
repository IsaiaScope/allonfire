// @module-tag unit
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { USER } from "../constants/users";
import { meetsPasswordRules, passwordRules } from "../utils/password-rules";

const STRONG = FIXTURE.PASSWORD;

describe("passwordRules", () => {
  it("meets none on an empty password", () => {
    expect(passwordRules("")).toEqual({
      length: false,
      lowercase: false,
      noSpaces: false,
      number: false,
      symbol: false,
      uppercase: false,
    });
  });

  it("refuses any whitespace: a space, a tab, a line break", () => {
    expect(passwordRules(STRONG).noSpaces).toBe(true);
    for (const white of [" ", "\t", "\n", "\u00a0"]) {
      expect(passwordRules(`${STRONG}${white}`).noSpaces).toBe(false);
      expect(meetsPasswordRules(`${STRONG}${white}`)).toBe(false);
      expect(meetsPasswordRules(`${white}${STRONG}`)).toBe(false);
    }
  });

  it("counts any script's letters and digits, and anything else as a symbol", () => {
    expect(passwordRules("Ωμ٣ ")).toMatchObject({
      lowercase: true,
      number: true,
      symbol: true,
      uppercase: true,
    });
  });

  it("asks for the module's minimum length", () => {
    const short = STRONG.slice(0, USER.LIMIT.PASSWORD_MIN - 1);
    expect(passwordRules(short).length).toBe(false);
    expect(passwordRules(`${short}x`).length).toBe(true);
  });
});

describe("meetsPasswordRules", () => {
  it("holds only when every rule is met", () => {
    expect(meetsPasswordRules(STRONG)).toBe(true);
    expect(meetsPasswordRules(STRONG.toLowerCase())).toBe(false);
  });
});

it("is met by the Fixture password, which every test signs in with", () => {
  expect(meetsPasswordRules(FIXTURE.PASSWORD)).toBe(true);
});
