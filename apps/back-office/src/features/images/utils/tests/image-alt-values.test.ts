// @module-tag unit
import { altValuesOf } from "../image-alt";

describe("altValuesOf", () => {
  it("keeps both Base languages and every other language the Image holds", () => {
    expect(altValuesOf({ en: "The sea", fr: "La mer", it: "Il mare" })).toEqual(
      { en: "The sea", fr: "La mer", it: "Il mare" }
    );
  });

  it("leaves out a language the Image holds as nothing", () => {
    expect(altValuesOf({ de: undefined, en: "a", it: "b" })).toEqual({
      en: "a",
      it: "b",
    });
  });
});
