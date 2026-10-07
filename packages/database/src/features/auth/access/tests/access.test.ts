// @module-tag unit
import { AllowedApp, Role } from "../../../../../generated/prisma/enums";
import { accessUserFrom, canEnterApp, canSeeContent, hasRole } from "../access";
import { appSchema } from "../constants/schemas";

const LAURA_VIEWERS = { app: AllowedApp.LAURA, minRole: Role.VIEWER };

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

describe("canSeeContent", () => {
  it("shows content for every App to any signed-in User", () => {
    expect(canSeeContent([], AllowedApp.ALL)).toBe(true);
  });

  it("shows an App's content to the Users allowed into it", () => {
    expect(canSeeContent([AllowedApp.LAURA], AllowedApp.LAURA)).toBe(true);
    expect(canSeeContent([AllowedApp.ALL], AllowedApp.BACK_OFFICE)).toBe(true);
    expect(canSeeContent([AllowedApp.LAURA], AllowedApp.BACK_OFFICE)).toBe(
      false
    );
  });
});

describe("canEnterApp", () => {
  it("needs the App in Allowed apps, or ALL", () => {
    const viewer = (allowedApps: AllowedApp[]) =>
      canEnterApp({ allowedApps, role: Role.VIEWER }, LAURA_VIEWERS);
    expect(viewer([AllowedApp.LAURA])).toBe(true);
    expect(viewer([AllowedApp.ALL])).toBe(true);
    expect(viewer([AllowedApp.BACK_OFFICE])).toBe(false);
  });

  it("needs a Role reaching the App's floor", () => {
    const user = { allowedApps: [AllowedApp.ALL], role: Role.USER };
    expect(
      canEnterApp(user, { app: AllowedApp.BACK_OFFICE, minRole: Role.ADMIN })
    ).toBe(false);
  });

  it("accepts only real Apps at compile time", () => {
    const user = { allowedApps: [], role: Role.ADMIN };
    // @ts-expect-error ALL is no App: nobody enters "every App" as one place
    canEnterApp(user, { app: AllowedApp.ALL, minRole: Role.VIEWER });
  });
});

describe("appSchema", () => {
  it("is every Allowed apps value but ALL", () => {
    expect(appSchema.options).toEqual([
      AllowedApp.LAURA,
      AllowedApp.BACK_OFFICE,
    ]);
    expect(appSchema.safeParse(AllowedApp.ALL).success).toBe(false);
  });
});

describe("accessUserFrom", () => {
  it("narrows a User read as strings, dropping unknown Apps", () => {
    expect(
      accessUserFrom({
        allowedApps: [AllowedApp.LAURA, AllowedApp.ALL, "social", "laura"],
        role: Role.VIEWER,
      })
    ).toEqual({
      allowedApps: [AllowedApp.LAURA, AllowedApp.ALL],
      role: Role.VIEWER,
    });
  });

  it("throws on a Role this build does not know, never guesses", () => {
    expect(() =>
      accessUserFrom({ allowedApps: [], role: "MODERATOR" })
    ).toThrow('Unknown Role "MODERATOR"');
  });
});
