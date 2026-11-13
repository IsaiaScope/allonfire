// @module-tag unit
import { imageAltSchema, readAlt } from "../utils/alt";

describe("imageAltSchema", () => {
  it("needs every base language", () => {
    expect(imageAltSchema.safeParse({ en: "The sea" }).success).toBe(false);
    expect(imageAltSchema.parse({ en: "The sea", it: "Il mare" })).toEqual({
      en: "The sea",
      it: "Il mare",
    });
  });

  it("accepts fr beside en and it", () => {
    expect(
      imageAltSchema.parse({ en: "The sea", fr: "La mer", it: "Il mare" })
    ).toEqual({ en: "The sea", fr: "La mer", it: "Il mare" });
  });

  it("drops a language outside the catalogue", () => {
    expect(
      imageAltSchema.parse({ en: "The sea", it: "Il mare", xx: "?" })
    ).toEqual({ en: "The sea", it: "Il mare" });
  });

  it("refuses a text over the alt limit in an optional language", () => {
    expect(
      imageAltSchema.safeParse({
        en: "The sea",
        fr: "x".repeat(301),
        it: "Il mare",
      }).success
    ).toBe(false);
  });
});

describe("readAlt", () => {
  it("fills a missing base language with English", () => {
    expect(readAlt({ en: "The sea" })).toEqual({
      en: "The sea",
      it: "The sea",
    });
  });

  it("falls back to another base language when English is missing", () => {
    expect(readAlt({ it: "Il mare" })).toEqual({
      en: "Il mare",
      it: "Il mare",
    });
  });

  it("keeps a stored empty alt empty, since it marks a decorative Image", () => {
    expect(readAlt({ en: "The sea", it: "" })).toEqual({
      en: "The sea",
      it: "",
    });
  });

  it("keeps a stored fr text", () => {
    expect(readAlt({ en: "The sea", fr: "La mer", it: "Il mare" })).toEqual({
      en: "The sea",
      fr: "La mer",
      it: "Il mare",
    });
  });
});
