// @module-tag unit
import { App, ImageAccess } from "@allonfire/database/enums";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { addImageSchema } from "../add-image-schema";

/** A file reporting `size` bytes, without holding them in memory. */
const fileOfSize = (size: number) => {
  const file = new File([""], "photo.jpg", { type: "image/jpeg" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

const row = (size = 1) => ({
  access: ImageAccess.PRIVATE,
  alt: { en: "The sea", it: "Il mare" },
  apps: [App.BACK_OFFICE],
  file: fileOfSize(size),
});
const rows = (count: number, size = 1) =>
  Array.from({ length: count }, () => row(size));

describe("addImageSchema", () => {
  it("accepts the most files one upload takes", () => {
    expect(
      addImageSchema().safeParse({ rows: rows(IMAGE.LIMIT.FILES_PER_UPLOAD) })
        .success
    ).toBe(true);
  });

  it("refuses one file more", () => {
    expect(
      addImageSchema().safeParse({
        rows: rows(IMAGE.LIMIT.FILES_PER_UPLOAD + 1),
      }).success
    ).toBe(false);
  });

  it("refuses no file at all", () => {
    expect(addImageSchema().safeParse({ rows: [] }).success).toBe(false);
  });

  it("refuses a file over the file limit", () => {
    expect(
      addImageSchema().safeParse({ rows: rows(1, IMAGE.LIMIT.FILE_BYTES + 1) })
        .success
    ).toBe(false);
  });

  it("accepts a file exactly at the file limit", () => {
    expect(
      addImageSchema().safeParse({ rows: rows(1, IMAGE.LIMIT.FILE_BYTES) })
        .success
    ).toBe(true);
  });

  it("refuses files that together pass the upload limit", () => {
    const count =
      Math.ceil(IMAGE.LIMIT.UPLOAD_BYTES / IMAGE.LIMIT.FILE_BYTES) + 1;
    expect(
      addImageSchema().safeParse({ rows: rows(count, IMAGE.LIMIT.FILE_BYTES) })
        .success
    ).toBe(false);
  });

  it("refuses a row without an App", () => {
    expect(
      addImageSchema().safeParse({ rows: [{ ...row(), apps: [] }] }).success
    ).toBe(false);
  });

  it("refuses a row without its Italian alt", () => {
    expect(
      addImageSchema().safeParse({
        rows: [{ ...row(), alt: { en: "The sea" } }],
      }).success
    ).toBe(false);
  });
});
