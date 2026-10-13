// @module-tag unit
import { ERROR } from "../error-codes";

// The one place these strings are typed: clients switch on them, so a changed
// value must fail here and not pass every test that reads the constant.
it("keeps the standard codes clients switch on", () => {
  expect(ERROR.CODE).toEqual({
    BAD_REQUEST: "BAD_REQUEST",
    FORBIDDEN: "FORBIDDEN",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    NOT_FOUND: "NOT_FOUND",
    PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
    RATE_LIMITED: "RATE_LIMITED",
    TIMEOUT: "TIMEOUT",
    UNAUTHORIZED: "UNAUTHORIZED",
    VALIDATION_FAILED: "VALIDATION_FAILED",
  });
});
