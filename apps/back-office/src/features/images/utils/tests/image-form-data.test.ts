// @module-tag unit
import { App, ImageAccess } from "@allonfire/database/enums";
import { uploadFormSchema } from "@allonfire/storage/features/image/hono/constants/schemas";
import {
  editValuesOf,
  imageNames,
  rowsOf,
  uploadFormOf,
} from "../image-form-data";

const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });

/** Posts one row the way the form's controls do. */
const postRow = (form: FormData, index: number, file: File, access: string) => {
  const names = imageNames(`rows[${index}].`);
  form.set(names.file, file);
  form.set(names.access, access);
  form.set(names.alt("en"), `en ${index}`);
  form.set(names.alt("it"), `it ${index}`);
  form.append(names.apps, App.BACK_OFFICE);
};

describe("rowsOf", () => {
  it("reads each posted row in order", () => {
    const form = new FormData();
    postRow(form, 0, photo("a.jpg"), ImageAccess.PUBLIC);
    postRow(form, 1, photo("b.jpg"), ImageAccess.PRIVATE);
    const rows = rowsOf(form);
    expect(rows.map(({ file }) => file.name)).toEqual(["a.jpg", "b.jpg"]);
    expect(rows[1]).toMatchObject({
      access: ImageAccess.PRIVATE,
      alt: { en: "en 1", it: "it 1" },
      apps: [App.BACK_OFFICE],
    });
  });

  it("reads another language's alt only where it was posted", () => {
    const form = new FormData();
    postRow(form, 0, photo("a.jpg"), ImageAccess.PUBLIC);
    form.set(imageNames("rows[0].").alt("fr"), "La mer");
    expect(rowsOf(form)[0]?.alt).toEqual({
      en: "en 0",
      fr: "La mer",
      it: "it 0",
    });
  });

  it("reads an unknown access as private", () => {
    const form = new FormData();
    postRow(form, 0, photo("a.jpg"), "SECRET");
    expect(rowsOf(form)[0]?.access).toBe(ImageAccess.PRIVATE);
  });

  it("stops at the first row without a file", () => {
    expect(rowsOf(new FormData())).toEqual([]);
  });
});

describe("uploadFormOf", () => {
  it("makes parts the API's upload schema parses, files and meta in order", () => {
    const form = new FormData();
    postRow(form, 0, photo("a.jpg"), ImageAccess.PUBLIC);
    postRow(form, 1, photo("b.jpg"), ImageAccess.PRIVATE);
    const parsed = uploadFormSchema.safeParse(uploadFormOf(rowsOf(form)));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.file.map(({ name }) => name)).toEqual([
      "a.jpg",
      "b.jpg",
    ]);
    expect(parsed.data?.meta.map(({ access }) => access)).toEqual([
      ImageAccess.PUBLIC,
      ImageAccess.PRIVATE,
    ]);
  });
});

describe("editValuesOf", () => {
  it("reads alt in two languages, the access and the Apps", () => {
    const form = new FormData();
    const names = imageNames("");
    form.set(names.access, ImageAccess.PUBLIC);
    form.set(names.alt("en"), "The sea");
    form.set(names.alt("it"), "Il mare");
    form.set(names.alt("fr"), "La mer");
    form.append(names.apps, App.BACK_OFFICE);
    expect(editValuesOf(form)).toEqual({
      access: ImageAccess.PUBLIC,
      alt: { en: "The sea", fr: "La mer", it: "Il mare" },
      apps: [App.BACK_OFFICE],
    });
  });
});
