// @module-tag unit
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "../../../http/constants/http";
import { forwardedHeaders, readVisitorHeaders } from "../forwarded-for";

const visitor = vi.hoisted(() => ({ cookie: "", incoming: new Headers() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => visitor.cookie }),
  headers: async () => visitor.incoming,
}));

const visit = (cookie: string, incoming: HeadersInit) => {
  visitor.cookie = cookie;
  visitor.incoming = new Headers(incoming);
};

/** A documentation address (RFC 5737) and a browser's agent. */
const ADDRESS = "203.0.113.7";
const BROWSER = "Mozilla/5.0 (Macintosh) Safari/605.1.15";
const COOKIE = "a=1";
const FROM_THE_BROWSER = {
  [HTTP.HEADER.ORIGIN]: LOCAL.URL.BACK_OFFICE,
  [HTTP.HEADER.USER_AGENT]: BROWSER,
  [HTTP.HEADER.X_FORWARDED_FOR]: ADDRESS,
};

describe("forwardedHeaders", () => {
  it("passes on the visitor's address, browser and the page's Origin", () => {
    expect(forwardedHeaders(new Headers(FROM_THE_BROWSER))).toEqual(
      FROM_THE_BROWSER
    );
  });

  it("passes on nothing that did not reach this server", () => {
    expect(forwardedHeaders(new Headers())).toEqual({});
  });
});

describe("readVisitorHeaders", () => {
  it("sends the visitor's cookies, address, browser and Origin", async () => {
    visit(COOKIE, FROM_THE_BROWSER);
    expect(await readVisitorHeaders()).toEqual({
      [HTTP.HEADER.COOKIE]: COOKIE,
      ...FROM_THE_BROWSER,
    });
  });

  it("sends no address when none reached this server", async () => {
    visit(COOKIE, {});
    expect(await readVisitorHeaders()).toEqual({
      [HTTP.HEADER.COOKIE]: COOKIE,
    });
  });
});
