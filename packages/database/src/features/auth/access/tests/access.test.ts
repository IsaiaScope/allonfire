// @module-tag unit
import { App, Role } from "../../../../../generated/prisma/enums";
import {
  accessUserFrom,
  canEnterApp,
  canManageEverywhere,
  canManageImage,
  canSeeImage,
  canSeeImageIn,
  enterableApps,
  hasRole,
  type ImageLink,
  roleIn,
} from "../access";
import { appSchema } from "../constants/schemas";

const member = (app: App, role: Role) => ({
  memberships: [{ app, role }],
});

const LAURA_PRIVATE: ImageLink = { app: App.LAURA, public: false };
const LAURA_PUBLIC: ImageLink = { app: App.LAURA, public: true };
const OFFICE_PRIVATE: ImageLink = { app: App.BACK_OFFICE, public: false };
const everywhereAdmin = {
  memberships: [
    { app: App.LAURA, role: Role.ADMIN },
    { app: App.BACK_OFFICE, role: Role.ADMIN },
  ],
};

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

describe("roleIn", () => {
  it("is the Role of the User's Membership in that App, or nothing", () => {
    const user = {
      memberships: [
        { app: App.LAURA, role: Role.VIEWER },
        { app: App.BACK_OFFICE, role: Role.ADMIN },
      ],
    };
    expect(roleIn(user, App.LAURA)).toBe(Role.VIEWER);
    expect(roleIn(user, App.BACK_OFFICE)).toBe(Role.ADMIN);
    expect(roleIn({ memberships: [] }, App.LAURA)).toBeUndefined();
  });
});

describe("canEnterApp", () => {
  it("needs a Membership in the App", () => {
    expect(canEnterApp(member(App.LAURA, Role.VIEWER), App.LAURA)).toBe(true);
    expect(canEnterApp(member(App.LAURA, Role.ADMIN), App.BACK_OFFICE)).toBe(
      false
    );
  });

  it("needs the Role there to reach the App's floor", () => {
    expect(
      canEnterApp(member(App.BACK_OFFICE, Role.USER), App.BACK_OFFICE)
    ).toBe(false);
    expect(
      canEnterApp(member(App.BACK_OFFICE, Role.ADMIN), App.BACK_OFFICE)
    ).toBe(true);
  });
});

describe("canManageImage", () => {
  it("needs the Admin Role in that App", () => {
    expect(canManageImage(member(App.LAURA, Role.ADMIN), App.LAURA)).toBe(true);
    expect(canManageImage(member(App.LAURA, Role.USER), App.LAURA)).toBe(false);
    expect(canManageImage(member(App.BACK_OFFICE, Role.ADMIN), App.LAURA)).toBe(
      false
    );
  });
});

describe("appSchema", () => {
  it("is every App, and only Apps", () => {
    expect(appSchema.options).toEqual([App.LAURA, App.BACK_OFFICE]);
    expect(appSchema.safeParse("ALL").success).toBe(false);
    expect(appSchema.safeParse("back-office").success).toBe(false);
  });
});

describe("accessUserFrom", () => {
  it("narrows Memberships read as strings, dropping unknown Apps", () => {
    expect(
      accessUserFrom({
        memberships: [
          { app: App.LAURA, role: Role.VIEWER },
          { app: "social", role: Role.ADMIN },
        ],
      })
    ).toEqual({ memberships: [{ app: App.LAURA, role: Role.VIEWER }] });
  });

  it("throws on a Role this build does not know, never guesses", () => {
    expect(() =>
      accessUserFrom({ memberships: [{ app: App.LAURA, role: "MODERATOR" }] })
    ).toThrow('Unknown Role "MODERATOR"');
  });
});

describe("canSeeImageIn", () => {
  it("shows a public placement to anyone, signed in or not", () => {
    expect(canSeeImageIn(null, LAURA_PUBLIC)).toBe(true);
    expect(canSeeImageIn({ memberships: [] }, LAURA_PUBLIC)).toBe(true);
  });

  it("shows a private placement only to a User who enters its App", () => {
    expect(canSeeImageIn(member(App.LAURA, Role.VIEWER), LAURA_PRIVATE)).toBe(
      true
    );
    expect(
      canSeeImageIn(member(App.BACK_OFFICE, Role.ADMIN), LAURA_PRIVATE)
    ).toBe(false);
    expect(canSeeImageIn(null, LAURA_PRIVATE)).toBe(false);
  });

  it("hides a private placement from a User under the App's floor", () => {
    expect(
      canSeeImageIn(member(App.BACK_OFFICE, Role.USER), OFFICE_PRIVATE)
    ).toBe(false);
  });
});

describe("canSeeImage", () => {
  it("is true when any placement shows the Image", () => {
    expect(canSeeImage(null, [OFFICE_PRIVATE, LAURA_PUBLIC])).toBe(true);
    expect(canSeeImage(null, [OFFICE_PRIVATE, LAURA_PRIVATE])).toBe(false);
    expect(
      canSeeImage(member(App.LAURA, Role.VIEWER), [
        OFFICE_PRIVATE,
        LAURA_PRIVATE,
      ])
    ).toBe(true);
  });
});

describe("canManageEverywhere", () => {
  it("needs the Admin Role in every App the Image is in", () => {
    const lauraAdmin = member(App.LAURA, Role.ADMIN);
    expect(canManageEverywhere(lauraAdmin, [LAURA_PUBLIC])).toBe(true);
    expect(
      canManageEverywhere(lauraAdmin, [LAURA_PUBLIC, OFFICE_PRIVATE])
    ).toBe(false);
    expect(
      canManageEverywhere(everywhereAdmin, [LAURA_PUBLIC, OFFICE_PRIVATE])
    ).toBe(true);
  });
});

describe("enterableApps", () => {
  it("lists the Apps the User enters, none for a visitor", () => {
    expect(enterableApps(null)).toEqual([]);
    expect(enterableApps(member(App.LAURA, Role.VIEWER))).toEqual([App.LAURA]);
    expect(enterableApps(member(App.BACK_OFFICE, Role.USER))).toEqual([]);
    expect(enterableApps(everywhereAdmin)).toEqual([
      App.LAURA,
      App.BACK_OFFICE,
    ]);
  });
});
