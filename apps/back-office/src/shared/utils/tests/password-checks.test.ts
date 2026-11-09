// @module-tag unit

import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { passwordChecks } from "../password-checks";

/** Meets every rule: 12+ characters, each kind once at least. */
const STRONG = FIXTURE.PASSWORD;

describe("passwordChecks", () => {
  it("meets nothing while the password is empty", () => {
    expect(passwordChecks({ confirmPassword: "", password: "" })).toEqual({
      length: false,
      lowercase: false,
      match: false,
      noSpaces: false,
      number: false,
      symbol: false,
      uppercase: false,
    });
  });

  it("unticks no-spaces the moment a space is typed", () => {
    expect(
      passwordChecks({ confirmPassword: "", password: `${STRONG} ` }).noSpaces
    ).toBe(false);
  });

  it("ticks each kind as it is typed, and the match once both agree", () => {
    expect(passwordChecks({ confirmPassword: "", password: "a1" })).toEqual({
      length: false,
      lowercase: true,
      match: false,
      noSpaces: true,
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
      noSpaces: true,
      number: true,
      symbol: true,
      uppercase: true,
    });
  });
});
