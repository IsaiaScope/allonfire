// @module-tag unit
import { altFor } from "../image-alt";

const ALT = { en: "The sea", it: "Il mare" };

describe("altFor", () => {
  it("reads the alt in the language asked for", () => {
    expect(altFor({ ...ALT, fr: "La mer" }, "fr")).toBe("La mer");
  });

  it("falls back to English for a language with no text, or none stored", () => {
    expect(altFor({ en: "The sea", it: "" }, "it")).toBe("The sea");
    expect(altFor(ALT, "fr")).toBe("The sea");
  });
});
