// @module-tag unit
import { HTTP } from "../../http/constants/http";
import { problemResponseName, problemResponses } from "../utils/openapi";

describe("problemResponseName", () => {
  it("names the response of a status after it", () => {
    expect(problemResponseName(HTTP.STATUS.NOT_FOUND)).toBe(
      `Problem${HTTP.STATUS.NOT_FOUND}`
    );
  });
});

describe("problemResponses", () => {
  it("points each status at its shared response", () => {
    expect(
      problemResponses(HTTP.STATUS.UNAUTHORIZED, HTTP.STATUS.FORBIDDEN)
    ).toEqual({
      [HTTP.STATUS.FORBIDDEN]: {
        $ref: `#/components/responses/${problemResponseName(HTTP.STATUS.FORBIDDEN)}`,
      },
      [HTTP.STATUS.UNAUTHORIZED]: {
        $ref: `#/components/responses/${problemResponseName(HTTP.STATUS.UNAUTHORIZED)}`,
      },
    });
  });
});
