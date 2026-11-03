// @module-tag unit

import { LOCAL } from "@allonfire/config/local/addresses";
import { serverLogger } from "@allonfire/core/features/next/logger/server-logger";
import { NextRequest } from "next/server";
import { AUTH } from "../../../shared/constants/auth";
import { refreshSession } from "../utils/refresh-session";

const TOKEN = "__Secure-better-auth.session_token=t";
const DATA = "__Secure-better-auth.session_data=d";
const RENEWED =
  "__Secure-better-auth.session_data=fresh; Max-Age=300; Path=/; HttpOnly";

const request = (cookie: string) =>
  new NextRequest("http://back-office.test/en", {
    headers: { cookie, "x-forwarded-for": "203.0.113.7" },
  });

const fetchMock = vi.fn(
  async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response("{}", {
      headers: { "content-type": "application/json", "set-cookie": RENEWED },
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
        name: "__Secure-better-auth.session_data",
        value: "fresh",
      }),
    ]);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      `${LOCAL.URL.TEST_API}${AUTH.PATH.BASE}${AUTH.PATH.GET_SESSION}`
    );
    expect(new Headers(init?.headers).get("x-forwarded-for")).toBe(
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
