// @module-tag unit

import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App } from "@allonfire/database/enums";
import { BASE_ERROR_CODES } from "better-auth";
import { NextResponse } from "next/server";
import { AUTH } from "../../../shared/constants/auth";
import { signInWithEmail } from "../utils/sign-in";
import { call, fetchMock, refusedWith, stubFetch } from "./api-fetch-mocks";

const TOKEN = AUTH.COOKIE.SESSION_TOKEN;
const NEW_SESSION = `${TOKEN}=fresh; Path=/; HttpOnly; SameSite=Lax`;

let response = new NextResponse();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (...args: Parameters<typeof response.cookies.set>) =>
      response.cookies.set(...args),
  }),
  headers: async () =>
    new Headers({
      origin: LOCAL.URL.BACK_OFFICE,
      [HTTP.HEADER.X_FORWARDED_FOR]: "1.2.3.4",
    }),
}));

/** The API's answer to the sign-in, with the new Session's cookie. */
const signedIn = () =>
  new Response(
    stringifyJson({
      redirect: false,
      token: "fresh",
      user: { email: "a@b.test", id: "user-1", name: "A" },
    }),
    {
      headers: [
        [HTTP.HEADER.CONTENT_TYPE, HTTP.CONTENT_TYPE.JSON],
        ["set-cookie", NEW_SESSION],
      ],
    }
  );

const form = (email = "a@b.test", password = "secret") => {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
};

const sentCookies = () => response.headers.getSetCookie();

beforeEach(() => {
  response = new NextResponse();
  stubFetch();
});

describe("signInWithEmail", () => {
  it("names the App and adopts the Session cookies the API sends", async () => {
    fetchMock.mockResolvedValueOnce(signedIn());
    await expect(signInWithEmail(form())).resolves.toBeUndefined();
    expect(
      sentCookies().some((cookie) => cookie.startsWith(`${TOKEN}=fresh`))
    ).toBe(true);
    expect(call(0).headers.get(AUTH.HEADER.APP)).toBe(App.BACK_OFFICE);
    expect(call(0).headers.get(HTTP.HEADER.ORIGIN)).toBe(LOCAL.URL.BACK_OFFICE);
    expect(call(0).headers.get(HTTP.HEADER.X_FORWARDED_FOR)).toBe("1.2.3.4");
  });

  it("answers forbidden when the API refuses the App, and sets no cookie", async () => {
    fetchMock.mockResolvedValueOnce(
      refusedWith(403, AUTH.ERROR_CODE.APP_FORBIDDEN)
    );
    await expect(signInWithEmail(form())).resolves.toBe(
      AUTH.SIGN_IN_ERROR.FORBIDDEN
    );
    expect(sentCookies()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("answers unverified when the API sent a verification link instead", async () => {
    fetchMock.mockResolvedValueOnce(
      refusedWith(403, BASE_ERROR_CODES.EMAIL_NOT_VERIFIED.code)
    );
    await expect(signInWithEmail(form())).resolves.toBe(
      AUTH.SIGN_IN_ERROR.UNVERIFIED
    );
  });

  it("passes the page a verification link lands on", async () => {
    fetchMock.mockResolvedValueOnce(signedIn());
    const data = form();
    data.set("callbackURL", `${LOCAL.URL.BACK_OFFICE}/en/email-verified`);
    await signInWithEmail(data);
    expect(await call(0).json()).toMatchObject({
      callbackURL: `${LOCAL.URL.BACK_OFFICE}/en/email-verified`,
    });
  });

  it("answers unavailable to any other 403, such as an untrusted origin", async () => {
    fetchMock.mockResolvedValueOnce(
      refusedWith(403, BASE_ERROR_CODES.INVALID_ORIGIN.code)
    );
    await expect(signInWithEmail(form())).resolves.toBe(
      AUTH.SIGN_IN_ERROR.UNAVAILABLE
    );
  });

  it.each([
    [HTTP.STATUS.UNAUTHORIZED, AUTH.SIGN_IN_ERROR.INVALID],
    [HTTP.STATUS.TOO_MANY_REQUESTS, AUTH.SIGN_IN_ERROR.RATE_LIMITED],
    [HTTP.STATUS.SERVICE_UNAVAILABLE, AUTH.SIGN_IN_ERROR.UNAVAILABLE],
  ])("maps the API's %i to %s", async (status, error) => {
    fetchMock.mockResolvedValueOnce(refusedWith(status));
    await expect(signInWithEmail(form())).resolves.toBe(error);
    expect(sentCookies()).toEqual([]);
  });

  it("answers unavailable when the API cannot be reached", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(signInWithEmail(form())).resolves.toBe(
      AUTH.SIGN_IN_ERROR.UNAVAILABLE
    );
  });

  it("asks nothing of the API for an empty field or a malformed email", async () => {
    await expect(signInWithEmail(form(" ", "secret"))).resolves.toBe(
      AUTH.SIGN_IN_ERROR.MISSING
    );
    await expect(signInWithEmail(form("not-an-email"))).resolves.toBe(
      AUTH.SIGN_IN_ERROR.INVALID
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
