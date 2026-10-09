// @module-tag unit

import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import { App, Role } from "@allonfire/database/enums";
import type {
  AccessUser,
  ImageLink,
} from "@allonfire/database/features/auth/access/access";
import { authoriseDelete, authoriseUpload } from "../utils/access";

const laura = (isPublic = false): ImageLink => ({
  app: App.LAURA,
  public: isPublic,
});
const backOffice: ImageLink = { app: App.BACK_OFFICE, public: false };

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
      statusOf(() => authoriseUpload(lauraAdmin, [{ apps: [laura()] }]))
    ).toBe("passed");
  });

  it("refuses when any Image goes to an App the User does not manage", () => {
    expect(
      statusOf(() =>
        authoriseUpload(lauraAdmin, [
          { apps: [laura()] },
          { apps: [laura(), backOffice] },
        ])
      )
    ).toBe(HTTP_STATUS.FORBIDDEN);
  });
});

describe("authoriseDelete from one App", () => {
  it("is enough to be an Admin there, wherever else the Image is", () => {
    const current = new Map([["a", [laura(), backOffice]]]);
    expect(
      statusOf(() => authoriseDelete(lauraAdmin, current, App.LAURA))
    ).toBe("passed");
  });

  it("answers 404 for an Image not placed in that App", () => {
    const current = new Map([["a", [backOffice]]]);
    expect(
      statusOf(() => authoriseDelete(everywhereAdmin, current, App.LAURA))
    ).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it("answers 403 to a User who sees the Image but does not manage it", () => {
    const current = new Map([["a", [laura()]]]);
    expect(
      statusOf(() => authoriseDelete(lauraViewer, current, App.LAURA))
    ).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("answers 404 across the batch before any 403", () => {
    const current = new Map([
      ["seen", [laura()]],
      ["hidden", [backOffice]],
    ]);
    expect(statusOf(() => authoriseDelete(lauraViewer, current))).toBe(
      HTTP_STATUS.NOT_FOUND
    );
  });
});

describe("authoriseDelete everywhere", () => {
  it("needs an Admin in every App the Image is in", () => {
    const current = new Map([["a", [laura(true), backOffice]]]);
    expect(statusOf(() => authoriseDelete(lauraAdmin, current))).toBe(
      HTTP_STATUS.FORBIDDEN
    );
    expect(statusOf(() => authoriseDelete(everywhereAdmin, current))).toBe(
      "passed"
    );
  });
});
