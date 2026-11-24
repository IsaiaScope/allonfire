// @module-tag unit
import { aofAltFor } from "../utils/alt-for";

describe("aofAltFor", () => {
  const alt = { en: "A sea", it: "Un mare" };

  it("answers the alt stored for the language", () => {
    expect(aofAltFor(alt, "it")).toBe("Un mare");
  });

  it("answers the English alt when the language has none", () => {
    expect(aofAltFor(alt, "fr")).toBe("A sea");
  });

  it("answers the English alt when the language is stored as undefined", () => {
    expect(aofAltFor({ en: "A sea", fr: undefined }, "fr")).toBe("A sea");
  });

  it("keeps an empty alt empty: it marks a decorative Image", () => {
    expect(aofAltFor({ en: "", it: "" }, "it")).toBe("");
    expect(aofAltFor({ en: "A sea", it: "" }, "it")).toBe("");
  });
});
