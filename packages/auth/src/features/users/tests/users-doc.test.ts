// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { USER } from "../constants/users";

/** The one success status each User route documents. */
const STATUS_OF_VERB = {
  AVATAR_DELETE: HTTP.STATUS.NO_CONTENT,
  AVATAR_PUT: HTTP.STATUS.OK,
  CREATE: HTTP.STATUS.CREATED,
  DELETE: HTTP.STATUS.OK,
  LIST: HTTP.STATUS.OK,
  READ: HTTP.STATUS.OK,
  UPDATE: HTTP.STATUS.OK,
} as const satisfies Record<keyof typeof USER.DOC, number>;

describe("USER.DOC", () => {
  it("documents the seven User routes, in order", () => {
    expect(objectKeys(USER.DOC)).toEqual(objectKeys(STATUS_OF_VERB));
  });

  it.each(objectKeys(STATUS_OF_VERB))("%s is titled and described", (verb) => {
    expect(USER.DOC[verb].SUMMARY).not.toBe("");
    expect(USER.DOC[verb].DESCRIPTION).not.toBe("");
  });

  it.each(objectKeys(STATUS_OF_VERB))(
    "%s answers its success status and no other",
    (verb) => {
      expect(objectKeys(USER.DOC[verb].RESPONSE)).toEqual([
        String(STATUS_OF_VERB[verb]),
      ]);
    }
  );
});

describe("USER.DEFAULT and USER.LIMIT", () => {
  it("opens a list on the first page, at the smallest page size", () => {
    expect(USER.DEFAULT).toEqual({ PAGE: 1, PAGE_SIZE: USER.PAGE_SIZES[0] });
  });

  it("lets one deletion name a page of Users, and a list reach page 100 000", () => {
    expect(USER.LIMIT.MAX_DELETE).toBe(Math.max(...USER.PAGE_SIZES));
    expect(USER.LIMIT.MAX_PAGE).toBe(100_000);
  });
});
