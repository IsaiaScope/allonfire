// @module-tag unit
import { App, Role } from "../../../../generated/prisma/enums";
import { userVersion } from "../user-version";

const UPDATED_AT = new Date("2026-11-02T10:00:00.000Z");
const LAURA_USER = { app: App.LAURA, role: Role.USER };
const BACK_OFFICE_ADMIN = { app: App.BACK_OFFICE, role: Role.ADMIN };

describe("userVersion", () => {
  it("is the same for the same User whatever the Memberships' order", () => {
    expect(
      userVersion({
        memberships: [LAURA_USER, BACK_OFFICE_ADMIN],
        updatedAt: UPDATED_AT,
      })
    ).toBe(
      userVersion({
        memberships: [BACK_OFFICE_ADMIN, LAURA_USER],
        updatedAt: UPDATED_AT,
      })
    );
  });

  it("changes when a Membership is removed", () => {
    expect(
      userVersion({ memberships: [LAURA_USER], updatedAt: UPDATED_AT })
    ).not.toBe(
      userVersion({
        memberships: [LAURA_USER, BACK_OFFICE_ADMIN],
        updatedAt: UPDATED_AT,
      })
    );
  });

  it("changes when a Role changes", () => {
    expect(
      userVersion({ memberships: [LAURA_USER], updatedAt: UPDATED_AT })
    ).not.toBe(
      userVersion({
        memberships: [{ app: App.LAURA, role: Role.ADMIN }],
        updatedAt: UPDATED_AT,
      })
    );
  });

  it("changes when updatedAt changes", () => {
    expect(
      userVersion({ memberships: [LAURA_USER], updatedAt: UPDATED_AT })
    ).not.toBe(
      userVersion({
        memberships: [LAURA_USER],
        updatedAt: new Date("2026-11-02T10:00:01.000Z"),
      })
    );
  });
});
