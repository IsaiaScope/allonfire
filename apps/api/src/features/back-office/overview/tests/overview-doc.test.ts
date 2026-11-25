// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { BACK_OFFICE } from "../../constants/back-office";

describe.each([
  ["STORAGE", BACK_OFFICE.OVERVIEW.STORAGE.DOC],
  ["USERS", BACK_OFFICE.OVERVIEW.USERS.DOC],
])("BACK_OFFICE.OVERVIEW.%s.DOC", (_overview, doc) => {
  it("documents the one overview route", () => {
    expect(objectKeys(doc)).toEqual(["OVERVIEW"]);
  });

  it("has a summary, a description and the response of its success status", () => {
    expect(doc.OVERVIEW.SUMMARY).not.toBe("");
    expect(doc.OVERVIEW.DESCRIPTION).not.toBe("");
    expect(objectKeys(doc.OVERVIEW.RESPONSE)).toEqual([String(HTTP.STATUS.OK)]);
    expect(doc.OVERVIEW.RESPONSE).toHaveProperty(String(HTTP.STATUS.OK));
  });
});
