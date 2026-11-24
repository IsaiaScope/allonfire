// @module-tag unit

import { DetailedError } from "hono/client";
import { HTTP } from "../../../http/constants/http";
import { retryUnlessRefused } from "../utils/retry";

const refused = new DetailedError("refused", {
  statusCode: HTTP.STATUS.FORBIDDEN,
});
const broken = new DetailedError("broken", {
  statusCode: HTTP.STATUS.INTERNAL_SERVER_ERROR,
});
const retry = retryUnlessRefused(2);

describe("retryUnlessRefused", () => {
  it("asks again after a server or network failure, up to the limit", () => {
    expect(retry(0, broken)).toBe(true);
    expect(retry(1, new TypeError("offline"))).toBe(true);
    expect(retry(2, broken)).toBe(false);
  });

  it("never asks again after the API refused", () => {
    expect(retry(0, refused)).toBe(false);
  });
});
