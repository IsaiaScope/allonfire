// @module-tag unit
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App } from "@allonfire/database/enums";
import { NextResponse } from "next/server";
import { AUTH_ERROR_CODE } from "../../../shared/constants/errors";
import { SIGN_IN_ERROR } from "../constants/api";
import { signInWithEmail } from "../utils/sign-in";

const TOKEN = "better-auth.session_token";
const NEW_SESSION = `${TOKEN}=fresh; Path=/; HttpOnly; SameSite=Lax`;

let response = new NextResponse();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (...args: Parameters<typeof response.cookies.set>) =>
      response.cookies.set(...args),
  }),
  headers: async () =>
    new Headers({
      origin: "http://localhost:3400",
      "x-forwarded-for": "1.2.3.4",
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
        ["content-type", "application/json"],
        ["set-cookie", NEW_SESSION],
      ],
    }
  );

const refusedWith = (status: number, code = "REFUSED") =>
  new Response(stringifyJson({ code, message: "no" }), {
    headers: { "content-type": "application/json" },
    status,
  });

const fetchMock = vi.fn(
  async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response("{}", { headers: { "content-type": "application/json" } })
);

/** The request fetch made, as a `Request`. */
const call = (index: number) => {
  const [url, init] = fetchMock.mock.calls[index] ?? [];
  if (url === undefined) {
    throw new Error(`no fetch call ${index}`);
  }
  return new Request(url, init);
};

const form = (email = "a@b.test", password = "secret") => {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
};

const sentCookies = () => response.headers.getSetCookie();

beforeEach(() => {
  response = new NextResponse();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("signInWithEmail", () => {
  it("names the App and adopts the Session cookies the API sends", async () => {
    fetchMock.mockResolvedValueOnce(signedIn());
    await expect(signInWithEmail(form())).resolves.toBeUndefined();
    expect(
      sentCookies().some((cookie) => cookie.startsWith(`${TOKEN}=fresh`))
    ).toBe(true);
    expect(call(0).headers.get("x-aof-app")).toBe(App.BACK_OFFICE);
    expect(call(0).headers.get("origin")).toBe("http://localhost:3400");
    expect(call(0).headers.get("x-forwarded-for")).toBe("1.2.3.4");
  });

  it("answers forbidden when the API refuses the App, and sets no cookie", async () => {
    fetchMock.mockResolvedValueOnce(
      refusedWith(403, AUTH_ERROR_CODE.APP_FORBIDDEN)
    );
    await expect(signInWithEmail(form())).resolves.toBe(
      SIGN_IN_ERROR.FORBIDDEN
    );
    expect(sentCookies()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("answers unavailable to any other 403, such as an untrusted origin", async () => {
    fetchMock.mockResolvedValueOnce(refusedWith(403, "INVALID_ORIGIN"));
    await expect(signInWithEmail(form())).resolves.toBe(
      SIGN_IN_ERROR.UNAVAILABLE
    );
  });

  it.each([
    [401, SIGN_IN_ERROR.INVALID],
    [429, SIGN_IN_ERROR.RATE_LIMITED],
    [503, SIGN_IN_ERROR.UNAVAILABLE],
  ])("maps the API's %i to %s", async (status, error) => {
    fetchMock.mockResolvedValueOnce(refusedWith(status));
    await expect(signInWithEmail(form())).resolves.toBe(error);
    expect(sentCookies()).toEqual([]);
  });

  it("answers unavailable when the API cannot be reached", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(signInWithEmail(form())).resolves.toBe(
      SIGN_IN_ERROR.UNAVAILABLE
    );
  });

  it("asks nothing of the API for an empty field or a malformed email", async () => {
    await expect(signInWithEmail(form(" ", "secret"))).resolves.toBe(
      SIGN_IN_ERROR.MISSING
    );
    await expect(signInWithEmail(form("not-an-email"))).resolves.toBe(
      SIGN_IN_ERROR.INVALID
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
