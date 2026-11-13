// @module-tag unit
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, ImageAccess } from "@allonfire/database/enums";
import { IMAGE } from "../../constants/image";
import {
  deleteBodySchema,
  listQuerySchema,
  patchBodySchema,
  toUploadItems,
  uploadFormSchema,
  uploadItemSchema,
} from "../constants/schemas";
import { ALT, VERSION } from "./stub-image-deps";

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
      patchBodySchema.parse([
        { apps: [App.LAURA], id: "image-1", version: VERSION },
      ])
    ).toEqual([{ apps: [App.LAURA], id: "image-1", version: VERSION }]);
  });

  it("takes a change without apps, but refuses an empty list or an App twice", () => {
    expect(
      patchBodySchema.safeParse([{ alt: ALT, id: "image-1", version: VERSION }])
        .success
    ).toBe(true);
    expect(
      patchBodySchema.safeParse([{ apps: [], id: "image-1", version: VERSION }])
        .success
    ).toBe(false);
    expect(
      patchBodySchema.safeParse([
        { apps: LAURA_TWICE, id: "image-1", version: VERSION },
      ]).success
    ).toBe(false);
  });

  it("refuses a change without the Version it was made on", () => {
    expect(
      patchBodySchema.safeParse([{ alt: ALT, id: "image-1" }]).success
    ).toBe(false);
  });

  it("refuses a batch naming one Image twice: its changes would read the same placements", () => {
    expect(
      patchBodySchema.safeParse([
        { alt: ALT, id: "image-1", version: VERSION },
        { apps: [App.LAURA], id: "image-1", version: VERSION },
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
  it("lists every App's visible Images, the first page, when nothing is named", () => {
    expect(listQuerySchema.parse({})).toEqual({
      page: 1,
      perPage: IMAGE.LIMIT.LIST.DEFAULT,
      search: "",
    });
  });

  it("takes a numbered page and its size", () => {
    expect(listQuerySchema.parse({ page: "2", perPage: "10" })).toEqual({
      page: 2,
      perPage: 10,
      search: "",
    });
  });

  it("refuses page 0 and a page above the last one allowed", () => {
    expect(listQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(
      listQuerySchema.safeParse({ page: String(IMAGE.LIMIT.MAX_PAGE + 1) })
        .success
    ).toBe(false);
  });

  it("refuses a page size above the most a page holds", () => {
    expect(
      listQuerySchema.safeParse({ perPage: String(IMAGE.LIMIT.LIST.MAX + 1) })
        .success
    ).toBe(false);
  });

  it("takes the filters and the text in one search, trimmed, and treats a blank or bad one as none", () => {
    expect(listQuerySchema.parse({ search: "  sea " }).search).toBe("sea");
    expect(listQuerySchema.parse({ search: "   " }).search).toBe("");
    expect(
      listQuerySchema.parse({ search: "x".repeat(IMAGE.LIMIT.SEARCH_MAX + 1) })
        .search
    ).toBe("");
  });

  it("no longer takes an access of its own: it is a field of search", () => {
    expect(listQuerySchema.parse({ access: "PUBLIC" })).not.toHaveProperty(
      "access"
    );
  });
});
