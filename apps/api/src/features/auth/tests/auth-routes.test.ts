// @module-tag unit

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";

const GET_SESSION_ROUTE = `${API.PATH.AUTH}${AUTH.PATH.GET_SESSION}`;

describe("/v1/auth/*", () => {
  it("reaches Better Auth and keeps its Set-Cookie", async () => {
    const auth = apiAuth({
      handler: () =>
        Promise.resolve(
          new Response("{}", {
            headers: {
              "set-cookie": "better-auth.session_token=abc; Path=/; HttpOnly",
            },
          })
        ),
    });
    const res = await createApp(appDeps({ auth })).request(GET_SESSION_ROUTE, {
      headers: { origin: LOCAL.URL.LAURA },
    });
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie()).toEqual([
      "better-auth.session_token=abc; Path=/; HttpOnly",
    ]);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });
});

describe("Session read", () => {
  it("is left to Better Auth on its own routes, and skipped for probes", async () => {
    let reads = 0;
    const auth = apiAuth({
      getSession: () => {
        reads += 1;
        return Promise.resolve(null);
      },
      handler: () => Promise.resolve(new Response("{}")),
    });
    const app = createApp(appDeps({ auth }));

    await app.request(GET_SESSION_ROUTE);
    await app.request(API.PATH.HEALTH);
    expect(reads).toBe(0);

    await app.request(`${API.PATH.VERSION}/anything`);
    expect(reads).toBe(1);
  });
});
