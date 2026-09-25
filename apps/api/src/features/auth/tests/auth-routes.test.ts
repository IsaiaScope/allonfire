// @module-tag unit
import { createApp } from "../../../app";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";

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
    const res = await createApp(appDeps({ auth })).request(
      "/v1/auth/get-session",
      { headers: { origin: "http://localhost:3200" } }
    );
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

    await app.request("/v1/auth/get-session");
    await app.request("/health");
    expect(reads).toBe(0);

    await app.request("/v1/anything");
    expect(reads).toBe(1);
  });
});
