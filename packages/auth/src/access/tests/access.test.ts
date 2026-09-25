// @module-tag unit
import { AllowedApp, Role } from "@allonfire/database/enums";
import { allowedAppsFrom, canEnterApp, hasRole, roleFrom } from "../access";

describe("hasRole", () => {
  it("reaches its own Role and every one below, never above", () => {
    expect(hasRole(Role.ADMIN, Role.VIEWER)).toBe(true);
    expect(hasRole(Role.USER, Role.USER)).toBe(true);
    expect(hasRole(Role.VIEWER, Role.USER)).toBe(false);
    expect(hasRole(Role.USER, Role.ADMIN)).toBe(false);
  });

  it("accepts only known Roles at compile time", () => {
    // @ts-expect-error "OWNER" is not a Role
    hasRole("OWNER", Role.USER);
  });
});

describe("canEnterApp", () => {
  it("allows the named App or all, nothing else", () => {
    expect(canEnterApp([AllowedApp.LAURA], AllowedApp.LAURA)).toBe(true);
    expect(canEnterApp([AllowedApp.ALL], AllowedApp.LAURA)).toBe(true);
    expect(canEnterApp([], AllowedApp.LAURA)).toBe(false);
  });

  it("accepts only known Apps at compile time", () => {
    // @ts-expect-error "social" is not an App
    canEnterApp(["social"], AllowedApp.LAURA);
  });
});

describe("allowedAppsFrom", () => {
  it("keeps known Apps and all, drops anything else", () => {
    expect(
      allowedAppsFrom([AllowedApp.LAURA, AllowedApp.ALL, "social", "laura"])
    ).toEqual([AllowedApp.LAURA, AllowedApp.ALL]);
  });
});

describe("roleFrom", () => {
  it("keeps a known Role", () => {
    expect(roleFrom(Role.VIEWER)).toBe(Role.VIEWER);
  });

  it("throws on a Role this build does not know, never guesses", () => {
    expect(() => roleFrom("MODERATOR")).toThrow('Unknown Role "MODERATOR"');
  });
});
