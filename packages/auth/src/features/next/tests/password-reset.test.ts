// @module-tag unit

import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { serverLogger } from "@allonfire/core/features/next/logger/server-logger";
import { App } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { AUTH } from "../../../shared/constants/auth";
import { USER } from "../../users/constants/users";
import { requestResetLink, resetWithToken } from "../utils/password-reset";
import { call, fetchMock, refusedWith, stubFetch } from "./api-fetch-mocks";

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      origin: LOCAL.URL.BACK_OFFICE,
      [HTTP.HEADER.X_FORWARDED_FOR]: "1.2.3.4",
    }),
}));

const RESET_PAGE = `${LOCAL.URL.BACK_OFFICE}/en${AUTH.PAGE.RESET_PASSWORD}`;
const LANGUAGE = I18N.DEFAULT_LANGUAGE;

const emailForm = (email: string) => {
  const data = new FormData();
  data.set("email", email);
  return data;
};

const passwordForm = (password: string, confirmPassword = password) => {
  const data = new FormData();
  data.set("password", password);
  data.set("confirmPassword", confirmPassword);
  return data;
};

beforeEach(stubFetch);

/** The server log's errors, kept out of the test output. */
const silencedErrors = () =>
  vi.spyOn(serverLogger(), "error").mockImplementation(() => undefined);

describe("requestResetLink", () => {
  it("answers unavailable when the API cannot be reached, and logs why", async () => {
    const failure = new TypeError("fetch failed");
    fetchMock.mockRejectedValueOnce(failure);
    const logged = silencedErrors();
    await expect(
      requestResetLink(emailForm("a@b.test"), {
        language: LANGUAGE,
        resetPage: RESET_PAGE,
      })
    ).resolves.toBe(AUTH.FORGOT_ERROR.UNAVAILABLE);
    expect(logged).toHaveBeenCalledWith(
      { err: failure },
      AUTH.LOG_MESSAGE.RESET_LINK_FAILED
    );
  });

  it("asks the API for a link to the App's page, naming the App and the language", async () => {
    await expect(
      requestResetLink(emailForm("a@b.test"), {
        language: LANGUAGE,
        resetPage: RESET_PAGE,
      })
    ).resolves.toBeUndefined();
    const request = call(0);
    expect(request.url).toContain(AUTH.PATH.REQUEST_PASSWORD_RESET);
    expect(await request.json()).toEqual({
      email: "a@b.test",
      redirectTo: RESET_PAGE,
    });
    expect(request.headers.get(AUTH.HEADER.APP)).toBe(App.BACK_OFFICE);
    expect(request.headers.get(HTTP.HEADER.ACCEPT_LANGUAGE)).toBe(LANGUAGE);
  });

  it("asks nothing for an address that is not one", async () => {
    await expect(
      requestResetLink(emailForm("nope"), {
        language: LANGUAGE,
        resetPage: RESET_PAGE,
      })
    ).resolves.toBe(AUTH.FORGOT_ERROR.INVALID);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [HTTP.STATUS.TOO_MANY_REQUESTS, AUTH.FORGOT_ERROR.RATE_LIMITED],
    [HTTP.STATUS.SERVICE_UNAVAILABLE, AUTH.FORGOT_ERROR.UNAVAILABLE],
  ])("maps the API's %i to %s", async (status, error) => {
    fetchMock.mockResolvedValueOnce(refusedWith(status));
    await expect(
      requestResetLink(emailForm("a@b.test"), {
        language: LANGUAGE,
        resetPage: RESET_PAGE,
      })
    ).resolves.toBe(error);
  });
});

describe("resetWithToken", () => {
  it("sets the new password with the link's token", async () => {
    await expect(
      resetWithToken(passwordForm(FIXTURE.NEW_PASSWORD), {
        language: LANGUAGE,
        token: "tok",
      })
    ).resolves.toBeUndefined();
    expect(await call(0).json()).toEqual({
      newPassword: FIXTURE.NEW_PASSWORD,
      token: "tok",
    });
  });

  it("asks nothing for a weak or mistyped password, or no token", async () => {
    const results = await Promise.all([
      resetWithToken(passwordForm("short"), {
        language: LANGUAGE,
        token: "tok",
      }),
      resetWithToken(passwordForm(FIXTURE.NEW_PASSWORD, "other"), {
        language: LANGUAGE,
        token: "tok",
      }),
      resetWithToken(passwordForm(FIXTURE.NEW_PASSWORD), {
        language: LANGUAGE,
        token: "",
      }),
      // Too long for the API, which would refuse it with the 400 a bad token gets.
      resetWithToken(
        passwordForm(
          `${FIXTURE.NEW_PASSWORD}${"a".repeat(USER.LIMIT.PASSWORD_MAX)}`
        ),
        { language: LANGUAGE, token: "tok" }
      ),
    ]);
    expect(results).toEqual([
      AUTH.RESET_ERROR.INVALID,
      AUTH.RESET_ERROR.INVALID,
      AUTH.RESET_ERROR.INVALID,
      AUTH.RESET_ERROR.INVALID,
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [HTTP.STATUS.BAD_REQUEST, AUTH.RESET_ERROR.INVALID_TOKEN],
    [HTTP.STATUS.TOO_MANY_REQUESTS, AUTH.RESET_ERROR.RATE_LIMITED],
    [HTTP.STATUS.SERVICE_UNAVAILABLE, AUTH.RESET_ERROR.UNAVAILABLE],
  ])("maps the API's %i to %s", async (status, error) => {
    fetchMock.mockResolvedValueOnce(refusedWith(status));
    await expect(
      resetWithToken(passwordForm(FIXTURE.NEW_PASSWORD), {
        language: LANGUAGE,
        token: "tok",
      })
    ).resolves.toBe(error);
  });

  it("answers unavailable when the API cannot be reached, and logs why", async () => {
    const failure = new TypeError("fetch failed");
    fetchMock.mockRejectedValueOnce(failure);
    const logged = silencedErrors();
    await expect(
      resetWithToken(passwordForm(FIXTURE.NEW_PASSWORD), {
        language: LANGUAGE,
        token: "tok",
      })
    ).resolves.toBe(AUTH.RESET_ERROR.UNAVAILABLE);
    expect(logged).toHaveBeenCalledWith(
      { err: failure },
      AUTH.LOG_MESSAGE.PASSWORD_RESET_FAILED
    );
  });
});
