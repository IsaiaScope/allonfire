// @module-tag unit
import { languageOf } from "../utils/redirect-to";

describe("languageOf", () => {
  it("keeps a known language", () => {
    expect(languageOf("it")).toBe("it");
  });

  it("falls back to the first language for anything else", () => {
    expect(languageOf(undefined)).toBe("en");
    expect(languageOf("xx")).toBe("en");
  });
});
