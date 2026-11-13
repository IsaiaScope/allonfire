// @module-tag unit
import { objectKeys } from "@allonfire/core/shared/utils/object";
import {
  addAltLanguage,
  altFor,
  altValuesOf,
  isBaseLanguage,
  removeAltLanguage,
} from "../image-alt";

const ALT = { en: "The sea", it: "Il mare" };

describe("addAltLanguage", () => {
  it("adds the language with an empty text, keeping the others", () => {
    expect(addAltLanguage(ALT, "fr")).toEqual({ ...ALT, fr: "" });
  });

  // The form lists them in this order: the new one under the last, above the picker.
  it("puts the new language after the last one", () => {
    const withFrench = addAltLanguage(ALT, "fr");
    expect(objectKeys(addAltLanguage(withFrench, "de"))).toEqual([
      "en",
      "it",
      "fr",
      "de",
    ]);
  });

  it("leaves a language the alt already holds as it is", () => {
    expect(addAltLanguage({ ...ALT, fr: "La mer" }, "fr").fr).toBe("La mer");
  });
});

describe("removeAltLanguage", () => {
  it("drops the language, keeping the others", () => {
    expect(removeAltLanguage({ ...ALT, fr: "La mer" }, "fr")).toEqual(ALT);
  });

  it("keeps the others in the order they were", () => {
    const alt = { ...ALT, de: "", fr: "", pt: "" };
    expect(objectKeys(removeAltLanguage(alt, "fr"))).toEqual([
      "en",
      "it",
      "de",
      "pt",
    ]);
  });

  it("never drops a Base language", () => {
    expect(removeAltLanguage(ALT, "en")).toEqual(ALT);
  });
});

describe("altValuesOf", () => {
  it("lists English and Italian first, then the others as the Image holds them", () => {
    const alt = altValuesOf({
      de: "Meer",
      en: "The sea",
      fr: "La mer",
      it: "Il mare",
    });
    expect(objectKeys(alt)).toEqual(["en", "it", "de", "fr"]);
  });
});

describe("isBaseLanguage", () => {
  it("is true for English and Italian, false for any other language", () => {
    expect(isBaseLanguage("en")).toBe(true);
    expect(isBaseLanguage("it")).toBe(true);
    expect(isBaseLanguage("fr")).toBe(false);
  });
});

describe("altFor", () => {
  it("reads the alt in the language asked for", () => {
    expect(altFor({ ...ALT, fr: "La mer" }, "fr")).toBe("La mer");
  });

  it("falls back to English for a language with no text, or none stored", () => {
    expect(altFor({ en: "The sea", it: "" }, "it")).toBe("The sea");
    expect(altFor(ALT, "fr")).toBe("The sea");
  });
});
