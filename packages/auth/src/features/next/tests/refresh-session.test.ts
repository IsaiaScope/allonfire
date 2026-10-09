// @module-tag unit
import { NextRequest } from "next/server";
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
    expect(String(url)).toBe("http://api.test/auth/get-session");
    expect(new Headers(init?.headers).get("x-forwarded-for")).toBe(
      "203.0.113.7"
    );
  });
});
