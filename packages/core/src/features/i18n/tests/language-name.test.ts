// @module-tag unit
import { I18N } from "../constants/locales";
import { languageName } from "../utils/language-name";

describe("languageName", () => {
  it("names each language in itself, never as its code", () => {
    for (const language of I18N.BASE_LANGUAGES) {
      expect(languageName(language).toLowerCase()).toBe(
        new Intl.DisplayNames([language], { type: "language" })
          .of(language)
          ?.toLowerCase()
      );
      expect(languageName(language)).not.toBe(language);
    }
  });

  // Node writes "italiano" and WebKit "Italiano": a page the server draws
  // with one and Safari with the other fails to hydrate (React #418).
  it("prints a base language the same on the server and in every browser", () => {
    expect(I18N.BASE_LANGUAGES.map(languageName)).toEqual([
      "English",
      "Italiano",
    ]);
  });

  it("leaves a script that writes its names without capitals", () => {
    // Uppercasing a Georgian letter gives the all-capitals alphabet.
    expect(languageName("ka")).toBe("ქართული");
  });
});
