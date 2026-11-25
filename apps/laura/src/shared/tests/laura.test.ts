// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { APP } from "@allonfire/design/apps/app";
import { LAURA_LOGO } from "@allonfire/design/apps/laura/laura-logo";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { SECTION } from "@/features/navigation/constants/sections";
import { LAURA } from "@/shared/constants/laura";

describe("LAURA", () => {
  it("is Laura's own descriptor", () => {
    expect(LAURA.app).toBe(App.LAURA);
    expect(LAURA.name).toBe("Laura");
    expect(LAURA.logo).toBe(LAURA_LOGO);
  });

  it("opens on the Gallery at Home, then Favorites, Memory and Upload", () => {
    expect(LAURA.sections[0].path).toBe(AUTH.PAGE.HOME);
    expect(LAURA.sections.map(({ path }) => path)).toEqual([
      AUTH.PAGE.HOME,
      LAURA.PAGE.FAVORITES,
      LAURA.PAGE.MEMORY,
      LAURA.PAGE.UPLOAD,
    ]);
    expect(LAURA.sections).toEqual([
      SECTION.GALLERY,
      SECTION.FAVORITES,
      SECTION.MEMORY,
      SECTION.UPLOAD,
    ]);
  });

  it("holds Play and the Leaderboard under Memory", () => {
    expect(SECTION.MEMORY.pages.map(({ path }) => path)).toEqual([
      LAURA.PAGE.MEMORY,
      LAURA.PAGE.LEADERBOARD,
    ]);
  });

  it("keeps only Upload above the App's floor, for an Admin", () => {
    const closed = LAURA.sections.filter((section) => "minRole" in section);
    expect(closed).toEqual([SECTION.UPLOAD]);
    expect(SECTION.UPLOAD.minRole).toBe(Role.ADMIN);
  });

  it("draws every App in its switcher: Laura by its logo", () => {
    expect(objectValues(App).every((app) => app in LAURA.entries)).toBe(true);
    expect(LAURA.entries[App.LAURA]).toEqual({
      mark: { logo: LAURA_LOGO },
      name: LAURA.name,
    });
  });

  it("reads its switcher's entries from the one definition the Back Office reads too", () => {
    expect(LAURA.entries).toBe(APP.ENTRY);
  });

  it("names itself and the Brand in the share image's alt", () => {
    expect(LAURA.shareImageAlt).toContain(LAURA.name);
    expect(LAURA.shareImageAlt).toContain(BRAND.NAME);
  });
});
