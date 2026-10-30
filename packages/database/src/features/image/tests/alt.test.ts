// @module-tag unit
import { imageAltSchema, readAlt } from "../alt";

describe("imageAltSchema", () => {
  it("needs every base language", () => {
    expect(imageAltSchema.safeParse({ en: "The sea" }).success).toBe(false);
    expect(imageAltSchema.parse({ en: "The sea", it: "Il mare" })).toEqual({
      en: "The sea",
      it: "Il mare",
    });
  });

  it("drops a language no Host speaks", () => {
    expect(
      imageAltSchema.parse({ en: "The sea", fr: "La mer", it: "Il mare" })
    ).toEqual({ en: "The sea", it: "Il mare" });
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

  it("reads a row saved in a language no Host speaks any more", () => {
    expect(readAlt({ en: "The sea", fr: "La mer", it: "Il mare" })).toEqual({
      en: "The sea",
      it: "Il mare",
    });
  });
});
