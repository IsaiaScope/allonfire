// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { createApp } from "../../../app";
import { env } from "../../../environment/environment";
import { API } from "../../../shared/constants/api";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { RATE_LIMIT } from "../../rate-limit/constants/limits";
import { memoryStore } from "../../rate-limit/tests/memory-store";

const SIGN_IN_ROUTE = `${API.PATH.AUTH}${AUTH.PATH.SIGN_IN_EMAIL}`;
const CHANGE_PASSWORD_ROUTE = `${API.PATH.AUTH}${AUTH.PATH.CHANGE_PASSWORD}`;
/** The auth limiter's counter for a client with no address: every test's. */
const AUTH_KEY = `${env.AUTH_RATE_LIMIT_KEY_PREFIX}${RATE_LIMIT.UNKNOWN_CLIENT}`;
const ok = apiAuth({ handler: () => Promise.resolve(new Response("{}")) });

describe("auth bucket", () => {
  it("answers 429 as a problem document after the limit", async () => {
    const app = createApp(appDeps({ auth: ok }));
    const allowed = await Promise.all(
      Array.from({ length: env.AUTH_RATE_LIMIT_MAX }, async () => {
        const res = await app.request(SIGN_IN_ROUTE, { method: "POST" });
        return res.status;
      })
    );
    expect(allowed).toEqual(new Array(env.AUTH_RATE_LIMIT_MAX).fill(200));
    const res = await app.request(SIGN_IN_ROUTE, { method: "POST" });
    expect(res.status).toBe(429);
    expect(res.headers.get("content-type")).toContain(
      "application/problem+json"
    );
    expect(res.headers.get(HTTP.HEADER.RETRY_AFTER)).not.toBeNull();
  });

  it("counts only sign-in, under its own key in the shared store", async () => {
    const store = memoryStore();
    const app = createApp(appDeps({ auth: ok, store }));
    await app.request(`${API.PATH.AUTH}${AUTH.PATH.GET_SESSION}`);
    expect(store.hits.has(AUTH_KEY)).toBe(false);

    await app.request(SIGN_IN_ROUTE, { method: "POST" });
    expect([...store.hits.keys()].sort()).toEqual(
      [AUTH_KEY, RATE_LIMIT.UNKNOWN_CLIENT].sort()
    );
  });

  it("counts a trailing-slash variant too", async () => {
    const store = memoryStore();
    const app = createApp(appDeps({ auth: ok, store }));
    await app.request(`${SIGN_IN_ROUTE}/`, { method: "POST" });
    expect(store.hits.get(AUTH_KEY)).toBe(1);
  });

  it("shares one bucket between sign-in and change-password", async () => {
    const store = memoryStore();
    const app = createApp(appDeps({ auth: ok, store }));

    await app.request(SIGN_IN_ROUTE, { method: "POST" });
    await app.request(CHANGE_PASSWORD_ROUTE, { method: "POST" });

    expect(store.hits.get(AUTH_KEY)).toBe(2);
  });
});
