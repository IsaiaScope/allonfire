// @module-tag unit
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../../generated/prisma/enums";
import { hasRole } from "../access";
import {
  APP_SETTINGS,
  type AppSettingsTable,
  registrationRoleSchema,
} from "../constants/app-settings";

describe("APP_SETTINGS", () => {
  it("gives every open App's newcomers a Role the App lets in", () => {
    // Widened, so a future open row is checked too.
    const settings: AppSettingsTable = APP_SETTINGS;
    for (const [app, { minRole, registration }] of objectEntries(settings)) {
      expect({
        app,
        reaches: registration === null || hasRole(registration, minRole),
      }).toEqual({ app, reaches: true });
    }
  });

  it("keeps the Back office sign-in only and Admin-only", () => {
    expect(APP_SETTINGS[App.BACK_OFFICE]).toEqual({
      minRole: Role.ADMIN,
      registration: null,
    });
  });

  it("never gives a stranger the Admin Role", () => {
    expect(registrationRoleSchema.safeParse(Role.ADMIN).success).toBe(false);
    expect(registrationRoleSchema.options).toEqual([Role.USER, Role.VIEWER]);
  });
});
