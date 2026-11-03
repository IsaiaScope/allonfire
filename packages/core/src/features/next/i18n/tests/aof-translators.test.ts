// @module-tag unit
import { SHARED_TRANSLATIONS } from "../translations/shared-translations";
import { aofMessages, aofTranslators } from "../utils/aof-translators";

const APP = {
  en: { Users: { copy: { label: "Copy {email}" } } },
  it: { Users: { copy: { label: "Copia {email}" } } },
};

describe("aofMessages", () => {
  it("puts the shared Common text under the App's own messages", () => {
    expect(aofMessages("it", APP.it)).toEqual({
      ...SHARED_TRANSLATIONS.it,
      ...APP.it,
    });
  });
});

describe("aofTranslators", () => {
  const t = aofTranslators(APP);

  it("fills an App message's placeholders in each base language", () => {
    expect(t.en("Users.copy.label", { email: "a@b.c" })).toBe("Copy a@b.c");
    expect(t.it("Users.copy.label", { email: "a@b.c" })).toBe("Copia a@b.c");
  });

  it("reads the shared Common text too", () => {
    expect(t.it("Common.NotFound.title")).toBe(
      SHARED_TRANSLATIONS.it.Common.NotFound.title
    );
  });
});
