// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { IMAGE } from "../image";

/** The one success status each Image route documents. */
const STATUS_OF_VERB = {
  DELETE: HTTP.STATUS.OK,
  GET: HTTP.STATUS.OK,
  LIST: HTTP.STATUS.OK,
  PATCH: HTTP.STATUS.OK,
  UPLOAD: HTTP.STATUS.CREATED,
} as const satisfies Record<keyof typeof IMAGE.DOC, number>;

describe("IMAGE.DOC", () => {
  it("documents the five Image routes, in order", () => {
    expect(objectKeys(IMAGE.DOC)).toEqual(objectKeys(STATUS_OF_VERB));
  });

  it.each(objectKeys(STATUS_OF_VERB))(
    "%s has a summary, a description and the response of its success status",
    (verb) => {
      const doc = IMAGE.DOC[verb];

      expect(doc.SUMMARY).not.toBe("");
      expect(doc.DESCRIPTION).not.toBe("");
      expect(objectKeys(doc.RESPONSE)).toEqual([String(STATUS_OF_VERB[verb])]);
      expect(doc.RESPONSE).toHaveProperty(String(STATUS_OF_VERB[verb]));
    }
  );

  it("reads every number in the upload text from the limit that enforces it", () => {
    expect(IMAGE.DOC.UPLOAD.DESCRIPTION).toContain(
      `${IMAGE.LIMIT.INPUT.MEGAPIXELS} megapixels`
    );
    expect(IMAGE.DOC.LIST.DESCRIPTION).toContain(
      `up to ${IMAGE.LIMIT.LIST.MAX}`
    );
  });
});
