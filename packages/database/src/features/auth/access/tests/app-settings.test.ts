// @module-tag unit

import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import {
  objectEntries,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../../generated/prisma/enums";
import { hasRole } from "../access";
import { ACCESS } from "../constants/access";
import {
  type AppSettingsTable,
  registrationRoleSchema,
} from "../constants/access-schema";

describe("ACCESS.APP_SETTINGS", () => {
  it("gives every open App's newcomers a Role the App lets in", () => {
    // Widened, so a future open row is checked too.
    const settings: AppSettingsTable = ACCESS.APP_SETTINGS;
    for (const [app, { minRole, registration }] of objectEntries(settings)) {
      expect({
        app,
        reaches: registration === null || hasRole(registration, minRole),
      }).toEqual({ app, reaches: true });
    }
  });

  it("keeps the Back Office sign-in only, Admin-only and out of search", () => {
    expect(ACCESS.APP_SETTINGS[App.BACK_OFFICE]).toEqual({
      indexing: METADATA.INDEXING.UNINDEXED,
      minRole: Role.ADMIN,
      registration: null,
      slug: "back-office",
    });
  });

  it("spells each App's slug as the database does: lowercase, a hyphen for each underscore", () => {
    for (const [app, { slug }] of objectEntries(ACCESS.APP_SETTINGS)) {
      expect({ app, slug }).toEqual({
        app,
        slug: app.toLowerCase().replaceAll("_", "-"),
      });
    }
  });

  it("gives no two Apps the same slug", () => {
    const slugs = objectValues(ACCESS.APP_SETTINGS).map(({ slug }) => slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps Laura out of search", () => {
    expect(ACCESS.APP_SETTINGS[App.LAURA].indexing).toBe(
      METADATA.INDEXING.UNINDEXED
    );
  });

  it("never gives a stranger the Admin Role", () => {
    expect(registrationRoleSchema.safeParse(Role.ADMIN).success).toBe(false);
    expect(registrationRoleSchema.options).toEqual([Role.USER, Role.VIEWER]);
  });
});
