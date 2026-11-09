// @module-tag unit

import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { serverLogger } from "@allonfire/core/features/next/logger/server-logger";
import { NextRequest } from "next/server";
import { AUTH } from "../../../shared/constants/auth";
import { SESSION_COOKIE } from "../../../shared/tests/stub-auth";
import { refreshSession } from "../utils/refresh-session";

const TOKEN = `${SESSION_COOKIE.SECURE_TOKEN}=t`;
const DATA = `${SESSION_COOKIE.SECURE_DATA}=d`;
const RENEWED = `${SESSION_COOKIE.SECURE_DATA}=fresh; Max-Age=300; Path=/; HttpOnly`;

const request = (cookie: string) =>
  new NextRequest("http://back-office.test/en", {
    headers: { cookie, [HTTP.HEADER.X_FORWARDED_FOR]: "203.0.113.7" },
  });

const fetchMock = vi.fn(
  async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response("{}", {
      headers: {
        [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
        [HTTP.HEADER.SET_COOKIE]: RENEWED,
      },
    })
);

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

describe("refreshSession", () => {
  it("leaves a signed-out visitor alone", async () => {
    expect(await refreshSession(request(""))).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves a Session whose cache is still fresh alone", async () => {
    expect(await refreshSession(request(`${TOKEN}; ${DATA}`))).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the cookies the API renews once the cache has expired", async () => {
    const renewed = await refreshSession(request(TOKEN));
    expect(renewed).toEqual([
      expect.objectContaining({
        name: SESSION_COOKIE.SECURE_DATA,
        value: "fresh",
      }),
    ]);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      `${LOCAL.URL.TEST_API}${AUTH.PATH.BASE}${AUTH.PATH.GET_SESSION}`
    );
    expect(new Headers(init?.headers).get(HTTP.HEADER.X_FORWARDED_FOR)).toBe(
      "203.0.113.7"
    );
  });
});

describe("refreshSession when the API fails", () => {
  it("renews nothing and logs the error", async () => {
    const failure = new Error("API down");
    fetchMock.mockRejectedValueOnce(failure);
    const error = vi
      .spyOn(serverLogger(), "error")
      .mockImplementation(() => undefined);

    expect(await refreshSession(request(TOKEN))).toEqual([]);
    expect(error).toHaveBeenCalledWith(
      { err: failure },
      AUTH.LOG_MESSAGE.SESSION_REFRESH_FAILED
    );
  });
});
