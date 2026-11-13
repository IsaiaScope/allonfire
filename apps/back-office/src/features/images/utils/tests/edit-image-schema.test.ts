// @module-tag unit
import { App, ImageAccess } from "@allonfire/database/enums";
import { editImageSchema } from "../edit-image-schema";

const valid = {
  access: ImageAccess.PUBLIC,
  alt: { en: "The sea", fr: "La mer", it: "Il mare" },
  apps: [App.BACK_OFFICE],
};

describe("editImageSchema", () => {
  it("accepts alt in the Base languages and another one", () => {
    expect(editImageSchema().safeParse(valid).success).toBe(true);
  });

  it("refuses a missing Base language", () => {
    expect(
      editImageSchema().safeParse({ ...valid, alt: { en: "The sea" } }).success
    ).toBe(false);
  });

  it("refuses an Image left in no App", () => {
    expect(editImageSchema().safeParse({ ...valid, apps: [] }).success).toBe(
      false
    );
  });

  it("refuses an access that is neither public nor private", () => {
    expect(
      editImageSchema().safeParse({ ...valid, access: "SECRET" }).success
    ).toBe(false);
  });
});
