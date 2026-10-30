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
});
