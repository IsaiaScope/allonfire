// @module-tag unit
import {
  cookieDomainFor,
  isOutsideDomain,
  setCookieFor,
  withoutDomain,
} from "../cookie-domain";

const DOMAIN = ".example.test";

describe("cookieDomainFor", () => {
  it.each([
    ["an App under the domain", "https://back-office.example.test"],
    ["the domain's own host", "https://example.test"],
    ["an App with a port", "https://app.example.test:8443"],
  ])("keeps the domain for %s", (_, origin) => {
    expect(cookieDomainFor(origin, DOMAIN)).toBe(DOMAIN);
  });

  it.each([
    ["localhost", "http://localhost:3400"],
    ["a look-alike host", "https://evilexample.test"],
    ["another domain", "https://other.test"],
  ])("drops the domain for %s", (_, origin) => {
    expect(cookieDomainFor(origin, DOMAIN)).toBeUndefined();
  });

  it("keeps the domain when the request names no Origin", () => {
    expect(cookieDomainFor(undefined, DOMAIN)).toBe(DOMAIN);
  });

  it("keeps the domain when the Origin is not a URL", () => {
    expect(cookieDomainFor("null", DOMAIN)).toBe(DOMAIN);
  });

  it("has nothing to keep without a domain", () => {
    expect(cookieDomainFor("http://localhost:3400", undefined)).toBeUndefined();
  });
});

describe("withoutDomain", () => {
  it("takes the Domain attribute out and keeps the rest", () => {
    expect(
      withoutDomain(
        `a=b; Max-Age=60; Domain=${DOMAIN}; Path=/; HttpOnly; SameSite=Lax`
      )
    ).toBe("a=b; Max-Age=60; Path=/; HttpOnly; SameSite=Lax");
  });

  it("leaves a cookie with no Domain as it is", () => {
    expect(withoutDomain("a=b; Path=/")).toBe("a=b; Path=/");
  });

  it("never touches a value that only looks like the attribute", () => {
    expect(withoutDomain("a=Domain=x; Path=/")).toBe("a=Domain=x; Path=/");
  });
});

describe("setCookieFor", () => {
  const COOKIE = `a=1; Path=/; Domain=${DOMAIN}; HttpOnly`;

  it("keeps the Domain for an Origin under the domain, or with no domain set", () => {
    expect(setCookieFor(COOKIE, "https://app.example.test", DOMAIN)).toBe(
      COOKIE
    );
    expect(setCookieFor(COOKIE, "http://localhost:3400", undefined)).toBe(
      COOKIE
    );
  });

  it("takes the Domain off for an Origin outside the domain", () => {
    expect(setCookieFor(COOKIE, "http://localhost:3400", DOMAIN)).toBe(
      "a=1; Path=/; HttpOnly"
    );
  });
});

describe("isOutsideDomain", () => {
  it("is true only for an Origin that is a URL outside a set domain", () => {
    expect(isOutsideDomain("http://localhost:3400", DOMAIN)).toBe(true);
    expect(isOutsideDomain("https://evilexample.test", DOMAIN)).toBe(true);
  });

  it.each([
    ["an Origin under the domain", "https://app.example.test", DOMAIN],
    ["no domain", "http://localhost:3400", undefined],
    ["no Origin", undefined, DOMAIN],
    ["an Origin that is not a URL", "not a url", DOMAIN],
  ])("is false for %s", (_, origin, domain) => {
    expect(isOutsideDomain(origin, domain)).toBe(false);
  });
});
