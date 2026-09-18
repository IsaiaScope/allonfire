import { describe, expectTypeOf, it } from "vitest";
import { ERROR_CODE } from "../../errors/constants/error-codes";
import { LOCALE } from "../constants/locales";
import { translate } from "../translate";

describe("translate call signature", () => {
  // Direct calls, not `toBeCallableWith`: that matcher cannot resolve a generic
  // against a conditional variadic tuple and reports a false failure.
  it("accepts values for a parameterized message", () => {
    expectTypeOf(
      translate(ERROR_CODE.RATE_LIMITED, LOCALE.EN_US, { seconds: 30 })
    ).toEqualTypeOf<string>();
  });

  it("takes no values argument for a plain message", () => {
    expectTypeOf(
      translate(ERROR_CODE.NOT_FOUND, LOCALE.EN_US)
    ).toEqualTypeOf<string>();
  });

  it("always returns a string", () => {
    expectTypeOf(
      translate(ERROR_CODE.NOT_FOUND, LOCALE.IT_IT)
    ).toEqualTypeOf<string>();
  });

  it("rejects a wrong value shape", () => {
    // @ts-expect-error RATE_LIMITED takes { seconds }, not { count }
    translate(ERROR_CODE.RATE_LIMITED, LOCALE.EN_US, { count: 30 });
  });

  it("rejects a missing values argument", () => {
    // @ts-expect-error PAYLOAD_TOO_LARGE requires { limit }
    translate(ERROR_CODE.PAYLOAD_TOO_LARGE, LOCALE.EN_US);
  });

  it("rejects values on a message that takes none", () => {
    // @ts-expect-error NOT_FOUND interpolates nothing
    translate(ERROR_CODE.NOT_FOUND, LOCALE.EN_US, { count: 1 });
  });

  it("rejects a bare language as a locale", () => {
    // @ts-expect-error locales are full BCP 47 tags
    translate(ERROR_CODE.NOT_FOUND, "it");
  });
});
