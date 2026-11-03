// @module-tag unit

import { requireApp } from "@allonfire/auth/features/hono/guards/middleware/require-app";
import { requireSession } from "@allonfire/auth/features/hono/guards/middleware/require-session";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { App, Role } from "@allonfire/database/enums";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { problemOf } from "../../../shared/tests/problem-of";
import { translate } from "../../i18n/translate";

/** Routes only these tests mount, each behind one guard. */
const GUARDED_ROUTE = `${API.PATH.VERSION}/guarded`;
const BACK_OFFICE_ROUTE = `${API.PATH.VERSION}/back-office`;

function guarded(session: AuthSession | null) {
  return createApp(
    appDeps({ auth: apiAuth({ getSession: () => Promise.resolve(session) }) })
  )
    .get(GUARDED_ROUTE, requireSession(), (c) => c.text("ok"))
    .get(BACK_OFFICE_ROUTE, requireApp(App.BACK_OFFICE), (c) => c.text("ok"));
}

describe("guards through the API", () => {
  it("renders 401 as a localised problem document", async () => {
    const res = await guarded(null).request(GUARDED_ROUTE, {
      headers: { [HTTP.HEADER.ACCEPT_LANGUAGE]: "it" },
    });
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect(res.headers.get(HTTP.HEADER.CONTENT_TYPE)).toContain(
      HTTP.CONTENT_TYPE.PROBLEM_JSON
    );
    const body = await problemOf(res);
    expect(body).toMatchObject({
      code: ERROR.CODE.UNAUTHORIZED,
      instance: GUARDED_ROUTE,
      status: HTTP.STATUS.UNAUTHORIZED,
    });
    expect(body.detail).not.toBe(
      translate(ERROR.CODE.UNAUTHORIZED, I18N.LOCALE.EN_US)
    );
  });

  it("renders 403 for a User the App does not let in", async () => {
    const res = await guarded(
      sessionFor({ memberships: [{ app: App.LAURA, role: Role.VIEWER }] })
    ).request(BACK_OFFICE_ROUTE);
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.FORBIDDEN);
  });

  it("renders a failing session lookup as 500", async () => {
    const app = createApp(
      appDeps({
        auth: apiAuth({
          getSession: () => Promise.reject(new Error("db down")),
        }),
      })
    ).get(GUARDED_ROUTE, requireSession(), (c) => c.text("ok"));
    const res = await app.request(GUARDED_ROUTE);
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.INTERNAL_ERROR);
  });
});

describe("cookies set while reading the Session", () => {
  it("reach the client on a 401 too, so an expired cookie is cleared", async () => {
    const cleared = `${AUTH.COOKIE.SESSION_TOKEN}=; Max-Age=0; Path=/`;
    const app = createApp(
      appDeps({
        auth: apiAuth({
          getSession: (_headers, setCookie) => {
            setCookie?.(cleared);
            return Promise.resolve(null);
          },
        }),
      })
    ).get(GUARDED_ROUTE, requireSession(), (c) => c.text("ok"));

    const res = await app.request(GUARDED_ROUTE);

    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect(res.headers.getSetCookie()).toEqual([cleared]);
  });
});
