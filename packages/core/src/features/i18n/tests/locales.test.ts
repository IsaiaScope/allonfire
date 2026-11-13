// @module-tag unit
import {
  contentLanguageSchema,
  hostLanguageSchema,
  I18N,
} from "../constants/locales";

describe("the language catalogue", () => {
  it("holds the Base languages first", () => {
    expect(I18N.CONTENT_LANGUAGES.slice(0, I18N.BASE_LANGUAGES.length)).toEqual(
      I18N.BASE_LANGUAGES
    );
  });

  it("accepts fr and ja and refuses xx", () => {
    expect(contentLanguageSchema.safeParse("fr").success).toBe(true);
    expect(contentLanguageSchema.safeParse("ja").success).toBe(true);
    expect(contentLanguageSchema.safeParse("xx").success).toBe(false);
  });

  it("lists each language once", () => {
    expect(new Set(I18N.CONTENT_LANGUAGES).size).toBe(
      I18N.CONTENT_LANGUAGES.length
    );
  });

  it("leaves the Base languages out of the optional ones", () => {
    expect(I18N.OPTIONAL_LANGUAGES).not.toContain("en");
    expect(I18N.OPTIONAL_LANGUAGES).not.toContain("it");
    expect(I18N.OPTIONAL_LANGUAGES).toContain("fr");
    expect(I18N.OPTIONAL_LANGUAGES.length + I18N.BASE_LANGUAGES.length).toBe(
      I18N.CONTENT_LANGUAGES.length
    );
  });
});

describe("the Host languages", () => {
  it("are English and Italian today", () => {
    expect(I18N.HOST_LANGUAGES).toEqual(["en", "it"]);
    expect(hostLanguageSchema.safeParse("it").success).toBe(true);
    expect(hostLanguageSchema.safeParse("fr").success).toBe(false);
  });
});
