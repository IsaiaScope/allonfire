// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { NextRequest } from "next/server";
import { AUTH } from "../../../shared/constants/auth";
import { withSignInGate } from "../utils/with-sign-in-gate";

const ORIGIN = "http://back-office.test";
const TOKEN = "__Secure-better-auth.session_token=t";
const IT = "it";
const { HOME, SIGN_IN } = AUTH.PAGE;

const proxy = vi.fn(() => new Response());
const gate = withSignInGate(proxy, { locales: ["en", IT], pages: [HOME] });
const visit = (path: string, cookie = "") =>
  gate(new NextRequest(`${ORIGIN}${path}`, { headers: { cookie } }));

beforeEach(() => proxy.mockClear());

describe("withSignInGate", () => {
  it("sends a signed-out visit to a signed-in page to Sign in, before it renders", async () => {
    const response = await visit(METADATA.PATH.ROOT);
    expect(response.status).toBe(HTTP.STATUS.TEMPORARY_REDIRECT);
    expect(response.headers.get(HTTP.HEADER.LOCATION)).toBe(
      `${ORIGIN}${SIGN_IN}`
    );
    expect(proxy).not.toHaveBeenCalled();
  });

  it("keeps the language the visit asked for", async () => {
    const response = await visit(`/${IT}${HOME}`);
    expect(response.headers.get(HTTP.HEADER.LOCATION)).toBe(
      `${ORIGIN}/${IT}${SIGN_IN}`
    );
  });

  it("lets a visit with a Session cookie through, for the page's own check", async () => {
    await visit(METADATA.PATH.ROOT, TOKEN);
    expect(proxy).toHaveBeenCalledOnce();
  });

  it("lets a signed-out visit to any other path through, so an unknown page still 404s", async () => {
    await visit(SIGN_IN);
    await visit("/no-such-page");
    expect(proxy).toHaveBeenCalledTimes(2);
  });
});
