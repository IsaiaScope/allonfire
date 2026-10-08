// @module-tag unit
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

describe("forwardedHeaders", () => {
  it("passes on the visitor's address and the page's Origin", () => {
    expect(
      forwardedHeaders(
        new Headers({
          origin: "http://localhost:3400",
          "x-forwarded-for": "203.0.113.7",
        })
      )
    ).toEqual({
      origin: "http://localhost:3400",
      "x-forwarded-for": "203.0.113.7",
    });
  });

  it("passes on nothing that did not reach this server", () => {
    expect(forwardedHeaders(new Headers())).toEqual({});
  });
});

describe("readVisitorHeaders", () => {
  it("sends the visitor's cookies, address and Origin", async () => {
    visit("a=1", {
      origin: "http://localhost:3400",
      "x-forwarded-for": "203.0.113.7",
    });
    expect(await readVisitorHeaders()).toEqual({
      cookie: "a=1",
      origin: "http://localhost:3400",
      "x-forwarded-for": "203.0.113.7",
    });
  });

  it("sends no address when none reached this server", async () => {
    visit("a=1", {});
    expect(await readVisitorHeaders()).toEqual({ cookie: "a=1" });
  });
});
