// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { LAURA_LOGO } from "@allonfire/design/apps/laura/laura-logo";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { LAURA, SECTION, SECTIONS } from "@/shared/constants/laura";

describe("LAURA", () => {
  it("is Laura's own descriptor", () => {
    expect(LAURA.app).toBe(App.LAURA);
    expect(LAURA.name).toBe("Laura");
    expect(LAURA.logo).toBe(LAURA_LOGO);
  });

  it("opens on the Gallery at Home, then Favorites, Memory and Upload", () => {
    expect(SECTIONS[0].path).toBe(AUTH.PAGE.HOME);
    expect(SECTIONS.map(({ path }) => path)).toEqual([
      AUTH.PAGE.HOME,
      LAURA.PAGE.FAVORITES,
      LAURA.PAGE.MEMORY,
      LAURA.PAGE.UPLOAD,
    ]);
    expect(SECTIONS).toEqual([
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
    const closed = SECTIONS.filter((section) => "minRole" in section);
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

  it("names itself and the Brand in the share image's alt", () => {
    expect(LAURA.shareImageAlt).toContain(LAURA.name);
    expect(LAURA.shareImageAlt).toContain(BRAND.NAME);
  });
});
