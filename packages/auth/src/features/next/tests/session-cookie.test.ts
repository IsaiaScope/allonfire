// @module-tag unit
import { AUTH } from "../../../shared/constants/auth";
import { readSessionCookie } from "../utils/session-cookie";

const TOKEN = `${AUTH.COOKIE.SESSION_TOKEN}=token.signature`;
const DATA = `${AUTH.COOKIE.SESSION_DATA}=renewed-every-few-minutes`;
let sent: { name: string; value: string }[] = [];

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => sent }),
}));

const asCookies = (...pairs: string[]) =>
  pairs.map((pair) => {
    const [name = "", value = ""] = pair.split("=");
    return { name, value };
  });

describe("readSessionCookie", () => {
  it("keeps only the Session token, never the cookie cache renewed beside it", async () => {
    sent = asCookies(DATA, TOKEN, "sidebar=false");
    expect(await readSessionCookie()).toBe(TOKEN);
  });

  it("finds it behind the __Secure- prefix", async () => {
    sent = asCookies(`__Secure-${TOKEN}`);
    expect(await readSessionCookie()).toBe(`__Secure-${TOKEN}`);
  });

  it("is empty when signed out", async () => {
    sent = asCookies(DATA);
    expect(await readSessionCookie()).toBe("");
  });
});
