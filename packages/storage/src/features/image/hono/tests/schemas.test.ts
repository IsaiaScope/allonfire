// @module-tag unit
import { App } from "@allonfire/database/enums";
import {
  deleteBodySchema,
  listQuerySchema,
  patchBodySchema,
  uploadItemSchema,
} from "../constants/schemas";

const ALT = { en: "The sea", it: "Il mare" };
const LAURA_TWICE = [{ app: App.LAURA }, { app: App.LAURA, public: true }];

describe("uploadItemSchema", () => {
  it("makes a placement sent without `public` private, and keeps one sent public", () => {
    expect(
      uploadItemSchema.parse({
        alt: ALT,
        apps: [{ app: App.LAURA }, { app: App.BACK_OFFICE, public: true }],
      }).apps
    ).toEqual([
      { app: App.LAURA, public: false },
      { app: App.BACK_OFFICE, public: true },
    ]);
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
  it("leaves a `public` that was not sent out, for the route to resolve", () => {
    expect(
      patchBodySchema.parse([{ apps: [{ app: App.LAURA }], id: "image-1" }])
    ).toEqual([{ apps: [{ app: App.LAURA }], id: "image-1" }]);
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
        { apps: [{ app: App.LAURA }], id: "image-1" },
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
