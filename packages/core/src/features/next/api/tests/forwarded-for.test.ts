// @module-tag unit
import { readVisitorHeaders } from "../forwarded-for";

const visitor = vi.hoisted(() => ({ cookie: "", incoming: new Headers() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => visitor.cookie }),
  headers: async () => visitor.incoming,
}));

const visit = (cookie: string, incoming: HeadersInit) => {
  visitor.cookie = cookie;
  visitor.incoming = new Headers(incoming);
};

describe("readVisitorHeaders", () => {
  it("sends the visitor's cookies and address", async () => {
    visit("a=1", { "x-forwarded-for": "203.0.113.7" });
    expect(await readVisitorHeaders()).toEqual({
      cookie: "a=1",
      "x-forwarded-for": "203.0.113.7",
    });
  });

  it("sends no address when none reached this server", async () => {
    visit("a=1", {});
    expect(await readVisitorHeaders()).toEqual({ cookie: "a=1" });
  });
});
