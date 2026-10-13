// @module-tag unit
import { NextResponse } from "next/server";
import { signOutOfApi } from "../utils/sign-out";

/** The `Secure` attribute, not the `__Secure-` in a cookie's name. */
const SECURE_ATTRIBUTE = /; Secure(;|$)/i;
const TOKEN = "__Secure-better-auth.session_token";
const DATA = "__Secure-better-auth.session_data";
/** The parent domain the API sets the Session cookies for. */
const DOMAIN = ".example.test";
const EXPIRED_BY_API = [
  `${TOKEN}=; Max-Age=0; Domain=${DOMAIN}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  `${DATA}=; Max-Age=0; Domain=${DOMAIN}; Path=/; HttpOnly; Secure; SameSite=Lax`,
];
// The App is told the same domain; its env is read when the module loads.
vi.hoisted(() => vi.stubEnv("AUTH_COOKIE_DOMAIN", ".example.test"));

type VisitorCookie = { name: string; value: string };

/** The visitor's cookies on the request the action answers. */
const visit = vi.hoisted((): { cookies: VisitorCookie[] } => ({ cookies: [] }));

let response = new NextResponse();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    delete: (...args: Parameters<typeof response.cookies.delete>) =>
      response.cookies.delete(...args),
    getAll: () => visit.cookies,
    set: (...args: Parameters<typeof response.cookies.set>) =>
      response.cookies.set(...args),
    toString: () =>
      visit.cookies.map(({ name, value }) => `${name}=${value}`).join("; "),
  }),
  headers: async () => new Headers(),
}));

const fetchMock = vi.fn(
  async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response("{}", {
      headers: [
        ["content-type", "application/json"],
        ...EXPIRED_BY_API.map((cookie): [string, string] => [
          "set-cookie",
          cookie,
        ]),
      ],
    })
);

/** The `Set-Cookie` header the App's response sends for `name`. */
const sentFor = (name: string) =>
  response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith(`${name}=`));

beforeEach(() => {
  response = new NextResponse();
  visit.cookies = [
    { name: TOKEN, value: "t" },
    { name: DATA, value: "d" },
    { name: "NEXT_LOCALE", value: "en" },
  ];
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

describe("signOutOfApi", () => {
  it("clears the cookies with the Domain and Secure the API set them with", async () => {
    await signOutOfApi();
    for (const name of [TOKEN, DATA]) {
      expect(sentFor(name)).toContain(`Domain=${DOMAIN}`);
      expect(sentFor(name)).toMatch(SECURE_ATTRIBUTE);
    }
    expect(sentFor("NEXT_LOCALE")).toBeUndefined();
  });

  it("still clears the cookies, with their Domain and Secure, when the API is down", async () => {
    fetchMock.mockRejectedValueOnce(new Error("unreachable"));
    await signOutOfApi();
    for (const name of [TOKEN, DATA]) {
      expect(sentFor(name)).toMatch(SECURE_ATTRIBUTE);
      expect(sentFor(name)).toContain("Expires=Thu, 01 Jan 1970");
      // Without the Domain it was set with, a browser keeps the cookie.
      expect(sentFor(name)).toContain(`Domain=${DOMAIN}`);
    }
    expect(sentFor("NEXT_LOCALE")).toBeUndefined();
  });
});
