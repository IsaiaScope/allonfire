// @module-tag unit
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess, Role } from "../../../../../generated/prisma/enums";
import {
  accessUserFrom,
  canEnterApp,
  canManageEverywhere,
  canManageImage,
  canSeeImage,
  enterableApps,
  entryRoles,
  hasRole,
  hasRoleIn,
  roleIn,
} from "../access";
import { appSchema } from "../constants/schemas";

const member = (app: App, role: Role) => ({
  memberships: [{ app, role }],
});

const PUBLIC_IN_LAURA = { access: ImageAccess.PUBLIC, apps: [App.LAURA] };
const PRIVATE_IN_LAURA = { access: ImageAccess.PRIVATE, apps: [App.LAURA] };
const PRIVATE_IN_BOTH = {
  access: ImageAccess.PRIVATE,
  apps: [App.LAURA, App.BACK_OFFICE],
};
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

describe("hasRoleIn", () => {
  it("needs a Membership in that App whose Role reaches at least the one asked", () => {
    expect(
      hasRoleIn(
        member(App.BACK_OFFICE, Role.ADMIN),
        App.BACK_OFFICE,
        Role.ADMIN
      )
    ).toBe(true);
    expect(
      hasRoleIn(member(App.BACK_OFFICE, Role.ADMIN), App.BACK_OFFICE, Role.USER)
    ).toBe(true);
    expect(
      hasRoleIn(member(App.BACK_OFFICE, Role.USER), App.BACK_OFFICE, Role.ADMIN)
    ).toBe(false);
  });

  it("never counts a Role held in another App", () => {
    expect(
      hasRoleIn(member(App.LAURA, Role.ADMIN), App.BACK_OFFICE, Role.VIEWER)
    ).toBe(false);
    expect(hasRoleIn({ memberships: [] }, App.LAURA, Role.VIEWER)).toBe(false);
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

describe("entryRoles", () => {
  it("lists the Roles that reach an App's floor, in enum order", () => {
    expect(entryRoles(App.LAURA)).toEqual([Role.ADMIN, Role.USER, Role.VIEWER]);
    expect(entryRoles(App.BACK_OFFICE)).toEqual([Role.ADMIN]);
  });

  it("offers only Roles that canEnterApp lets in", () => {
    for (const app of objectValues(App)) {
      for (const role of entryRoles(app)) {
        expect(canEnterApp(member(app, role), app)).toBe(true);
      }
    }
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

describe("canSeeImage", () => {
  it("shows a public Image to anyone: a visitor, a member, an outsider", () => {
    expect(canSeeImage(null, PUBLIC_IN_LAURA)).toBe(true);
    expect(canSeeImage(member(App.LAURA, Role.VIEWER), PUBLIC_IN_LAURA)).toBe(
      true
    );
    expect(canSeeImage({ memberships: [] }, PUBLIC_IN_LAURA)).toBe(true);
  });

  it("shows a private Image only to those who enter one of its Apps", () => {
    expect(canSeeImage(null, PRIVATE_IN_LAURA)).toBe(false);
    expect(canSeeImage(member(App.LAURA, Role.VIEWER), PRIVATE_IN_LAURA)).toBe(
      true
    );
    expect(
      canSeeImage(member(App.BACK_OFFICE, Role.ADMIN), PRIVATE_IN_LAURA)
    ).toBe(false);
  });

  it("lets a member of either App see a private Image in both", () => {
    expect(canSeeImage(member(App.LAURA, Role.VIEWER), PRIVATE_IN_BOTH)).toBe(
      true
    );
    expect(
      canSeeImage(member(App.BACK_OFFICE, Role.ADMIN), PRIVATE_IN_BOTH)
    ).toBe(true);
  });

  it("hides a private Image from a User under its App's floor", () => {
    expect(
      canSeeImage(member(App.BACK_OFFICE, Role.USER), {
        access: ImageAccess.PRIVATE,
        apps: [App.BACK_OFFICE],
      })
    ).toBe(false);
  });
});

describe("canManageEverywhere", () => {
  it("needs the Admin Role in every App the Image is in", () => {
    const lauraAdmin = member(App.LAURA, Role.ADMIN);
    expect(canManageEverywhere(lauraAdmin, [App.LAURA])).toBe(true);
    expect(canManageEverywhere(lauraAdmin, [App.LAURA, App.BACK_OFFICE])).toBe(
      false
    );
    expect(
      canManageEverywhere(everywhereAdmin, [App.LAURA, App.BACK_OFFICE])
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
