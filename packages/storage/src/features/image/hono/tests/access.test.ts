// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App, ImageAccess, Role } from "@allonfire/database/enums";
import type {
  AccessUser,
  ImageVisibility,
} from "@allonfire/database/features/auth/access/access";
import {
  authoriseDelete,
  authorisePatch,
  authoriseUpload,
} from "../utils/access";

const privately = (...apps: App[]): ImageVisibility => ({
  access: ImageAccess.PRIVATE,
  apps,
});
const publicly = (...apps: App[]): ImageVisibility => ({
  access: ImageAccess.PUBLIC,
  apps,
});

const lauraAdmin: AccessUser = {
  memberships: [{ app: App.LAURA, role: Role.ADMIN }],
};
const lauraViewer: AccessUser = {
  memberships: [{ app: App.LAURA, role: Role.VIEWER }],
};
const everywhereAdmin: AccessUser = {
  memberships: [
    { app: App.LAURA, role: Role.ADMIN },
    { app: App.BACK_OFFICE, role: Role.ADMIN },
  ],
};

const statusOf = (run: () => void) => {
  try {
    run();
  } catch (error) {
    return error instanceof Error && "status" in error ? error.status : error;
  }
  return "passed";
};

describe("authoriseUpload", () => {
  it("lets an Admin place Images in the Apps they manage", () => {
    expect(
      statusOf(() => authoriseUpload(lauraAdmin, [{ apps: [App.LAURA] }]))
    ).toBe("passed");
  });

  it("refuses when any Image goes to an App the User does not manage", () => {
    expect(
      statusOf(() =>
        authoriseUpload(lauraAdmin, [
          { apps: [App.LAURA] },
          { apps: [App.LAURA, App.BACK_OFFICE] },
        ])
      )
    ).toBe(HTTP.STATUS.FORBIDDEN);
  });
});

describe("authoriseDelete from one App", () => {
  it("is enough to be an Admin there, wherever else the Image is", () => {
    const current = new Map([["a", privately(App.LAURA, App.BACK_OFFICE)]]);
    expect(
      statusOf(() => authoriseDelete(lauraAdmin, current, App.LAURA))
    ).toBe("passed");
  });

  it("answers 404 for an Image not placed in that App", () => {
    const current = new Map([["a", privately(App.BACK_OFFICE)]]);
    expect(
      statusOf(() => authoriseDelete(everywhereAdmin, current, App.LAURA))
    ).toBe(HTTP.STATUS.NOT_FOUND);
  });

  it("answers 403 to a User who sees the Image but does not manage it", () => {
    const current = new Map([["a", privately(App.LAURA)]]);
    expect(
      statusOf(() => authoriseDelete(lauraViewer, current, App.LAURA))
    ).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("answers 404 across the batch before any 403", () => {
    const current = new Map([
      ["seen", privately(App.LAURA)],
      ["hidden", privately(App.BACK_OFFICE)],
    ]);
    expect(statusOf(() => authoriseDelete(lauraViewer, current))).toBe(
      HTTP.STATUS.NOT_FOUND
    );
  });
});

describe("authoriseDelete everywhere", () => {
  it("needs an Admin in every App the Image is in", () => {
    const current = new Map([["a", publicly(App.LAURA, App.BACK_OFFICE)]]);
    expect(statusOf(() => authoriseDelete(lauraAdmin, current))).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect(statusOf(() => authoriseDelete(everywhereAdmin, current))).toBe(
      "passed"
    );
  });
});

describe("authorisePatch", () => {
  const current = new Map([["a", privately(App.LAURA, App.BACK_OFFICE)]]);

  it("sets access only for an Admin in every App the Image is in", () => {
    const change = [{ access: ImageAccess.PUBLIC, id: "a" }];
    expect(statusOf(() => authorisePatch(lauraAdmin, current, change))).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect(authorisePatch(everywhereAdmin, current, change)).toEqual([
      { access: ImageAccess.PUBLIC, id: "a" },
    ]);
  });

  it("writes no access that does not change", () => {
    expect(
      authorisePatch(everywhereAdmin, current, [
        { access: ImageAccess.PRIVATE, id: "a" },
      ])
    ).toEqual([{ id: "a" }]);
  });

  it("places and takes out only the Apps that change, each by its own Admin", () => {
    const inLaura = new Map([["a", privately(App.LAURA)]]);
    const moved = [{ apps: [App.BACK_OFFICE], id: "a" }];
    expect(statusOf(() => authorisePatch(lauraAdmin, inLaura, moved))).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect(authorisePatch(everywhereAdmin, inLaura, moved)).toEqual([
      { id: "a", place: [App.BACK_OFFICE], remove: [App.LAURA] },
    ]);
  });

  it("renames the file when a public Image turns private and a new name is ready", () => {
    const open = new Map([["a", publicly(App.LAURA)]]);
    expect(
      authorisePatch(
        lauraAdmin,
        open,
        [{ access: ImageAccess.PRIVATE, id: "a" }],
        new Map([["a", "new.avif"]])
      )
    ).toEqual([{ access: ImageAccess.PRIVATE, id: "a", key: "new.avif" }]);
  });
});
