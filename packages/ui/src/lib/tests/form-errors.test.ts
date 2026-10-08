// @module-tag unit
import { shownErrors } from "../form-errors";

const ISSUE = { message: "Enter your email." };

describe("shownErrors", () => {
  it("hides errors until the field is left or a submit is tried", () => {
    expect(
      shownErrors([ISSUE], { isBlurred: false, submissionAttempts: 0 })
    ).toEqual([]);
  });

  it("shows them once the field is left", () => {
    expect(
      shownErrors([ISSUE], { isBlurred: true, submissionAttempts: 0 })
    ).toEqual([ISSUE]);
  });

  it("shows them once a submit was tried, on a field never left", () => {
    expect(
      shownErrors([ISSUE], { isBlurred: false, submissionAttempts: 1 })
    ).toEqual([ISSUE]);
  });

  it("reads plain strings and skips what carries no message", () => {
    expect(
      shownErrors(["Required.", undefined, { code: "custom" }], {
        isBlurred: true,
        submissionAttempts: 0,
      })
    ).toEqual([{ message: "Required." }]);
  });
});
