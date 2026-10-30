// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { App, Role } from "@allonfire/database/enums";
import { NextRequest } from "next/server";
import { AUTH } from "../../../shared/constants/auth";
import { withSignInGate } from "../utils/with-sign-in-gate";

const ORIGIN = "http://back-office.test";
const TOKEN = "__Secure-better-auth.session_token=t";
const IT = "it";
const { HOME, SIGN_IN } = AUTH.PAGE;
/** A page only the App knows: the gate must take it as a plain path. */
const APP_PAGE = { REPORTS: "/reports" } as const;

const proxy = vi.fn(() => new Response());
const gate = withSignInGate(proxy, {
  locales: [I18N.DEFAULT_LANGUAGE, IT],
  pages: [HOME],
});
const visit = (path: string, cookie = "") =>
  gate(new NextRequest(`${ORIGIN}${path}`, { headers: { cookie } }));

/** The API answers `get-session` with a User holding these Memberships. */
const apiSends = (memberships: { app: App; role: Role }[] | null) => {
  const fetch = vi.fn(async () =>
    Response.json(
      memberships && {
        session: { id: "session-1" },
        user: { email: "someone@example.com", memberships },
      }
    )
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

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

  it("gates any page the App lists, not only the shared ones", async () => {
    const appGate = withSignInGate(proxy, {
      locales: [I18N.DEFAULT_LANGUAGE, IT],
      pages: [HOME, APP_PAGE.REPORTS],
    });
    const response = await appGate(
      new NextRequest(`${ORIGIN}/${IT}${APP_PAGE.REPORTS}`)
    );
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

  it("gates every page under a listed page, in either language form", async () => {
    const appGate = withSignInGate(proxy, {
      locales: [I18N.DEFAULT_LANGUAGE, IT],
      pages: [HOME, APP_PAGE.REPORTS],
    });
    const under = await appGate(
      new NextRequest(`${ORIGIN}${APP_PAGE.REPORTS}/abc`)
    );
    expect(under.headers.get(HTTP.HEADER.LOCATION)).toBe(`${ORIGIN}${SIGN_IN}`);
    const underIt = await appGate(
      new NextRequest(`${ORIGIN}/${IT}${APP_PAGE.REPORTS}/abc`)
    );
    expect(underIt.headers.get(HTTP.HEADER.LOCATION)).toBe(
      `${ORIGIN}/${IT}${SIGN_IN}`
    );
  });

  it("never gates by a prefix that is only part of a name, nor under Home", async () => {
    const appGate = withSignInGate(proxy, {
      locales: [I18N.DEFAULT_LANGUAGE, IT],
      pages: [HOME, APP_PAGE.REPORTS],
    });
    await appGate(new NextRequest(`${ORIGIN}${APP_PAGE.REPORTS}x`));
    await appGate(new NextRequest(`${ORIGIN}/unknown/abc`));
    await appGate(new NextRequest(`${ORIGIN}/${IT}/unknown`));
    expect(proxy).toHaveBeenCalledTimes(3);
  });

  it("sends someone the App lets in from Sign in to Home, in the same language form", async () => {
    apiSends([{ app: App.BACK_OFFICE, role: Role.ADMIN }]);
    const response = await visit(`/${IT}${SIGN_IN}`, TOKEN);
    expect(response.status).toBe(HTTP.STATUS.TEMPORARY_REDIRECT);
    expect(response.headers.get(HTTP.HEADER.LOCATION)).toBe(
      `${ORIGIN}/${IT}${HOME}`
    );
    expect(
      (await visit(SIGN_IN, TOKEN)).headers.get(HTTP.HEADER.LOCATION)
    ).toBe(`${ORIGIN}${METADATA.PATH.ROOT}`);
    expect(proxy).not.toHaveBeenCalled();
  });

  it("leaves Sign in to a cookie the App refuses, or the API cannot read", async () => {
    apiSends([{ app: App.LAURA, role: Role.ADMIN }]);
    await visit(SIGN_IN, TOKEN);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("API down")))
    );
    await visit(SIGN_IN, TOKEN);
    expect(proxy).toHaveBeenCalledTimes(2);
  });

  it("asks the API nothing for a signed-out visit to Sign in", async () => {
    const fetch = apiSends(null);
    await visit(`/${IT}${SIGN_IN}`);
    expect(fetch).not.toHaveBeenCalled();
    expect(proxy).toHaveBeenCalledOnce();
  });
});
