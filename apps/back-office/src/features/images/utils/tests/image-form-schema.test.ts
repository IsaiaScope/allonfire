// @module-tag unit

import { App, ImageAccess } from "@allonfire/database/enums";
import { MAX_ALT_LENGTH } from "@allonfire/database/features/image/utils/alt";
import { z } from "zod";
import { altSchema, imageFields } from "../image-form-schema";

const MESSAGES = { altTooLong: "long", appsRequired: "apps" };
const fieldsSchema = z.object(imageFields(MESSAGES));
const valid = {
  access: ImageAccess.PRIVATE,
  alt: { en: "The sea", it: "Il mare" },
  apps: [App.BACK_OFFICE],
};

describe("altSchema", () => {
  it("needs both Base languages", () => {
    expect(altSchema().safeParse({ en: "The sea" }).success).toBe(false);
    expect(altSchema().safeParse({ it: "Il mare" }).success).toBe(false);
  });

  it("accepts an empty text, which marks a decorative Image", () => {
    expect(altSchema().safeParse({ en: "", it: "" }).success).toBe(true);
  });

  it("accepts another catalogue language and refuses one outside it", () => {
    expect(
      altSchema().safeParse({ en: "a", fr: "La mer", it: "b" }).success
    ).toBe(true);
    expect(altSchema().safeParse({ en: "a", it: "b", xx: "?" }).success).toBe(
      false
    );
  });

  it("refuses a text over the alt limit in any language", () => {
    const long = "x".repeat(MAX_ALT_LENGTH + 1);
    expect(altSchema().safeParse({ en: long, it: "b" }).success).toBe(false);
    expect(altSchema().safeParse({ en: "a", fr: long, it: "b" }).success).toBe(
      false
    );
  });
});

describe("imageFields", () => {
  it("accepts an Image with an App", () => {
    expect(fieldsSchema.safeParse(valid).success).toBe(true);
  });

  it("needs at least one App, with the form's message", () => {
    const result = fieldsSchema.safeParse({ ...valid, apps: [] });
    expect(result.error?.issues[0]?.message).toBe(MESSAGES.appsRequired);
  });

  it("refuses an App named twice", () => {
    expect(
      fieldsSchema.safeParse({
        ...valid,
        apps: [App.BACK_OFFICE, App.BACK_OFFICE],
      }).success
    ).toBe(false);
  });
});
