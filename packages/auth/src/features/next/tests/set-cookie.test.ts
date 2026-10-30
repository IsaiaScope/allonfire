// @module-tag unit
import { adoptSetCookies, parseSetCookies } from "../utils/set-cookie";

describe("parseSetCookies", () => {
  it("reads Better Auth's session cookie", () => {
    expect(
      parseSetCookies([
        "better-auth.session_token=abc.def%3D; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax",
      ])
    ).toEqual([
      {
        name: "better-auth.session_token",
        options: {
          httpOnly: true,
          maxAge: 604_800,
          path: "/",
          sameSite: "lax",
          secure: true,
        },
        value: "abc.def=",
      },
    ]);
  });

  it("skips a header without a name", () => {
    expect(parseSetCookies(["=b"])).toEqual([]);
  });
});

describe("adoptSetCookies", () => {
  it("sets every cookie on the target and returns their names", () => {
    const set = vi.fn();
    expect(
      adoptSetCookies({ set }, ["a=1; Path=/", "b=2; Max-Age=0; Path=/"])
    ).toEqual(["a", "b"]);
    expect(set).toHaveBeenCalledWith(
      "a",
      "1",
      expect.objectContaining({ path: "/" })
    );
    expect(set).toHaveBeenCalledWith(
      "b",
      "2",
      expect.objectContaining({ maxAge: 0 })
    );
  });
});
