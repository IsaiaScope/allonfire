// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { AUTH } from "../auth";
import type {
  AppPath,
  ForgotError,
  ResetError,
  SignInError,
} from "../auth-schema";

describe("AUTH.ERROR", () => {
  it("holds each form's error values, the translation keys of its page", () => {
    expect(objectValues(AUTH.ERROR.SIGN_IN)).toEqual([
      "forbidden",
      "invalid",
      "missing",
      "rateLimited",
      "unavailable",
      "unverified",
    ]);
    expect(objectValues(AUTH.ERROR.FORGOT)).toEqual([
      "invalid",
      "rateLimited",
      "unavailable",
    ]);
    expect(objectValues(AUTH.ERROR.RESET)).toEqual([
      "invalid",
      "invalidToken",
      "rateLimited",
      "unavailable",
    ]);
  });

  it("types each error as the values of its group", () => {
    expectTypeOf<SignInError>().toEqualTypeOf<
      (typeof AUTH.ERROR.SIGN_IN)[keyof typeof AUTH.ERROR.SIGN_IN]
    >();
    expectTypeOf<ForgotError>().toEqualTypeOf<
      (typeof AUTH.ERROR.FORGOT)[keyof typeof AUTH.ERROR.FORGOT]
    >();
    expectTypeOf<ResetError>().toEqualTypeOf<
      (typeof AUTH.ERROR.RESET)[keyof typeof AUTH.ERROR.RESET]
    >();
    expectTypeOf<AppPath>().toEqualTypeOf<
      (typeof AUTH.PAGE)[keyof typeof AUTH.PAGE]
    >();
  });
});

describe("AUTH.MAIL.PARAM", () => {
  it("names the query parameters a link carries", () => {
    expect(AUTH.MAIL.PARAM).toEqual({
      ERROR: "error",
      TOKEN: "token",
      VERIFIED: "verified",
    });
  });
});

describe("AUTH.LIMIT", () => {
  it("holds the wait for the API's auth routes and the secret's length", () => {
    expect(AUTH.LIMIT).toEqual({
      API_TIMEOUT_MS: 10_000,
      SECRET_MIN_LENGTH: 32,
    });
  });
});

describe("AUTH.DOC.JOIN_APP", () => {
  it("documents the one success status, 200", () => {
    expect(objectValues(AUTH.DOC.JOIN_APP.RESPONSE)).toHaveLength(1);
    expect(AUTH.DOC.JOIN_APP.RESPONSE).toHaveProperty(
      String(HTTP.STATUS.OK),
      "The App joined"
    );
  });
});
