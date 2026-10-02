// @module-tag unit
import { parseSetCookies } from "../utils/set-cookie";

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
