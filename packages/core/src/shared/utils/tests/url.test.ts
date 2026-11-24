// @module-tag unit
import { hostOf } from "../url";

describe("hostOf", () => {
  it("reads the host of an address", () => {
    expect(hostOf("https://lh3.googleusercontent.com/a/x=s96-c")).toBe(
      "lh3.googleusercontent.com"
    );
    expect(hostOf("http://localhost:3300/v1")).toBe("localhost");
  });

  it("is none when the text is not an address", () => {
    expect(hostOf("")).toBeUndefined();
    expect(hostOf("avatars/a1b2.webp")).toBeUndefined();
  });

  it("still answers in a browser without URL.parse (Chrome before 126, Safari before 18)", () => {
    const { parse } = URL;
    Reflect.deleteProperty(URL, "parse");
    try {
      expect(hostOf("https://example.com/a")).toBe("example.com");
      expect(hostOf("nope")).toBeUndefined();
    } finally {
      Reflect.set(URL, "parse", parse);
    }
  });
});
