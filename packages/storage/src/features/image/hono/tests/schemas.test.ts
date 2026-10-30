// @module-tag unit
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, ImageAccess } from "@allonfire/database/enums";
import {
  deleteBodySchema,
  listQuerySchema,
  patchBodySchema,
  toUploadItems,
  uploadFormSchema,
  uploadItemSchema,
} from "../constants/schemas";

const ALT = { en: "The sea", it: "Il mare" };
const LAURA_TWICE = [App.LAURA, App.LAURA];

describe("uploadItemSchema", () => {
  it("makes an Image sent without `access` private, and keeps one sent public", () => {
    const file = new File(["x"], "sea.jpg");
    const items = (meta: object[]) =>
      toUploadItems(
        uploadFormSchema.parse({
          file: [file, file],
          meta: stringifyJson(meta),
        })
      );
    expect(
      items([
        { alt: ALT, apps: [App.LAURA] },
        { access: ImageAccess.PUBLIC, alt: ALT, apps: [App.BACK_OFFICE] },
      ]).map(({ access }) => access)
    ).toEqual([ImageAccess.PRIVATE, ImageAccess.PUBLIC]);
  });

  it("refuses an Image in no App, or in one App twice", () => {
    expect(uploadItemSchema.safeParse({ alt: ALT, apps: [] }).success).toBe(
      false
    );
    expect(
      uploadItemSchema.safeParse({ alt: ALT, apps: LAURA_TWICE }).success
    ).toBe(false);
  });

  it("no longer takes a single `app`", () => {
    expect(
      uploadItemSchema.safeParse({ alt: ALT, app: App.LAURA }).success
    ).toBe(false);
  });
});

describe("patchBodySchema", () => {
  it("leaves an `access` that was not sent out: the Image keeps its own", () => {
    expect(
      patchBodySchema.parse([{ apps: [App.LAURA], id: "image-1" }])
    ).toEqual([{ apps: [App.LAURA], id: "image-1" }]);
  });

  it("takes a change without apps, but refuses an empty list or an App twice", () => {
    expect(
      patchBodySchema.safeParse([{ alt: ALT, id: "image-1" }]).success
    ).toBe(true);
    expect(
      patchBodySchema.safeParse([{ apps: [], id: "image-1" }]).success
    ).toBe(false);
    expect(
      patchBodySchema.safeParse([{ apps: LAURA_TWICE, id: "image-1" }]).success
    ).toBe(false);
  });

  it("refuses a batch naming one Image twice: its changes would read the same placements", () => {
    expect(
      patchBodySchema.safeParse([
        { alt: ALT, id: "image-1" },
        { apps: [App.LAURA], id: "image-1" },
      ]).success
    ).toBe(false);
  });
});

describe("deleteBodySchema", () => {
  it("names an App to take the Images out of, or none to delete them everywhere", () => {
    expect(
      deleteBodySchema.parse({ app: App.LAURA, ids: ["image-1"] })
    ).toEqual({ app: App.LAURA, ids: ["image-1"] });
    expect(deleteBodySchema.parse({ ids: ["image-1"] })).toEqual({
      ids: ["image-1"],
    });
    expect(
      deleteBodySchema.safeParse({ app: "back-office", ids: ["image-1"] })
        .success
    ).toBe(false);
  });
});

describe("listQuerySchema", () => {
  it("lists every App's visible Images when no App is named", () => {
    expect(listQuerySchema.parse({})).toEqual({ limit: 30 });
  });
});
